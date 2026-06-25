// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721Royalty} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AlchmRightsRegistry} from "./AlchmRightsRegistry.sol";

/**
 * @title RecipeRegistry
 * @notice Immutable, versioned recipe records anchored to an Alchm rights record.
 *
 * Each ERC-721 token represents one canonical recipe version. Heavy recipe and
 * display metadata remain off-chain; their immutable content hash and locators,
 * deterministic computation commitment, ingredient-catalog root, license hash,
 * authorship, and lineage live here.
 *
 * NFT ownership and creator attribution are deliberately separate. Transferring a
 * token never changes `creator` and does not itself transfer the referenced
 * copyright or grant rights beyond the license manifest identified by `licenseHash`.
 */
contract RecipeRegistry is ERC721Royalty, ReentrancyGuard {
    uint96 public constant MAX_ROYALTY_BPS = 1_000; // 10%

    enum Relation {
        Original,
        Revision,
        Fork
    }

    struct RecipeRecord {
        bytes32 rightsId;
        bytes32 contentHash;
        bytes32 computationHash;
        bytes32 ingredientCatalogRoot;
        bytes32 licenseHash;
        uint256 parentTokenId;
        address creator;
        uint64 engineVersion;
        uint64 mintedAt;
        Relation relation;
        string contentURI;
        string metadataURI;
    }

    struct MintRecipeInput {
        address recipient;
        bytes32 rightsId;
        bytes32 contentHash;
        bytes32 computationHash;
        bytes32 ingredientCatalogRoot;
        bytes32 licenseHash;
        uint256 parentTokenId;
        uint64 engineVersion;
        Relation relation;
        uint96 royaltyBps;
        string contentURI;
        string metadataURI;
    }

    AlchmRightsRegistry public immutable rightsRegistry;
    uint256 public nextTokenId = 1;

    mapping(uint256 tokenId => RecipeRecord record) private _recipes;
    mapping(bytes32 contentHash => uint256 tokenId) public tokenForContentHash;

    event RecipeMinted(
        uint256 indexed tokenId,
        bytes32 indexed rightsId,
        bytes32 indexed contentHash,
        address creator,
        address recipient,
        uint256 parentTokenId,
        Relation relation,
        uint64 engineVersion,
        bytes32 computationHash,
        bytes32 ingredientCatalogRoot,
        bytes32 licenseHash,
        string contentURI,
        string metadataURI
    );

    error ContentAlreadyRegistered(uint256 tokenId);
    error EmptyURI();
    error InvalidAddress();
    error InvalidEngineVersion();
    error InvalidHash();
    error InvalidLineage();
    error LicenseMismatch();
    error ParentNotFound();
    error RightsAnchorNotFound();
    error UnauthorizedMinter();
    error RoyaltyTooHigh();

    constructor(address rightsRegistry_) ERC721("Alchm Recipe", "ALCHM-RECIPE") {
        if (rightsRegistry_ == address(0)) revert InvalidAddress();
        rightsRegistry = AlchmRightsRegistry(rightsRegistry_);
    }

    function mintRecipe(MintRecipeInput calldata input) external nonReentrant returns (uint256 tokenId) {
        _validate(input);

        tokenId = nextTokenId++;
        tokenForContentHash[input.contentHash] = tokenId;
        _recipes[tokenId] = RecipeRecord({
            rightsId: input.rightsId,
            contentHash: input.contentHash,
            computationHash: input.computationHash,
            ingredientCatalogRoot: input.ingredientCatalogRoot,
            licenseHash: input.licenseHash,
            parentTokenId: input.parentTokenId,
            creator: msg.sender,
            engineVersion: input.engineVersion,
            mintedAt: uint64(block.timestamp),
            relation: input.relation,
            contentURI: input.contentURI,
            metadataURI: input.metadataURI
        });

        _safeMint(input.recipient, tokenId);
        if (input.royaltyBps != 0) {
            _setTokenRoyalty(tokenId, msg.sender, input.royaltyBps);
        }

        emit RecipeMinted(
            tokenId,
            input.rightsId,
            input.contentHash,
            msg.sender,
            input.recipient,
            input.parentTokenId,
            input.relation,
            input.engineVersion,
            input.computationHash,
            input.ingredientCatalogRoot,
            input.licenseHash,
            input.contentURI,
            input.metadataURI
        );
    }

    function getRecipe(uint256 tokenId) external view returns (RecipeRecord memory) {
        _requireOwned(tokenId);
        return _recipes[tokenId];
    }

    function creatorOf(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return _recipes[tokenId].creator;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _recipes[tokenId].metadataURI;
    }

    function _validate(MintRecipeInput calldata input) internal view {
        if (input.recipient == address(0)) revert InvalidAddress();
        if (!rightsRegistry.exists(input.rightsId)) revert RightsAnchorNotFound();
        if (!rightsRegistry.isAuthorized(input.rightsId, msg.sender)) revert UnauthorizedMinter();
        if (
            input.contentHash == bytes32(0) || input.computationHash == bytes32(0)
                || input.ingredientCatalogRoot == bytes32(0) || input.licenseHash == bytes32(0)
        ) revert InvalidHash();
        if (input.licenseHash != rightsRegistry.licenseHashOf(input.rightsId)) revert LicenseMismatch();
        uint256 existing = tokenForContentHash[input.contentHash];
        if (existing != 0) revert ContentAlreadyRegistered(existing);
        if (input.engineVersion == 0) revert InvalidEngineVersion();
        if (bytes(input.contentURI).length == 0 || bytes(input.metadataURI).length == 0) {
            revert EmptyURI();
        }
        if (input.royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();

        if (input.relation == Relation.Original) {
            if (input.parentTokenId != 0) revert InvalidLineage();
            return;
        }

        if (_ownerOf(input.parentTokenId) == address(0)) revert ParentNotFound();
        RecipeRecord storage parent = _recipes[input.parentTokenId];
        if (parent.rightsId != input.rightsId) revert InvalidLineage();
        if (input.relation == Relation.Revision && parent.creator != msg.sender) {
            revert InvalidLineage();
        }
    }
}
