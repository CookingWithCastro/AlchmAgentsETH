# AAE Web3 / Solana Stack — Orientation Audit and Initial Architecture Plan

**Status:** Gate 0 approved; Phase 1 scaffolding and Phase 2 ESMS/persona core implemented on Devnet.
**Audit date:** 2026-07-31.
**Target:** Solana Devnet first, preserving the existing EVM deployments and the WTEN off-chain ledger.
**Scope note:** this is a code-orientation and architecture audit, not a formal smart-contract security audit.

## Executive summary

AAE already has two distinct EVM rails:

- Base Sepolia hosts the ESMS claim/shop lifecycle.
- Circle Arc testnet hosts ESMS plus star staking, the virtual-reserve constellation AMM, and transferable LP Deeds.

Those deployments use the same ESMS contract address but have independent chain state. There is no bridge or global on-chain supply coordinator. The authoritative WTEN ledger prevents a normal claim from being free, but the existing system should not yet be described as fungibly “omnichain.” Solana should begin as a third settlement domain coordinated by the same off-chain ledger, not as an automatic bridge.

The recommended Solana v1 is one modular Anchor program, four deterministic Token-2022 mints, deterministic PDA state, and a Bun sync worker. The four ESMS mints should use **4 decimals**, not EVM's 18 decimals. The existing ledger is `Decimal(12,4)`, so a 4-decimal raw balance exactly preserves every ledger unit and safely fits in a Solana `u64`. An 18-decimal Solana mint would cap the supply at only about 18.446 whole tokens.

Each ESMS mint should combine:

- `NonTransferable` to enforce soulbound balances;
- `PermissionedBurn` so holders cannot bypass the AAE redemption lifecycle;
- a program-PDA permanent delegate for sponsored `redeem_for` burns;
- a self-referential Metadata Pointer plus Token Metadata.

Token-2022's official guide explicitly notes that `NonTransferable` alone still lets the holder burn. The newer Permissioned Burn extension adds the issuer co-signature that AAE needs. See the [Token-2022 extension guide](https://www.solana-program.com/docs/token-2022/extensions#non-transferable-tokens) and its [Permissioned Burn section](https://www.solana-program.com/docs/token-2022/extensions#permissioned-burn).

The Solana implementation should preserve the good EVM invariants—claim/order replay protection, granular pause semantics, always-available exits, attestor nonces and deadlines, the star Merkle root, and yield caps—while fixing several gaps found in the current code:

1. `PlanetaryRegistry.anchorAgentState` is not access-controlled; any account can overwrite any agent commitment.
2. `lib/jepa/onchain-sync.ts` does not currently produce a canonical 32-byte epoch commitment and contains a publicly known fallback private key.
3. Adding principal to an existing StarVault position gives the new principal the old accrual start time.
4. `ConstellationAMM.seedInitial` can be called repeatedly by the admin without burning ESMS; the resulting Deed can later withdraw and mint ESMS, making the admin an effective unbounded minter.
5. No event indexer projects staking or AMM state into PostgreSQL today.

## Audit basis and verification status

The audit followed contract source, tests, Next.js routes, Prisma models, frontend hooks, and the JEPA writer. The local Foundry suite passed **93/93 tests** on 2026-07-31. `scripts/verify-deploy.ts` confirmed bytecode at all four configured Arc addresses, after which the public Arc RPC rate-limited the role reads. Accordingly:

- contract behavior below is source- and test-verified;
- configured addresses are bytecode-verified in this pass;
- the full live role/configuration table is recorded in [`WEB3_STATUS.md`](../WEB3_STATUS.md), last verified there on 2026-07-19, but was not independently re-verified end to end during this audit.

## Phase 1 — existing EVM and off-chain infrastructure

### 1. ESMS: one soulbound ERC-1155, four token IDs

Source: [`contracts/src/EsmsToken.sol`](../contracts/src/EsmsToken.sol).

|  ID | Name      | Elemental use | EVM unit scale |
| --: | --------- | ------------- | -------------: |
|   0 | Spirit    | Fire          |    18 decimals |
|   1 | Essence   | Water         |    18 decimals |
|   2 | Matter    | Earth         |    18 decimals |
|   3 | Substance | Air           |    18 decimals |

Implemented behavior:

- `_update` permits only mint (`from == 0`) and burn (`to == 0`). Wallet-to-wallet transfers always revert.
- `claimMint(to, claimId, ids, amounts)` is `MINTER_ROLE`-gated and marks `claimed[claimId]` before minting. EVM transaction atomicity rolls the mark back if validation or minting fails.
- `redeem(orderId, ids, amounts)` burns only the caller's balance. `redeemedOrders[orderId]` is the replay guard.
- `redeemFor(...)` requires both `BURNER_ROLE` and an unexpired holder EIP-712 signature over holder, order, IDs, amounts, and deadline.
- `burn(from, ...)` is deliberately reserved for vetted contracts such as `ConstellationAMM`, not settlement EOAs.
- The ESMS pause freezes only `redeem` and `redeemFor`; claim mints and AMM burns remain available by design.
- The UUPS implementation separates admin, minter, burner, pauser, and upgrader powers.

The authoritative ledger is PostgreSQL/WTEN `Decimal(12,4)`, while [`lib/esms-chain/minter.ts`](../lib/esms-chain/minter.ts) calls `parseUnits(value, 18)`. The API route [`app/api/esms/claim/route.ts`](../app/api/esms/claim/route.ts) creates a local reconciliation row, debits WTEN first with the same `claimId`, then submits `claimMint`. If the transaction response is lost, it checks `claimed(claimId)` on-chain before retrying.

### 2. Planetary persona registry and JEPA commitment writer

Sources:

- [`contracts/PlanetaryRegistry.sol`](../contracts/PlanetaryRegistry.sol)
- [`contracts/IPlanetaryRegistry.sol`](../contracts/IPlanetaryRegistry.sol)
- [`lib/jepa/onchain-sync.ts`](../lib/jepa/onchain-sync.ts)
- [`lib/jepa/cosmic-context-encoder.ts`](../lib/jepa/cosmic-context-encoder.ts)

