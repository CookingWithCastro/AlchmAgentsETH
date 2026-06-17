// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title EsmsToken
 * @notice Soulbound ERC-1155 for the Alchm ESMS economy (Spirit/Essence/Matter/Substance).
 *
 * Design (Phase 1 — claim/mirror):
 *  - The off-chain WTEN ledger remains AUTHORITATIVE. Users opt-in to "claim" their
 *    balance to chain: the backend debits off-chain, then calls {claimMint} here.
 *  - SOULBOUND: tokens may be minted (from 0x0) and burned (to 0x0) but never
 *    transferred between accounts — they're utility points, not tradable assets.
 *  - IDEMPOTENT: each claim carries a unique claimId; a repeated claimId reverts,
 *    so a retried claim can never double-mint.
 *  - UUPS upgradeable, Pausable (emergency shop-redeem kill switch), role-gated.
 *
 * Token ids: 0=Spirit, 1=Essence, 2=Matter, 3=Substance. Amounts use 18 decimals
 * (the off-chain ledger is Decimal(12,4); the backend scales by 1e18).
 *
 * Authorization model for burns (hardened):
 *  - {redeem} burns the CALLER's own balance — implicit self-authorization.
 *  - {redeemFor} burns a holder's balance on their behalf (gas-sponsored). It is no
 *    longer "trust the BURNER blindly": the holder must sign an EIP-712
 *    {RedeemAuthorization}, so a compromised settlement key cannot torch an arbitrary
 *    holder's balance without that holder's signature.
 *  - {burn} stays BURNER-gated and is reserved for VETTED CONTRACTS only (the
 *    ConstellationAMM), which only ever debit a balance inside a tx the holder
 *    themselves initiated. Never grant BURNER_ROLE to an EOA — use {redeemFor} for
 *    sponsored, holder-signed burns instead.
 *
 * Pause scope: {pause} freezes only the shop spend paths ({redeem}/{redeemFor}). It
 * deliberately does NOT block {claimMint}/{burn}, so the ConstellationAMM's
 * "you can always pull liquidity" {withdraw} (which settles by minting ESMS) keeps
 * working during a pause. Mint-surface incidents are stopped at the StarVault/AMM
 * granular pauses, not here.
 */
