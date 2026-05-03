// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title WillKeeper
/// @notice ERC-7857-compatible iNFT representing the autonomous agent for a Will.
contract WillKeeper is ERC721, Ownable {
    using Strings for uint256;

    enum ActionType {Heartbeat, Reminder, Trigger, Execute, MemoryUpdate}

    struct KeeperData {
        address willAddress;
        bytes32 ensSubname;
        string memoryURI;
        uint256 alertnessScore;
        uint256 actionsFired;
        uint256 lastActionAt;
        address operator;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => KeeperData) public keepers;
    address public factory;

    event MemoryUpdated(uint256 indexed tokenId, string uri);
    event ActionRecorded(uint256 indexed tokenId, ActionType action, uint256 alertness);
    event OperatorSet(uint256 indexed tokenId, address operator);

    modifier onlyOperatorOrOwner(uint256 tokenId) {
        require(
            msg.sender == keepers[tokenId].operator || msg.sender == ownerOf(tokenId) || msg.sender == owner(),
            "not authorized"
        );
        _;
    }

    constructor(address _initialOwner) ERC721("WillKeeper iNFT", "WK7857") Ownable(_initialOwner) {}

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    function mint(
        address to,
        address willAddress,
        bytes32 ensSubname,
        string calldata memoryURI,
        address operator
    ) external returns (uint256 tokenId) {
        require(msg.sender == factory || msg.sender == owner(), "not factory");
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        keepers[tokenId] = KeeperData({
            willAddress: willAddress,
            ensSubname: ensSubname,
            memoryURI: memoryURI,
            alertnessScore: 0,
            actionsFired: 0,
            lastActionAt: block.timestamp,
            operator: operator
        });
    }

    function setOperator(uint256 tokenId, address operator) external {
        require(msg.sender == ownerOf(tokenId), "not owner");
        keepers[tokenId].operator = operator;
        emit OperatorSet(tokenId, operator);
    }

    function updateMemory(uint256 tokenId, string calldata newURI) external onlyOperatorOrOwner(tokenId) {
        keepers[tokenId].memoryURI = newURI;
        emit MemoryUpdated(tokenId, newURI);
    }

    function recordAction(uint256 tokenId, ActionType action) external onlyOperatorOrOwner(tokenId) {
        KeeperData storage k = keepers[tokenId];
        k.actionsFired += 1;
        k.lastActionAt = block.timestamp;
        if (action == ActionType.Trigger || action == ActionType.Execute) {
            k.alertnessScore += 100;
        } else if (action == ActionType.Reminder) {
            k.alertnessScore += 5;
        } else {
            k.alertnessScore += 1;
        }
        emit ActionRecorded(tokenId, action, k.alertnessScore);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        KeeperData memory k = keepers[tokenId];
        string memory json = string.concat(
            '{"name":"WillKeeper #', tokenId.toString(),
            '","description":"ERC-7857 compatible iNFT. Autonomous agent watching a Wallet Will. Memory persisted on 0G Storage.",',
            '"image":"https://wallet-will.xyz/keeper/', tokenId.toString(), '.svg",',
            '"animation_url":"', k.memoryURI, '",',
            '"attributes":[',
                '{"trait_type":"Standard","value":"ERC-7857"},',
                '{"trait_type":"Will","value":"', Strings.toHexString(uint160(k.willAddress), 20), '"},',
                '{"trait_type":"Alertness","value":', k.alertnessScore.toString(), '},',
                '{"trait_type":"Actions Fired","value":', k.actionsFired.toString(), '},',
                '{"trait_type":"Memory URI","value":"', k.memoryURI, '"}',
            ']}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