The contract stores one latest `AgentState` per `bytes32 agentNode`:

```text
targetPersonaHash : bytes32
epochHash         : bytes32
lastUpdated       : uint256 timestamp
wallet            : address set by the first writer
```

The TypeScript writer hashes the raw buffer of the in-memory `Float64Array` target persona with SHA-256. The current context encoder hashes JSON with SHA-256 but retains only 16 hex characters (64 bits); the writer then right-pads those characters with zeroes to fill `bytes32`. The fallback value `static-fallback-01` is not hexadecimal and cannot be submitted as a valid `bytes32` through viem.

Important differences between comments and enforcement:

- `anchorAgentState` does **not** apply the declared `onlyOwner` modifier.
- The stored `wallet` is not checked on later updates.
- The contract checks only that the two hashes are nonzero. It cannot prove a vector has 64 dimensions, that an epoch payload exists, or that `Domicile > Exaltation` was followed.
- `agentNode` is `sha256(agentId)`, not ENS namehash.
- ENSIP records are not written by this contract.
- The writer falls back to the public test key `0x11…11` if `AGENT_DEPLOYER_KEY` is absent. That must be removed before another live registry is configured.

The Solana design therefore treats these values as opaque commitments and adds explicit writer authorization, monotonic sequence numbers, and a canonical hashing specification.

### 3. StarVault staking and yield settlement

Source: [`contracts/src/StarVault.sol`](../contracts/src/StarVault.sol).

State and invariants:

- `starRoot` commits to the allowed Hipparcos IDs.
- A star is activated once by an admin or by a permissionless Merkle proof. Updating the root does not deactivate a previously activated star.
- Each star has a logical pool with `totalPrincipal` and `totalShares`; the contract has shared USDC custody.
- Each `(starId, staker)` has shares, a next attestation nonce, and `lastClaimAt`.
- Stake pulls 6-decimal USDC and mints proportional internal shares.
- Unstake is not pausable and needs no attestation.
- Yield is computed off-chain, signed under EIP-712 by an `ATTESTOR_ROLE`, and checked on-chain against staker, element, nonce, deadline, and `yieldCap`.
- The cap is:

```text
principal_usdc_6dp × max_rate_esms_18dp_per_usdc_day × elapsed_seconds
────────────────────────────────────────────────────────────────────
                         1e6 × 86,400
```

The frontend/API path is:

```text
useStarStaking
  -> /api/staking/star-proof (only on first activation)
  -> approve USDC
  -> StarVault.stake

useStarStaking.claim
  -> /api/staking/claim-attestation
  -> read principalOf + usedNonce + yieldCap
  -> calculate visibility/rate from client-supplied sky, natal and location inputs
  -> clamp to yieldCap and sign
  -> StarVault.claimYield
```

Migration gap: `lastClaimAt` is set only when the user's shares were zero. A user can let a small position age, add a much larger principal, and immediately receive a cap based on the larger current principal over the entire old elapsed period. Solana should checkpoint accrued cap using the **old** principal before every stake/unstake change.

### 4. Constellation AMM and Deed NFT

Sources:

- [`contracts/src/ConstellationAMM.sol`](../contracts/src/ConstellationAMM.sol)
- [`contracts/src/ConstellationDeed.sol`](../contracts/src/ConstellationDeed.sol)

The AMM is a constant-product market over soulbound ESMS. It cannot custody ESMS, so each pool stores virtual reserves. A swap burns the input from the caller and mints the output. The AMM therefore holds both `MINTER_ROLE` and `BURNER_ROLE`.

Each pool stores:

```text
elemA, elemB : uint8
feeBps       : uint16
reserveA/B   : uint256 virtual reserves
totalShares  : uint256
exists       : bool
```

`seedLiquidity` and `swap` require a short-lived, per-trader/per-pool nonce-bearing visibility attestation. Liquidity additions enforce `minShares` and a 1% ratio tolerance. Withdrawals require no attestation, are never paused, and return ESMS by minting it. The LP position is a transferable ERC-721 Deed whose AMM-controlled record stores `constellationId`, shares, and mint block.

Migration gaps:

- `seedInitial` is not limited to an empty pool. An admin may add virtual reserves repeatedly without an ESMS burn, receive withdrawable Deeds, and later mint those reserves by withdrawing.
- `feeBps` is not bounded at registration; values above 10,000 make swap arithmetic revert.
- The Solana bootstrap should be one-time, validate the fee, and lock any unbacked bootstrap shares permanently rather than issue an admin-withdrawable Deed.

### 5. Rights and recipe NFT registries

Sources:

- [`contracts/src/AlchmRightsRegistry.sol`](../contracts/src/AlchmRightsRegistry.sol)
- [`contracts/src/RecipeRegistry.sol`](../contracts/src/RecipeRegistry.sol)

`AlchmRightsRegistry` uses `REGISTRAR_ROLE` to prevent registration-number squatting. It stores immutable work/evidence identity plus a mutable holder and license. Rights transfer is a two-step propose/accept flow. Accepting increments `operatorEpoch`, invalidating every earlier operator approval without enumerating operators.

`RecipeRegistry` mints one transferable ERC-721 per immutable recipe version. It commits content, computation, ingredient catalog, license, creator, engine version, URI, and original/revision/fork lineage. Mint authority comes from the current rights holder/operator relation rather than an OpenZeppelin `MINTER_ROLE`. Optional ERC-2981 royalties are capped at 10%.

### 6. Effective authority map