contract EsmsToken is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable
{
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant SPIRIT = 0;
    uint256 public constant ESSENCE = 1;
    uint256 public constant MATTER = 2;
    uint256 public constant SUBSTANCE = 3;

    /// @dev EIP-712 typehash for a holder-signed sponsored redeem.
    bytes32 public constant REDEEM_AUTH_TYPEHASH = keccak256(
        "RedeemAuthorization(address from,bytes32 orderId,uint256[] ids,uint256[] amounts,uint256 deadline)"
    );

    /// @notice Processed claim ids (idempotency guard).
    mapping(bytes32 => bool) public claimed;

    /// @notice Processed shop redeem orders (idempotency guard). Appended after
    /// `claimed` to keep the UUPS storage layout backwards-compatible.
    mapping(bytes32 => bool) public redeemedOrders;

    event ClaimExecuted(address indexed to, bytes32 indexed claimId, uint256[] ids, uint256[] amounts);
    event Redeemed(address indexed from, bytes32 indexed orderId, uint256[] ids, uint256[] amounts);

    error TransfersDisabled();
    error ClaimAlreadyProcessed(bytes32 claimId);
    error RedeemAlreadyProcessed(bytes32 orderId);
    error BadElementId(uint256 id);
    error RedeemAuthExpired();
    error RedeemBadSigner();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory uri_, address admin, address minter) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __EIP712_init("EsmsToken", "1");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    /**
     * @notice Mint ESMS for a settled off-chain claim. Idempotent on `claimId`.
     * @param to       recipient (the user's Privy embedded wallet)
     * @param claimId  unique id for this claim (off-chain debit key)
     * @param ids      token ids (0..3)
     * @param amounts  amounts (18-dp scaled)
     */
    function claimMint(
        address to,
        bytes32 claimId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        if (claimed[claimId]) revert ClaimAlreadyProcessed(claimId);
        claimed[claimId] = true;
        _requireValidIds(ids);
        _mintBatch(to, ids, amounts, "");
        emit ClaimExecuted(to, claimId, ids, amounts);
    }

    /**
     * @notice Burn ESMS from `from`. Reserved for VETTED CONTRACTS holding BURNER_ROLE
     * (the ConstellationAMM) that only debit a balance inside a holder-initiated call.
     * Soulbound is preserved: a burn sends to 0x0, which {_update} permits. NEVER grant
     * BURNER_ROLE to an EOA — use {redeemFor} (holder-signed) for sponsored burns.
     * @param from     the holder whose balance is debited
     * @param ids      token ids (0..3)
     * @param amounts  amounts (18-dp scaled)
     */
    function burn(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) {
        _requireValidIds(ids);
        _burnBatch(from, ids, amounts);
    }

    /**
     * @notice Spend ESMS in the token-economy shop: burn the caller's own balance
     * against a unique `orderId`. Self-authorized (from == msg.sender). Idempotent —
     * a repeat `orderId` reverts. Frozen while paused.
     */
    function redeem(
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external whenNotPaused {
        _redeem(msg.sender, orderId, ids, amounts);
    }

    /**
     * @notice Gas-sponsored variant of {redeem}: a BURNER (the shop settlement wallet)
     * burns `from`'s ESMS for a purchase the holder authorized. The holder's consent is
     * proven on-chain by an EIP-712 {RedeemAuthorization} signature — a compromised
     * settlement key alone cannot burn an arbitrary holder's balance. Same soulbound,
     * idempotency, and pause guarantees as {redeem}.
     * @param from     the holder whose balance is debited
     * @param orderId  unique purchase id (also the signed replay key)
     * @param ids      token ids (0..3)
     * @param amounts  amounts (18-dp scaled)
     * @param deadline signature expiry (unix seconds)
     * @param sig      `from`'s EIP-712 signature over the RedeemAuthorization
     */
    function redeemFor(
        address from,
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        uint256 deadline,
        bytes calldata sig
    ) external onlyRole(BURNER_ROLE) whenNotPaused {
        if (block.timestamp > deadline) revert RedeemAuthExpired();
        bytes32 digest = hashRedeemAuthorization(from, orderId, ids, amounts, deadline);
        if (ECDSA.recover(digest, sig) != from) revert RedeemBadSigner();
        _redeem(from, orderId, ids, amounts);
    }

    /// @notice EIP-712 digest a holder signs to authorize a sponsored {redeemFor}.
    function hashRedeemAuthorization(
        address from,
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        uint256 deadline
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REDEEM_AUTH_TYPEHASH,
                    from,
                    orderId,
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts)),
                    deadline
                )
            )
        );
    }

    /// @dev Shared redeem path: idempotency guard, id-range guard, burn, event.
    function _redeem(
        address from,
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) internal {
        if (redeemedOrders[orderId]) revert RedeemAlreadyProcessed(orderId);
        redeemedOrders[orderId] = true;
        _requireValidIds(ids);
        _burnBatch(from, ids, amounts);
        emit Redeemed(from, orderId, ids, amounts);
    }

    /// @dev Every token id must be a real element (0..3); rejects out-of-band ids.
    function _requireValidIds(uint256[] calldata ids) internal pure {
        for (uint256 i; i < ids.length; ++i) {
            if (ids[i] > SUBSTANCE) revert BadElementId(ids[i]);
        }
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /// @dev Soulbound: allow mint (from==0) and burn (to==0) only; block transfers.
    /// NOTE: intentionally NOT whenNotPaused — pause is scoped to {redeem}/{redeemFor}
    /// so the AMM's always-on {withdraw} (which settles by minting ESMS) is never frozen.
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        super._update(from, to, ids, values);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
