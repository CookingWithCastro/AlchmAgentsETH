# Pentacle Star Vaults — star-staking on Circle Arc

Stake USDC on individual **stars**; earn **ESMS elemental essence** (Spirit / Essence /
Matter / Substance) at a rate set by the live sky — but only while the star is **risen
above your horizon**. Custody + settlement on Circle Arc; accrual driven by the live
Pentacles SpacetimeDB sky engine.

This is the "leverage the stars / stake spirit-essence-matter-substance / earn yield by the
active zodiac degree, rates from your chart" feature. UI: **`/pentacles`**.

## Locked design (from the guided Q&A)

| Decision        | Choice                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Stake target    | **Individual stars** (`star_node.hip_id`), **shared pool** per star                                    |
| Custody / chain | **USDC on Circle Arc testnet** (chainId 5042002)                                                       |
| Yield gate      | **Only while the star is above your horizon** (the "180 visible degrees")                              |
| Yield rate      | **Multiplicative**: sky elemental dominance × natal chart affinity × transiting-planet dignity         |
| Reward asset    | **ESMS minted on Arc** in the star's element (Fire→Spirit, Water→Essence, Earth→Matter, Air→Substance) |
| Accrual ledger  | **Pentacles SpacetimeDB module** (see `docs/pentacles-staking-reducer-prompt.md`)                      |
| Scope           | Full 11-zone pentacle sky-map experience                                                               |

### The pentacle = the 11 zones

A **pentagram inscribed in a circle divides the disk into exactly 11 regions**: 1 central
pentagon (**Crown**) + 5 points (**Spires**) + 5 arc valleys (**Houses**). That maps 1:1 onto
the SpacetimeDB `zone` table (11 rows, `kind ∈ {House, Spire, Crown}`). Each zone is tinted
by its owning planet's element and `control` score. This is the "pentacle projected over the
sky" — rendered in `components/staking/PentacleSkyMap.tsx`.

### Element ↔ ESMS correspondence

Taken from the thermodynamics already in `useLiveEphemeris` (Heat groups `spirit²+Fire²`,
Entropy `substance²+Air²`, Reactivity denom `matter+Earth`, essence pairs with Water):

```
Spirit (0) ↔ Fire    Essence (1) ↔ Water    Matter (2) ↔ Earth    Substance (3) ↔ Air
```

A star's element = the element of the sign its **ecliptic longitude** (from `ra`/`dec`) falls in.

### Yield rate

```
dailyRatePerUsdc = BASE_DAILY_RATE (0.0006)
                 × zoneDominance   // share of transiting planets reinforcing the star's element (~0.5..2.0)
                 × chartAffinity   // your natal dominant element / ESMS scores / monicaConstant (~0.5..2.5)
                 × planetDignity   // dignity of planets conjunct the star's sign (1.0..2.0)
                 × visible         // 1 only while the star is above your horizon
```

All inputs come from data the app already produces: live `ephemeris`, the staker's
`user_natal_charts`, and the star's `ra`/`dec`. Implemented in `lib/staking/yield-rate.ts`.

## Architecture

```
  Browser (/pentacles)                         Circle Arc testnet
  ┌───────────────────────────┐                ┌───────────────────────┐
  │ PentacleSkyMap (11 zones)  │   stake USDC   │ StarVault.sol         │
  │ StarStakePanel (live APY)  │ ─────────────▶ │  · USDC custody/star  │
  │ useStarStaking (Dynamic)   │                │  · shares pro-rata    │
  └─────────────┬─────────────┘                │  · claimYield(att)    │
                │ live read                     │    → mints ESMS       │
                ▼                               └──────────▲────────────┘
  ┌───────────────────────────┐                           │ EIP-712 StarYield
  │ SpacetimeDB cookingwith…   │   accrued essence         │
  │  star_node · zone · ephem  │ ─────────────────────────▶│ attestor (ATTESTOR_ROLE)
  │  star_stake (accrual)*     │                            /api/staking/claim-attestation
  └───────────────────────────┘
   * added by docs/pentacles-staking-reducer-prompt.md
```

- **Custody + settlement** — `contracts/src/StarVault.sol` (Arc): `stake` / `unstake` (no
  attestation — always exit) / `claimYield(StarYield, sig)` mints ESMS. Models its yield
  claim on `ConstellationAMM`'s EIP-712 `VisibilityAttestation` (single-use nonce, deadline).