| Surface   | EVM authority        | Effective power                                           |
| --------- | -------------------- | --------------------------------------------------------- |
| ESMS      | `DEFAULT_ADMIN_ROLE` | Grant/revoke ESMS roles and update URI                    |
| ESMS      | `MINTER_ROLE`        | Claim/yield/AMM mint                                      |
| ESMS      | `BURNER_ROLE`        | Vetted-contract burn and sponsored signed redeem          |
| ESMS      | `PAUSER_ROLE`        | Pause shop redeem paths only                              |
| ESMS      | `UPGRADER_ROLE`      | Replace UUPS implementation                               |
| StarVault | `ADMIN_ROLE`         | Set root, activate stars, set yield cap, grant roles      |
| StarVault | `ATTESTOR_ROLE`      | Sign bounded yield claims                                 |
| StarVault | `PAUSER_ROLE`        | Pause yield claims; stake/unstake remain live             |
| AMM       | `ADMIN_ROLE`         | Register/bootstrap pools; currently an indirect mint path |
| AMM       | `ATTESTOR_ROLE`      | Sign visibility for add/swap                              |
| AMM       | `PAUSER_ROLE`        | Pause add/swap; withdraw remains live                     |
| Deed      | owner, once          | Set AMM address once                                      |
| Deed      | AMM only             | Mint, resize and burn LP positions                        |
| Rights    | `REGISTRAR_ROLE`     | Create official rights anchors                            |
| Rights    | current holder       | License, operators and two-step transfer                  |

### 7. Backend, database, and indexer map

The Python FastAPI backend has ESMS calculations and staking-related persona text, but it does not submit or index these contracts. EVM settlement currently lives in Next.js routes and TypeScript libraries.

Existing persistence:

- `TokenBalance` stores the local `Decimal(12,4)` mirror.
- `esms_claims` stores claim ID, user, one EVM wallet, four amounts, status, transaction hash and network.
- `users.walletAddress` is explicitly an EVM/Privy address.
- `agent_wallets` is keyed only by `agentId` and defaults to Base Sepolia, so it cannot represent one agent on multiple chain families without a schema change.

Current consistency rules:

1. **Claim:** create row → debit WTEN with the same idempotency key → mint → mark minted. On-chain `claimed[claimId]` reconciles a lost response.
2. **Shop:** burn on-chain → verify the `Redeemed` event or reconcile `redeemedOrders` → grant a database entitlement with the same order ID.
3. **Staking/AMM:** no database projection. Hooks and attestation routes read the RPC directly.
4. **Persona:** one-way write from in-memory JEPA state; no durable write queue or event index.

The Solana `processed_tx` table proposed later prevents duplicate **indexing**. It does not replace on-chain Claim/Order Receipt PDAs, which prevent duplicate state transitions.

### 8. Existing client SDK and UI

The repository depends on `viem` and Dynamic's wallet context. It does **not** contain a `wagmi` dependency or Wagmi provider. The EVM hooks construct viem clients directly from Dynamic's EIP-1193 provider in [`lib/staking/wallet.ts`](../lib/staking/wallet.ts).

On-chain UI entry points include:

- `useStarStaking` → `StarStakePanel` and the portfolio page;
- `useZonePool` → `ZonePoolLP` and `SwapEssenceModal`;
- `useEsmsBalances` and `usePortfolio` → the Pentacles screens;
- `useArcWallet` → onboarding/network switching;
- shop purchase components → EIP-712 `redeemFor` challenge/sign/settle.

No Solana, Anchor, SPL Token, or wallet-adapter package is installed today.

## Phase 2 — proposed Solana architecture

### 1. Architecture principles

1. **Ledger-coordinated dual chain, not a bridge.** Every claim has exactly one immutable target chain.
2. **Program-owned authority.** Hot services may submit transactions or sign bounded attestations, but never own a Token-2022 mint authority.
3. **Deterministic accounts.** Mints and state are PDAs; initialization never generates replacement keypairs.
4. **On-chain replay guards.** Claim and redemption receipts remain permanently allocated.
5. **Lossless integer boundaries.** Rust uses `u64` amounts and `u128` intermediates; TypeScript/JSON/PostgreSQL never pass them through floating-point numbers.
6. **Granular pause, always-available exit.** Preserve unstake and LP withdrawal during incidents.
7. **Finalized database projections.** Confirmed state may power optimistic UI, but only finalized transactions update authoritative projections.
8. **Version every signed message and commitment.** Include program ID and cluster domain to prevent cross-program or cross-cluster replay.

Solana programs are stateless and keep mutable state in explicit accounts. PDAs are deterministic off-curve addresses that only their program can sign for; Anchor's `seeds`/`bump` constraints validate them. See the official [Solana core concepts](https://solana.com/docs/core) and [Anchor PDA guide](https://www.anchor-lang.com/docs/basics/pda).

### 2. One program now, explicit module seams

Use one `aae_solana` program on Devnet so a swap or stake claim can atomically update AAE state and CPI into Token-2022. Keep ESMS, persona, staking, AMM, and provenance in separate Rust modules. Before mainnet, reassess splitting mint/persona authority from market logic; that reduces upgrade blast radius but adds cross-program authorization and CPI complexity.

The program upgrade authority is separate from `GlobalConfig.admin`. Both should move to a multisig/governance authority before mainnet. Solana's verified-build documentation also recommends multisig/governance for deployment authority and explains source/deployment hash verification: [Verifying Programs](https://solana.com/docs/programs/verified-builds).

### 3. Target PDA topology through later phases

All integer seeds use fixed-width little-endian bytes; all externally supplied identifiers are first reduced to a 32-byte canonical hash. Every account includes a schema version and bump.

