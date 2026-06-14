// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

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
 *  - UUPS upgradeable, Pausable (emergency kill switch), role-gated.
 *
 * Token ids: 0=Spirit, 1=Essence, 2=Matter, 3=Substance. Amounts use 18 decimals
 * (the off-chain ledger is Decimal(12,4); the backend scales by 1e18).
 */
contract EsmsToken is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant SPIRIT = 0;
    uint256 public constant ESSENCE = 1;
    uint256 public constant MATTER = 2;
    uint256 public constant SUBSTANCE = 3;

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory uri_, address admin, address minter) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
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
        _mintBatch(to, ids, amounts, "");
        emit ClaimExecuted(to, claimId, ids, amounts);
    }

    /**
     * @notice Burn ESMS from `from`. Used by sanctioned sinks (the Constellation
     * AMM) when a holder provides liquidity to or swaps into a pool. Soulbound is
     * preserved: a burn sends to 0x0, which {_update} already permits — players
     * still cannot transfer to one another, only a BURNER (a vetted pool) may
     * debit a balance, and only inside a call the holder themselves initiated.
     * @param from     the holder whose balance is debited
     * @param ids      token ids (0..3)
     * @param amounts  amounts (18-dp scaled)
     */
    function burn(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) {
        _burnBatch(from, ids, amounts);
    }

    /**
     * @notice Spend ESMS in the token-economy shop: burn the caller's own
     * balance against a unique `orderId`. Soulbound is preserved (the burn goes
     * to 0x0; no account-to-account transfer). Idempotent — a repeat `orderId`
     * reverts, so a retried purchase never double-burns. The backend watches the
     * {Redeemed} event (or reads {redeemedOrders}) to settle off-chain fulfillment.
     * @param orderId unique purchase id (off-chain shop order key)
     * @param ids     token ids (0..3)
     * @param amounts amounts (18-dp scaled)
     */
    function redeem(
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        _redeem(msg.sender, orderId, ids, amounts);
    }

    /**
     * @notice Backend-sponsored variant of {redeem}: a vetted BURNER (the shop
     * settlement wallet) burns `from`'s ESMS for a purchase the holder authorized
     * off-chain, paying the gas so the user needs no native balance. Same
     * soulbound and idempotency guarantees as {redeem}.
     */
    function redeemFor(
        address from,
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) {
        _redeem(from, orderId, ids, amounts);
    }

    /// @dev Shared redeem path: idempotency guard, burn, event.
    function _redeem(
        address from,
        bytes32 orderId,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) internal {
        if (redeemedOrders[orderId]) revert RedeemAlreadyProcessed(orderId);
        redeemedOrders[orderId] = true;
        _burnBatch(from, ids, amounts);
        emit Redeemed(from, orderId, ids, amounts);
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

    /// @dev Soulbound + pausable: allow mint (from==0) and burn (to==0) only; block transfers.
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
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