- **Reward token** — `EsmsToken.sol` deployed on Arc; the vault holds `MINTER_ROLE`. ESMS
  stays soulbound — yield is minted, never a USDC wrapper.
- **Off-chain engine** — `lib/staking/`: `visibility.ts` (horizon altitude), `yield-rate.ts`
  (multiplicative rate), `elements.ts` (element↔ESMS), `attestor.ts` (EIP-712 signer),
  `arc.ts` (chain + ABIs).
- **Accrual ledger** — the Pentacles SpacetimeDB module (`star_stake` table + visibility-gated
  accrual on each sky tick). Run `docs/pentacles-staking-reducer-prompt.md` in that repo.

## Files

| Path                                                                                 | Role                                                                                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `contracts/src/StarVault.sol`                                                        | USDC custody + visibility-attested ESMS yield (Arc)                                                 |
| `contracts/script/DeployStarVault.s.sol`                                             | Deploy ESMS + StarVault to Arc, wire roles                                                          |
| `lib/staking/{types,arc,elements,visibility,yield-rate,attestor,ui,star-catalog}.ts` | Star engine                                                                                         |
| `lib/staking/{astro,pentacle-geometry,aspects,ascendant,zone-pools,amm}.ts`          | Zone-pool + ascendant engine                                                                        |
| `lib/staking/useStarStaking.ts`, `useZonePool.ts`                                    | Wallet (Dynamic) stake/claim + AMM seed against Arc                                                 |
| `lib/spacetime/hooks/useLiveStars.ts`, `useLiveZones.ts`                             | Live SpacetimeDB subscriptions                                                                      |
| `components/staking/{PentacleSkyMap,StarStakePanel,ZonePoolsPanel,ZonePoolLP}.tsx`   | UI                                                                                                  |
| `components/Navigation.tsx`                                                          | Main header navigation (`Cosmic Tools` → `/pentacles` link)                                         |
| `app/(app)/pentacles/`                                                               | Pentacle Star Vaults & portfolio pages (`/pentacles`, `/pentacles/connect`, `/pentacles/portfolio`) |
| `app/api/staking/{claim-attestation,pool-attestation}/route.ts`                      | Signs yield claim / opens a zone pool                                                               |
| `app/api/agents/{word-duel,jing}/route.ts`                                           | Pentacles companion agent minigame "brain" endpoints                                                |
| `scripts/run-agent-pentacles.ts`                                                     | 3-loop autonomous agent player engine (staking, siege, duels)                                       |
| `docs/pentacles-staking-reducer-prompt.md`                                           | Prompt to add the SpacetimeDB stake ledger                                                          |

## Deploy & run

1. **Contracts** (from `contracts/`; only needed for a new deployment):
   ```bash
   ARC_RPC_URL=https://rpc.testnet.arc.io \
   DEPLOYER_PRIVATE_KEY=… ATTESTOR_ADDRESS=… ESMS_METADATA_URI=… \
   forge script script/DeployStarVault.s.sol:DeployStarVault --rpc-url arc --broadcast
   ```
   Copy the printed `NEXT_PUBLIC_STAR_VAULT_ADDRESS` and `NEXT_PUBLIC_ARC_ESMS_ADDRESS`.
   The current verified Arc testnet deployment is checked into `lib/staking/deployment.ts`, so
   fresh installs and previews use it automatically unless these variables override it.
2. **Env** (`.env`):
   ```
   NEXT_PUBLIC_STAR_VAULT_ADDRESS=0x…           # deployed StarVault on Arc
   NEXT_PUBLIC_ARC_ESMS_ADDRESS=0x…             # deployed ESMS on Arc
   NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS=0x…    # deployed ConstellationAMM on Arc (zone pools)
   NEXT_PUBLIC_CONSTELLATION_DEED_ADDRESS=0x…   # deployed ConstellationDeed on Arc (LP NFT)
   ARC_ATTESTOR_PRIVATE_KEY=0x…                 # the feeder; must hold ATTESTOR_ROLE on vault + AMM
   STAKING_BASE_DAILY_RATE=0.0006               # optional rate tuning
   STAKING_CLAIM_WINDOW_DAYS=1                  # optional accrual window per claim
   NEXT_PUBLIC_ASC_ACTIVATION_ORB_ARCMIN=2      # ±2′ orb → ~16s ascendant activation window
   NEXT_PUBLIC_SPACETIME_LIVE_FEED=true         # show the live star_node / zone / ephemeris feed
   # plus the existing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID for wallet connect
   ```
