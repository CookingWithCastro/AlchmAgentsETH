// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IPlanetaryRegistry.sol";

/**
 * @title PlanetaryRegistry
 * @dev On-chain cryptographic registry for JEPA target persona state commitments and cosmic context snapshots.
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 */
contract PlanetaryRegistry is IPlanetaryRegistry {
    mapping(bytes32 => AgentState) private _agentStates;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "PlanetaryRegistry: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @inheritdoc IPlanetaryRegistry
    function anchorAgentState(bytes32 agentNode, bytes32 _targetPersonaHash, bytes32 _epochHash) external override {
        require(_targetPersonaHash != bytes32(0), "PlanetaryRegistry: Invalid persona hash");
        require(_epochHash != bytes32(0), "PlanetaryRegistry: Invalid epoch hash");

        AgentState storage state = _agentStates[agentNode];
        state.targetPersonaHash = _targetPersonaHash;
        state.epochHash = _epochHash;
        state.lastUpdated = block.timestamp;

        if (state.wallet == address(0)) {
            state.wallet = msg.sender;
        }

        emit StateAnchored(agentNode, _targetPersonaHash, _epochHash);
    }

    /// @inheritdoc IPlanetaryRegistry
    function getAgentState(bytes32 agentNode) external view override returns (AgentState memory) {
        return _agentStates[agentNode];
    }
}
