// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {StarVault} from "../src/StarVault.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// Minimal 6-decimal USDC stand-in for Arc's gas token.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract StarVaultTest is Test {
    MockUSDC usdc;
    EsmsToken esms;
    StarVault vault;

    uint256 attestorPk = uint256(keccak256("attestor"));
    address attestor;
    address admin = address(0xA11CE);
    address esmsMinter = address(0xB0B);
    address alice = address(0xA11);
    address bob = address(0xB0B0);

    uint32 constant SIRIUS = 32349;
    uint32 constant VEGA = 91262;
    uint8 constant SPIRIT = 0;
    uint8 constant ESSENCE = 1;
    uint8 constant MATTER = 2;
    uint8 constant SUBSTANCE = 3;

    uint256 constant USDC1 = 1e6; // 1 USDC (6-dp)
    // Generous default so the yield cap never binds in functional tests; cap binding is
    // exercised separately in the cap tests via setMaxYieldRate.
    uint256 constant MAX_RATE = 1e18;

    event Staked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event Unstaked(uint32 indexed starId, address indexed staker, uint256 usdcAmount, uint256 shares);
    event YieldClaimed(uint32 indexed starId, address indexed staker, uint8 element, uint256 amount);
    event StarActivated(uint32 indexed starId, address indexed awakener);

    function setUp() public {
        attestor = vm.addr(attestorPk);
        vm.warp(1_000_000); // sane non-zero clock for deadlines

        usdc = new MockUSDC();

        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, ("uri/{id}", admin, esmsMinter));
        esms = EsmsToken(address(new ERC1967Proxy(address(impl), init)));

        vault = new StarVault(address(usdc), address(esms), admin, MAX_RATE);

        vm.startPrank(admin);
        esms.grantRole(esms.MINTER_ROLE(), address(vault)); // vault mints yield
        vault.grantRole(vault.ATTESTOR_ROLE(), attestor); // feeder may sign claims
        uint32[] memory bright = new uint32[](2);
        bright[0] = SIRIUS;
        bright[1] = VEGA;
        vault.adminActivateStars(bright); // pre-activate the test stars
        vm.stopPrank();

        usdc.mint(alice, 1_000 * USDC1);
        usdc.mint(bob, 1_000 * USDC1);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _stake(address who, uint32 starId, uint256 amt) internal returns (uint256 shares) {
        vm.startPrank(who);
        usdc.approve(address(vault), amt);
        shares = vault.stake(starId, amt);
        vm.stopPrank();
    }

    function _yield(
        address staker,
        uint32 starId,
        uint8 element,
        uint256 amount,
        uint64 nonce,
        uint64 deadline
    ) internal pure returns (StarVault.StarYield memory y) {
        y = StarVault.StarYield({
            staker: staker,
            starId: starId,
            element: element,
            amount: amount,
            nonce: nonce,
            deadline: deadline
        });
    }

    function _signYield(uint256 pk, StarVault.StarYield memory y) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, vault.hashYield(y));
        return abi.encodePacked(r, s, v);
    }

    /// Warp a day so the cap has accrued, then claim with the star's current nonce.
    function _claim(address who, uint256 pk, uint32 starId, uint8 element, uint256 amount) internal {
        vm.warp(block.timestamp + 1 days);
        StarVault.StarYield memory y =
            _yield(who, starId, element, amount, vault.usedNonce(starId, who), uint64(block.timestamp + 600));
        bytes memory sig = _signYield(pk, y);
        vm.prank(who);
        vault.claimYield(y, sig);
    }

    function _leaf(uint32 starId) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(starId))));
    }

    function _commutative(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    // ── registry: activation gate ───────────────────────────────────────────────

    function test_Stake_UnactivatedStarReverts() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 10 * USDC1);
        vm.expectRevert(StarVault.StarNotActivated.selector);
        vault.stake(40000, 10 * USDC1); // never activated
        vm.stopPrank();
    }

    function test_AdminActivate_EmitsAndEnablesStake() public {
        uint32 NEWSTAR = 55555;
        assertFalse(vault.starActivated(NEWSTAR));
        uint32[] memory ids = new uint32[](1);
        ids[0] = NEWSTAR;
        vm.expectEmit(true, true, false, false);
        emit StarActivated(NEWSTAR, admin);
        vm.prank(admin);
        vault.adminActivateStars(ids);
        assertTrue(vault.starActivated(NEWSTAR));
        _stake(alice, NEWSTAR, 10 * USDC1); // now stakeable
        assertEq(vault.principalOf(NEWSTAR, alice), 10 * USDC1);
    }

    function test_AdminActivate_OnlyAdmin() public {
        uint32[] memory ids = new uint32[](1);
        ids[0] = 12345;
        vm.prank(alice);
        vm.expectRevert();
        vault.adminActivateStars(ids);
    }

    function test_ActivateStar_MerkleProof() public {
        uint32 A = 11111;
        uint32 B = 22222;
        bytes32 leafA = _leaf(A);
        bytes32 leafB = _leaf(B);
        bytes32 root = _commutative(leafA, leafB);

        vm.prank(admin);
        vault.setStarRoot(root);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafB; // sibling proves A
        vm.expectEmit(true, true, false, false);
        emit StarActivated(A, address(this));
        vault.activateStar(A, proof);
        assertTrue(vault.starActivated(A));

        _stake(alice, A, 5 * USDC1);
        assertEq(vault.principalOf(A, alice), 5 * USDC1);
    }

    function test_ActivateStar_BadProofReverts() public {
        bytes32 root = _commutative(_leaf(11111), _leaf(22222));
        vm.prank(admin);
        vault.setStarRoot(root);

        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = _leaf(99999); // wrong sibling
        vm.expectRevert(StarVault.BadStarProof.selector);
        vault.activateStar(11111, badProof);
    }

    function test_SetStarRoot_OnlyAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setStarRoot(bytes32(uint256(1)));
    }

    // ── custody: stake ─────────────────────────────────────────────────────────

    function test_Stake_FirstStaker_MintsSharesAndPullsUsdc() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 100 * USDC1); // approve outside the expectEmit window
        vm.expectEmit(true, true, false, true);
        emit Staked(SIRIUS, alice, 100 * USDC1, 100 * USDC1);
        uint256 shares = vault.stake(SIRIUS, 100 * USDC1);
        vm.stopPrank();

        assertEq(shares, 100 * USDC1, "first staker is 1:1");
        assertEq(usdc.balanceOf(address(vault)), 100 * USDC1, "vault custodies USDC");
        assertEq(vault.sharesOf(SIRIUS, alice), 100 * USDC1);
        assertEq(vault.principalOf(SIRIUS, alice), 100 * USDC1);
        (uint256 totalPrincipal, uint256 totalShares) = vault.pools(SIRIUS);
        assertEq(totalPrincipal, 100 * USDC1);
        assertEq(totalShares, 100 * USDC1);
    }

    function test_Stake_SecondStaker_ProRataShares() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        uint256 bobShares = _stake(bob, SIRIUS, 300 * USDC1);

        assertEq(bobShares, 300 * USDC1, "shares pro-rata to principal");
        assertEq(vault.principalOf(SIRIUS, alice), 100 * USDC1);
        assertEq(vault.principalOf(SIRIUS, bob), 300 * USDC1);
        (uint256 totalPrincipal, uint256 totalShares) = vault.pools(SIRIUS);
        assertEq(totalPrincipal, 400 * USDC1);
        assertEq(totalShares, 400 * USDC1);
    }

    function test_Stake_SeparatePoolsPerStar() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _stake(alice, VEGA, 50 * USDC1);
        assertEq(vault.principalOf(SIRIUS, alice), 100 * USDC1);
        assertEq(vault.principalOf(VEGA, alice), 50 * USDC1);
    }

    function test_Stake_ZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(StarVault.ZeroAmount.selector);
        vault.stake(SIRIUS, 0);
    }

    function test_Stake_WithoutApprovalReverts() public {
        vm.prank(alice);
        vm.expectRevert(); // ERC20 insufficient allowance
        vault.stake(SIRIUS, 10 * USDC1);
    }

    function test_SharePrice_BeforeAndAfter() public {
        assertEq(vault.sharePrice(SIRIUS), 1e6, "1 USDC/share before any stake");
        _stake(alice, SIRIUS, 100 * USDC1);
        assertEq(vault.sharePrice(SIRIUS), 1e6, "still 1:1 after a plain stake");
    }

    // ── custody: unstake ───────────────────────────────────────────────────────

    function test_Unstake_ReturnsPrincipalNoAttestation() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        uint256 balBefore = usdc.balanceOf(alice);

        vm.expectEmit(true, true, false, true);
        emit Unstaked(SIRIUS, alice, 100 * USDC1, 100 * USDC1);
        vm.prank(alice);
        uint256 out = vault.unstake(SIRIUS, 100 * USDC1);

        assertEq(out, 100 * USDC1);
        assertEq(usdc.balanceOf(alice), balBefore + 100 * USDC1, "principal returned");
        assertEq(vault.sharesOf(SIRIUS, alice), 0);
        (uint256 totalPrincipal, uint256 totalShares) = vault.pools(SIRIUS);
        assertEq(totalPrincipal, 0);
        assertEq(totalShares, 0);
    }

    function test_Unstake_Partial() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.prank(alice);
        uint256 out = vault.unstake(SIRIUS, 40 * USDC1);
        assertEq(out, 40 * USDC1);
        assertEq(vault.principalOf(SIRIUS, alice), 60 * USDC1);
    }

    function test_Unstake_MoreThanBalanceReverts() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.prank(alice);
        vm.expectRevert(StarVault.InsufficientShares.selector);
        vault.unstake(SIRIUS, 100 * USDC1 + 1);
    }

    function test_Unstake_ZeroReverts() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.prank(alice);
        vm.expectRevert(StarVault.ZeroAmount.selector);
        vault.unstake(SIRIUS, 0);
    }

    function test_StakeUnstake_TwoStakers_NoCrossLoss() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _stake(bob, SIRIUS, 300 * USDC1);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore = usdc.balanceOf(bob);
        uint256 aShares = vault.sharesOf(SIRIUS, alice); // read before pranking
        uint256 bShares = vault.sharesOf(SIRIUS, bob);

        vm.prank(alice);
        vault.unstake(SIRIUS, aShares);
        vm.prank(bob);
        vault.unstake(SIRIUS, bShares);

        assertEq(usdc.balanceOf(alice), aliceBefore + 100 * USDC1);
        assertEq(usdc.balanceOf(bob), bobBefore + 300 * USDC1);
        assertEq(usdc.balanceOf(address(vault)), 0, "vault fully drained");
    }

    // ── yield: claim via attestation ───────────────────────────────────────────

    function test_ClaimYield_MintsEsms() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        uint256 amount = 5e18;

        vm.warp(block.timestamp + 1 days);
        StarVault.StarYield memory y =
            _yield(alice, SIRIUS, SPIRIT, amount, vault.usedNonce(SIRIUS, alice), uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.expectEmit(true, true, false, true);
        emit YieldClaimed(SIRIUS, alice, SPIRIT, amount);
        vm.prank(alice);
        vault.claimYield(y, sig);

        assertEq(esms.balanceOf(alice, SPIRIT), amount, "ESMS minted to staker");
        assertEq(vault.usedNonce(SIRIUS, alice), 1, "nonce consumed");
    }

    function test_ClaimYield_EachElement() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _stake(alice, VEGA, 100 * USDC1);
        _claim(alice, attestorPk, SIRIUS, SPIRIT, 1e18);
        _claim(alice, attestorPk, VEGA, ESSENCE, 2e18);
        _claim(alice, attestorPk, SIRIUS, MATTER, 3e18);
        _claim(alice, attestorPk, VEGA, SUBSTANCE, 4e18);
        assertEq(esms.balanceOf(alice, SPIRIT), 1e18);
        assertEq(esms.balanceOf(alice, ESSENCE), 2e18);
        assertEq(esms.balanceOf(alice, MATTER), 3e18);
        assertEq(esms.balanceOf(alice, SUBSTANCE), 4e18);
    }

    function test_ClaimYield_BadSignerReverts() public {
        uint256 fakePk = uint256(keccak256("not-the-attestor"));
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(fakePk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldBadSigner.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_RevokedAttestorReverts() public {
        bytes32 role = vault.ATTESTOR_ROLE(); // read before pranking
        vm.prank(admin);
        vault.revokeRole(role, attestor);
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldBadSigner.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_ExpiredReverts() public {
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 60));
        bytes memory sig = _signYield(attestorPk, y);
        vm.warp(block.timestamp + 61); // star has since set
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldExpired.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_BadNonceReverts() public {
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 1e18, 7, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldBadNonce.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_ReplayReverts() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _claim(alice, attestorPk, SIRIUS, SPIRIT, 1e18); // consumes nonce 0
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldBadNonce.selector); // nonce 0 already used
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_StakerMismatchReverts() public {
        StarVault.StarYield memory y = _yield(bob, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice); // alice submits an attestation bound to bob
        vm.expectRevert(StarVault.YieldStakerMismatch.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_BadElementReverts() public {
        StarVault.StarYield memory y = _yield(alice, SIRIUS, 4, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.BadElement.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_ZeroAmountReverts() public {
        StarVault.StarYield memory y = _yield(alice, SIRIUS, SPIRIT, 0, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.ZeroAmount.selector);
        vault.claimYield(y, sig);
    }

    function test_ClaimYield_EsmsStaysSoulbound() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _claim(alice, attestorPk, SIRIUS, SPIRIT, 1e18);
        vm.prank(alice);
        vm.expectRevert(EsmsToken.TransfersDisabled.selector);
        esms.safeTransferFrom(alice, bob, SPIRIT, 1e18, "");
    }

    // ── yield: the on-chain cap (Q1) ─────────────────────────────────────────────

    function test_YieldCap_ClaimAtCapSucceeds() public {
        vm.prank(admin);
        vault.setMaxYieldRate(1e16); // 0.01 ESMS / USDC / day
        _stake(alice, SIRIUS, 100 * USDC1); // 100 USDC
        vm.warp(block.timestamp + 1 days);

        // cap = 100 * 1e16 = 1e18 after exactly one day
        assertEq(vault.yieldCap(SIRIUS, alice), 1e18, "cap = principal * rate * elapsed");
        StarVault.StarYield memory y =
            _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y); // sign before pranking (view call would consume it)
        vm.prank(alice);
        vault.claimYield(y, sig); // exactly at cap: ok
        assertEq(esms.balanceOf(alice, SPIRIT), 1e18);
    }

    function test_YieldCap_OverCapReverts() public {
        vm.prank(admin);
        vault.setMaxYieldRate(1e16);
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.warp(block.timestamp + 1 days);

        StarVault.StarYield memory y =
            _yield(alice, SIRIUS, SPIRIT, 1e18 + 1, 0, uint64(block.timestamp + 600)); // 1 wei over cap
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldExceedsCap.selector);
        vault.claimYield(y, sig);
    }

    function test_YieldCap_NoPrincipalIsZero() public {
        // a signed claim from someone who never staked the star cannot mint (cap 0)
        vm.prank(admin);
        vault.setMaxYieldRate(1e16);
        assertEq(vault.yieldCap(SIRIUS, alice), 0);
        StarVault.StarYield memory y =
            _yield(alice, SIRIUS, SPIRIT, 1, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(StarVault.YieldExceedsCap.selector);
        vault.claimYield(y, sig);
    }

    // ── per-star nonce independence (Q8) ─────────────────────────────────────────

    function test_Nonce_IndependentPerStar() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        _stake(alice, VEGA, 100 * USDC1);
        // a claim on SIRIUS (nonce 0) does not advance VEGA's nonce
        _claim(alice, attestorPk, SIRIUS, SPIRIT, 1e18);
        assertEq(vault.usedNonce(SIRIUS, alice), 1);
        assertEq(vault.usedNonce(VEGA, alice), 0, "VEGA nonce untouched");
        // VEGA can still claim with nonce 0 — stars don't serialize against each other
        _claim(alice, attestorPk, VEGA, ESSENCE, 1e18);
        assertEq(vault.usedNonce(VEGA, alice), 1);
    }

    // ── pause scope (Q3) ─────────────────────────────────────────────────────────

    function test_Pause_BlocksClaimButNotStakeOrUnstake() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.warp(block.timestamp + 1 days);

        vm.prank(admin);
        vault.pause();

        // claim blocked
        StarVault.StarYield memory y =
            _yield(alice, SIRIUS, SPIRIT, 1e18, 0, uint64(block.timestamp + 600));
        bytes memory sig = _signYield(attestorPk, y);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.claimYield(y, sig);

        // stake STILL works while paused
        _stake(bob, SIRIUS, 50 * USDC1);
        assertEq(vault.principalOf(SIRIUS, bob), 50 * USDC1);

        // unstake STILL works while paused — "you can always exit"
        vm.prank(alice);
        uint256 out = vault.unstake(SIRIUS, 100 * USDC1);
        assertEq(out, 100 * USDC1);
    }

    function test_Pause_OnlyPauser() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.pause();
    }

    function test_Unpause_RestoresClaim() public {
        _stake(alice, SIRIUS, 100 * USDC1);
        vm.prank(admin);
        vault.pause();
        vm.prank(admin);
        vault.unpause();
        _claim(alice, attestorPk, SIRIUS, SPIRIT, 1e18); // works again
        assertEq(esms.balanceOf(alice, SPIRIT), 1e18);
    }

    // ── roles ──────────────────────────────────────────────────────────────────

    function test_Constructor_GrantsAdminRoles() public view {
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(vault.hasRole(vault.ADMIN_ROLE(), admin));
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), admin));
        assertEq(vault.maxYieldRatePerUsdcPerDay(), MAX_RATE);
    }

    function test_GrantAttestor_OnlyAdmin() public {
        bytes32 role = vault.ATTESTOR_ROLE(); // read before the expectRevert window
        vm.prank(alice);
        vm.expectRevert();
        vault.grantRole(role, alice);
    }

    // ── fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_StakeUnstake_RoundTrip(uint96 amt) public {
        amt = uint96(bound(amt, 1, 1_000 * USDC1));
        uint256 before = usdc.balanceOf(alice);
        uint256 shares = _stake(alice, VEGA, amt);
        vm.prank(alice);
        uint256 out = vault.unstake(VEGA, shares);
        assertEq(out, amt, "single staker recovers exactly the principal");
        assertEq(usdc.balanceOf(alice), before);
    }

    function testFuzz_ProRataShares(uint96 a, uint96 b) public {
        uint256 amtA = bound(a, 1 * USDC1, 500 * USDC1);
        uint256 amtB = bound(b, 1 * USDC1, 500 * USDC1);
        _stake(alice, SIRIUS, amtA);
        _stake(bob, SIRIUS, amtB);
        // Principals reflect each staker's deposit (±1 wei rounding).
        assertApproxEqAbs(vault.principalOf(SIRIUS, alice), amtA, 1);
        assertApproxEqAbs(vault.principalOf(SIRIUS, bob), amtB, 1);
    }
}
