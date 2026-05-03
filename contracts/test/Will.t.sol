// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Will} from "../src/Will.sol";
import {WillKeeper} from "../src/WillKeeper.sol";
import {WillFactory} from "../src/WillFactory.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USDC", "USDC") {
        _mint(msg.sender, 1_000_000e6);
    }
    function decimals() public pure override returns (uint8) {return 6;}
    function mintTo(address to, uint256 amount) external {_mint(to, amount);}
}

contract WillTest is Test {
    WillKeeper keeper;
    WillFactory factory;
    MockUSDC usdc;

    address owner = address(0xA11CE);
    address admin = address(0xAD);
    address alice = address(0xA11);
    address bob = address(0xB0B);

    function setUp() public {
        keeper = new WillKeeper(admin);
        usdc = new MockUSDC();
        factory = new WillFactory(address(keeper), admin, address(0), address(0), address(usdc));
        vm.prank(admin);
        keeper.setFactory(address(factory));
    }

    function _createWill() internal returns (Will, uint256) {
        Will.Beneficiary[] memory bens = new Will.Beneficiary[](2);
        bens[0] = Will.Beneficiary({payoutAddress: alice, ensName: keccak256("alice.eth"), sharePoints: 6000});
        bens[1] = Will.Beneficiary({payoutAddress: bob, ensName: keccak256("bob.eth"), sharePoints: 4000});

        address[] memory watched = new address[](1);
        watched[0] = address(usdc);

        vm.prank(owner);
        (address willAddr, uint256 tokenId) = factory.createWill(
            keccak256("eddy.eth"),
            bens,
            watched,
            300,
            120,
            keccak256("willkeeper-1.wills.eth"),
            "0g://x",
            owner
        );
        return (Will(willAddr), tokenId);
    }

    function test_HeartbeatResetsTimer() public {
        (Will will,) = _createWill();
        vm.warp(block.timestamp + 100);
        vm.prank(owner);
        will.heartbeat();
        assertEq(will.lastHeartbeat(), block.timestamp);
    }

    function test_TriggerAfterInactivity() public {
        (Will will,) = _createWill();
        vm.warp(block.timestamp + 301);
        will.triggerWill();
        assertEq(uint8(will.state()), uint8(Will.WillState.Triggered));
    }

    function test_OwnerCanCancelDuringChallenge() public {
        (Will will,) = _createWill();
        vm.warp(block.timestamp + 301);
        will.triggerWill();
        vm.prank(owner);
        will.cancel();
        assertEq(uint8(will.state()), uint8(Will.WillState.Active));
    }

    function test_ExecuteAfterChallenge() public {
        (Will will,) = _createWill();
        usdc.mintTo(address(will), 1000e6);

        vm.warp(block.timestamp + 301);
        will.triggerWill();
        vm.warp(block.timestamp + 121);
        will.execute();

        assertEq(uint8(will.state()), uint8(Will.WillState.Executed));
        assertEq(usdc.balanceOf(alice), 600e6);
        assertEq(usdc.balanceOf(bob), 400e6);
    }

    function test_CannotExecuteDuringChallenge() public {
        (Will will,) = _createWill();
        usdc.mintTo(address(will), 1000e6);
        vm.warp(block.timestamp + 301);
        will.triggerWill();
        vm.expectRevert();
        will.execute();
    }
}