| PDA/state               | Seeds                                             | Core fields / purpose                                                                  |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ProgramConfig`         | `["program_authority"]`                           | Phase 2 admin, rotatable attestor/pauser, cluster domain, granular pause state         |
| `RoleGrant` (later)     | `["role", role_id, member]`                       | future active/expiry grants for scaled service/operator delegation                     |
| `EsmsMint`              | `["esms_mint", mint_id_u8]`                       | deterministic Token-2022 mint, mint ID `0..3`                                          |
| `ClaimReceipt`          | `["claim_receipt", claim_id_32]`                  | recipient, `[u64;4]` atoms, ledger hash, signer and slot; never closed                 |
| `OrderReceipt`          | `["order_receipt", order_id_32]`                  | holder, `[u64;4]` atoms, mode, submitter and slot; never closed                        |
| `PersonaCommitment`     | `["persona_commitment", agent_key_32]`            | writer, target hash, epoch hash, sequence and updated slot                             |
| `StarVaultState`        | `["star-vault"]`                                  | USDC mint/vault, total logical principal, configuration link                           |
| `StarPool`              | `["star-pool", star_id_u32]`                      | activated flag, total principal, total shares                                          |
| `StakePosition`         | `["stake", star_id_u32, staker]`                  | shares, accrued-cap accumulator, last checkpoint, claim nonce                          |
| `ConstellationPool`     | `["constellation", id_u16]`                       | pair, fee, virtual reserves, total shares, visibility nonce version, bootstrapped flag |
| `PoolTraderNonce`       | `["pool-nonce", id_u16, trader]`                  | next visibility-attestation nonce                                                      |
| `DeedMint`              | `["deed-mint", id_u16, sequence_u64]`             | deterministic Token-2022 NFT mint                                                      |
| `DeedPosition`          | `["deed", deed_mint]`                             | pool, shares, created slot, active/closed state                                        |
| `RightsAnchor` (later)  | `["rights", anchor_id_32]`                        | holder, immutable hashes, mutable license, operator epoch                              |
| `OperatorGrant` (later) | `["operator", anchor_id_32, epoch_u64, operator]` | current-epoch recipe authorization                                                     |
| `RecipeRecord` (later)  | `["recipe", content_hash_32]`                     | provenance, lineage, creator, recipe NFT mint                                          |

Anchor account constraints such as `seeds`, `bump`, `has_one`, `owner`, token program selection, and Token-2022 extension constraints should be used wherever available; see [Anchor account constraints](https://www.anchor-lang.com/docs/references/account-constraints). Permissioned Burn is newer than several Anchor wrapper surfaces, so the implementation phase must prove the exact `anchor-spl`/`spl-token-2022-interface` CPI versions in a small local test before program work expands.

### 4. EVM-to-Solana feature mapping

| EVM contract/function  | Solana account/instruction                         | Notes                                                                                                                      |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ERC-1155 IDs `0..3`    | four `EsmsMint` Token-2022 PDAs                    | Preserve semantic IDs in program state/metadata                                                                            |
| `_update` transfer ban | `NonTransferable` mint extension                   | Native soulbound enforcement                                                                                               |
| `claimMint`            | `claim_mint_esms(claim_id, [u64;4])`               | One atomic instruction; creates `ClaimReceipt` and mints nonzero elements                                                  |
| `claimed[claimId]`     | `ClaimReceipt` PDA existence                       | Permanent replay protection                                                                                                |
| `redeem`               | `redeem_esms(order_id, [u64;4])`                   | Holder signs transaction; program PDA co-signs permissioned burn CPI                                                       |
| `redeemFor`            | `redeem_for_esms(order_id, amounts, expiry, auth)` | Detached holder Ed25519 auth + PDA permanent delegate; creates receipt                                                     |
| `burn` for vetted AMM  | internal AMM handler CPI                           | No generic public “burn arbitrary holder” instruction                                                                      |
| ESMS pause             | `pause_mask` bits                                  | Pause self/sponsored redeem without blocking required exits                                                                |
| `anchorAgentState`     | `record_persona_commitment`                        | Authorized writer, nonzero hashes, strictly increasing sequence                                                            |
| `StarVault.starRoot`   | `GlobalConfig.star_root`                           | Preserve exact EVM Merkle encoding for shared proofs                                                                       |
| `activateStar`         | `activate_star(proof)`                             | Creates/marks `StarPool`; previous activations remain valid after root update unless governance adds explicit deactivation |
| `stake`                | `stake_star`                                       | SPL USDC transfer CPI and checked share math                                                                               |
| `unstake`              | `unstake_star`                                     | Always available; vault PDA transfers USDC back                                                                            |
| `claimYield`           | `claim_star_yield`                                 | Ed25519 attestation, nonce, expiry, cap, ESMS mint CPI                                                                     |
| AMM `registerPool`     | `register_constellation_pool`                      | Validate distinct elements and `fee_bps <= 10_000`                                                                         |
| AMM `seedInitial`      | `bootstrap_constellation_pool`                     | Exactly once; bootstrap shares locked/non-withdrawable                                                                     |
| AMM `seedLiquidity`    | `add_constellation_liquidity`                      | Burns both ESMS inputs, ratio/slippage checks, mints Deed NFT                                                              |
| AMM `swap`             | `swap_esms`                                        | `u128` constant-product intermediates; burns input/mints output                                                            |
| AMM `withdraw`         | `withdraw_constellation_liquidity`                 | No visibility attestation; not pausable; update/burn Deed                                                                  |
| `ConstellationDeed`    | Token-2022 NFT + `DeedPosition` PDA                | Transferable ownership token; state remains in PDA                                                                         |
| `AlchmRightsRegistry`  | `RightsAnchor`/`OperatorGrant` PDAs                | Preserve two-step transfer and operator-epoch invalidation                                                                 |
| `RecipeRegistry`       | `RecipeRecord` + Token-2022 NFT                    | Marketplace royalties need a separate policy; Token-2022 has no direct ERC-2981 semantic equivalent                        |

### 5. Token-2022 strategy for the four ESMS mints

#### Required extensions

| Extension          | Authority                       | Reason                                                                    |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| Non-Transferable   | immutable at mint setup         | Soulbound wallet balances                                                 |
| Permissioned Burn  | element `EsmsMintAuthority` PDA | Every burn requires issuer/program approval in addition to owner/delegate |
| Permanent Delegate | element `EsmsMintAuthority` PDA | Lets the program perform a sponsored, holder-authorized burn              |
| Metadata Pointer   | points to the mint itself       | Canonical metadata discovery                                              |
| Token Metadata     | program/PDA update authority    | Name, symbol, URI and element ID                                          |

Token-2022 metadata lives in the mint itself, with the Metadata Pointer pointing back to that mint; clients and idempotent initialization validate the mutual relationship and the full metadata fields. See [Metadata Pointer and Metadata](https://www.solana-program.com/docs/token-2022/extensions#metadata-pointer). Gate 0 deliberately fixes the v1 mint to this extension set. `MintCloseAuthority` is omitted because there is no v1 close path and a close/reinitialize lifecycle would weaken the deterministic mint invariant.

Do **not** use Token-2022's whole-mint Pausable extension for the normal AAE pause switch: it pauses mint, burn and transfer together, while the current protocol intentionally preserves some mint/burn paths and every exit. Program-level pause bits provide the required granularity.

#### Decimal and conversion specification

Let `ledger_atoms = decimal_amount × 10^4`.

| Domain          | Raw representation     | Exact conversion        |
| --------------- | ---------------------- | ----------------------- |
| WTEN/PostgreSQL | `Decimal(12,4)`        | canonical source amount |
| EVM ESMS        | `uint256`, 18 decimals | `ledger_atoms × 10^14`  |
| Solana ESMS     | `u64`, 4 decimals      | `ledger_atoms`          |

The maximum `Decimal(12,4)` value is `99,999,999.9999`, or `999,999,999,999` atoms, far below `u64::MAX`. Directly using 18 decimals on Solana would allow only:

```text
18,446,744,073,709,551,615 / 10^18 = 18.446744073709551615 ESMS
```

Cross-chain reconciliation must divide an EVM raw value by `10^14` and reject any remainder. Dust created outside the ledger's 4-decimal domain is not representable on Solana and must never be rounded silently.

#### Claim and redeem authorization

`claim_mint_esms` creates one receipt for all four amounts so a multi-element ledger debit settles atomically. In the Phase 2 core it requires the admin (`MINTER_ROLE`) or the configured attestor transaction signer and validates the exact claim ID, recipient, element mint/ATA addresses, amount bounds, and nonzero ledger reference hash before minting. The service attestor is admin-rotatable/revocable; the Token-2022 mint authority remains the program PDA. The hash is an auditable commitment, not an oracle: the program trusts that signer to attest that WTEN committed the debit to the configured Solana cluster. The authoritative target-chain lock is enforced in WTEN because neither settlement chain can observe the other's receipts.

`redeem_for_esms` should verify a detached Ed25519 authorization whose canonical message includes:

```text
"AAE_ESMS_REDEEM_V1"
program_id
cluster_genesis_hash
holder_pubkey
order_id
[u64; 4] amounts
deadline_unix_seconds
```

The client places a native Ed25519 verification instruction immediately before the AAE instruction; the program reads the Instructions sysvar and requires an exact public-key/message match. Solana precompiles cannot be called by CPI, so this transaction-level verification pattern is deliberate. See [Solana precompiled programs](https://solana.com/docs/core/programs/precompiles).

The element authority PDA is both the permanent delegate and permissioned burn authority. The AAE program signs the Token-2022 CPI only after the detached holder signature and unused `RedeemReceipt` are validated. A self-redeem instead uses the wallet signer plus the PDA permissioned-burn co-signature.

### 6. Canonical persona commitment

The chain stores hashes, not 64 floats. Define a versioned off-chain serialization before either chain is treated as authoritative:

```text
persona_preimage_v1 =
  "AAE_PERSONA_V1" ||
  agent_key[32] ||
  64 × canonical_f64_le

