// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IENSRegistry {
    function resolver(bytes32 node) external view returns (address);
    function owner(bytes32 node) external view returns (address);
}

interface IENSResolver {
    function addr(bytes32 node) external view returns (address);
    function text(bytes32 node, string calldata key) external view returns (string memory);
}
