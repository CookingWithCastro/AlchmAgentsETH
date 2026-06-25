# Alchm ESMS contracts (Foundry)

`EsmsToken` — a **soulbound, upgradeable ERC-1155** for the on-chain ESMS economy
(Spirit/Essence/Matter/Substance) on **Base**. Phase 1 = claim/mirror: the off-chain
WTEN ledger stays authoritative; the PA backend debits off-chain then mints here.

## Prereqs — install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash   # installs `foundryup`
foundryup                                       # installs forge / cast / anvil
```

## Setup (from `contracts/`)

```bash
forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.1.0 --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vvv     # mint, idempotency, soulbound, pause, roles, UUPS upgrade
```

## Deploy (Base Sepolia testnet first)

```bash
export DEPLOYER_PRIVATE_KEY=0x...          # a funded testnet key (gets ADMIN/PAUSER/UPGRADER)
export MINTER_ADDRESS=0x...                # the PA backend minter wallet (gets MINTER_ROLE)
export ESMS_METADATA_URI="https://agents.alchm.kitchen/api/esms/metadata/{id}"
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASESCAN_API_KEY=...                # optional, for --verify

forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify
# → prints the proxy address. Set it as ESMS_CONTRACT_ADDRESS in the PA env.
```

## Key properties

- **Soulbound:** `_update` reverts on account-to-account transfer; only mint (from 0x0)
  and burn (to 0x0) are allowed.
- **Idempotent claims:** `claimMint(to, claimId, ids, amounts)` reverts if `claimId`
  was already processed — a retried claim never double-mints.
- **Roles:** `MINTER_ROLE` (backend), `PAUSER_ROLE` + `UPGRADER_ROLE` + `DEFAULT_ADMIN`
  (deployer/multisig). **Protect the minter key** — it can mint unlimited ESMS.
- **Upgradeable (UUPS):** fix bugs / add Phase 2 (redeem, transfers) without migrating state.
- **Pausable:** emergency kill switch on all mint/burn/transfer.

## Phase 2 — shop redeem/burn (shipped)

The ESMS Bazaar spends tokens with a real on-chain burn (ESMS is soulbound, so a
burn IS the spend):

- `redeem(orderId, ids, amounts)` — the holder burns their own balance.
- `redeemFor(from, orderId, ids, amounts)` — a `BURNER_ROLE` settlement wallet
  burns on the holder's behalf, sponsoring gas.
- `redeemedOrders[orderId]` makes each purchase idempotent; a matching
  `Redeemed` event lets the backend confirm a user-signed burn before fulfilling.

See [`../docs/SHOPPING.md`](../docs/SHOPPING.md). Tests:
`forge test --match-path test/EsmsRedeem.t.sol`.

Still later: transferability unlock, a paymaster for fully user-paid txs,
external-wallet targets, mainnet promotion.

## Recipe rights + NFT provenance protocol

`AlchmRightsRegistry` anchors a registered work, declared rights holder, evidence
hash, and versioned license manifest. Rights-holder transfers use a two-party
propose/accept flow referencing an external signed transfer instrument. A transfer
increments the operator epoch, automatically invalidating every previously
authorized recipe-minting agent.

`RecipeRegistry` mints one ERC-721 per immutable canonical recipe version. Each
record commits to its content hash, deterministic computation hash, ingredient
catalog root, rights anchor, license hash, creator, engine version, and
revision/fork lineage. NFT ownership never overwrites creator attribution.
ERC-2981 royalties are optional and capped at 10%.

```bash
# Focused test suite
forge test --match-path test/RecipeProtocol.t.sol -vvv

# Base Sepolia deployment (separate from Deploy.s.sol; existing addresses do not shift)
export DEPLOYER_PRIVATE_KEY=0x...
export RIGHTS_HOLDER=0x...
export ALCHM_WORK_HASH=0x...       # keccak256 of canonical work/manifest bytes
export ALCHM_EVIDENCE_HASH=0x...   # keccak256 of certificate/evidence bundle
export ALCHM_LICENSE_HASH=0x...    # keccak256 of canonical license-manifest bytes
export ALCHM_LICENSE_URI=walrus://...

forge script script/DeployRecipeProtocol.s.sol:DeployRecipeProtocol \
  --rpc-url base_sepolia --broadcast --verify
```

The genesis deployment script identifies the work as
`Alchm Planetary-Food Algorithm`, U.S. Copyright Reg. No. `VA 2-434-962`.
The registry is a provenance and licensing record, not an adjudication of the
legal validity or scope of a claim, license, or transfer.