target_persona_hash = SHA256(persona_preimage_v1)
epoch_hash = SHA256("AAE_EPOCH_V1" || canonical_context_json_utf8)
```

Rules:

- exactly 64 values;
- reject `NaN` and infinities;
- normalize `-0` to `+0`;
- explicitly write IEEE-754 binary64 little-endian bytes rather than hashing a host-native buffer;
- canonicalize context JSON by a named deterministic scheme rather than ordinary object insertion order;
- use a full 32-byte SHA-256 digest;
- define `agent_key` as a named scheme (`sha256(NFC UTF-8 agent ID)` or ENS namehash), never label one as the other;
- increment `sequence` exactly by one and authorize every update with `PersonaCommitment.authority` or an active writer RoleGrant.

For backward compatibility, migrated EVM commitments should be labeled `legacy_raw_f64_v0` rather than silently pretending they use v1 canonicalization.

### 7. Star registry and yield accounting

To reuse the existing `starRoot`, reproduce OpenZeppelin `StandardMerkleTree` encoding exactly:

1. ABI-encode `uint32 starId` as 32-byte big-endian/padded data.
2. Keccak-256 that data.
3. Keccak-256 the 32-byte inner hash again for the leaf.
4. At each proof step, lexicographically sort the pair, concatenate 64 bytes, and Keccak-256.
5. Bound proof length before iterating.

Yield math uses `u128` intermediates and checked conversion to `u64`:

```text
principal_usdc_atoms × max_rate_esms_atoms_per_usdc_day × elapsed_seconds
───────────────────────────────────────────────────────────────────────
                           1_000_000 × 86_400
