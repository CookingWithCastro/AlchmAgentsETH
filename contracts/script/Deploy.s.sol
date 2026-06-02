// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EsmsToken} from "../src/EsmsToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * Deploy the EsmsToken behind a UUPS (ERC1967) proxy.
 *
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url base_sepolia --broadcast --verify
 *
 * Env: DEPLOYER_PRIVATE_KEY, MINTER_ADDRESS, ESMS_METADATA_URI
 *   ESMS_METADATA_URI e.g. https://agents.alchm.kitchen/api/esms/metadata/{id}
 *   The deployer becomes DEFAULT_ADMIN / PAUSER / UPGRADER; MINTER_ADDRESS gets MINTER_ROLE.
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address minter = vm.envAddress("MINTER_ADDRESS");
        string memory uri = vm.envString("ESMS_METADATA_URI");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);
        EsmsToken impl = new EsmsToken();
        bytes memory init = abi.encodeCall(EsmsToken.initialize, (uri, admin, minter));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        vm.stopBroadcast();

        console.log("EsmsToken implementation:", address(impl));
        console.log("EsmsToken proxy (set as ESMS_CONTRACT_ADDRESS):", address(proxy));
    }
}
