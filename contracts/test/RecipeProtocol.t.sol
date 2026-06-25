// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {AlchmRightsRegistry} from "../src/AlchmRightsRegistry.sol";
import {RecipeRegistry} from "../src/RecipeRegistry.sol";

contract RecipeProtocolTest is Test {
    AlchmRightsRegistry rights;
    RecipeRegistry recipes;

    address admin = address(0xA11CE);
    address rightsHolder = address(0xB0B);
    address operator = address(0xCAFE);
    address recipient = address(0xD00D);
    address buyer = address(0xBEEF);
    address outsider = address(0xBAD);

    bytes32 rightsId;
    bytes32 constant WORK_HASH = keccak256("alchm-registered-work");
    bytes32 constant EVIDENCE_HASH = keccak256("copyright-certificate-and-deposit-evidence");
    bytes32 constant CATALOG_ROOT = keccak256("ingredient-catalog-v1");
    bytes32 constant LICENSE_HASH = keccak256("license-tier:personal-v1");

    string constant TITLE = "Alchm Planetary-Food Algorithm";
    string constant AUTHORITY = "United States Copyright Office";
    string constant REGISTRATION = "VA 2-434-962";
    string constant LICENSE_URI = "walrus://alchm-license-v1";

    function setUp() public {
        vm.warp(1_000_000);
        rights = new AlchmRightsRegistry(admin);
        recipes = new RecipeRegistry(address(rights));

        vm.prank(admin);
        rightsId = rights.registerRights(_rightsInput(rightsHolder, TITLE, REGISTRATION, WORK_HASH, EVIDENCE_HASH));
    }

    function _rightsInput(
        address holder,
        string memory title,
        string memory registration,
        bytes32 workHash,
        bytes32 evidenceHash
    ) internal pure returns (AlchmRightsRegistry.RegisterRightsInput memory input) {
        input = AlchmRightsRegistry.RegisterRightsInput({
            rightsHolder: holder,
            workHash: workHash,
            evidenceHash: evidenceHash,
            licenseHash: LICENSE_HASH,
            title: title,
            authority: AUTHORITY,
            registrationNumber: registration,
            licenseURI: LICENSE_URI
        });
    }

    function _input(bytes32 contentHash) internal view returns (RecipeRegistry.MintRecipeInput memory input) {
        input = RecipeRegistry.MintRecipeInput({
            recipient: recipient,
            rightsId: bytes32(0), // filled by caller because storage values are unavailable in pure
            contentHash: contentHash,
            computationHash: keccak256(abi.encode("computation", contentHash)),
            ingredientCatalogRoot: CATALOG_ROOT,
            licenseHash: LICENSE_HASH,
            parentTokenId: 0,
            engineVersion: 1,
            relation: RecipeRegistry.Relation.Original,
            royaltyBps: 500,
            contentURI: "walrus://recipe-content",
            metadataURI: "https://agents.alchm.kitchen/api/recipes/nft/1"
        });
    }

    function _original(bytes32 contentHash) internal view returns (RecipeRegistry.MintRecipeInput memory input) {
        input = _input(contentHash);
        input.rightsId = rightsId;
    }

    function _mintAs(address minter, RecipeRegistry.MintRecipeInput memory input) internal returns (uint256 tokenId) {
        vm.prank(minter);
        tokenId = recipes.mintRecipe(input);
    }

    // ── Rights anchor ───────────────────────────────────────────────────────

    function test_RegisterRights_AnchorsCopyrightRecord() public view {
        AlchmRightsRegistry.RightsAnchor memory anchor = rights.getRights(rightsId);
        assertEq(anchor.rightsHolder, rightsHolder);
        assertEq(anchor.workHash, WORK_HASH);
        assertEq(anchor.evidenceHash, EVIDENCE_HASH);
        assertEq(anchor.licenseHash, LICENSE_HASH);
        assertEq(anchor.registeredAt, 1_000_000);
        assertEq(anchor.operatorEpoch, 1);
        assertEq(anchor.title, TITLE);
        assertEq(anchor.authority, AUTHORITY);
        assertEq(anchor.registrationNumber, REGISTRATION);
        assertEq(anchor.licenseURI, LICENSE_URI);

        bytes32 registrationKey = rights.registrationKeyOf(AUTHORITY, REGISTRATION);
        assertEq(rights.anchorForRegistration(registrationKey), rightsId);
    }

    function test_RegisterRights_OnlyRegistrar() public {
        bytes32 registrarRole = rights.REGISTRAR_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, registrarRole)
        );
        rights.registerRights(
            _rightsInput(outsider, "Other Work", "VA 0-000-000", keccak256("other"), keccak256("evidence"))
        );
    }

    function test_RegisterRights_DuplicateRegistrationReverts() public {
        vm.prank(admin);
        vm.expectRevert(AlchmRightsRegistry.DuplicateRegistration.selector);
        rights.registerRights(
            _rightsInput(rightsHolder, TITLE, REGISTRATION, keccak256("different-file"), EVIDENCE_HASH)
        );
    }

    function test_UpdateLicense_OnlyRightsHolder() public {
        string memory nextURI = "walrus://alchm-license-v2";
        bytes32 nextHash = keccak256("license-tier:personal-v2");
        vm.prank(rightsHolder);
        rights.updateLicense(rightsId, nextHash, nextURI);
        AlchmRightsRegistry.RightsAnchor memory anchor = rights.getRights(rightsId);
        assertEq(anchor.licenseURI, nextURI);
        assertEq(anchor.licenseHash, nextHash);

        vm.prank(outsider);
        vm.expectRevert(AlchmRightsRegistry.NotRightsHolder.selector);
        rights.updateLicense(rightsId, keccak256("malicious"), "walrus://malicious");
    }

    function test_OperatorAuthorization_IsRevokedByRightsTransfer() public {
        vm.prank(rightsHolder);
        rights.setOperator(rightsId, operator, true);
        assertTrue(rights.isAuthorized(rightsId, operator));

        bytes32 instrumentHash = keccak256("signed-transfer-instrument");
        vm.prank(rightsHolder);
        rights.proposeTransfer(rightsId, buyer, instrumentHash, "walrus://signed-transfer-instrument");
        vm.prank(buyer);
        rights.acceptTransfer(rightsId);

        assertEq(rights.rightsHolderOf(rightsId), buyer);
        assertTrue(rights.isAuthorized(rightsId, buyer));
        assertFalse(rights.isAuthorized(rightsId, rightsHolder));
        assertFalse(rights.isAuthorized(rightsId, operator));
        assertEq(rights.getRights(rightsId).operatorEpoch, 2);
    }

    function test_RightsTransfer_OnlyProposedHolderCanAccept() public {
        vm.prank(rightsHolder);
        rights.proposeTransfer(
            rightsId, buyer, keccak256("signed-transfer-instrument"), "walrus://signed-transfer-instrument"
        );

        vm.prank(outsider);
        vm.expectRevert(AlchmRightsRegistry.NotProposedHolder.selector);
        rights.acceptTransfer(rightsId);
    }

    function test_RightsTransfer_CanBeCancelled() public {
        vm.prank(rightsHolder);
        rights.proposeTransfer(
            rightsId, buyer, keccak256("signed-transfer-instrument"), "walrus://signed-transfer-instrument"
        );
        vm.prank(rightsHolder);
        rights.cancelTransfer(rightsId);

        vm.prank(buyer);
        vm.expectRevert(AlchmRightsRegistry.NoPendingTransfer.selector);
        rights.acceptTransfer(rightsId);
    }

    // ── Recipe NFTs ─────────────────────────────────────────────────────────

    function test_MintOriginal_CreatesImmutableAttributedNFT() public {
        bytes32 contentHash = keccak256("canonical-recipe-v1");
        RecipeRegistry.MintRecipeInput memory input = _original(contentHash);
        uint256 tokenId = _mintAs(rightsHolder, input);

        assertEq(tokenId, 1);
        assertEq(recipes.ownerOf(tokenId), recipient);
        assertEq(recipes.creatorOf(tokenId), rightsHolder);
        assertEq(recipes.tokenForContentHash(contentHash), tokenId);
        assertEq(recipes.tokenURI(tokenId), input.metadataURI);

        RecipeRegistry.RecipeRecord memory record = recipes.getRecipe(tokenId);
        assertEq(record.rightsId, rightsId);
        assertEq(record.contentHash, contentHash);
        assertEq(record.computationHash, input.computationHash);
        assertEq(record.ingredientCatalogRoot, CATALOG_ROOT);
        assertEq(record.licenseHash, LICENSE_HASH);
        assertEq(record.parentTokenId, 0);
        assertEq(record.creator, rightsHolder);
        assertEq(record.engineVersion, 1);
        assertEq(record.mintedAt, 1_000_000);
        assertEq(uint256(record.relation), uint256(RecipeRegistry.Relation.Original));

        (address royaltyReceiver, uint256 royaltyAmount) = recipes.royaltyInfo(tokenId, 1 ether);
        assertEq(royaltyReceiver, rightsHolder);
        assertEq(royaltyAmount, 0.05 ether);
        assertTrue(recipes.supportsInterface(type(IERC2981).interfaceId));
    }

    function test_TransferNFT_DoesNotChangeCreator() public {
        uint256 tokenId = _mintAs(rightsHolder, _original(keccak256("canonical-recipe-v1")));
        vm.prank(recipient);
        recipes.transferFrom(recipient, buyer, tokenId);
        assertEq(recipes.ownerOf(tokenId), buyer);
        assertEq(recipes.creatorOf(tokenId), rightsHolder);
    }

    function test_AuthorizedOperatorCanMint() public {
        vm.prank(rightsHolder);
        rights.setOperator(rightsId, operator, true);
        uint256 tokenId = _mintAs(operator, _original(keccak256("agent-created-recipe")));
        assertEq(recipes.creatorOf(tokenId), operator);
    }

    function test_UnauthorizedWalletCannotMint() public {
        vm.prank(outsider);
        vm.expectRevert(RecipeRegistry.UnauthorizedMinter.selector);
        recipes.mintRecipe(_original(keccak256("unauthorized-recipe")));
    }

    function test_DuplicateContentHashReverts() public {
        bytes32 contentHash = keccak256("canonical-recipe-v1");
        _mintAs(rightsHolder, _original(contentHash));
        vm.prank(rightsHolder);
        vm.expectRevert(abi.encodeWithSelector(RecipeRegistry.ContentAlreadyRegistered.selector, uint256(1)));
        recipes.mintRecipe(_original(contentHash));
    }

    function test_RecipeMustUseCurrentRightsLicense() public {
        RecipeRegistry.MintRecipeInput memory input = _original(keccak256("wrong-license"));
        input.licenseHash = keccak256("unapproved-license");

        vm.prank(rightsHolder);
        vm.expectRevert(RecipeRegistry.LicenseMismatch.selector);
        recipes.mintRecipe(input);
    }

    function test_RevisionRequiresSameCreator() public {
        uint256 parent = _mintAs(rightsHolder, _original(keccak256("canonical-recipe-v1")));

        vm.prank(rightsHolder);
        rights.setOperator(rightsId, operator, true);

        RecipeRegistry.MintRecipeInput memory revision = _original(keccak256("revision-v2"));
        revision.parentTokenId = parent;
        revision.relation = RecipeRegistry.Relation.Revision;

        vm.prank(operator);
        vm.expectRevert(RecipeRegistry.InvalidLineage.selector);
        recipes.mintRecipe(revision);

        uint256 revisionId = _mintAs(rightsHolder, revision);
        assertEq(recipes.getRecipe(revisionId).parentTokenId, parent);
        assertEq(uint256(recipes.getRecipe(revisionId).relation), uint256(RecipeRegistry.Relation.Revision));
    }

    function test_AuthorizedOperatorCanForkRecipe() public {
        uint256 parent = _mintAs(rightsHolder, _original(keccak256("canonical-recipe-v1")));
        vm.prank(rightsHolder);
        rights.setOperator(rightsId, operator, true);

        RecipeRegistry.MintRecipeInput memory fork = _original(keccak256("licensed-fork"));
        fork.parentTokenId = parent;
        fork.relation = RecipeRegistry.Relation.Fork;
        uint256 forkId = _mintAs(operator, fork);

        assertEq(recipes.getRecipe(forkId).creator, operator);
        assertEq(recipes.getRecipe(forkId).parentTokenId, parent);
        assertEq(uint256(recipes.getRecipe(forkId).relation), uint256(RecipeRegistry.Relation.Fork));
    }

    function test_OriginalCannotDeclareParent() public {
        uint256 parent = _mintAs(rightsHolder, _original(keccak256("canonical-recipe-v1")));
        RecipeRegistry.MintRecipeInput memory invalid = _original(keccak256("bad-original"));
        invalid.parentTokenId = parent;

        vm.prank(rightsHolder);
        vm.expectRevert(RecipeRegistry.InvalidLineage.selector);
        recipes.mintRecipe(invalid);
    }

    function test_ForkMustUseParentsRightsAnchor() public {
        uint256 parent = _mintAs(rightsHolder, _original(keccak256("canonical-recipe-v1")));
        vm.prank(admin);
        bytes32 otherRightsId = rights.registerRights(
            _rightsInput(
                rightsHolder, "Second Work", "VA 9-999-999", keccak256("other-work"), keccak256("other-evidence")
            )
        );

        RecipeRegistry.MintRecipeInput memory fork = _original(keccak256("wrong-anchor-fork"));
        fork.rightsId = otherRightsId;
        fork.parentTokenId = parent;
        fork.relation = RecipeRegistry.Relation.Fork;
        vm.prank(rightsHolder);
        vm.expectRevert(RecipeRegistry.InvalidLineage.selector);
        recipes.mintRecipe(fork);
    }

    function test_RoyaltyAboveCapReverts() public {
        RecipeRegistry.MintRecipeInput memory input = _original(keccak256("expensive-royalty"));
        input.royaltyBps = 1_001;
        vm.prank(rightsHolder);
        vm.expectRevert(RecipeRegistry.RoyaltyTooHigh.selector);
        recipes.mintRecipe(input);
    }

    function test_RightsTransferImmediatelyChangesMintAuthority() public {
        vm.prank(rightsHolder);
        rights.proposeTransfer(
            rightsId, buyer, keccak256("signed-transfer-instrument"), "walrus://signed-transfer-instrument"
        );
        vm.prank(buyer);
        rights.acceptTransfer(rightsId);

        vm.prank(rightsHolder);
        vm.expectRevert(RecipeRegistry.UnauthorizedMinter.selector);
        recipes.mintRecipe(_original(keccak256("old-holder-recipe")));

        uint256 tokenId = _mintAs(buyer, _original(keccak256("new-holder-recipe")));
        assertEq(recipes.creatorOf(tokenId), buyer);
    }
}
