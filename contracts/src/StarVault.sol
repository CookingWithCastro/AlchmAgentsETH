// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IEsmsMint {
    function claimMint(address to, bytes32 claimId, uint256[] calldata ids, uint256[] calldata amounts)
        external;
}

/**
 * @title StarVault
 * @notice Stake USDC on individual stars; earn ESMS "elemental essence" while the
 * star is above your horizon. The on-chain pieces this contract owns:
 *
 *   1. CUSTODY — a shared USDC pool per star (by Hipparcos `hipId`, a uint32). Anyone
 *      may {stake} into a star and earn yield pro-rata by share; {unstake} returns
 *      principal at any time (no attestation — you can always leave a set star).
 *
 *   2. SETTLEMENT — yield is computed OFF-CHAIN (the multiplicative rate: zone
 *      elemental dominance x your natal-chart affinity x the transiting planet's
 *      dignity, integrated only over the seconds the star was visibly risen at your
 *      location). The chain cannot compute a horizon, so {claimYield} takes an EIP-712
 *      {StarYield} attestation signed by a trusted ATTESTOR_ROLE (the "Pentacles
 *      feeder") asserting how much of which element accrued. On a valid claim the
 *      vault mints ESMS to the staker. The attestation is single-use (per-staker
 *      nonce) and short-lived (deadline), mirroring {ConstellationAMM}'s visibility
 *      gate so a star that has since set cannot be claimed on a stale signature.
 *
 * Element ids match {EsmsToken}: 0=Spirit(Fire) 1=Essence(Water) 2=Matter(Earth)
 * 3=Substance(Air). ESMS amounts are 18-dp; USDC is 6-dp (Arc's gas token).
 *
 * The vault holds MINTER_ROLE on the ESMS token. ESMS stays soulbound — yield is
 * minted from 0x0, never transferred — so rewards are utility points, not a wrapper
 * around the staked USDC.
 */
contract StarVault is AccessControl, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    bytes32 public constant YIELD_TYPEHASH = keccak256(
        "StarYield(address staker,uint32 starId,uint8 element,uint256 amount,uint64 nonce,uint64 deadline)"
    );

    struct StarYield {
        address staker;
        uint32 starId;
        uint8 element; // 0=Spirit 1=Essence 2=Matter 3=Substance
        uint256 amount; // ESMS to mint (18-dp)
        uint64 nonce;
        uint64 deadline;
    }

    struct Pool {
        uint256 totalPrincipal; // USDC staked on this star (6-dp)
        uint256 totalShares;
    }

    IERC20 public immutable usdc; // Arc USDC (6 decimals)
    IEsmsMint public immutable esms; // ESMS token on Arc (vault holds MINTER_ROLE)

    mapping(uint32 => Pool) public pools; // starId => pool
    mapping(uint32 => mapping(address => uint256)) public sharesOf; // starId => staker => shares
    mapping(address => uint64) public usedNonce; // staker => next expected yield nonce
    uint256 private _claimNonce; // makes every ESMS claimId unique

    /// @dev Bootstrap price: 1 share == 1 micro-USDC (6-dp) for the first staker.
    uint256 private constant SHARE_BOOTSTRAP = 1;

    event Staked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event Unstaked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event YieldClaimed(uint32 indexed starId, address indexed staker, uint8 element, uint256 amount);

    error ZeroAmount();
    error InsufficientShares();
    error YieldStakerMismatch();
    error YieldExpired();
    error YieldBadNonce();
    error YieldBadSigner();
    error BadElement();

    constructor(address usdc_, address esms_, address admin) EIP712("StarVault", "1") {
        usdc = IERC20(usdc_);
        esms = IEsmsMint(esms_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ── Custody ───────────────────────────────────────────────────────────────

    /// Stake `usdcAmount` of USDC on star `starId`. Shares are minted pro-rata to the
    /// pool's current principal (1:1 for the first staker). Approve USDC first.
    function stake(uint32 starId, uint256 usdcAmount) external nonReentrant returns (uint256 shares) {
        if (usdcAmount == 0) revert ZeroAmount();
        Pool storage p = pools[starId];

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        if (p.totalShares == 0 || p.totalPrincipal == 0) {
            shares = usdcAmount * SHARE_BOOTSTRAP;
        } else {
            shares = (usdcAmount * p.totalShares) / p.totalPrincipal;
        }
        if (shares == 0) revert ZeroAmount();

        p.totalPrincipal += usdcAmount;
        p.totalShares += shares;
        sharesOf[starId][msg.sender] += shares;

        emit Staked(starId, msg.sender, usdcAmount, shares);
    }

    /// Burn `shares` on star `starId` and return the pro-rata USDC principal. No
    /// attestation: you can always exit, even after the star has set.
    function unstake(uint32 starId, uint256 shares) external nonReentrant returns (uint256 usdcAmount) {
        if (shares == 0) revert ZeroAmount();
        uint256 bal = sharesOf[starId][msg.sender];
        if (shares > bal) revert InsufficientShares();

        Pool storage p = pools[starId];
        usdcAmount = (shares * p.totalPrincipal) / p.totalShares;

        sharesOf[starId][msg.sender] = bal - shares;
        p.totalShares -= shares;
        p.totalPrincipal -= usdcAmount;

        usdc.safeTransfer(msg.sender, usdcAmount);
        emit Unstaked(starId, msg.sender, usdcAmount, shares);
    }

    // ── Yield settlement ────────────────────────────────────────────────────────

    /// Claim accrued ESMS yield for a star using an attestor-signed {StarYield}. The
    /// attestor is the off-chain engine that integrated the visible-while-risen rate;
    /// the chain only checks the signature, the staker, the deadline and the nonce.
    function claimYield(StarYield calldata y, bytes calldata sig) external nonReentrant {
        if (y.staker != msg.sender) revert YieldStakerMismatch();
        if (y.element > 3) revert BadElement();
        if (block.timestamp > y.deadline) revert YieldExpired();
        if (y.nonce != usedNonce[msg.sender]) revert YieldBadNonce();

        address signer = ECDSA.recover(hashYield(y), sig);
        if (!hasRole(ATTESTOR_ROLE, signer)) revert YieldBadSigner();
        usedNonce[msg.sender] = y.nonce + 1; // single-use: consume this nonce

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        ids[0] = y.element;
        amts[0] = y.amount;
        esms.claimMint(msg.sender, _nextClaimId(), ids, amts);

        emit YieldClaimed(y.starId, msg.sender, y.element, y.amount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function hashYield(StarYield calldata y) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(YIELD_TYPEHASH, y.staker, y.starId, y.element, y.amount, y.nonce, y.deadline)
            )
        );
    }

    /// Current USDC value (6-dp) of one share on `starId`. 1e6 (1 USDC) before any stake.
    function sharePrice(uint32 starId) external view returns (uint256) {
        Pool storage p = pools[starId];
        if (p.totalShares == 0) return 1e6 / SHARE_BOOTSTRAP;
        return (p.totalPrincipal * 1e6) / p.totalShares;
    }

    /// A staker's USDC-denominated principal on `starId` (6-dp).
    function principalOf(uint32 starId, address staker) external view returns (uint256) {
        Pool storage p = pools[starId];
        if (p.totalShares == 0) return 0;
        return (sharesOf[starId][staker] * p.totalPrincipal) / p.totalShares;
    }

    function _nextClaimId() internal returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, _claimNonce++));
    }
}
