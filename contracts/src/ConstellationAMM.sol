// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ConstellationDeed} from "./ConstellationDeed.sol";

interface IEsmsMintBurn {
    function claimMint(address to, bytes32 claimId, uint256[] calldata ids, uint256[] calldata amounts)
        external;
    function burn(address from, uint256[] calldata ids, uint256[] calldata amounts) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title ConstellationAMM
 * @notice A constant-product DEX whose pools are real constellations — and whose
 * pools only open while the constellation is above the trader's horizon.
 *
 * Each pool trades a pair of ESMS elements (0=Spirit,1=Essence,2=Matter,3=Substance).
 * Because ESMS is soulbound (it can never be transferred between accounts), the pool
 * holds no token custody: it keeps *virtual reserves* and settles at the edges by
 * burning the element a trader puts in and minting the element they take out. The AMM
 * therefore holds MINTER_ROLE and BURNER_ROLE on the ESMS token.
 *
 * Visibility gate: the chain cannot compute a horizon, so {seedLiquidity} and {swap}
 * require an EIP-712 VisibilityAttestation signed by a trusted attestor (the Pentacles
 * feeder, ATTESTOR_ROLE) that has confirmed the constellation is risen over the
 * trader's location *right now*. The attestation is single-use (per-trader-per-pool
 * nonce) and short-lived (deadline). {seedLiquidity}/{swap} are pausable (PAUSER_ROLE)
 * for incident response; {withdraw} needs no attestation and is never pausable — you
 * can always pull liquidity, even after your constellation has set.
 *
 * Liquidity-add safety: {seedLiquidity} takes a `minShares` slippage bound and enforces
 * that adds are on-ratio (within {RATIO_TOLERANCE_BPS}), so a later LP cannot be griefed
 * by a price-inflating donation and an off-ratio add cannot silently donate its excess.
 * Admin bootstraps each pool's baseline via {seedInitial} so no user is ever the first
 * depositor.
 *
 * The LP position is a transferable {ConstellationDeed} NFT — the showable artifact.
 */
