// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConstellationDeed
 * @notice The liquidity-provider position for a Constellation pool — a *transferable*
 * ERC-721, deliberately the opposite of soulbound ESMS. ESMS are utility points that
 * can never move between players; a Deed is the tradable trophy that proves you
 * traced a constellation and seeded its sky-gated pool. Holding the Deed is what lets
 * you withdraw your share of the pool's reserves.
 *
 * Minted, reshared and burned exclusively by the ConstellationAMM (set once by the
 * owner). The owner never mints — it only wires the AMM.
 */
contract ConstellationDeed is ERC721, Ownable {
    struct Position {
        uint16 constellationId;
        uint256 shares;
        uint64 mintedAtBlock;
    }

    /// The only address allowed to mint/burn/reshare. Set once to the AMM.
    address public amm;
    uint256 public nextId = 1;
    mapping(uint256 => Position) public positions;

    error AmmAlreadySet();
    error NotAmm();

    constructor(address initialOwner)
        ERC721("Pentacles Constellation Deed", "DEED")
        Ownable(initialOwner)
    {}

    /// Wire the AMM once. Immutable thereafter so a Deed can never be reminted
    /// by a swapped-in authority.
    function setAmm(address amm_) external onlyOwner {
        if (amm != address(0)) revert AmmAlreadySet();
        amm = amm_;
    }

    modifier onlyAmm() {
        if (msg.sender != amm) revert NotAmm();
        _;
    }

    function mint(address to, uint16 constellationId, uint256 shares)
        external
        onlyAmm
        returns (uint256 id)
    {
        id = nextId++;
        positions[id] = Position(constellationId, shares, uint64(block.number));
        _mint(to, id); // plain _mint (no onERC721Received callback) — AMM controls flow
    }

    /// Reduce a position's shares after a partial withdrawal.
    function setShares(uint256 id, uint256 shares) external onlyAmm {
        positions[id].shares = shares;
    }

    /// Burn on a full withdrawal.
    function burn(uint256 id) external onlyAmm {
        delete positions[id];
        _burn(id);
    }

    function positionOf(uint256 id)
        external
        view
        returns (uint16 constellationId, uint256 shares, uint64 mintedAtBlock)
    {
        Position storage p = positions[id];
        return (p.constellationId, p.shares, p.mintedAtBlock);
    }
}
