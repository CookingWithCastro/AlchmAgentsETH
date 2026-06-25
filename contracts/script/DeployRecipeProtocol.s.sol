// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AlchmRightsRegistry} from "../src/AlchmRightsRegistry.sol";
import {RecipeRegistry} from "../src/RecipeRegistry.sol";

/**
 * Deploy the Alchm recipe provenance protocol to Base Sepolia and register the
 * genesis copyright anchor for:
 *
 *   Alchm Planetary-Food Algorithm — U.S. Copyright Reg. No. VA 2-434-962
 *
 * The work and evidence stay off-chain. Only their caller-supplied hashes and a
 * public license-manifest URI are anchored. This is deliberately separate from
 * Deploy.s.sol so adding the protocol never shifts the existing ESMS/Deed/AMM
 * deployment nonce sequence or canonical addresses.
 *
 * Run:
 *   forge script script/DeployRecipeProtocol.s.sol:DeployRecipeProtocol \
 *     --rpc-url base_sepolia --broadcast --verify
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY  funded Base Sepolia deployer/initial registrar
 *   RIGHTS_HOLDER        declared holder (optional; defaults to deployer)
 *   ALCHM_WORK_HASH      keccak256 of canonical deposited-work bytes/manifest
 *   ALCHM_EVIDENCE_HASH  keccak256 of certificate/evidence bundle
 *   ALCHM_LICENSE_HASH   keccak256 of canonical license-manifest bytes
 *   ALCHM_LICENSE_URI    public, content-addressed license manifest
 */
contract DeployRecipeProtocol is Script {
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;
    string constant TITLE = "Alchm Planetary-Food Algorithm";
    string constant AUTHORITY = "United States Copyright Office";
    string constant REGISTRATION_NUMBER = "VA 2-434-962";

    function run()
        external
        returns (AlchmRightsRegistry rightsRegistry, RecipeRegistry recipeRegistry, bytes32 rightsId)
    {
        require(block.chainid == BASE_SEPOLIA_CHAIN_ID, "wrong chain: expected Base Sepolia 84532");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.addr(pk);
        address rightsHolder = vm.envOr("RIGHTS_HOLDER", admin);
        bytes32 workHash = vm.envBytes32("ALCHM_WORK_HASH");
        bytes32 evidenceHash = vm.envBytes32("ALCHM_EVIDENCE_HASH");
        bytes32 licenseHash = vm.envBytes32("ALCHM_LICENSE_HASH");
        string memory licenseURI = vm.envString("ALCHM_LICENSE_URI");

        vm.startBroadcast(pk);

        rightsRegistry = new AlchmRightsRegistry(admin);
        recipeRegistry = new RecipeRegistry(address(rightsRegistry));
        rightsId = rightsRegistry.registerRights(
            AlchmRightsRegistry.RegisterRightsInput({
                rightsHolder: rightsHolder,
                workHash: workHash,
                evidenceHash: evidenceHash,
                licenseHash: licenseHash,
                title: TITLE,
                authority: AUTHORITY,
                registrationNumber: REGISTRATION_NUMBER,
                licenseURI: licenseURI
            })
        );

        vm.stopBroadcast();

        console.log("AlchmRightsRegistry:", address(rightsRegistry));
        console.log("RecipeRegistry:", address(recipeRegistry));
        console.log("Alchm genesis rights id:");
        console.logBytes32(rightsId);
        console.log("Declared rights holder:", rightsHolder);
    }
}