contract ConstellationAMM is AccessControl, EIP712, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "VisibilityAttestation(address trader,uint16 constellationId,bytes32 regionCommit,uint8 visibleStars,uint64 nonce,uint64 deadline)"
    );

    struct VisibilityAttestation {
        address trader;
        uint16 constellationId;
        bytes32 regionCommit;
        uint8 visibleStars;
        uint64 nonce;
        uint64 deadline;
    }

    struct Pool {
        uint8 elemA;
        uint8 elemB;
        uint16 feeBps;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        bool exists;
    }

    IEsmsMintBurn public immutable esms;
    ConstellationDeed public immutable deed;

    mapping(uint16 => Pool) public pools;
    mapping(uint16 => mapping(address => uint64)) public usedNonce; // constId => trader => next nonce
    uint256 private _mintNonce; // makes every ESMS claimId unique

    uint256 private constant BPS = 10_000;
    uint256 private constant MINIMUM_LIQUIDITY = 1_000; // burned on first seed (no zero-div)
    uint256 private constant RATIO_TOLERANCE_BPS = 100; // adds must be within 1% of pool ratio

    event PoolRegistered(uint16 indexed constId, uint8 elemA, uint8 elemB, uint16 feeBps);
    event PoolSeeded(uint16 indexed constId, address indexed trader, uint256 amtA, uint256 amtB, uint256 shares, uint256 deedId);
    event Swapped(uint16 indexed constId, address indexed trader, uint8 inId, uint256 inAmt, uint8 outId, uint256 outAmt);
    event LiquidityWithdrawn(uint16 indexed constId, address indexed trader, uint256 deedId, uint256 amtA, uint256 amtB);

    error PoolExists();
    error NoSuchPool();
    error BadElements();
    error BadElementForPool();
    error AttestationTraderMismatch();
    error AttestationConstellationMismatch();
    error AttestationExpired();
    error AttestationBadNonce();
    error AttestationBadSigner();
    error InsufficientOutput();
    error NotDeedOwner();
    error BadShareBps();
    error InsufficientLiquidity();
    error SlippageTooHigh();
    error OffRatioDeposit();

    constructor(address esms_, address deed_, address admin) EIP712("ConstellationAMM", "1") {
        esms = IEsmsMintBurn(esms_);
        deed = ConstellationDeed(deed_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ── Admin: pool registry + pause ──────────────────────────────────────────

    /// Register a constellation pool. `elemA`/`elemB` are the frozen ESMS pair the
    /// generator baked for this constellation; `feeBps` its fee tier.
    function registerPool(uint16 constId, uint8 elemA, uint8 elemB, uint16 feeBps)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (pools[constId].exists) revert PoolExists();
        if (elemA == elemB || elemA > 3 || elemB > 3) revert BadElements();
        pools[constId] = Pool({
            elemA: elemA,
            elemB: elemB,
            feeBps: feeBps,
            reserveA: 0,
            reserveB: 0,
            totalShares: 0,
            exists: true
        });
        emit PoolRegistered(constId, elemA, elemB, feeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Liquidity ───────────────────────────────────────────────────────────

    /// Seed/add liquidity to a constellation pool while it is risen. Burns `amtA` of
    /// elemA and `amtB` of elemB from the caller; mints them a {ConstellationDeed}.
    /// Reverts if minted shares < `minShares` (slippage) or the add is off-ratio.
    function seedLiquidity(
        uint16 constId,
        uint256 amtA,
        uint256 amtB,
        uint256 minShares,
        VisibilityAttestation calldata att,
        bytes calldata sig
    ) external nonReentrant whenNotPaused returns (uint256 deedId) {
        Pool storage p = pools[constId];
        if (!p.exists) revert NoSuchPool();
        _verify(constId, att, sig);
        // A user must burn real ESMS to add liquidity — otherwise seeding phantom reserves
        // and withdrawing would mint ESMS from nothing.
        _burnPair(msg.sender, p.elemA, amtA, p.elemB, amtB);
        deedId = _addReserves(msg.sender, p, constId, amtA, amtB, minShares);
    }

    /// Admin bootstrap: seed a pool's baseline (no attestation) so no user is ever the
    /// first depositor. Creates VIRTUAL reserves with NO ESMS burned — consistent with the
    /// AMM minting/burning at the edges; admin-subsidized liquidity the admin holds the
    /// Deed for. Admin-only and trusted by construction.
    function seedInitial(uint16 constId, uint256 amtA, uint256 amtB, uint256 minShares)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
        returns (uint256 deedId)
    {
        Pool storage p = pools[constId];
        if (!p.exists) revert NoSuchPool();
        deedId = _addReserves(msg.sender, p, constId, amtA, amtB, minShares);
    }

    function _addReserves(address who, Pool storage p, uint16 constId, uint256 amtA, uint256 amtB, uint256 minShares)
        internal
        returns (uint256 deedId)
    {
        uint256 shares;
        if (p.totalShares == 0) {
            shares = _sqrt(amtA * amtB);
            if (shares <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            shares -= MINIMUM_LIQUIDITY; // first-seed dust, never minted to anyone
            p.totalShares += MINIMUM_LIQUIDITY;
        } else {
            uint256 sA = (amtA * p.totalShares) / p.reserveA;
            uint256 sB = (amtB * p.totalShares) / p.reserveB;
            uint256 lo = sA < sB ? sA : sB;
            uint256 hi = sA < sB ? sB : sA;
            if (lo == 0) revert InsufficientLiquidity();
            // On-ratio guard: the over-supplied side may not exceed the other by >tolerance,
            // so an off-ratio add can't silently donate its excess to existing LPs.
            if ((hi - lo) * BPS > lo * RATIO_TOLERANCE_BPS) revert OffRatioDeposit();
            shares = lo;
        }
        if (shares < minShares) revert SlippageTooHigh();

        p.reserveA += amtA;
        p.reserveB += amtB;
        p.totalShares += shares;

        deedId = deed.mint(who, constId, shares);
        emit PoolSeeded(constId, who, amtA, amtB, shares, deedId);
    }

    /// Withdraw `shareBps` (1..10000) of a Deed's position, minting the underlying
    /// ESMS back to the caller. No attestation, never pausable — liquidity can always leave.
    function withdraw(uint256 deedId, uint256 shareBps) external nonReentrant {
        if (shareBps == 0 || shareBps > BPS) revert BadShareBps();
        if (deed.ownerOf(deedId) != msg.sender) revert NotDeedOwner();
        (uint16 constId, uint256 shares,) = deed.positionOf(deedId);

        Pool storage p = pools[constId];
        uint256 pull = (shares * shareBps) / BPS;
        if (pull == 0) revert BadShareBps();

        uint256 amtA = (p.reserveA * pull) / p.totalShares;
        uint256 amtB = (p.reserveB * pull) / p.totalShares;

        p.reserveA -= amtA;
        p.reserveB -= amtB;
        p.totalShares -= pull;

        if (pull == shares) {
            deed.burn(deedId);
        } else {
            deed.setShares(deedId, shares - pull);
        }

        _mintPair(msg.sender, p.elemA, amtA, p.elemB, amtB);
        emit LiquidityWithdrawn(constId, msg.sender, deedId, amtA, amtB);
    }

    // ── Swap ────────────────────────────────────────────────────────────────

    /// Swap `inAmt` of `inId` for the pool's other element, while the pool is risen.
    function swap(
        uint16 constId,
        uint8 inId,
        uint256 inAmt,
        uint256 minOut,
        VisibilityAttestation calldata att,
        bytes calldata sig
    ) external nonReentrant whenNotPaused returns (uint256 outAmt) {
        Pool storage p = pools[constId];
        if (!p.exists) revert NoSuchPool();
        if (inId != p.elemA && inId != p.elemB) revert BadElementForPool();
        _verify(constId, att, sig);

        bool inIsA = inId == p.elemA;
        uint256 reserveIn = inIsA ? p.reserveA : p.reserveB;
        uint256 reserveOut = inIsA ? p.reserveB : p.reserveA;
        uint8 outId = inIsA ? p.elemB : p.elemA;

        uint256 inWithFee = (inAmt * (BPS - p.feeBps)) / BPS;
        outAmt = (reserveOut * inWithFee) / (reserveIn + inWithFee);
        if (outAmt < minOut || outAmt == 0 || outAmt >= reserveOut) revert InsufficientOutput();

        // Effects: the full input (incl. fee) stays as reserve; output leaves.
        if (inIsA) {
            p.reserveA += inAmt;
            p.reserveB -= outAmt;
        } else {
            p.reserveB += inAmt;
            p.reserveA -= outAmt;
        }

        _burnOne(msg.sender, inId, inAmt);
        _mintOne(msg.sender, outId, outAmt);
        emit Swapped(constId, msg.sender, inId, inAmt, outId, outAmt);
    }

    // ── Views ───────────────────────────────────────────────────────────────

    function getReserves(uint16 constId) external view returns (uint256 rA, uint256 rB) {
        Pool storage p = pools[constId];
        return (p.reserveA, p.reserveB);
    }

    function quote(uint16 constId, uint8 inId, uint256 inAmt) external view returns (uint256 outAmt) {
        Pool storage p = pools[constId];
        if (!p.exists || (inId != p.elemA && inId != p.elemB)) return 0;
        bool inIsA = inId == p.elemA;
        uint256 reserveIn = inIsA ? p.reserveA : p.reserveB;
        uint256 reserveOut = inIsA ? p.reserveB : p.reserveA;
        if (reserveIn == 0 || reserveOut == 0) return 0;
        uint256 inWithFee = (inAmt * (BPS - p.feeBps)) / BPS;
        outAmt = (reserveOut * inWithFee) / (reserveIn + inWithFee);
    }

    // ── Attestation verification ────────────────────────────────────────────

    function hashAttestation(VisibilityAttestation calldata att) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    att.trader,
                    att.constellationId,
                    att.regionCommit,
                    att.visibleStars,
                    att.nonce,
                    att.deadline
                )
            )
        );
    }

    function _verify(uint16 constId, VisibilityAttestation calldata att, bytes calldata sig) internal {
        if (att.trader != msg.sender) revert AttestationTraderMismatch();
        if (att.constellationId != constId) revert AttestationConstellationMismatch();
        if (block.timestamp > att.deadline) revert AttestationExpired();
        if (att.nonce != usedNonce[constId][msg.sender]) revert AttestationBadNonce();
        address signer = ECDSA.recover(hashAttestation(att), sig);
        if (!hasRole(ATTESTOR_ROLE, signer)) revert AttestationBadSigner();
        usedNonce[constId][msg.sender] = att.nonce + 1; // single-use: consume this nonce
    }

    // ── ESMS mint/burn helpers ──────────────────────────────────────────────

    function _nextClaimId() internal returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, _mintNonce++));
    }

    function _burnOne(address from, uint8 id, uint256 amt) internal {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        ids[0] = id;
        amts[0] = amt;
        esms.burn(from, ids, amts);
    }

    function _mintOne(address to, uint8 id, uint256 amt) internal {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        ids[0] = id;
        amts[0] = amt;
        esms.claimMint(to, _nextClaimId(), ids, amts);
    }

    function _burnPair(address from, uint8 idA, uint256 amtA, uint8 idB, uint256 amtB) internal {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amts = new uint256[](2);
        ids[0] = idA;
        ids[1] = idB;
        amts[0] = amtA;
        amts[1] = amtB;
        esms.burn(from, ids, amts);
    }

    function _mintPair(address to, uint8 idA, uint256 amtA, uint8 idB, uint256 amtB) internal {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amts = new uint256[](2);
        ids[0] = idA;
        ids[1] = idB;
        amts[0] = amtA;
        amts[1] = amtB;
        esms.claimMint(to, _nextClaimId(), ids, amts);
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
