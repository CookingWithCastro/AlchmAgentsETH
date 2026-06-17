// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract EsmsTokenTest is Test {
    EsmsToken token;
    address admin = address(0xA11CE);
    address minter = address(0xB0B);
    address user = address(0xCAFE);
    address other = address(0xD00D);

    function setUp() public {
        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, ("https://x/{id}", admin, minter));
        token = EsmsToken(address(new ERC1967Proxy(address(impl), init)));
    }

    function _esms() internal pure returns (uint256[] memory ids, uint256[] memory amts) {
        ids = new uint256[](4);
        amts = new uint256[](4);
        for (uint256 i; i < 4; i++) {
            ids[i] = i;
            amts[i] = (i + 1) * 1e18;
        }
    }

    function test_ClaimMint() public {
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.prank(minter);
        token.claimMint(user, keccak256("c1"), ids, amts);
        assertEq(token.balanceOf(user, 0), 1e18);
        assertEq(token.balanceOf(user, 3), 4e18);
        assertTrue(token.claimed(keccak256("c1")));
    }

    function test_Idempotent_RepeatClaimReverts() public {
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.startPrank(minter);
        token.claimMint(user, keccak256("c1"), ids, amts);
        vm.expectRevert(abi.encodeWithSelector(EsmsToken.ClaimAlreadyProcessed.selector, keccak256("c1")));
        token.claimMint(user, keccak256("c1"), ids, amts);
        vm.stopPrank();
        assertEq(token.balanceOf(user, 0), 1e18); // not doubled
    }

    function test_OnlyMinterCanMint() public {
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.expectRevert(); // caller is the test contract, lacks MINTER_ROLE
        token.claimMint(user, keccak256("c2"), ids, amts);
    }

    function test_Soulbound_TransferReverts() public {
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.prank(minter);
        token.claimMint(user, keccak256("c1"), ids, amts);
        vm.prank(user);
        vm.expectRevert(EsmsToken.TransfersDisabled.selector);
        token.safeTransferFrom(user, other, 0, 1e18, "");
    }

    /// Pause is scoped to the shop spend paths ({redeem}/{redeemFor}), NOT minting — so
    /// the AMM's always-on {withdraw} (which settles by minting ESMS) is never frozen.
    function test_PauseDoesNotBlockMint() public {
        (uint256[] memory ids, uint256[] memory amts) = _esms();
        vm.prank(admin);
        token.pause();
        vm.prank(minter);
        token.claimMint(user, keccak256("c1"), ids, amts); // mint still works while paused
        assertEq(token.balanceOf(user, 0), 1e18);
    }

    function test_ClaimMint_RejectsOutOfRangeId() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        ids[0] = 4; // only 0..3 are real elements
        amts[0] = 1e18;
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(EsmsToken.BadElementId.selector, uint256(4)));
        token.claimMint(user, keccak256("c1"), ids, amts);
    }

    function test_UpgradeRequiresRole() public {
        EsmsToken impl2 = new EsmsToken();
        vm.expectRevert();
        token.upgradeToAndCall(address(impl2), ""); // caller lacks UPGRADER_ROLE
        vm.prank(admin);
        token.upgradeToAndCall(address(impl2), ""); // admin has UPGRADER_ROLE
    }
}
