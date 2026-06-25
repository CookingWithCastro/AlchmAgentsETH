// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AlchmRightsRegistry
 * @notice An on-chain provenance anchor for registered creative works and their
 * licensing manifests.
 *
 * A record identifies a registration claim, its declared rights holder, hashes of
 * the work/evidence, and the current public license manifest. Registration is
 * restricted to REGISTRAR_ROLE so third parties cannot squat an official
 * registration number. The rights holder controls recipe-minting operators.
 *
 * A transfer is a two-party state transition and must reference the hash + URI of
 * a separately executed transfer instrument. This contract records that evidence;
 * it does not determine the legal validity or scope of a copyright claim, license,
 * or transfer.
 */
contract AlchmRightsRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct RightsAnchor {
        address rightsHolder;
        bytes32 workHash;
        bytes32 evidenceHash;
        bytes32 licenseHash;
        uint64 registeredAt;
        uint64 operatorEpoch;
        string title;
        string authority;
        string registrationNumber;
        string licenseURI;
    }

    struct PendingTransfer {
        address proposedHolder;
        bytes32 instrumentHash;
        string instrumentURI;
    }

    struct RegisterRightsInput {
        address rightsHolder;
        bytes32 workHash;
        bytes32 evidenceHash;
        bytes32 licenseHash;
        string title;
        string authority;
        string registrationNumber;
        string licenseURI;
    }

    mapping(bytes32 anchorId => RightsAnchor) private _anchors;
    mapping(bytes32 registrationKey => bytes32 anchorId) public anchorForRegistration;
    mapping(bytes32 anchorId => PendingTransfer) private _pendingTransfers;
    mapping(bytes32 anchorId => mapping(uint64 epoch => mapping(address operator => bool approved))) private _operators;

    event RightsRegistered(
        bytes32 indexed anchorId,
        bytes32 indexed registrationKey,
        address indexed rightsHolder,
        bytes32 workHash,
        bytes32 evidenceHash,
        bytes32 licenseHash,
        string title,
        string authority,
        string registrationNumber,
        string licenseURI
    );
    event LicenseUpdated(
        bytes32 indexed anchorId, bytes32 indexed previousLicenseHash, bytes32 indexed newLicenseHash, string licenseURI
    );
    event OperatorSet(bytes32 indexed anchorId, uint64 indexed operatorEpoch, address indexed operator, bool approved);
    event RightsTransferProposed(
        bytes32 indexed anchorId,
        address indexed currentHolder,
        address indexed proposedHolder,
        bytes32 instrumentHash,
        string instrumentURI
    );
    event RightsTransferCancelled(bytes32 indexed anchorId, address indexed proposedHolder);
    event RightsTransferAccepted(
        bytes32 indexed anchorId,
        address indexed previousHolder,
        address indexed newHolder,
        bytes32 instrumentHash,
        string instrumentURI,
        uint64 operatorEpoch
    );

    error AnchorNotFound();
    error DuplicateRegistration();
    error EmptyField();
    error InvalidAddress();
    error InvalidHash();
    error NotRightsHolder();
    error NoPendingTransfer();
    error NotProposedHolder();
    error SameRightsHolder();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /**
     * @notice Register an immutable provenance anchor. The holder and license may
     * evolve through explicit functions, while the title, registration identity,
     * work hash, evidence hash, and original timestamp never change.
     */
    function registerRights(RegisterRightsInput calldata input)
        external
        onlyRole(REGISTRAR_ROLE)
        returns (bytes32 anchorId)
    {
        if (input.rightsHolder == address(0)) revert InvalidAddress();
        if (
            bytes(input.title).length == 0 || bytes(input.authority).length == 0
                || bytes(input.registrationNumber).length == 0 || bytes(input.licenseURI).length == 0
        ) revert EmptyField();
        if (input.workHash == bytes32(0) || input.evidenceHash == bytes32(0) || input.licenseHash == bytes32(0)) {
            revert InvalidHash();
        }

        bytes32 registrationKey = registrationKeyOf(input.authority, input.registrationNumber);
        if (anchorForRegistration[registrationKey] != bytes32(0)) revert DuplicateRegistration();

        anchorId = keccak256(abi.encode(registrationKey, input.workHash));
        _anchors[anchorId] = RightsAnchor({
            rightsHolder: input.rightsHolder,
            workHash: input.workHash,
            evidenceHash: input.evidenceHash,
            licenseHash: input.licenseHash,
            registeredAt: uint64(block.timestamp),
            operatorEpoch: 1,
            title: input.title,
            authority: input.authority,
            registrationNumber: input.registrationNumber,
            licenseURI: input.licenseURI
        });
        anchorForRegistration[registrationKey] = anchorId;
        _emitRightsRegistered(anchorId, registrationKey, input);
    }

    function exists(bytes32 anchorId) public view returns (bool) {
        return _anchors[anchorId].registeredAt != 0;
    }

    function getRights(bytes32 anchorId) external view returns (RightsAnchor memory) {
        _requireAnchor(anchorId);
        return _anchors[anchorId];
    }

    function rightsHolderOf(bytes32 anchorId) public view returns (address) {
        _requireAnchor(anchorId);
        return _anchors[anchorId].rightsHolder;
    }

    function licenseHashOf(bytes32 anchorId) public view returns (bytes32) {
        _requireAnchor(anchorId);
        return _anchors[anchorId].licenseHash;
    }

    function registrationKeyOf(string memory authority, string memory registrationNumber)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(authority, registrationNumber));
    }

    /**
     * Update the public license manifest without mutating the anchored work.
     */
    function updateLicense(bytes32 anchorId, bytes32 licenseHash, string calldata licenseURI) external {
        RightsAnchor storage anchor = _requireRightsHolder(anchorId);
        if (licenseHash == bytes32(0)) revert InvalidHash();
        if (bytes(licenseURI).length == 0) revert EmptyField();
        bytes32 previous = anchor.licenseHash;
        anchor.licenseHash = licenseHash;
        anchor.licenseURI = licenseURI;
        emit LicenseUpdated(anchorId, previous, licenseHash, licenseURI);
    }

    /**
     * Authorize a wallet or agent to mint recipe records under this rights anchor.
     */
    function setOperator(bytes32 anchorId, address operator, bool approved) external {
        RightsAnchor storage anchor = _requireRightsHolder(anchorId);
        if (operator == address(0)) revert InvalidAddress();
        _operators[anchorId][anchor.operatorEpoch][operator] = approved;
        emit OperatorSet(anchorId, anchor.operatorEpoch, operator, approved);
    }

    function isAuthorized(bytes32 anchorId, address account) public view returns (bool) {
        if (!exists(anchorId) || account == address(0)) return false;
        RightsAnchor storage anchor = _anchors[anchorId];
        return account == anchor.rightsHolder || _operators[anchorId][anchor.operatorEpoch][account];
    }

    /**
     * Propose a rights-holder change backed by a separately signed instrument.
     * Accepting the transfer increments the operator epoch, invalidating every
     * previously authorized minting wallet without needing an enumerable list.
     */
    function proposeTransfer(
        bytes32 anchorId,
        address proposedHolder,
        bytes32 instrumentHash,
        string calldata instrumentURI
    ) external {
        RightsAnchor storage anchor = _requireRightsHolder(anchorId);
        if (proposedHolder == address(0)) revert InvalidAddress();
        if (proposedHolder == anchor.rightsHolder) revert SameRightsHolder();
        if (instrumentHash == bytes32(0)) revert InvalidHash();
        if (bytes(instrumentURI).length == 0) revert EmptyField();

        _pendingTransfers[anchorId] = PendingTransfer({
            proposedHolder: proposedHolder, instrumentHash: instrumentHash, instrumentURI: instrumentURI
        });
        emit RightsTransferProposed(anchorId, anchor.rightsHolder, proposedHolder, instrumentHash, instrumentURI);
    }

    function pendingTransfer(bytes32 anchorId) external view returns (PendingTransfer memory) {
        _requireAnchor(anchorId);
        return _pendingTransfers[anchorId];
    }

    function cancelTransfer(bytes32 anchorId) external {
        _requireRightsHolder(anchorId);
        PendingTransfer storage pending = _pendingTransfers[anchorId];
        if (pending.proposedHolder == address(0)) revert NoPendingTransfer();
        address proposedHolder = pending.proposedHolder;
        delete _pendingTransfers[anchorId];
        emit RightsTransferCancelled(anchorId, proposedHolder);
    }

    function acceptTransfer(bytes32 anchorId) external {
        RightsAnchor storage anchor = _requireAnchor(anchorId);
        PendingTransfer memory pending = _pendingTransfers[anchorId];
        if (pending.proposedHolder == address(0)) revert NoPendingTransfer();
        if (msg.sender != pending.proposedHolder) revert NotProposedHolder();

        address previousHolder = anchor.rightsHolder;
        anchor.rightsHolder = pending.proposedHolder;
        anchor.operatorEpoch += 1;
        delete _pendingTransfers[anchorId];

        emit RightsTransferAccepted(
            anchorId,
            previousHolder,
            anchor.rightsHolder,
            pending.instrumentHash,
            pending.instrumentURI,
            anchor.operatorEpoch
        );
    }

    function _requireAnchor(bytes32 anchorId) internal view returns (RightsAnchor storage anchor) {
        anchor = _anchors[anchorId];
        if (anchor.registeredAt == 0) revert AnchorNotFound();
    }

    function _requireRightsHolder(bytes32 anchorId) internal view returns (RightsAnchor storage anchor) {
        anchor = _requireAnchor(anchorId);
        if (msg.sender != anchor.rightsHolder) revert NotRightsHolder();
    }

    function _emitRightsRegistered(bytes32 anchorId, bytes32 registrationKey, RegisterRightsInput calldata input)
        internal
    {
        emit RightsRegistered(
            anchorId,
            registrationKey,
            input.rightsHolder,
            input.workHash,
            input.evidenceHash,
            input.licenseHash,
            input.title,
            input.authority,
            input.registrationNumber,
            input.licenseURI
        );
    }
}
