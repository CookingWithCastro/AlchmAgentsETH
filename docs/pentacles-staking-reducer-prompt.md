# Prompt — add star-staking accrual to the Pentacles SpacetimeDB module

> Copy everything below the line into Claude Code **in the Pentacles SpacetimeDB Rust
> module repo** (the one that publishes the `cookingwithcastrollc` module). It adds the
> staking tables + reducers + visibility-gated yield accrual that the AlchmAgents app
> (`AlchmAgentsETH`) reads to settle yield on Circle Arc. It builds on tables that
> already exist in your module: `star_node`, `zone`, `ephemeris`, `player`,
> `natal_chart`, `player_location`, and the `sky_tick_timer` scheduled reducer.

---

## Task

Add **shared-pool star staking with visibility-gated, multiplicative essence accrual** to
this SpacetimeDB module. Stakers put USDC into a star on-chain (Circle Arc, handled by a
separate `StarVault` contract); this module is the **authoritative accrual ledger** — it
tracks each position's shares and accrues ESMS "essence" every sky tick, but only while
the star is **above the staker's horizon**. A separate off-chain attestor reads
`accrued_essence` to sign EIP-712 claims that mint ESMS on Arc.

### Element correspondence (must match the app exactly)

```
Spirit (0) ↔ Fire     Essence (1) ↔ Water     Matter (2) ↔ Earth     Substance (3) ↔ Air
```

