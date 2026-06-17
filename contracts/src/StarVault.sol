// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
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
 *   1. REGISTRY — stake() is gated to verified Hipparcos stars. The full ~118k-star
 *      catalog is committed as a single Merkle root ({starRoot}); the first staker of a
 *      star "awakens" it via permissionless {activateStar} with an in-browser proof
 *      (emitting {StarActivated} — the Star-Agent lazy-registration signal), after which
 *      every later stake on that star pays only one SLOAD. Admin can pre-activate the
 *      curated bright stars directly via {adminActivateStars} (no proof needed).
 *
 *   2. CUSTODY — a shared USDC pool per star (by Hipparcos `hipId`, a uint32). {stake}
 *      mints shares pro-rata; {unstake} returns principal at any time (no attestation,
 *      not pausable — you can always leave a set star).
 *
 *   3. SETTLEMENT — yield is computed OFF-CHAIN (the multiplicative rate: zone elemental
 *      dominance x your natal-chart affinity x the transiting planet's dignity, integrated
 *      only over the seconds the star was visibly risen). The chain cannot compute a
 *      horizon, so {claimYield} takes an EIP-712 {StarYield} attestation signed by a
 *      trusted ATTESTOR_ROLE. The attestor chooses the exact amount, but the chain BOUNDS
 *      it: a claim can never mint more than {_yieldCap} = principal x maxRate x elapsed,
 *      so a compromised attestor key is a bounded over-minter, not an unbounded one. The
 *      attestation is single-use (per-staker-per-star nonce), short-lived (deadline), and
 *      the mint surface is pausable (PAUSER_ROLE) for incident response.
 *
 * Element ids match {EsmsToken}: 0=Spirit(Fire) 1=Essence(Water) 2=Matter(Earth)
 * 3=Substance(Air). ESMS amounts are 18-dp; USDC is 6-dp (Arc's gas token).
 *
 * The vault holds MINTER_ROLE on the ESMS token. ESMS stays soulbound — yield is minted
 * from 0x0, never transferred — so rewards are utility points, not a USDC wrapper.
 */
contract StarVault is AccessControl, EIP712, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

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
    mapping(uint32 => mapping(address => uint64)) public usedNonce; // starId => staker => next yield nonce
    mapping(uint32 => mapping(address => uint64)) public lastClaimAt; // starId => staker => accrual window start
    uint256 private _claimNonce; // makes every ESMS claimId unique

    /// @notice Merkle root committing the set of stakeable Hipparcos star ids.
    bytes32 public starRoot;
    /// @notice Stars that have been activated (admin-seeded or community-proven).
    mapping(uint32 => bool) public starActivated;

    /// @notice Max ESMS (18-dp) mintable per 1 whole USDC (1e6) of principal per day.
    /// Caps {claimYield}; the attestor sets the exact amount within this envelope.
    uint256 public maxYieldRatePerUsdcPerDay;

    /// @dev Bootstrap price: 1 share == 1 micro-USDC (6-dp) for the first staker.
    uint256 private constant SHARE_BOOTSTRAP = 1;
    uint256 private constant DAY = 1 days;

    event Staked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event Unstaked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event YieldClaimed(uint32 indexed starId, address indexed staker, uint8 element, uint256 amount);
    event StarActivated(uint32 indexed starId, address indexed awakener);
    event StarRootUpdated(bytes32 root);
    event MaxYieldRateUpdated(uint256 ratePerUsdcPerDay);

    error ZeroAmount();
    error InsufficientShares();
    error YieldStakerMismatch();
    error YieldExpired();
    error YieldBadNonce();
    error YieldBadSigner();
    error YieldExceedsCap();
    error BadElement();
    error StarNotActivated();
    error BadStarProof();

    constructor(address usdc_, address esms_, address admin, uint256 maxYieldRatePerUsdcPerDay_)
        EIP712("StarVault", "1")
    {
        usdc = IERC20(usdc_);
        esms = IEsmsMint(esms_);
        maxYieldRatePerUsdcPerDay = maxYieldRatePerUsdcPerDay_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        emit MaxYieldRateUpdated(maxYieldRatePerUsdcPerDay_);
    }

    // ── Registry ────────────────────────────────────────────────────────────────

    /// Commit/replace the stakeable-star Merkle root as the live catalogue grows.
    function setStarRoot(bytes32 root) external onlyRole(ADMIN_ROLE) {
        starRoot = root;
        emit StarRootUpdated(root);
    }

    /// Directly activate curated stars (the bright-star catalogue) without a proof.
    function adminActivateStars(uint32[] calldata starIds) external onlyRole(ADMIN_ROLE) {
        for (uint256 i; i < starIds.length; ++i) {
            if (!starActivated[starIds[i]]) {
                starActivated[starIds[i]] = true;
                emit StarActivated(starIds[i], msg.sender);
            }
        }
    }

    /// Permissionlessly awaken a star by proving its id is in {starRoot}. Idempotent.
    /// Leaf format (OpenZeppelin StandardMerkleTree, type ["uint32"]):
    /// keccak256(bytes.concat(keccak256(abi.encode(starId)))).
    function activateStar(uint32 starId, bytes32[] calldata proof) external {
        if (starActivated[starId]) return; // already awake — no-op
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(starId))));
        if (!MerkleProof.verifyCalldata(proof, starRoot, leaf)) revert BadStarProof();
        starActivated[starId] = true;
        emit StarActivated(starId, msg.sender);
    }

    // ── Custody ───────────────────────────────────────────────────────────────

    /// Stake `usdcAmount` of USDC on an activated star `starId`. Shares are minted
    /// pro-rata to the pool's current principal (1:1 for the first staker). Approve first.
    function stake(uint32 starId, uint256 usdcAmount) external nonReentrant returns (uint256 shares) {
        if (usdcAmount == 0) revert ZeroAmount();
        if (!starActivated[starId]) revert StarNotActivated();
        Pool storage p = pools[starId];

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        if (p.totalShares == 0 || p.totalPrincipal == 0) {
            shares = usdcAmount * SHARE_BOOTSTRAP;
        } else {
            shares = (usdcAmount * p.totalShares) / p.totalPrincipal;
        }
        if (shares == 0) revert ZeroAmount();

        // Open the yield-accrual window on a staker's first entry into this star.
        if (sharesOf[starId][msg.sender] == 0) {
            lastClaimAt[starId][msg.sender] = uint64(block.timestamp);
        }

        p.totalPrincipal += usdcAmount;
        p.totalShares += shares;
        sharesOf[starId][msg.sender] += shares;

        emit Staked(starId, msg.sender, usdcAmount, shares);
    }

    /// Burn `shares` on star `starId` and return the pro-rata USDC principal. No
    /// attestation and not pausable: you can always exit, even after the star has set.
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
    /// attestor integrated the visible-while-risen rate off-chain; the chain checks the
    /// signature, staker, deadline, per-star nonce, and the on-chain {_yieldCap} bound.
    function claimYield(StarYield calldata y, bytes calldata sig) external nonReentrant whenNotPaused {
        if (y.staker != msg.sender) revert YieldStakerMismatch();
        if (y.element > 3) revert BadElement();
        if (y.amount == 0) revert ZeroAmount();
        if (block.timestamp > y.deadline) revert YieldExpired();
        if (y.nonce != usedNonce[y.starId][msg.sender]) revert YieldBadNonce();

        address signer = ECDSA.recover(hashYield(y), sig);
        if (!hasRole(ATTESTOR_ROLE, signer)) revert YieldBadSigner();
        if (y.amount > _yieldCap(y.starId, msg.sender)) revert YieldExceedsCap();

        usedNonce[y.starId][msg.sender] = y.nonce + 1; // single-use: consume this nonce
        lastClaimAt[y.starId][msg.sender] = uint64(block.timestamp); // reset accrual window

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        ids[0] = y.element;
        amts[0] = y.amount;
        esms.claimMint(msg.sender, _nextClaimId(), ids, amts);

        emit YieldClaimed(y.starId, msg.sender, y.element, y.amount);
    }

    /// Max ESMS claimable right now for `staker` on `starId`: principal x rate x elapsed.
    /// Zero if they hold no principal or have never staked this star.
    function yieldCap(uint32 starId, address staker) external view returns (uint256) {
        return _yieldCap(starId, staker);
    }

    function _yieldCap(uint32 starId, address staker) internal view returns (uint256) {
        uint64 last = lastClaimAt[starId][staker];
        if (last == 0) return 0;
        uint256 principal = principalOf(starId, staker); // 6-dp USDC
        if (principal == 0) return 0;
        uint256 elapsed = block.timestamp - last; // seconds
        // principal(6-dp) x rate(18-dp ESMS / USDC / day) x elapsed(s) / (1e6 USDC-scale x DAY)
        return (principal * maxYieldRatePerUsdcPerDay * elapsed) / (1e6 * DAY);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setMaxYieldRate(uint256 ratePerUsdcPerDay) external onlyRole(ADMIN_ROLE) {
        maxYieldRatePerUsdcPerDay = ratePerUsdcPerDay;
        emit MaxYieldRateUpdated(ratePerUsdcPerDay);
    }

    /// Freeze the yield-mint surface during an incident. {stake}/{unstake} stay live.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
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
    function principalOf(uint32 starId, address staker) public view returns (uint256) {
        Pool storage p = pools[starId];
        if (p.totalShares == 0) return 0;
        return (sharesOf[starId][staker] * p.totalPrincipal) / p.totalShares;
    }

    function _nextClaimId() internal returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, _claimNonce++));
    }
}
