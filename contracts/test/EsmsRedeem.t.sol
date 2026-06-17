// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @notice Covers the Phase-2 shop redeem/burn path on the soulbound ESMS token.
contract EsmsRedeemTest is Test {
    EsmsToken token;
    address admin = address(0xA11CE);
    address minter = address(0xB0B);
    address burner = address(0xBEEF);
    uint256 userPk = uint256(keccak256("user")); // user has a key so it can sign redeem auths
    address user;

    bytes32 constant ORDER = keccak256("order-1");

    event Redeemed(address indexed from, bytes32 indexed orderId, uint256[] ids, uint256[] amounts);

    function setUp() public {
        user = vm.addr(userPk);
        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, ("https://x/{id}", admin, minter));
        token = EsmsToken(address(new ERC1967Proxy(address(impl), init)));
        // grant the shop settlement wallet BURNER_ROLE (resolve the role id before
        // pranking — a nested view call would otherwise consume the prank)
        bytes32 burnerRole = token.BURNER_ROLE();
        vm.prank(admin);
        token.grantRole(burnerRole, burner);
        // seed the user with claimed ESMS to spend
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.prank(minter);
        token.claimMint(user, keccak256("seed"), ids, amts);
    }

    function _esms() internal pure returns (uint256[] memory ids, uint256[] memory amts) {
        ids = new uint256[](4);
        amts = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            ids[i] = i;
            amts[i] = 10e18;
        }
    }

    function _cost() internal pure returns (uint256[] memory ids, uint256[] memory amts) {
        ids = new uint256[](4);
        amts = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            ids[i] = i;
            amts[i] = 3e18;
        }
    }

    /// Sign a RedeemAuthorization as `userPk` (the holder consenting to a sponsored burn).
    function _signRedeem(
        uint256 pk,
        bytes32 orderId,
        uint256[] memory ids,
        uint256[] memory amts,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = token.hashRedeemAuthorization(vm.addr(pk), orderId, ids, amts, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_Redeem_BurnsCallerOwnBalance() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        vm.expectEmit(true, true, false, true);
        emit Redeemed(user, ORDER, ids, amts);
        vm.prank(user);
        token.redeem(ORDER, ids, amts);
        assertEq(token.balanceOf(user, 0), 7e18); // 10 - 3
        assertEq(token.balanceOf(user, 3), 7e18);
        assertTrue(token.redeemedOrders(ORDER));
    }

    function test_Redeem_Idempotent_RepeatOrderReverts() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        vm.startPrank(user);
        token.redeem(ORDER, ids, amts);
        vm.expectRevert(abi.encodeWithSelector(EsmsToken.RedeemAlreadyProcessed.selector, ORDER));
        token.redeem(ORDER, ids, amts);
        vm.stopPrank();
        assertEq(token.balanceOf(user, 0), 7e18); // not double-burned
    }

    function test_RedeemFor_OnlyBurnerWithHolderSig() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signRedeem(userPk, ORDER, ids, amts, deadline);
        // a random caller without BURNER_ROLE cannot sponsor a burn even with a valid sig
        vm.expectRevert();
        token.redeemFor(user, ORDER, ids, amts, deadline, sig);
        // the vetted burner can, because the holder signed the authorization
        vm.prank(burner);
        token.redeemFor(user, ORDER, ids, amts, deadline, sig);
        assertEq(token.balanceOf(user, 1), 7e18);
        assertTrue(token.redeemedOrders(ORDER));
    }

    function test_RedeemFor_WithoutHolderSigReverts() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        uint256 deadline = block.timestamp + 600;
        // attacker (the burner key) forges an order the holder never signed
        bytes memory wrongSig = _signRedeem(uint256(keccak256("not-the-user")), ORDER, ids, amts, deadline);
        vm.prank(burner);
        vm.expectRevert(EsmsToken.RedeemBadSigner.selector);
        token.redeemFor(user, ORDER, ids, amts, deadline, wrongSig);
        assertEq(token.balanceOf(user, 1), 10e18); // nothing burned
        assertFalse(token.redeemedOrders(ORDER));
    }

    function test_RedeemFor_ExpiredAuthReverts() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        uint256 deadline = block.timestamp + 60;
        bytes memory sig = _signRedeem(userPk, ORDER, ids, amts, deadline);
        vm.warp(block.timestamp + 61);
        vm.prank(burner);
        vm.expectRevert(EsmsToken.RedeemAuthExpired.selector);
        token.redeemFor(user, ORDER, ids, amts, deadline, sig);
    }

    function test_RedeemFor_ShareIdempotencyWithRedeem() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signRedeem(userPk, ORDER, ids, amts, deadline);
        vm.prank(burner);
        token.redeemFor(user, ORDER, ids, amts, deadline, sig);
        // the same orderId can never be redeemed again, even via the user path
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(EsmsToken.RedeemAlreadyProcessed.selector, ORDER));
        token.redeem(ORDER, ids, amts);
    }

    function test_Redeem_InsufficientBalanceReverts() public {
        uint256[] memory ids = new uint256[](4);
        uint256[] memory amts = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            ids[i] = i;
            amts[i] = 999e18; // more than the user holds
        }
        vm.prank(user);
        vm.expectRevert(); // ERC1155 insufficient balance
        token.redeem(ORDER, ids, amts);
        assertFalse(token.redeemedOrders(ORDER));
    }

    function test_Redeem_StillSoulbound() public {
        // redeeming does not unlock account-to-account transfers
        vm.prank(user);
        vm.expectRevert(EsmsToken.TransfersDisabled.selector);
        token.safeTransferFrom(user, burner, 0, 1e18, "");
    }

    function test_Redeem_PauseBlocksBurn() public {
        (uint256[] memory ids, uint256[] memory amts) = _cost();
        vm.prank(admin);
        token.pause();
        vm.prank(user);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        token.redeem(ORDER, ids, amts);
    }
}