A star's element is the element of the zodiac sign its **ecliptic longitude** falls in
(derive longitude from the star's `ra`/`dec` — the app uses obliquity 23.43928°). Yield is
paid in the ESMS id that element maps to.

## 1. Tables

```rust
// One staker's position on one star. Mirrors the on-chain StarVault stake.
#[spacetimedb::table(name = star_stake, public)]
pub struct StarStake {
    #[primary_key]
    #[auto_inc]
    pub stake_id: u64,
    #[index(btree)]
    pub staker: Identity,
    #[index(btree)]
    pub star_id: u32,            // Hipparcos hip_id (FK → star_node)
    pub element: u8,             // 0..3, the star's ESMS id (frozen at stake time)
    pub principal_usdc: u64,     // 6-dp USDC mirrored from the on-chain stake
    pub shares: u128,            // pool shares (pro-rata)
    pub accrued_essence: u128,   // 18-dp ESMS accrued and not yet claimed
    pub claimed_essence: u128,   // 18-dp ESMS already settled on Arc
    pub staked_at: Timestamp,
    pub last_accrual_at: Timestamp,
}

// Per-star aggregate (shared pool).
#[spacetimedb::table(name = star_stake_pool, public)]
pub struct StarStakePool {
    #[primary_key]
    pub star_id: u32,
    pub total_principal_usdc: u64,
    pub total_shares: u128,
}
```

## 2. Reducers

```rust
// Called by the app right after a confirmed on-chain StarVault.stake(). `principal_usdc`
// and `shares` are read back from the StarVault event so this ledger matches custody.
#[spacetimedb::reducer]
pub fn record_star_stake(ctx: &ReducerContext, star_id: u32, principal_usdc: u64, shares: u128) -> Result<(), String> {
    let star = ctx.db.star_node().hip_id().find(star_id).ok_or("no such star")?;
    let element = esms_id_for_star(star.ra, star.dec); // see §4
    // upsert pool
    let mut pool = ctx.db.star_stake_pool().star_id().find(star_id)
        .unwrap_or(StarStakePool { star_id, total_principal_usdc: 0, total_shares: 0 });
    pool.total_principal_usdc += principal_usdc;
    pool.total_shares += shares;
    ctx.db.star_stake_pool().star_id().update(pool);

    ctx.db.star_stake().insert(StarStake {
        stake_id: 0, staker: ctx.sender, star_id, element,
        principal_usdc, shares, accrued_essence: 0, claimed_essence: 0,
        staked_at: ctx.timestamp, last_accrual_at: ctx.timestamp,
    });
    Ok(())
}

// Called after a confirmed on-chain unstake. Removes shares/principal.
#[spacetimedb::reducer]
pub fn record_star_unstake(ctx: &ReducerContext, stake_id: u64) -> Result<(), String> {
    let s = ctx.db.star_stake().stake_id().find(stake_id).ok_or("no stake")?;
    if s.staker != ctx.sender { return Err("not your stake".into()); }
    if let Some(mut pool) = ctx.db.star_stake_pool().star_id().find(s.star_id) {
        pool.total_principal_usdc = pool.total_principal_usdc.saturating_sub(s.principal_usdc);
        pool.total_shares = pool.total_shares.saturating_sub(s.shares);
        ctx.db.star_stake_pool().star_id().update(pool);
    }
    ctx.db.star_stake().stake_id().delete(stake_id);
    Ok(())
}

// Called by the attestor service after it signs a claim, to move accrued → claimed so
// it can't be double-signed. (Guard with an ATTESTOR identity check if you have one.)
#[spacetimedb::reducer]
pub fn mark_star_yield_claimed(ctx: &ReducerContext, stake_id: u64, amount: u128) -> Result<(), String> {
    let mut s = ctx.db.star_stake().stake_id().find(stake_id).ok_or("no stake")?;
    s.accrued_essence = s.accrued_essence.saturating_sub(amount);
    s.claimed_essence += amount;
    ctx.db.star_stake().stake_id().update(s);
    Ok(())
}
```

## 3. Accrual on each sky tick

In the existing `sky_tick_timer` scheduled reducer (the one that already updates
`ephemeris`), after positions are updated, iterate all `star_stake` rows and accrue:

```rust
for mut stake in ctx.db.star_stake().iter() {
    let star = match ctx.db.star_node().hip_id().find(stake.star_id) { Some(s) => s, None => continue };
    let loc  = match ctx.db.player_location().identity().find(stake.staker) { Some(l) => l, None => continue };

    let now = ctx.timestamp;
    let alt = star_altitude_deg(star.ra, star.dec, loc.lat, loc.lon, now); // §4
    if alt <= 0.0 { stake.last_accrual_at = now; ctx.db.star_stake().stake_id().update(stake); continue; }

    let elapsed_secs = (now.micros_since_epoch() - stake.last_accrual_at.micros_since_epoch()) as f64 / 1e6;
    if elapsed_secs <= 0.0 { continue; }

    let rate = daily_rate_per_usdc(&ctx, &stake, &star); // §4 — base × zone × chart × dignity
    let days = elapsed_secs / 86_400.0;
    let gained = (stake.principal_usdc as f64 / 1e6) * rate * days; // ESMS units
    stake.accrued_essence += (gained * 1e18) as u128; // 18-dp
    stake.last_accrual_at = now;
    ctx.db.star_stake().stake_id().update(stake);
}
```

## 4. Math helpers (port these from the app — keep numbers identical)

The app implements all of these in `lib/staking/` of `AlchmAgentsETH`; mirror them so the
ledger and the UI agree:

- **`esms_id_for_star(ra, dec)`** — ecliptic longitude → sign → element → ESMS id.
  (`lib/staking/elements.ts`)
- **`star_altitude_deg(ra, dec, lat, lon, t)`** — GMST → local sidereal time → hour angle
  → `asin(sin dec·sin lat + cos dec·cos lat·cos H)`. Visible iff > 0.
  (`lib/staking/visibility.ts`)
- **`daily_rate_per_usdc`** = `BASE_DAILY_RATE (0.0006)` ×
  - `zone_dominance` — share of transiting `ephemeris` planets whose sign-element (and own
    affinity) matches the star's element, mapped to ~0.5..2.0;
  - `chart_affinity` — from the staker's `natal_chart` placements: +0.5 if the staker's
    dominant element matches the star's, plus dignity weight, clamped ~0.5..2.5;
  - `planet_dignity` — `1 + Σ|dignity|·0.1` over planets transiting the star's sign, capped 2.0.
    (`lib/staking/yield-rate.ts`)

## 5. Integration contract with AlchmAgentsETH

- On-chain **custody + settlement** is the `StarVault` contract on Arc
  (`contracts/src/StarVault.sol`): `stake(starId, usdc)`, `unstake(starId, shares)`,
  `claimYield(StarYield, sig)`. This module never holds funds.
- The app calls `record_star_stake` / `record_star_unstake` right after the matching
  on-chain tx confirms, passing the same `principal`/`shares`.
- The off-chain **attestor** (`lib/staking/attestor.ts`, holds `ATTESTOR_ROLE` on the
  vault) reads `star_stake.accrued_essence`, signs an EIP-712 `StarYield`, then calls
  `mark_star_yield_claimed`. The single-use on-chain nonce prevents replay.
- **Element + visibility + rate math must match `lib/staking/` byte-for-byte** so the live
  APY the UI shows equals what actually accrues.

## Acceptance

- `spacetime publish` succeeds; `star_stake`, `star_stake_pool` appear in the schema.
- Generated TS client (regenerate into `AlchmAgentsETH/lib/spacetime/generated/`) exposes
  the new tables + `record_star_stake` / `record_star_unstake` / `mark_star_yield_claimed`.
- A staked position's `accrued_essence` grows on sky ticks only while the star is risen at
  the staker's `player_location`, and stops when it sets.