```

Before any stake or unstake changes principal, checkpoint:

```text
accrued_cap += cap(old_principal, now - last_checkpoint)
last_checkpoint = now
```

Claim checks the signed amount against `accrued_cap + cap(current_principal, elapsed)`, consumes the nonce, resets the accumulator, and mints. This removes retroactive accrual for top-ups while preserving earned time across partial withdrawals. Define during implementation whether a fully exited user may claim already accrued yield later or must claim before closing the position.

The attestation message must include program/cluster domain, staker, star ID, element, amount, nonce, deadline and attestor-set version. The server must derive live sky/natal inputs from trusted server sources for production; the current API accepts those economic inputs from the client and is explicitly demo-grade.

### 8. AMM and Deed details

- Store reserves and shares as `u64` only if every operation proves bounds; use `u128` for products, ratios and fee calculations.
- Reject zero input, identical elements, elements outside `0..3`, `fee_bps > 10_000`, expired attestation, wrong trader/pool, wrong signer and wrong nonce.
- `bootstrap_constellation_pool` is callable exactly once. If virtual reserves are unbacked, their corresponding shares go to a permanently locked PDA and cannot withdraw.
- User liquidity burns real ESMS before reserves/shares increase.
- Swap applies effects and Token-2022 burn/mint atomically in one transaction.
- Withdrawal is always enabled and verifies current Deed ownership from a Token-2022 account with amount `1`.

Each Deed uses a Token-2022 mint with decimals `0`, supply `1`, Metadata Pointer + Token Metadata, and optionally Group/Member extensions for an AAE Deed collection. It must **not** use NonTransferable. The changing share balance remains in `DeedPosition`, not mutable display metadata. On full withdrawal, burn the NFT and mark the position closed; retain enough PDA/event history for provenance. Token-2022's metadata/group/member relationships are documented in the [extension guide](https://www.solana-program.com/docs/token-2022/extensions#metadata).

## Phase 2B — Solana feeder and durable synchronization

### 1. Worker responsibilities

`solana-sync-service` is a Bun service, separate from request handlers:

1. subscribe to finalized logs mentioning the AAE program;
2. fetch the full finalized transaction;
3. decode Anchor instructions and events from the pinned IDL;
4. normalize every `u64`/`i64`/`u128` value to a decimal string at JSON boundaries;
5. apply projections and mark the signature processed in one PostgreSQL transaction;
6. on startup/reconnect, backfill with `getSignaturesForAddress` until the durable cursor is reached;
7. process backfill oldest-to-newest;
8. dead-letter decode/schema-version failures without advancing past them silently.

`logsSubscribe` is a low-latency signal, not the durable source. Official RPC documents that `getSignaturesForAddress` returns newest-first signatures with `before`/`until` pagination, and that `getTransaction` returns the transaction and its `u64` slot: [getSignaturesForAddress](https://solana.com/docs/rpc/http/getsignaturesforaddress), [getTransaction](https://solana.com/docs/rpc/http/gettransaction).

Prefer Anchor `emit_cpi!` for settlement events because provider logs may be truncated; fetch and decode inner instruction data. It costs more compute but is more durable. See [Anchor events](https://www.anchor-lang.com/docs/features/events).

### 2. Proposed database records

Minimum required table:

```text
solana_processed_tx
  signature       TEXT PRIMARY KEY
  slot            NUMERIC(20,0) NOT NULL -- full unsigned u64 domain
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

Recommended supporting records:

```text
solana_event
  id              TEXT PRIMARY KEY        -- signature:event_index
  signature       TEXT NOT NULL
  event_index     INTEGER NOT NULL
  event_type      TEXT NOT NULL
  schema_version  INTEGER NOT NULL
  payload         JSONB NOT NULL           -- all chain integers are decimal strings
  UNIQUE(signature, event_index)

solana_sync_cursor
  stream          TEXT PRIMARY KEY         -- aae-program:<program_id>:<cluster>
  last_signature  TEXT
  last_slot       NUMERIC(20,0) NOT NULL
  updated_at      TIMESTAMPTZ NOT NULL

chain_wallet
  subject_type    TEXT NOT NULL             -- user | agent
  subject_id      TEXT NOT NULL
  chain_namespace TEXT NOT NULL             -- eip155 | solana
  chain_reference TEXT NOT NULL             -- chain id or genesis-hash reference
  address         TEXT NOT NULL
  verified_at     TIMESTAMPTZ
  PRIMARY KEY(subject_type, subject_id, chain_namespace, chain_reference)
```

Extend claims rather than creating unrelated ledgers:

```text
claim_id, ledger_transaction_id, target_chain_namespace,
target_chain_reference, destination_address, amounts_atoms[4],
status(pending/debited/submitted/finalized/failed), signature
```

`target_chain_*` and destination become immutable once WTEN debit succeeds. This is the off-chain guard against minting one debit on both EVM and Solana; neither chain can observe the other's receipt directly.

### 3. Transactional/idempotency rule

For one finalized signature, use a single database transaction:

```text
BEGIN
  if processed_tx exists: COMMIT/no-op
  insert each signature:event_index (unique)
  apply all claim/redeem/stake/AMM/persona projections
  update cursor
  insert processed_tx LAST
COMMIT
```

The critical invariant is that the event rows, projections, cursor, and `processed_tx` marker commit or roll back together. Inserting `processed_tx` last is a useful convention, but statement order inside that transaction is not the safety boundary. Every projection also has its own natural unique key (`claim_id`, `order_id`, `signature:event_index`) so replay is safe at two levels.

### 4. Lossless `u64` JSON contract

JavaScript `number` is forbidden for token atoms, shares, reserves, nonces, and slots.

- Use a lossless JSON-RPC parser at the worker boundary and decode slots plus token/account bytes directly to `bigint` (or Anchor BN → decimal string → `bigint`). Do not let general SDK response models parse protocol integers first when they expose those values as JavaScript `number`.
- Parse API input only from canonical base-10 strings.
- Reject negatives, signs, decimals, exponents, leading junk, and values above the declared Rust type.
- Serialize `bigint` as `value.toString(10)` with a boundary replacer.
- Store unsigned `u64`/`u128` domains in appropriately bounded PostgreSQL `NUMERIC`; use `BIGINT` only for values proven to fit its signed range. Return every chain integer from APIs as a string.
- If an SDK path still exposes a slot as a JavaScript `number`, accept it only after `Number.isSafeInteger(slot)` and convert immediately; otherwise reject the response rather than approximate it.

This rule applies even though current Devnet slots are below `2^53 - 1`; it prevents a latent protocol-format migration.

## Phase 2C — Devnet initialization and toolchain

### 1. Current toolchain correction

