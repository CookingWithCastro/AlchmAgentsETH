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
 * then wire roles with SEPARATION OF DUTIES, set the star-registry root, pre-activate
 * the bright-star catalogue, register + admin-seed the 6 canonical ESMS pools.
 *
 * Key separation (hardened):
 *   - deployer (broadcast key)  → DEFAULT_ADMIN / PAUSER / UPGRADER only. NEVER a minter
 *     (pool baselines are seeded as virtual reserves via {seedInitial}, no ESMS needed).
 *   - MINTER_ADDRESS            → the permanent ESMS minter (the backend claim/yield key).
 *   - ATTESTOR_ADDRESS          → ATTESTOR_ROLE on vault + AMM ONLY (the hot feeder key,
 *     kept off the admin/upgrader/minter surface so a leak can only forge attestations).
 *
 * USDC is Arc's pre-deployed gas token at 0x3600…0000 — passed, not deployed.
 *
 *   forge script script/DeployStarVault.s.sol:DeployStarVault --rpc-url arc --broadcast
 *
 * Env: DEPLOYER_PRIVATE_KEY, MINTER_ADDRESS, ATTESTOR_ADDRESS, ESMS_METADATA_URI,
 *      STAR_REGISTRY_ROOT, [ARC_USDC_ADDRESS], [MAX_YIELD_RATE_PER_USDC_PER_DAY]
 */
contract DeployStarVault is Script {
    uint256 constant ARC_CHAIN_ID = 5042002;
    address constant ARC_USDC_DEFAULT = 0x3600000000000000000000000000000000000000;

    // Default cap: 0.05 ESMS (18-dp) per 1 USDC per day. Legit claims (~0.006/day max
    // off-chain) sit well under this; a leaked attestor can over-mint at most the cap.
    uint256 constant DEFAULT_MAX_YIELD_RATE = 5e16;

    uint256 constant SEED_PER_SIDE = 1_000e18; // baseline virtual reserve per pool side

    // ESMS ids: 0=Spirit 1=Essence 2=Matter 3=Substance. The 6 cross-element pairs:
    uint8[6] PAIR_A = [uint8(0), 0, 0, 1, 1, 2];
    uint8[6] PAIR_B = [uint8(1), 2, 3, 2, 3, 3];

    struct Cfg {
        uint256 pk;
        address admin;
        address minter;
        address attestor;
        address usdc;
        uint256 maxRate;
        bytes32 starRoot;
        string uri;
    }

    function run() external {
        require(block.chainid == ARC_CHAIN_ID, "wrong chain: expected Arc 5042002");
        Cfg memory c = _config();

        vm.startBroadcast(c.pk);

        // 1. ESMS token (UUPS proxy). The permanent backend minter is wired at init; the
        //    deployer is admin/upgrader/pauser only and is NEVER granted MINTER_ROLE.
        EsmsToken esms = EsmsToken(
            address(
                new ERC1967Proxy(
                    address(new EsmsToken()),
                    abi.encodeCall(EsmsToken.initialize, (c.uri, c.admin, c.minter))
                )
            )
        );

        // 2-3. Vault (custody + capped yield + registry), Deed (LP NFT), AMM (ESMS pools).
        StarVault vault = new StarVault(c.usdc, address(esms), c.admin, c.maxRate);
        ConstellationDeed deed = new ConstellationDeed(c.admin);
        ConstellationAMM amm = new ConstellationAMM(address(esms), address(deed), c.admin);

        _wireRoles(esms, vault, amm, deed, c.attestor);
        vault.setStarRoot(c.starRoot);
        vault.adminActivateStars(_brightStars());
        _registerAndSeedPools(amm);

        vm.stopBroadcast();

        console.log("EsmsToken proxy (NEXT_PUBLIC_ARC_ESMS_ADDRESS):", address(esms));
        console.log("StarVault (NEXT_PUBLIC_STAR_VAULT_ADDRESS):", address(vault));
        console.log("ConstellationDeed (NEXT_PUBLIC_CONSTELLATION_DEED_ADDRESS):", address(deed));
        console.log("ConstellationAMM (NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS):", address(amm));
        console.log("Attestor (vault+amm):", c.attestor);
        console.log("Permanent ESMS minter:", c.minter);
    }

    function _config() internal view returns (Cfg memory c) {
        c.pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        c.admin = vm.addr(c.pk);
        c.minter = vm.envAddress("MINTER_ADDRESS");
        c.attestor = vm.envAddress("ATTESTOR_ADDRESS");
        c.usdc = vm.envOr("ARC_USDC_ADDRESS", ARC_USDC_DEFAULT);
        c.maxRate = vm.envOr("MAX_YIELD_RATE_PER_USDC_PER_DAY", DEFAULT_MAX_YIELD_RATE);
        c.starRoot = vm.envBytes32("STAR_REGISTRY_ROOT");
        c.uri = vm.envString("ESMS_METADATA_URI");
    }

    function _wireRoles(
        EsmsToken esms,
        StarVault vault,
        ConstellationAMM amm,
        ConstellationDeed deed,
        address attestor
    ) internal {
        deed.setAmm(address(amm));
        esms.grantRole(esms.MINTER_ROLE(), address(vault));
        esms.grantRole(esms.MINTER_ROLE(), address(amm));
        esms.grantRole(esms.BURNER_ROLE(), address(amm));
        vault.grantRole(vault.ATTESTOR_ROLE(), attestor);
        amm.grantRole(amm.ATTESTOR_ROLE(), attestor);
    }

    /// Register the 6 ESMS element-pair pools and admin-seed each baseline (virtual
    /// reserves, no ESMS burned) so no user is ever the first depositor.
    function _registerAndSeedPools(ConstellationAMM amm) internal {
        for (uint16 i; i < 6; i++) {
            amm.registerPool(i, PAIR_A[i], PAIR_B[i], 100); // 1% fee tier
            amm.seedInitial(i, SEED_PER_SIDE, SEED_PER_SIDE, 0);
        }
    }

    // Bright-star catalogue (lib/staking/star-catalog.ts) — pre-activated without a proof.
    function _brightStars() internal pure returns (uint32[] memory ids) {
        ids = new uint32[](15);
        ids[0] = 32349; ids[1] = 69673; ids[2] = 91262; ids[3] = 24608; ids[4] = 24436;
        ids[5] = 37279; ids[6] = 27989; ids[7] = 21421; ids[8] = 97649; ids[9] = 80763;
        ids[10] = 65474; ids[11] = 37826; ids[12] = 49669; ids[13] = 102098; ids[14] = 113368;
    }
}
