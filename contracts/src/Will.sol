// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IUniversalRouter} from "./interfaces/IUniversalRouter.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";

/// @title Will
/// @notice Non-custodial, time-locked crypto inheritance vault.
contract Will is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    enum WillState {Active, Triggered, Cancelled, Executed}

    struct Beneficiary {
        address payoutAddress;
        bytes32 ensName;
        uint16 sharePoints;
    }

    address public owner;
    address public emergencyAdmin;
    bytes32 public ownerENS;

    uint256 public lastHeartbeat;
    uint256 public inactivityPeriod;
    uint256 public challengeWindow;
    uint256 public triggeredAt;

    WillState public state;

    Beneficiary[] private _beneficiaries;
    address public recoveryAsset;
    address[] public watchedTokens;

    address public universalRouter;
    address public permit2;

    event Heartbeat(uint256 timestamp);
    event Triggered(address indexed caller, uint256 timestamp);
    event Cancelled(uint256 timestamp);
    event Executed(uint256 totalDistributed, uint256 timestamp);
    event BeneficiaryPaid(address indexed to, bytes32 indexed ensName, uint256 amount);
    event OwnerRotated(address indexed oldOwner, address indexed newOwner);
    event TokenSwept(address indexed token, uint256 amountIn, uint256 amountOut);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == emergencyAdmin, "not admin");
        _;
    }

    constructor(
        address _owner,
        address _admin,
        bytes32 _ownerENS,
        Beneficiary[] memory _beneficiariesInit,
        address[] memory _watchedTokens,
        address _recoveryAsset,
        uint256 _inactivityPeriod,
        uint256 _challengeWindow,
        address _universalRouter,
        address _permit2
    ) {
        require(_owner != address(0), "zero owner");
        require(_recoveryAsset != address(0), "zero recovery");
        require(_inactivityPeriod >= 60, "inactivity too short");
        require(_challengeWindow >= 30, "challenge too short");
        require(_beneficiariesInit.length > 0, "no beneficiaries");

        uint256 totalShares;
        for (uint256 i = 0; i < _beneficiariesInit.length; i++) {
            totalShares += _beneficiariesInit[i].sharePoints;
            _beneficiaries.push(_beneficiariesInit[i]);
        }
        require(totalShares == 10000, "shares != 10000");

        owner = _owner;
        emergencyAdmin = _admin;
        ownerENS = _ownerENS;
        watchedTokens = _watchedTokens;
        recoveryAsset = _recoveryAsset;
        inactivityPeriod = _inactivityPeriod;
        challengeWindow = _challengeWindow;
        universalRouter = _universalRouter;
        permit2 = _permit2;

        lastHeartbeat = block.timestamp;
        state = WillState.Active;
    }

    function heartbeat() external onlyOwner whenNotPaused {
        require(state == WillState.Active || state == WillState.Triggered, "terminal");
        if (state == WillState.Triggered) {
            state = WillState.Active;
            triggeredAt = 0;
            emit Cancelled(block.timestamp);
        }
        lastHeartbeat = block.timestamp;
        emit Heartbeat(block.timestamp);
    }

    function cancel() external onlyOwner whenNotPaused {
        require(state == WillState.Triggered, "not triggered");
        state = WillState.Active;
        triggeredAt = 0;
        lastHeartbeat = block.timestamp;
        emit Cancelled(block.timestamp);
    }

    function triggerWill() external whenNotPaused {
        require(state == WillState.Active, "not active");
        require(block.timestamp >= lastHeartbeat + inactivityPeriod, "still active");
        state = WillState.Triggered;
        triggeredAt = block.timestamp;
        emit Triggered(msg.sender, block.timestamp);
    }

    function execute() external nonReentrant whenNotPaused {
        require(state == WillState.Triggered, "not triggered");
        require(block.timestamp >= triggeredAt + challengeWindow, "challenge open");

        for (uint256 i = 0; i < watchedTokens.length; i++) {
            address token = watchedTokens[i];
            if (token == recoveryAsset) continue;
            uint256 bal = IERC20(token).balanceOf(address(this));
            if (bal == 0) continue;
            uint256 received = _swapToRecovery(token, bal);
            emit TokenSwept(token, bal, received);
        }

        uint256 estate = IERC20(recoveryAsset).balanceOf(address(this));
        require(estate > 0, "empty estate");

        uint256 distributed;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            Beneficiary memory b = _beneficiaries[i];
            uint256 amount = (estate * b.sharePoints) / 10000;
            if (i == _beneficiaries.length - 1) {
                amount = IERC20(recoveryAsset).balanceOf(address(this));
            }
            if (amount == 0) continue;
            IERC20(recoveryAsset).safeTransfer(b.payoutAddress, amount);
            distributed += amount;
            emit BeneficiaryPaid(b.payoutAddress, b.ensName, amount);
        }

        state = WillState.Executed;
        emit Executed(distributed, block.timestamp);
    }

    /// @dev Best-effort swap via Universal Router. Falls back to skipping if router call reverts.
    function _swapToRecovery(address tokenIn, uint256 amountIn) internal returns (uint256) {
        if (universalRouter == address(0)) return 0;
        IERC20(tokenIn).forceApprove(permit2, type(uint256).max);
        IPermit2(permit2).approve(tokenIn, universalRouter, uint160(amountIn), uint48(block.timestamp + 3600));

        // V3_SWAP_EXACT_IN command (0x00)
        bytes memory commands = hex"00";
        bytes[] memory inputs = new bytes[](1);
        bytes memory path = abi.encodePacked(tokenIn, uint24(3000), recoveryAsset);
        inputs[0] = abi.encode(address(this), amountIn, uint256(0), path, true);

        uint256 before = IERC20(recoveryAsset).balanceOf(address(this));
        try IUniversalRouter(universalRouter).execute(commands, inputs, block.timestamp + 600) {
            return IERC20(recoveryAsset).balanceOf(address(this)) - before;
        } catch {
            return 0;
        }
    }

    function rotateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnerRotated(owner, newOwner);
        owner = newOwner;
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    function beneficiaries() external view returns (Beneficiary[] memory) {
        return _beneficiaries;
    }

    function getWatchedTokens() external view returns (address[] memory) {
        return watchedTokens;
    }

    function timeUntilTrigger() external view returns (uint256) {
        if (state != WillState.Active) return 0;
        uint256 deadline = lastHeartbeat + inactivityPeriod;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    function timeUntilExecutable() external view returns (uint256) {
        if (state != WillState.Triggered) return 0;
        uint256 deadline = triggeredAt + challengeWindow;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
}