The mission names `@coral-xyz/anchor`. Current Anchor 1.0 renamed that TypeScript package to `@anchor-lang/core`; see the official [Anchor 1.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0). Its TypeScript client is still tied to legacy `@solana/web3.js` v1 and SPL Token v1 compatibility: [Anchor TypeScript client](https://www.anchor-lang.com/docs/clients/typescript).

At the same time, current Solana frontend guidance calls web3.js v1 and wallet-adapter legacy and prefers the Kit/Wallet Standard stack. The requested wallet-adapter path remains supported and the official cookbook shows it with Wallet Standard discovery and `wallets={[]}`: [Connect a Wallet with React](https://solana.com/developers/cookbook/wallets/connect-wallet-react). Before implementation, record an ADR choosing one of:

- **Compatibility path for Devnet:** Anchor 1.x `@anchor-lang/core` + pinned `@solana/web3.js` v1 + wallet-adapter, isolated behind AAE adapters.
- **Generated Kit client path:** use Anchor only for Rust/IDL, generate a Kit-compatible client, and use modern Wallet Standard/Kit React integration.

Do not add both as unbounded application-wide SDKs. The initial recommendation is the compatibility path for fastest Anchor Devnet delivery, with one narrow `lib/solana/client` boundary so it can later be replaced.

### 2. Idempotent initialization algorithm

Proposed `scripts/init-solana-devnet.mjs` behavior after this architecture is approved:

1. Load an existing payer and program ID from explicit paths/secrets; never generate either on rerun.
2. Verify the RPC genesis hash/cluster and executable program ID.
3. Derive every config, authority and mint PDA.
4. Fetch each account.
5. If absent, call the program's initialization instruction.
6. If present, decode and assert owner, discriminator/version, seeds/bump, decimals, Token-2022 program ID, extension set, authorities, metadata, USDC mint, root and cap.
7. Fail closed on mismatches; never silently replace a mint or keypair.
8. Apply explicitly permitted config drift through named admin instructions.
9. simulate, submit, confirm at `finalized`, then reread and verify.
10. Write only public addresses/configuration to `deployments/solana-devnet.json`; keep all secret key material outside the repository.

Mint extensions must be allocated and initialized before the base mint is initialized. Program-side creation keeps the mint PDAs deterministic and lets the script remain a pure orchestration client.

## Phase 2D — dual-chain frontend

### 1. Provider boundary

Keep the existing Dynamic + viem EVM provider unchanged. Add a client-only Solana provider beside it, not inside EVM chain-switching logic:

```text
AppProviders
├── existing auth / Dynamic EVM context
│   └── viem Arc/Base clients
└── SolanaProvider
    ├── Devnet RPC connection
    ├── Wallet Standard discovery
    └── Anchor/IDL program adapter
```

Use a tagged identity type everywhere:

```text
EVM     = { family: "eip155", chainId, address }
Solana  = { family: "solana", cluster, publicKey }
```

Never place a Solana public key in `users.walletAddress`, call it an EVM address, lowercase it, or run EVM checksum validation on it.

### 2. Proposed hooks and UI seams

```text
lib/solana/useSolanaWallet.ts
lib/solana/useSolanaEsmsBalances.ts
lib/solana/useSolanaStarStaking.ts
lib/solana/useSolanaConstellationPool.ts
lib/solana/usePersonaCommitment.ts
lib/web3/useChainCapabilities.ts
```

The current Pentacles components can reuse presentation logic, but transaction hooks should be chain-family-specific. A chain selector must show that balances, positions and transaction hashes belong to different settlement domains. Do not sum them into a single spendable “omnichain” balance unless a later bridge/accounting protocol defines how burn/mint conservation works.

Frontend API contracts use decimal strings for every Solana amount. Optimistic UI may show `confirmed`, but completed claims, purchases and projections show `finalized` only.

## Proposed file layout

No paths below exist yet; this is the implementation target after review.

```text
Anchor.toml
Cargo.toml
programs/
  aae_solana/
    Cargo.toml
    src/
      lib.rs
      constants.rs
      errors.rs
      events.rs
      state/
        global_config.rs
        roles.rs
        esms.rs
        persona.rs
        staking.rs
        amm.rs
        deed.rs
        rights.rs
        recipe.rs
      instructions/
        initialize.rs
        admin.rs
        esms/
          initialize_mints.rs
          claim_mint.rs
          redeem.rs
          redeem_for.rs
        persona/
          record_commitment.rs
        staking/
          activate_star.rs
          stake.rs
          unstake.rs
          claim_yield.rs
        amm/
          register_pool.rs
          bootstrap_pool.rs
          add_liquidity.rs
          swap.rs
          withdraw.rs
        deed/
          mint.rs
          update.rs
          burn.rs
      utils/
        checked_math.rs
        ed25519_attestation.rs
        merkle.rs
        token_2022.rs
tests/
  solana/
    esms.spec.ts
    persona.spec.ts
    star-vault.spec.ts
    constellation-amm.spec.ts
    sync-replay.spec.ts
lib/
  solana/
    client.ts
    addresses.ts
    amounts.ts
    idl/
    events.ts
    useSolanaWallet.ts
    useSolanaEsmsBalances.ts
    useSolanaStarStaking.ts
    useSolanaConstellationPool.ts
services/
  solana-sync-service/
    index.ts
    subscriber.ts
    backfill.ts
    decoder.ts
    projector.ts
    bigint-json.ts
scripts/
  init-solana-devnet.mjs
  verify-solana-devnet.mjs
deployments/
  solana-devnet.json
```

## Required security and invariant tests

### ESMS

- each of four mints has exactly the expected extensions, decimals and PDA authorities;
- wallet transfer and delegated transfer fail;
- standard burn fails when Permissioned Burn is configured;
- self-redeem and holder-authorized sponsored redeem succeed;
- forged, expired, wrong-program, wrong-cluster and replayed authorizations fail;
- a claim receipt prevents retry minting across all four elements;
- no rounding at EVM/ledger/Solana conversion boundaries;
- pause bits match current intended semantics.

### Persona

- unauthorized overwrite fails;
- zero hashes and skipped/reused sequence fail;
- the canonical serializer has cross-language golden vectors;
- legacy v0 and canonical v1 hashes cannot be confused.

### StarVault

- existing EVM Merkle proofs verify identically;
- top-up cannot inherit prior accrual;
- attestor compromise cannot exceed the cap;
- nonce is independent per star/staker;
- stake and unstake share accounting conserve USDC modulo defined rounding dust;
- unstake remains available under every pause combination.

### AMM/Deed

- bootstrap is exactly once and cannot create a withdrawable admin position;
- constant product, fee and slippage properties use checked `u128` math;
- no generic path can use the permanent delegate outside authorized AAE instructions;
- Deed transfer changes withdrawal authority; metadata/state spoofing does not;
- partial withdrawal updates shares and full withdrawal burns the NFT;
- withdrawal remains available while add/swap are paused.

### Sync worker

- duplicate websocket/backfill delivery produces one projection;
- crash before `processed_tx` commit replays safely;
- crash after commit is a no-op;
- multiple events in one signature are all applied atomically;
- reconnect gap backfills to the prior cursor;
- every large integer survives Rust → transaction → RPC → decoder → JSON → PostgreSQL unchanged.

## Phase 3 — implementation roadmap

### Gate 0: review and protocol decisions

The following decisions were approved for the Phase 1/2 implementation on 2026-07-31:

- Solana ESMS uses exactly 4 decimals. One `Decimal(12,4)` ledger atom maps to one raw Solana `u64` atom.
- WTEN remains the authoritative global debit ledger. Every claim debit is locked to exactly one settlement target (`eip155:*` or `solana:*`); Solana v1 is not a bridge.
- Every ESMS mint combines `NonTransferable`, `PermissionedBurn`, a program-PDA `PermanentDelegate`, and a self-referential `MetadataPointer` plus Token Metadata.
- Persona commitment writes require the configured admin or JEPA attestor and a sequence increment of exactly one. Unrestricted EVM-style overwrites are not reproduced.
- Anchor `0.30.1` is retained for repo compatibility. Because Permissioned Burn post-dates its `anchor-spl` surface, the program uses the current Token-2022 wire ABI for that extension and verifies the combination against Devnet's current Token-2022 deployment.

The remaining bullets are gates for Phase 3+ and do not block the implemented ESMS/persona core:

- Choose Anchor compatibility client versus Kit-generated client.
- Choose one program for Devnet and define the mainnet split review gate.
- Choose the Devnet USDC mint and trusted RPC provider.
- Define persona `agent_key`, canonical JSON, and writer authority.
- Decide whether accrued yield remains claimable after full unstake.
- Decide whether to patch the identified EVM gaps before claiming behavioral parity.

### Phase 1: scaffold and golden specifications

- Pin Rust, Anchor, Solana and Token-2022 versions.
- Create the Anchor workspace and deterministic PDA constants.
- Add cross-language amount, Merkle and persona-hash golden vectors.
- Prove NonTransferable + PermissionedBurn + PermanentDelegate behavior against the current Token-2022 deployment.

**Exit:** toolchain reproducible under Bun-driven scripts; extension spike and golden vectors pass.

### Phase 2: ESMS and persona core

- Implement upgrade-authority bootstrap, rotatable service authorities, four mints, claim/redeem receipts and granular pause.
- Implement canonical persona commitment with authorized monotonic updates.
- Add invariant and negative-path tests plus IDL client wrappers.

**Exit:** Devnet demonstrates debit claim payload → one atomic four-mint claim → self/sponsored redeem, plus protected persona updates. The repository-pinned Solana 1.18 local validator bundles an older Token-2022 binary that predates Permissioned Burn, so the extension-combination test intentionally targets Devnet.

### Phase 3: staking, AMM and Deeds

- Implement exact Merkle compatibility and USDC custody.
- Implement checkpointed yield cap and native Ed25519 attestations.
- Implement one-time bootstrap, checked AMM math, transferable Deeds and always-open exits.

**Exit:** all economic invariants and pause/exit tests pass locally.

### Phase 4: database and sync service

- Add chain-normalized wallet/claim tables, processed signatures, events and cursors.
- Implement finalized subscription, full-transaction decode and reconnect backfill.
- Add reconciliation/admin telemetry and dead-letter recovery.

**Exit:** replay/crash tests prove no duplicate or lost projection.

### Phase 5: dual-chain frontend

- Add the isolated Solana provider/client.
- Implement Solana hooks and chain-aware balance/position UI.
- Add transaction lifecycle, explorer links, string amount contracts and wallet ownership verification.

**Exit:** one browser can use existing EVM paths and Devnet Solana paths without provider/address-state collision.

### Phase 6: idempotent Devnet deployment

- Deploy a verifiable program build.
- Run initializer twice and prove the second run is a verified no-op.
- Publish the public deployment manifest and run post-deploy extension/PDA/authority checks.
- Run claim, redeem, persona, stake, claim-yield, swap and withdraw smoke tests.

**Exit:** Devnet runbook is repeatable from a clean checkout without creating new keypairs.

### Phase 7: hardening before mainnet

- Independent program/economic audit.
- Multisig upgrade/admin authorities and rehearsed grant-new → verify → revoke-old rotation.
- Production RPC/Geyser redundancy, alerting, finality/reconciliation SLOs and disaster recovery.
- Decide bridge versus ledger-coordinated independent supplies; do not market “omnichain fungibility” before that protocol exists.
- Reassess splitting core mint/persona authority from market logic.

## Review checklist / unresolved decisions

1. Is Solana intended to hold an independent ESMS supply, or must balances be portable across EVM and Solana?
2. Does a claim debit represent a globally consumed entitlement, and is its target chain immutable after debit?
3. Should persona updates be controlled by each agent wallet, a service writer set, or both?
4. Must the Solana star root remain byte-identical to EVM, including OpenZeppelin double-hashed leaves?
5. Is unbacked AMM bootstrap emission intentional? If yes, who receives its economic benefit and what is its cap?
6. Are recipe royalties informational/marketplace-enforced on Solana, or must a separate royalty-aware NFT standard be selected?
7. Is the faster legacy-compatible Anchor client acceptable for Devnet, given current Solana guidance toward Kit?
8. Will the EVM registry, yield checkpoint and bootstrap gaps be fixed before the Solana launch, or documented as chain-specific differences?

No Solana program, schema migration, dependency, provider, or deployment script should be added until these decisions and this architecture are reviewed.
