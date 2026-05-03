// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Will} from "../src/Will.sol";
import {WillFactory} from "../src/WillFactory.sol";

contract SetupDemo is Script {
    function run() external {
        uint256 pk = vm.envUint("OWNER_PRIVATE_KEY");
        address factoryAddr = vm.envAddress("WILL_FACTORY_ADDRESS");
        address agent = vm.envOr("AGENT_OPERATOR_ADDRESS", vm.addr(pk));
        address usdc = vm.envAddress("USDC_BASE_SEPOLIA");

        WillFactory factory = WillFactory(factoryAddr);

        Will.Beneficiary[] memory bens = new Will.Beneficiary[](2);
        bens[0] = Will.Beneficiary({
            payoutAddress: vm.addr(pk),
            ensName: keccak256("alice.eth"),
            sharePoints: 6000
        });
        bens[1] = Will.Beneficiary({
            payoutAddress: vm.addr(pk),
            ensName: keccak256("bob.eth"),
            sharePoints: 4000
        });

        address[] memory watched = new address[](1);
        watched[0] = usdc;

        vm.startBroadcast(pk);
        (address willAddr, uint256 tokenId) = factory.createWill(
            keccak256("eddy.eth"),
            bens,
            watched,
            5 minutes,
            2 minutes,
            keccak256(abi.encodePacked("willkeeper-1.wills.eth")),
            "0g://placeholder",
            agent
        );
        vm.stopBroadcast();

        console2.log("Demo Will:", willAddr);
        console2.log("KeeperTokenId:", tokenId);
    }
}
