// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPlanetaryRegistry {
    struct AgentState {
        bytes32 targetPersonaHash; // Hash of the 64-dim Float64Array
        bytes32 epochHash;         // Current cosmic context snapshot hash
        uint256 lastUpdated;
        address wallet;            // Agent's sovereign ERC-4337 wallet
    }

    event StateAnchored(bytes32 indexed agentNode, bytes32 targetPersonaHash, bytes32 epochHash);

    /// @notice Anchors the latest JEPA state for an agent via ENSIP-25/26 text records
    /// @dev Enforces Domicile > Exaltation logic implicitly by requiring valid epoch hashes
    function anchorAgentState(bytes32 agentNode, bytes32 _targetPersonaHash, bytes32 _epochHash) external;

    function getAgentState(bytes32 agentNode) external view returns (AgentState memory);
}