3. **Pentacles ledger** — run `docs/pentacles-staking-reducer-prompt.md` in the SpacetimeDB
   module repo, `spacetime publish`, regenerate the TS client into `lib/spacetime/generated/`.
4. `bun dev` → open **`/pentacles`**.

## Demo flow

1. Open `/pentacles` — the pentacle's 11 zones tint by live planetary control; real stars
   plot by their true horizon position; the leaderboard ranks risen stars by live APY.
2. Pick your **dominant element** — watch every matching star's chart-affinity multiplier
   (and APY) jump.
3. Click a star → the panel shows its element/ESMS payout, whether it's **risen**, and the
   `dominance × affinity × dignity` breakdown.
4. Connect a wallet (Dynamic, on Arc) → **Stake** USDC → **Claim** to mint ESMS essence
   (only while the star is risen).

## Zone pools + ascendant (v2)

The 11 zones aren't just star-yield boosts — each hosts **ESMS element-pair liquidity pools**
on the existing `ConstellationAMM`, and stars crossing your ascendant fire on-chain bursts.

- **The pentacle is a horizon projection** (azimuthal-equidistant: zenith center, horizon rim,
  North +Y). The inscribed pentagram makes 11 regions — **Crown = zone 10** (center pentagon),
  **Spires = zones 5–9** (points to N/ENE/SE/SW/WNW), **Houses = zones 0–4** (horizon arcs).
  Canonical vertices + `get_zone_for_alt_az` live in `lib/staking/pentacle-geometry.ts`; planets
  and stars are assigned to zones by their live alt/az.
- **Aspect-driven element-pair pools.** A favorable cross-element aspect between two planets
  (conjunction / sextile / trine, within orb) opens a pool of their **current-sign elements** —
  e.g. Sun in a Fire sign trine Mercury in an Earth sign → a **Spirit↔Matter** pool. All **6**
  ESMS pairs are registered on `ConstellationAMM` as stable `constId` 0–5; the live aspect **and**
  the zone being risen gate which are tradeable. `lib/staking/aspects.ts` + `zone-pools.ts`.
- **On-chain wiring.** `DeployStarVault.s.sol` also deploys `ConstellationDeed` + `ConstellationAMM`
  on Arc and registers the 6 pairs. `POST /api/staking/pool-attestation` signs the AMM's EIP-712
  `VisibilityAttestation` only while the pair's aspect is active and the sky is risen — the
  signature **is** the "pool is open" gate. `lib/staking/useZonePool.ts` + `components/staking/ZonePoolLP.tsx`
  let a holder seed liquidity with earned ESMS (the Deed NFT is the position).
- **Ascendant activation ("shooting star").** The ascendant sweeps 15 arc-min/min; a star whose
  ecliptic longitude is within a ±2′ orb of the rising degree is "on the ascendant" (~16s window).
  While activated it **burst-boosts the zone it sits in**, minted on-chain as an extra ½-day of
  yield in the StarVault claim. `lib/staking/ascendant.ts`; burst in `claim-attestation/route.ts`.

## Status

Verified locally:

- `bunx tsc --noEmit` clean; `/pentacles` renders the 11 canonical zones + live
  star_node/zone/ephemeris feed (10 planets) + planets-in-zones + ascendant line + live
  aspect pools + per-star multiplicative APYs + chart-affinity reactivity + the zone-pool LP panel.
- **`forge test` — 93/93 pass**, including **`StarVault.t.sol` (39 tests)**: custody &
  pro-rata shares, unstake round-trips with no cross-staker loss, attested ESMS yield, and every
  attestation failure mode (bad signer, revoked attestor, expired, bad/replayed nonce, staker
  mismatch, bad element), plus 2 fuzz tests (`forge test --match-contract StarVaultTest`).

Live deployment (verified 2026-06-21):

- **Arc testnet 5042002:** ESMS, StarVault, ConstellationDeed, and ConstellationAMM all have
  bytecode; vault/AMM attestor and token minter/burner roles are correctly wired; all six pools
  are seeded. `bun run scripts/verify-deploy.ts` verifies the exact addresses used by the app.
- **Base Sepolia 84532:** the mirrored ESMS shop settlement wallet holds MINTER + BURNER and is
  funded for sponsored transactions.
- **Production:** `/pentacles` is live, its server-side attestor is configured, and the claim API
  reaches the real horizon-visibility gate. The UI shows a live Arc bytecode status badge.
