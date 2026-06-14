// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {StarVault} from "../src/StarVault.sol";
import {ConstellationDeed} from "../src/ConstellationDeed.sol";
import {ConstellationAMM} from "../src/ConstellationAMM.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * Deploy the full pentacle staking stack to Circle Arc testnet (chainId 5042002):
 *   EsmsToken (UUPS proxy)  →  StarVault  +  ConstellationDeed  →  ConstellationAMM
 * then grant roles and register the 6 canonical ESMS element-pair pools (stable constIds
 * 0..5) that the 11 zones' aspect-driven pools route into.
 *
 *   - StarVault: USDC custody per star + visibility-attested ESMS yield (MINTER on ESMS).
 *   - ConstellationAMM: the 6 ESMS element-pair pools; a favorable planetary aspect + the
 *     zone being risen opens/boosts the matching pair (gated by the AMM's VisibilityAttestation).
 *
 * USDC is Arc's pre-deployed gas token at 0x3600…0000 — passed, not deployed.
 *
 *   forge script script/DeployStarVault.s.sol:DeployStarVault --rpc-url arc --broadcast
 *
 * Env: DEPLOYER_PRIVATE_KEY, ATTESTOR_ADDRESS, ESMS_METADATA_URI, [ARC_USDC_ADDRESS]
 */
contract DeployStarVault is Script {
    address constant ARC_USDC_DEFAULT = 0x3600000000000000000000000000000000000000;

    // ESMS ids: 0=Spirit 1=Essence 2=Matter 3=Substance. The 6 cross-element pairs:
    uint8[6] PAIR_A = [uint8(0), 0, 0, 1, 1, 2];
    uint8[6] PAIR_B = [uint8(1), 2, 3, 2, 3, 3];

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        string memory uri = vm.envString("ESMS_METADATA_URI");
        address usdc = vm.envOr("ARC_USDC_ADDRESS", ARC_USDC_DEFAULT);
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        // 1. ESMS token on Arc behind a UUPS proxy (admin is the initial minter for seeding).
        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, (uri, admin, admin));
        EsmsToken esms = EsmsToken(address(new ERC1967Proxy(address(impl), init)));

        // 2. StarVault: USDC custody + ESMS yield settlement.
        StarVault vault = new StarVault(usdc, address(esms), admin);

        // 3. ConstellationDeed (LP NFT) + ConstellationAMM (ESMS element-pair pools).
        ConstellationDeed deed = new ConstellationDeed(admin);
        ConstellationAMM amm = new ConstellationAMM(address(esms), address(deed), admin);

        // 4. Wire roles: vault + AMM may mint ESMS yield; AMM may burn (swaps/LP); feeder attests.
        deed.setAmm(address(amm));
        esms.grantRole(esms.MINTER_ROLE(), address(vault));
        esms.grantRole(esms.MINTER_ROLE(), address(amm));
        esms.grantRole(esms.BURNER_ROLE(), address(amm));
        vault.grantRole(vault.ATTESTOR_ROLE(), attestor);
        amm.grantRole(amm.ATTESTOR_ROLE(), attestor);

        // 5. Register the 6 ESMS element-pair pools (constId == index 0..5).
        for (uint16 i; i < 6; i++) {
            amm.registerPool(i, PAIR_A[i], PAIR_B[i], 100); // 1% fee tier
        }

        vm.stopBroadcast();

        console.log("Arc USDC (ARC_USDC_ADDRESS):", usdc);
        console.log("EsmsToken proxy (NEXT_PUBLIC_ARC_ESMS_ADDRESS):", address(esms));
        console.log("StarVault (NEXT_PUBLIC_STAR_VAULT_ADDRESS):", address(vault));
        console.log("ConstellationDeed (NEXT_PUBLIC_CONSTELLATION_DEED_ADDRESS):", address(deed));
        console.log("ConstellationAMM (NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS):", address(amm));
        console.log("Attestor (ATTESTOR_ROLE on vault + amm):", attestor);
    }
}
