// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Will} from "./Will.sol";
import {WillKeeper} from "./WillKeeper.sol";

/// @title WillFactory
/// @notice Spawns Will contracts and mints WillKeeper iNFTs in a single tx.
contract WillFactory {
    WillKeeper public immutable keeperNFT;
    address public immutable emergencyAdmin;
    address public immutable universalRouter;
    address public immutable permit2;
    address public immutable defaultRecoveryAsset;

    mapping(address => address[]) public willsByOwner;
    address[] public allWills;

    event WillCreated(
        address indexed owner,
        address indexed willAddress,
        uint256 indexed keeperTokenId,
        bytes32 ownerENS
    );

    constructor(
        address _keeperNFT,
        address _emergencyAdmin,
        address _universalRouter,
        address _permit2,
        address _defaultRecoveryAsset
    ) {
        keeperNFT = WillKeeper(_keeperNFT);
        emergencyAdmin = _emergencyAdmin;
        universalRouter = _universalRouter;
        permit2 = _permit2;
        defaultRecoveryAsset = _defaultRecoveryAsset;
    }

    function createWill(
        bytes32 ownerENS,
        Will.Beneficiary[] calldata beneficiaries,
        address[] calldata watchedTokens,
        uint256 inactivityPeriod,
        uint256 challengeWindow,
        bytes32 ensSubname,
        string calldata memoryURI,
        address agentOperator
    ) external returns (address willAddress, uint256 keeperTokenId) {
        Will will = new Will(
            msg.sender,
            emergencyAdmin,
            ownerENS,
            beneficiaries,
            watchedTokens,
            defaultRecoveryAsset,
            inactivityPeriod,
            challengeWindow,
            universalRouter,
            permit2
        );
        willAddress = address(will);

        keeperTokenId = keeperNFT.mint(msg.sender, willAddress, ensSubname, memoryURI, agentOperator);

        willsByOwner[msg.sender].push(willAddress);
        allWills.push(willAddress);

        emit WillCreated(msg.sender, willAddress, keeperTokenId, ownerENS);
    }

    function getWillsByOwner(address ownerAddr) external view returns (address[] memory) {
        return willsByOwner[ownerAddr];
    }

    function totalWills() external view returns (uint256) {
        return allWills.length;
    }
}
