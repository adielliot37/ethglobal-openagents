// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {WillKeeper} from "../src/WillKeeper.sol";
import {WillFactory} from "../src/WillFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("OWNER_PRIVATE_KEY");
        address admin = vm.addr(pk);
        address universalRouter = vm.envAddress("UNIVERSAL_ROUTER_BASE_SEPOLIA");
        address permit2 = vm.envAddress("PERMIT2_BASE_SEPOLIA");
        address usdc = vm.envAddress("USDC_BASE_SEPOLIA");

        vm.startBroadcast(pk);

        WillKeeper keeper = new WillKeeper(admin);
        WillFactory factory = new WillFactory(address(keeper), admin, universalRouter, permit2, usdc);
        keeper.setFactory(address(factory));

        vm.stopBroadcast();

        console2.log("WillKeeper:", address(keeper));
        console2.log("WillFactory:", address(factory));
        console2.log("EmergencyAdmin:", admin);
    }
}
