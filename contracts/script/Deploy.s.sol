// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {ConstellationDeed} from "../src/ConstellationDeed.sol";
import {ConstellationAMM} from "../src/ConstellationAMM.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * Deploy the full Constellation Liquidity Pool stack to Base / Base-Sepolia:
 *   EsmsToken (UUPS proxy)  →  ConstellationDeed (ERC-721)  →  ConstellationAMM
 * then grant the AMM MINTER+BURNER on ESMS, wire the Deed to the AMM, grant the
 * attestor ATTESTOR_ROLE, and register the 12 demo constellation pools (mirrors
 * scripts/make_constellations.py output — keep in sync if the catalogue changes).
 *
 *   forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify
 *
 * Env: DEPLOYER_PRIVATE_KEY, MINTER_ADDRESS, ATTESTOR_ADDRESS, ESMS_METADATA_URI,
 *      [REDEEMER_ADDRESS]
 *   DEPLOYER becomes DEFAULT_ADMIN/PAUSER/UPGRADER (ESMS) and ADMIN (AMM + Deed).
 *   MINTER_ADDRESS gets ESMS MINTER_ROLE (the backend that seeds/claims demo ESMS).
 *   ATTESTOR_ADDRESS gets AMM ATTESTOR_ROLE (the Pentacles feeder's signing key).
 *   REDEEMER_ADDRESS (optional) gets ESMS BURNER_ROLE — the shop settlement wallet that
 *     submits holder-signed redeemFor burns. Set it for the on-chain shop to work.
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address minter = vm.envAddress("MINTER_ADDRESS");
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        address redeemer = vm.envOr("REDEEMER_ADDRESS", address(0));
        string memory uri = vm.envString("ESMS_METADATA_URI");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        // 1. ESMS token behind a UUPS proxy.
        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, (uri, admin, minter));
        EsmsToken esms = EsmsToken(address(new ERC1967Proxy(address(impl), init)));

        // 2. Deed (LP position NFT) + 3. AMM.
        ConstellationDeed deed = new ConstellationDeed(admin);
        ConstellationAMM amm = new ConstellationAMM(address(esms), address(deed), admin);

        // 4. Wire: the AMM is the Deed's sole minter, and is allowed to mint/burn ESMS.
        deed.setAmm(address(amm));
        esms.grantRole(esms.MINTER_ROLE(), address(amm));
        esms.grantRole(esms.BURNER_ROLE(), address(amm));

        // 5. The feeder attestor may sign visibility attestations.
        amm.grantRole(amm.ATTESTOR_ROLE(), attestor);

        // 5b. The shop settlement wallet may burn buyers' (holder-signed) ESMS via redeemFor.
        if (redeemer != address(0)) esms.grantRole(esms.BURNER_ROLE(), redeemer);

        // 6. Register the 12 demo pools (id, elemA, elemB, feeBps).
        _registerPools(amm);

        vm.stopBroadcast();

        console.log("EsmsToken proxy (ESMS_CONTRACT_ADDRESS):", address(esms));
        console.log("Shop BURNER (REDEEMER_ADDRESS):", redeemer);
        console.log("ConstellationDeed (DEED_CONTRACT_ADDRESS):", address(deed));
        console.log("ConstellationAMM (AMM_CONTRACT_ADDRESS):", address(amm));
    }

    function _registerPools(ConstellationAMM amm) internal {
        uint16[12] memory ids = [uint16(0), 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        uint8[12] memory a = [uint8(0), 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1];
        uint8[12] memory b = [uint8(3), 2, 2, 3, 2, 3, 2, 3, 2, 2, 3, 2];
        uint16[12] memory fee = [uint16(87), 121, 181, 177, 224, 71, 139, 216, 172, 122, 156, 182];
        for (uint256 i; i < 12; i++) {
            amm.registerPool(ids[i], a[i], b[i], fee[i]);
        }
    }
}
