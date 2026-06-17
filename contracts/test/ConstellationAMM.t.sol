// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {ConstellationDeed} from "../src/ConstellationDeed.sol";
import {ConstellationAMM} from "../src/ConstellationAMM.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract ConstellationAMMTest is Test {
    EsmsToken esms;
    ConstellationDeed deed;
    ConstellationAMM amm;

    uint256 attestorPk = uint256(keccak256("attestor"));
    address attestor;
    address admin = address(0xA11CE);
    address minter = address(0xB0B);
    address user = address(0xCAFE);
    address other = address(0xD00D);

    uint16 constant ORION = 0; // generator pair (0,3) = Spirit/Substance
    uint8 constant SPIRIT = 0;
    uint8 constant SUBSTANCE = 3;
    uint16 constant FEE = 87;

    function setUp() public {
        attestor = vm.addr(attestorPk);
        vm.warp(1_000_000); // a sane non-zero clock for deadlines

        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, ("uri/{id}", admin, minter));
        esms = EsmsToken(address(new ERC1967Proxy(address(impl), init)));

        deed = new ConstellationDeed(admin);
        amm = new ConstellationAMM(address(esms), address(deed), admin);

        vm.startPrank(admin);
        deed.setAmm(address(amm));
        esms.grantRole(esms.MINTER_ROLE(), address(amm));
        esms.grantRole(esms.BURNER_ROLE(), address(amm));
        amm.grantRole(amm.ATTESTOR_ROLE(), attestor);
        amm.registerPool(ORION, SPIRIT, SUBSTANCE, FEE);
        vm.stopPrank();

        _mintEsms(user, 1_000_000e18);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _mintEsms(address to, uint256 amt) internal {
        uint256[] memory ids = new uint256[](4);
        uint256[] memory amts = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            ids[i] = i;
            amts[i] = amt;
        }
        vm.prank(minter);
        esms.claimMint(to, keccak256(abi.encode("seed", to, amt)), ids, amts);
    }

    function _att(address trader, uint16 constId, uint64 nonce, uint64 deadline)
        internal
        pure
        returns (ConstellationAMM.VisibilityAttestation memory a)
    {
        a = ConstellationAMM.VisibilityAttestation({
            trader: trader,
            constellationId: constId,
            regionCommit: keccak256("nyc-bucket"),
            visibleStars: 5,
            nonce: nonce,
            deadline: deadline
        });
    }

    function _sign(uint256 pk, ConstellationAMM.VisibilityAttestation memory a)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, amm.hashAttestation(a));
        return abi.encodePacked(r, s, v);
    }

    function _seed(address who, uint64 nonce, uint256 amtA, uint256 amtB) internal returns (uint256 deedId) {
        ConstellationAMM.VisibilityAttestation memory a = _att(who, ORION, nonce, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(who);
        deedId = amm.seedLiquidity(ORION, amtA, amtB, 0, a, sig);
    }

    // ── liquidity ──────────────────────────────────────────────────────────

    function test_SeedLiquidity_MintsDeedAndSetsReserves() public {
        uint256 deedId = _seed(user, 0, 1000e18, 4000e18);

        (uint256 rA, uint256 rB) = amm.getReserves(ORION);
        assertEq(rA, 1000e18);
        assertEq(rB, 4000e18);
        assertEq(deed.ownerOf(deedId), user);
        assertEq(esms.balanceOf(user, SPIRIT), 1_000_000e18 - 1000e18);
        assertEq(esms.balanceOf(user, SUBSTANCE), 1_000_000e18 - 4000e18);
        assertEq(amm.usedNonce(ORION, user), 1);
    }

    function test_Swap_ConstantProductAndMintsOutput() public {
        _seed(user, 0, 1000e18, 4000e18);
        (uint256 rA0, uint256 rB0) = amm.getReserves(ORION);
        uint256 k0 = rA0 * rB0;

        uint256 inAmt = 100e18;
        uint256 expectedOut = amm.quote(ORION, SPIRIT, inAmt);
        assertGt(expectedOut, 0);

        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 1, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        uint256 subBefore = esms.balanceOf(user, SUBSTANCE);
        vm.prank(user);
        uint256 outAmt = amm.swap(ORION, SPIRIT, inAmt, 0, a, sig);

        assertEq(outAmt, expectedOut);
        assertEq(esms.balanceOf(user, SUBSTANCE), subBefore + outAmt); // output minted to trader
        (uint256 rA1, uint256 rB1) = amm.getReserves(ORION);
        assertEq(rA1, rA0 + inAmt); // full input (incl. fee) stays as reserve
        assertEq(rB1, rB0 - outAmt);
        assertGe(rA1 * rB1, k0); // fee makes k grow, never shrink
    }

    function test_Withdraw_FullBurnsDeedAndReturnsEsms() public {
        uint256 deedId = _seed(user, 0, 1000e18, 4000e18);
        uint256 spiritBefore = esms.balanceOf(user, SPIRIT);

        vm.prank(user);
        amm.withdraw(deedId, 10_000);

        // Deed burned, reserves drained (minus locked MINIMUM_LIQUIDITY dust).
        vm.expectRevert();
        deed.ownerOf(deedId);
        (uint256 rA, uint256 rB) = amm.getReserves(ORION);
        assertLt(rA, 1e15); // ~dust
        assertLt(rB, 1e15);
        assertGt(esms.balanceOf(user, SPIRIT), spiritBefore); // got Spirit back
    }

    function test_Withdraw_PartialKeepsDeed() public {
        uint256 deedId = _seed(user, 0, 1000e18, 4000e18);
        vm.prank(user);
        amm.withdraw(deedId, 5000); // half
        assertEq(deed.ownerOf(deedId), user); // still held
        (uint256 rA,) = amm.getReserves(ORION);
        assertApproxEqRel(rA, 500e18, 0.01e18);
    }

    // ── attestation failure modes ────────────────────────────────────────────

    function test_Attestation_ReplayReverts() public {
        _seed(user, 0, 1000e18, 4000e18); // consumes nonce 0
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 0, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.AttestationBadNonce.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);
    }

    function test_Attestation_ExpiredReverts() public {
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 0, uint64(block.timestamp + 60));
        bytes memory sig = _sign(attestorPk, a);
        vm.warp(block.timestamp + 61); // the constellation has since set
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.AttestationExpired.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);
    }

    function test_Attestation_WrongTraderReverts() public {
        ConstellationAMM.VisibilityAttestation memory a = _att(other, ORION, 0, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user); // user submits an attestation bound to `other`
        vm.expectRevert(ConstellationAMM.AttestationTraderMismatch.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);
    }

    function test_Attestation_WrongConstellationReverts() public {
        ConstellationAMM.VisibilityAttestation memory a = _att(user, 6, 0, uint64(block.timestamp + 120)); // Leo
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.AttestationConstellationMismatch.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);
    }

    function test_Attestation_BadSignerReverts() public {
        uint256 fakePk = uint256(keccak256("not-the-attestor"));
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 0, uint64(block.timestamp + 120));
        bytes memory sig = _sign(fakePk, a); // signed by a key without ATTESTOR_ROLE
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.AttestationBadSigner.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);
    }

    // ── invariants ───────────────────────────────────────────────────────────

    function test_Soulbound_StillEnforcedForEsms() public {
        vm.prank(user);
        vm.expectRevert(EsmsToken.TransfersDisabled.selector);
        esms.safeTransferFrom(user, other, SPIRIT, 1e18, "");
    }

    function test_Deed_IsTransferable() public {
        uint256 deedId = _seed(user, 0, 1000e18, 4000e18);
        vm.prank(user);
        deed.transferFrom(user, other, deedId);
        assertEq(deed.ownerOf(deedId), other); // the trophy moves freely, unlike ESMS
    }

    function test_RegisterPool_OnlyAdmin() public {
        vm.expectRevert();
        amm.registerPool(99, 0, 1, 30); // caller lacks ADMIN_ROLE
    }

    // ── liquidity-add safety (Q6) ──────────────────────────────────────────────

    function test_SeedLiquidity_SlippageGuardReverts() public {
        _seed(user, 0, 1000e18, 1000e18); // on-ratio baseline
        // add on-ratio but demand more shares than the deposit yields
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 1, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.SlippageTooHigh.selector);
        amm.seedLiquidity(ORION, 100e18, 100e18, 1_000e18, a, sig); // minShares unreachable
    }

    function test_SeedLiquidity_OffRatioAddReverts() public {
        _seed(user, 0, 1000e18, 1000e18); // 1:1 baseline
        // add badly off-ratio (1:2) — would silently donate the excess; now rejected
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 1, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        vm.expectRevert(ConstellationAMM.OffRatioDeposit.selector);
        amm.seedLiquidity(ORION, 100e18, 200e18, 0, a, sig);
    }

    function test_SeedLiquidity_OnRatioAddSucceeds() public {
        _seed(user, 0, 1000e18, 1000e18);
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 1, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        uint256 deedId = amm.seedLiquidity(ORION, 500e18, 500e18, 1, a, sig); // exactly on-ratio
        (, uint256 shares,) = deed.positionOf(deedId);
        assertGt(shares, 0);
    }

    function test_SeedInitial_AdminBootstrapsVirtualBaseline() public {
        // admin bootstraps a pool with NO attestation and NO ESMS burned (virtual reserves)
        assertEq(esms.balanceOf(admin, SPIRIT), 0);
        vm.prank(admin);
        uint256 deedId = amm.seedInitial(ORION, 1000e18, 1000e18, 0);
        assertEq(deed.ownerOf(deedId), admin);
        (uint256 rA, uint256 rB) = amm.getReserves(ORION);
        assertEq(rA, 1000e18);
        assertEq(rB, 1000e18);
        assertEq(esms.balanceOf(admin, SPIRIT), 0, "no ESMS burned from admin");
    }

    function test_SeedInitial_OnlyAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        amm.seedInitial(ORION, 1000e18, 1000e18, 0);
    }

    // ── pause scope (Q3) ───────────────────────────────────────────────────────

    function test_Pause_BlocksSeedAndSwapButNotWithdraw() public {
        uint256 deedId = _seed(user, 0, 1000e18, 1000e18);

        vm.prank(admin);
        amm.pause();

        // seed blocked
        ConstellationAMM.VisibilityAttestation memory a = _att(user, ORION, 1, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        amm.seedLiquidity(ORION, 10e18, 10e18, 0, a, sig);

        // swap blocked
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        amm.swap(ORION, SPIRIT, 10e18, 0, a, sig);

        // withdraw STILL works — "you can always pull liquidity"
        vm.prank(user);
        amm.withdraw(deedId, 10_000);
        assertGt(esms.balanceOf(user, SPIRIT), 1_000_000e18 - 1000e18);
    }

    // ── per-constellation nonce independence (Q8) ──────────────────────────────

    function test_Nonce_IndependentPerConstellation() public {
        uint16 LEO = 1;
        vm.prank(admin);
        amm.registerPool(LEO, SPIRIT, SUBSTANCE, FEE);

        // nonce 0 on ORION
        _seed(user, 0, 1000e18, 1000e18);
        assertEq(amm.usedNonce(ORION, user), 1);
        assertEq(amm.usedNonce(LEO, user), 0); // LEO untouched

        // nonce 0 still valid on LEO — pools don't serialize against each other
        ConstellationAMM.VisibilityAttestation memory a = _att(user, LEO, 0, uint64(block.timestamp + 120));
        bytes memory sig = _sign(attestorPk, a);
        vm.prank(user);
        amm.seedLiquidity(LEO, 1000e18, 1000e18, 0, a, sig);
        assertEq(amm.usedNonce(LEO, user), 1);
    }
}
