# Migration plan: make `monicaConstant` / `kalchmConstant` represent absence

**Status: PLAN ONLY — nothing here has been executed.** No migration was run, no
`prisma db push` was issued, no database was contacted while writing this.

**Goal.** Today `kalchmConstant` and `monicaConstant` are `NOT NULL` in
`prisma/schema.prisma`, so an unmeasured quantity is unrepresentable at the DB layer
and every writer must invent a number. That violates the repo's standing principle —
_a literal substituted for an absent measurement invents data; propagate absence,
never a sentinel_. This plan makes the columns nullable so absence can be stored, and
sorts out the fact that two different quantities are sharing one column name.

Existing code already points here. Four call sites carry a `COLUMN NAME MISMATCH`
comment that says "see the NOT NULL monicaConstant/kalchmConstant migration plan in
docs/": `app/api/profile/route.ts:99-103`, `app/api/create-agent/route.ts:577-580`,
`app/api/create-agent/route.ts:664-667`, `lib/services/natal-chart-storage.ts:143-146`.
This document is that plan.

Every claim below is marked **[VERIFIED]** (read out of the file at the cited line) or
**[INFERRED]** (reasoned, not directly observed). Live database state is **[INFERRED]**
throughout — no database was queried.

---

## 1. The load-bearing distinction: three unrelated things named "Monica"

This must be settled before any column is touched, because a migration that treats
them alike would be wrong.

| #   | Name                       | Definition                                                                                                                                              | Where                                                                                                                                                                                                                   |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Thermodynamic Monica**   | `-greg / (activation × ln K)`; ABSENT is `null`/`None`; equilibrium is `MONICA_EQUILIBRIUM = 1.618`                                                     | `lib/thermodynamics/kalchm.ts`, `backend/thermodynamics.py`, `pa-rust-backend/src/astro/alchemy.rs`                                                                                                                     |
| 2   | **Phi Axis Index (PAI)**   | `(Spirit × φ + Essence + elementalBonus) / (Matter + Substance + 1)` — **[VERIFIED]** `lib/monica/monica-constant-validator.ts:118`, function at `:122` | `lib/monica/monica-constant.ts`, `lib/monica/monica-constant-validator.ts`                                                                                                                                              |
| 3   | **Monica the guide agent** | The onboarding persona — not a quantity at all                                                                                                          | `monica_user_settings`, `monica_interactions`, `monica_knowledge`, `monica_module_progress`, `monica_user_progress`, `monica_contextual_help` (`prisma/schema.prisma:840-1010`); enum value `MONICA_SPECIAL` at `:1487` |

Category 3 is a naming collision only — **those six tables and the `MONICA_SPECIAL`
enum value are out of scope and must not be touched.**

### The finding that drives everything else

**Not one writer of any `monicaConstant` _column_ writes the thermodynamic Monica.**
**[VERIFIED]** — see the writer inventory in §3. Every writer supplies either the Phi
Axis Index, a bare literal, or an unrelated score. The column is misnamed in all five
places it appears.

`kalchmConstant` is different: `app/api/create-agent/route.ts:559-564,576` **[VERIFIED]**
computes a genuine Kalchm via `calculateKalchm({spirit, essence, matter, substance})`
and writes it. So `historical_agents.kalchmConstant` holds _real Kalchm from one writer
and fabrications from every other_ — see §5.

**Dependency:** a separate concurrent task is renaming the phi-based quantity
(`lib/monica/monica-constant.ts`). **Do not rename any DB column in this migration.**
Sequencing is in §8; the short version is that this plan changes _nullability only_, and
the rename lands afterwards as its own migration, so the two never contend for the same
`ALTER TABLE`.

---

## 2. Column inventory (complete)

Verified by `grep -rni "monica\|kalchm" prisma/` — all five quantity columns, with the
owning model confirmed by reading each model's brace boundaries. `prisma/sqlite-schema.prisma`
exists but contains **no** Monica/Kalchm column **[VERIFIED]** — it did not appear in the
recursive grep, so it needs no migration.

| #   | `schema.prisma` line | Model                                       | Column           | Current declaration                      | Quantity actually stored                                                         |
| --- | -------------------- | ------------------------------------------- | ---------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `:698`               | `created_agents` (model at `:690-708`)      | `monicaConstant` | `Float` → NOT NULL, no default           | Phi Axis Index **[VERIFIED]** `app/api/create-agent/route.ts:668`                |
| 2   | `:724`               | `historical_agents` (model at `:710-815`)   | `kalchmConstant` | `Float` → NOT NULL, no default           | Mixed: real Kalchm, `0`, `0.5`, spirit scores                                    |
| 3   | `:725`               | `historical_agents`                         | `monicaConstant` | `Float @default(0)` → NOT NULL DEFAULT 0 | Mixed: PAI, `0.5`, `0.72`, spirit, power levels                                  |
| 4   | `:1278`              | `user_natal_charts` (model at `:1266-1301`) | `monicaConstant` | `Float` → NOT NULL, no default           | Phi Axis Index **[VERIFIED]** `lib/services/natal-chart-storage.ts:147` + `:531` |
| 5   | `:1311`              | `user_profiles` (model at `:1303-1323`)     | `monicaConstant` | `Float` → NOT NULL, no default           | Phi Axis Index **[VERIFIED]** `app/api/profile/route.ts:104,126`                 |

**Attribution caution.** A prior reviewer mis-attributed one of these. The trap is that
`created_agents` (`:690`) sits immediately above `historical_agents` (`:710`), so `:698`
looks like it belongs to `historical_agents` if you anchor on the wrong `model` keyword.
`:698` is **`created_agents`**. Re-derive attribution from the enclosing `model … { … }`
braces, not from proximity.

Indexes that must survive the migration — **[VERIFIED]** `prisma/schema.prisma:811-812`:

- `@@index([kalchmConstant])`
- `@@index([monicaConstant])`

Both are on `historical_agents`. B-tree indexes store NULLs, so making the columns
nullable does not invalidate either index; no reindex is required. **[INFERRED]**

Historical record in `prisma/migrations/` (these files are stale — see §6):
`20250926221456_init_postgresql/migration.sql:31` (`user_profiles`), `:222-223`
(`historical_agents`), `:386` (`created_agents`); and
`20250930031400_add_planetary_agent_transit_system/migration.sql:14` (`user_natal_charts`).

---

## 3. Writers

### 3a. TypeScript / Prisma

| File:line                                              | Column                             | Value written                          | Notes                                                                                  |
| ------------------------------------------------------ | ---------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `app/api/profile/route.ts:104`                         | `user_profiles.monicaConstant`     | `phiAxis.value`                        | update branch; comment `:99-103` already flags the mismatch                            |
| `app/api/profile/route.ts:126`                         | `user_profiles.monicaConstant`     | `phiAxis.value`                        | create branch                                                                          |
| `app/api/profile/route.ts:170`                         | (response payload)                 | `phiAxis`                              | not a DB write                                                                         |
| `lib/user-provisioning.ts:77`                          | `user_profiles.monicaConstant`     | **literal `0`**                        | "Pending Onboarding" placeholder row                                                   |
| `lib/user-provisioning.ts:106`                         | `user_profiles.monicaConstant`     | **literal `0`**                        | same, create path                                                                      |
| `app/api/user-charts/route.ts:54`                      | `user_natal_charts.monicaConstant` | **literal `0`**                        | create branch                                                                          |
| `lib/services/natal-chart-storage.ts:147`              | `user_natal_charts.monicaConstant` | PAI (from `:531`)                      | genuine PAI computation                                                                |
| `app/api/create-agent/route.ts:576`                    | `historical_agents.kalchmConstant` | `derivedKalchm` (`:559`)               | **the one genuine Kalchm writer**                                                      |
| `app/api/create-agent/route.ts:581`                    | `historical_agents.monicaConstant` | `computedPhiAxisIndex` (`:565`)        | PAI, not Monica                                                                        |
| `app/api/create-agent/route.ts:668`                    | `created_agents.monicaConstant`    | `computedPhiAxisIndex`                 | PAI                                                                                    |
| `lib/historical-agents-db.ts:151`                      | `historical_agents.monicaConstant` | `agent.consciousness.monicaConstant`   | passthrough from `CraftedAgent`                                                        |
| `lib/historical-agents-db.ts:152`                      | `historical_agents.kalchmConstant` | `…kalchmConstant ?? null`              | **already null-tolerant in code**; today the `null` is rejected by the NOT NULL column |
| `lib/historical-agents-db.ts:965`                      | `historical_agents.kalchmConstant` | `agentData.kalchmConstant`             | typed `number` at `:924`                                                               |
| `lib/agents/agentic-user-sync.ts:121,131,160`          | `user_profiles` / sync payload     | `input.monicaConstant`                 | typed `number` at `:15`                                                                |
| **`app/api/philosophers-stone/create/route.ts:83,93`** | **both columns**                   | **`$5, $5`**                           | **see §3c — raw SQL, same bug as `crud.py:29`**                                        |
| `scripts/seed-historical-agents.ts:93,104`             | `historical_agents.kalchmConstant` | **hardcoded `0`** in the `VALUES` list | seeds ~70 agents                                                                       |
| `scripts/seed-historical-agents.ts:87,119`             | `historical_agents.monicaConstant` | `$13`, upserted via `EXCLUDED`         |                                                                                        |
| `scripts/seed-moon-agents.ts:116,117`                  | both columns                       | **`alchm.spirit` to BOTH**             | neither value is Monica or Kalchm                                                      |
| `scripts/test-human-attunement.ts:135`                 | test fixture                       | `1.0`                                  | test-only                                                                              |

### 3b. Python / SQLAlchemy

| File:line                                       | Column           | Value written                                                                                                                                        |
| ----------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/crud.py:26-48`                         | both             | **FIXED** — no longer fabricates; drops both keys when unmeasured so the insert omits them                                                           |
| `backend/main.py:1001`                          | `monicaConstant` | `p_data["spirit"]` — a spirit score                                                                                                                  |
| `backend/main.py:1164`                          | `monicaConstant` | `power_level`                                                                                                                                        |
| `backend/main.py:1184`                          | `monicaConstant` | **literal `0.72`**                                                                                                                                   |
| `backend/main.py:1208`                          | `monicaConstant` | **literal `0.5`**                                                                                                                                    |
| `backend/main.py:1936`                          | `monicaConstant` | **literal `0.5`**                                                                                                                                    |
| `backend/seed_planetary_agents.py:65`           | `monicaConstant` | **literal `0.5`**                                                                                                                                    |
| `backend/seed_moon_phase_agents.py:132,133`     | both             | `p_data["spirit"]` **to BOTH**                                                                                                                       |
| `backend/seed_3600_planetary_agents.py:155,156` | both             | `power_level` **to BOTH**                                                                                                                            |
| `backend/models.py:33`                          | `kalchmConstant` | ORM client-side `default=0.5` — fires whenever the caller omits the column                                                                           |
| `backend/models.py:34`                          | `monicaConstant` | `Column(Float)` — already nullable in the ORM                                                                                                        |
| `backend/database.py:225`                       | `kalchmConstant` | `COALESCE("kalchmConstant", "monicaConstant", 0.5)` — SQLite startup repair                                                                          |
| `backend/database.py:248`                       | `kalchmConstant` | `ADD COLUMN … DEFAULT 0.5` — Postgres startup repair                                                                                                 |
| `backend/database.py:320`                       | `kalchmConstant` | `COALESCE("kalchmConstant", "monicaConstant", 0.5)` — Postgres startup repair                                                                        |
| `backend/crud.py:89-90`                         | any              | `update_agent` `setattr` loop; `exclude_unset=True` means an omitted field is untouched, but an explicit `null` becomes `NULL` and is rejected today |

### 3c. Three more sites that launder Monica into Kalchm

`backend/crud.py:29` used to read `agent_data["kalchmConstant"] = agent_data["monicaConstant"]`.
That is now fixed. **The identical fabrication survives in three other places** and each
must be fixed _before_ the backfill in §5, or the backfill will be re-corrupted:

1. **`app/api/philosophers-stone/create/route.ts:83,93`** **[VERIFIED]** — the column list
   is `"kalchmConstant", "monicaConstant"` and the `VALUES` clause binds **`$5, $5`**.
   `values[4]` (`$5`) is `data.consciousness.monicaConstant` (`:108`). One value, two
   different quantities. Raw `pool.query`, so Prisma types never caught it.
2. **`scripts/seed-moon-agents.ts:116-117`** **[VERIFIED]** — `monicaConstant: alchm.spirit`
   and `kalchmConstant: alchm.spirit`. Same value to both, and it is a _spirit score_,
   which is neither quantity.
3. **`backend/seed_moon_phase_agents.py:132-133`** and
   **`backend/seed_3600_planetary_agents.py:155-156`** **[VERIFIED]** — same shape in
   Python (`p_data["spirit"]` and `power_level` respectively).

Also `backend/database.py:225,320` **[VERIFIED]** run
`SET "kalchmConstant" = COALESCE("kalchmConstant", "monicaConstant", 0.5)` **at every
backend startup**. This is Monica→Kalchm laundering executed as a scheduled job. **It
will silently undo the backfill on the next deploy** unless it is removed first. This is
the single highest-risk item in the plan.

---

## 4. Readers, and what breaks on NULL

| File:line                                                  | Reads                                               | Behaviour on `null` today                                                                                                                                                                                                                                                                                                                                                | Required change                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-db-agents.ts:24`                            | `agent.monicaConstant.toFixed(2)`                   | **THROWS** `TypeError` — unguarded method call on `null`                                                                                                                                                                                                                                                                                                                 | Guard: print `—` / `unmeasured`                                                                                                  |
| `lib/historical-agents-db.ts:111,300-331`                  | `calculateMonicaComponents(monicaConstant: number)` | **Silently wrong.** Does not throw: every `>=` comparison against `null` is false, so it falls through to the final `else` and returns the "Dormant" ESMS quad `{2.5, 3.0, 4.0, 4.5}` (`:328-329`), which is then written to `spiritScore`/`essenceScore`/`matterScore`/`substanceScore` at `:158-161`. **Absence is laundered into four more fabricated measurements.** | Accept `number \| null`; on `null`, write `null` to all four score columns (they are already nullable — `schema.prisma:729-732`) |
| `backend/utils.py:849-850`                                 | `kalchmConstant`                                    | Safe-ish: `if kalchm is not None else 50.0`. Does not crash, but substitutes a fabricated neutral 50 % and presents it as a consciousness score                                                                                                                                                                                                                          | Propagate absence: drop the component and renormalise, exactly as the Monica path at `:856,872-877` already does                 |
| `backend/utils.py:856,872-877`                             | `monica_constant`                                   | **Correct model.** `has_monica = … is not None and math.isfinite(…)`, then the component is appended only when present and the weight sum is recomputed                                                                                                                                                                                                                  | None — this is the pattern the others should copy                                                                                |
| `backend/main.py:1693`                                     | `agent.monicaConstant`                              | Safe — explicit `is not None else None`                                                                                                                                                                                                                                                                                                                                  | None                                                                                                                             |
| `backend/main.py:1729`                                     | `agent.monicaConstant`                              | Safe — explicit `is not None else None`                                                                                                                                                                                                                                                                                                                                  | None                                                                                                                             |
| `app/api/agents/route.ts:28`                               | `agent.monicaConstant ?? null`                      | Safe                                                                                                                                                                                                                                                                                                                                                                     | None                                                                                                                             |
| `app/api/agents/gallery/route.ts:56,126`                   | `?? null` / passthrough                             | Safe                                                                                                                                                                                                                                                                                                                                                                     | Display layer must render absence, not `0`                                                                                       |
| `lib/services/agent-action-service.ts:1189-1191,1232`      | `profile.monicaConstant`                            | Safe — explicit null/undefined check, then `Number.isFinite` guard                                                                                                                                                                                                                                                                                                       | None                                                                                                                             |
| `scripts/run-agent-tick.ts:145-146`                        | `agent.user_profiles.monicaConstant`                | Needs review — wrapped in an IIFE                                                                                                                                                                                                                                                                                                                                        | Verify null path                                                                                                                 |
| `lib/jobs/transit-monitoring-job.ts:190`                   | `chart.monicaConstant`                              | Passthrough                                                                                                                                                                                                                                                                                                                                                              | Verify consumer                                                                                                                  |
| `app/api/personalized-transits/route.ts:55`                | `chart.monicaConstant`                              | Passthrough                                                                                                                                                                                                                                                                                                                                                              | Verify consumer                                                                                                                  |
| `app/api/personalized-planetary-transits/route.ts:200,292` | `chart.monicaConstant`                              | Passthrough                                                                                                                                                                                                                                                                                                                                                              | Verify consumer                                                                                                                  |
| `scripts/measure-staking-monica.ts:91,117`                 | both sources                                        | Analysis script                                                                                                                                                                                                                                                                                                                                                          | Exclude null rows rather than coercing                                                                                           |
| `scripts/backfill-agent-sync.ts:56`                        | `profile?.monicaConstant`                           | Optional-chained                                                                                                                                                                                                                                                                                                                                                         | Verify downstream                                                                                                                |
| `scripts/provision-agentic-users.ts:139,200`               | `agent.monicaConstant ?? undefined`                 | Safe                                                                                                                                                                                                                                                                                                                                                                     | None                                                                                                                             |

### Not in scope — same identifier, no DB column involved

These compute Kalchm/Monica in memory and never touch a column. Listed so a future
reader does not chase them: `lib/core-energy-rules.ts:97,247-276`,
`lib/planetary-rules-index.ts:119,173,206,301-303,392`, `lib/food-recommendation-rules.ts:207,232-235`,
`lib/daily-tracking-rules.ts:30,155,199,627`, `lib/astrological-chart-rules.ts:46,524`,
`app/page.tsx`, `app/(app)/monica/page.tsx`, `app/providers.tsx`,
`app/(app)/synastry/[agent]/page.tsx`, `backend/src/routes/consciousness.ts:366`.

`server.ts:358-384` computes its own `monicaConstant` for `GET /api/astrology/consensus`.
CLAUDE.md documents it as a known non-canonical site. It serves the value over HTTP but
does not write a column, so it is **out of scope here** and should be fixed under the
thermodynamics-unification work.

### Display-layer rule for absence

Once nullable, a `null` must never render as `0`, `0.5`, or a blank that reads as zero.
Render an explicit `—` with a tooltip such as _"not measured for this agent"_. The
precedent is the chart-provenance work in commit `7ad3b4e5`, which labelled every chart
`computed | authored | placeholder | unattributed` rather than letting a placeholder
pass as a measurement. **[INFERRED]** — recommendation, not observed behaviour.

---

## 5. The backfill decision — READ THIS FIRST

**A fabricated value cannot be distinguished from a legitimate one after the fact.
The existing data is not recoverable.** This is the most important finding in the plan.

`historical_agents.monicaConstant` is a bare `DOUBLE PRECISION` with no provenance
column, no write timestamp per field, and no audit trail. Values currently in it come
from at least six different sources **[VERIFIED]** from the writer inventory:

- Phi Axis Index (`app/api/create-agent/route.ts:581`)
- literal `0.5` (`backend/main.py:1208`, `:1936`, `backend/seed_planetary_agents.py:65`, and — until now — `backend/crud.py:28`)
- literal `0.72` (`backend/main.py:1184`)
- literal `0` (`lib/user-provisioning.ts:77,106`, `app/api/user-charts/route.ts:54`)
- raw spirit scores (`backend/main.py:1001`, `scripts/seed-moon-agents.ts:116`, `backend/seed_moon_phase_agents.py:132`)
- power levels (`backend/main.py:1164`, `backend/seed_3600_planetary_agents.py:155`)

A stored `0.5` may be `crud.py`'s invention, `seed_planetary_agents.py`'s invention, or a
genuine Phi Axis Index that legitimately evaluates to 0.5. **Nothing in the row
distinguishes them.** The same is true of `0`: it is both `user-provisioning.ts`'s
placeholder and `seed-historical-agents.ts:104`'s hardcoded Kalchm and a legitimate
computed result.

### Consequence

Do **not** write a backfill that nulls rows matching `= 0.5` or `= 0`. That would
destroy legitimate values along with fabricated ones, and it would be a second
data-invention event in the opposite direction.

### Recommended policy — recompute, don't guess

1. **`kalchmConstant`** is recomputable wherever ESMS survives. `historical_agents`
   carries `spiritScore`/`essenceScore`/`matterScore`/`substanceScore`
   (`schema.prisma:729-732`, all nullable). Where all four are non-null, recompute Kalchm
   with the canonical `calculateKalchm` and overwrite. Where any is null, set `NULL`.
   ⚠️ Caveat: for agents created through `lib/historical-agents-db.ts:111`, those four
   scores are themselves the fabricated ladder output from `calculateMonicaComponents`
   (§4), so recomputing from them produces a _real Kalchm of fabricated inputs_. Those
   rows must be set `NULL`, not recomputed. Identify them by the same difficulty — you
   cannot, from the row alone. **[INFERRED]** Best available discriminator: the seven
   distinct quads hardcoded at `lib/historical-agents-db.ts:311-329` are exact literals
   and can be matched, accepting a small false-positive rate. Document the choice.
2. **`monicaConstant`** — since no writer ever stored the thermodynamic Monica (§1),
   there is nothing to preserve _as Monica_. Preserve the values as the Phi Axis Index
   they actually are, and let the concurrent rename task move them to a correctly named
   column. **Do not null this column in this migration.**
3. **New rows only.** After the schema change, absence is stored as `NULL` going
   forward. Historical rows keep their unknown-provenance numbers, and are marked
   untrustworthy in documentation rather than silently "cleaned".

### The honest alternative, if the team wants certainty

Add a provenance column (e.g. `monicaProvenance TEXT`) mirroring the chart-provenance
pattern from `7ad3b4e5`, defaulting every existing row to `'unattributed'`. That does
not recover the lost information, but it stops the values being _presented_ as measured
— which is what the standing principle actually requires. **Recommended.**

---

## 6. Deploy reality: `db push`, not `migrate deploy`

**[VERIFIED — CLAUDE.md]** This repo deploys schema via `prisma db push`, and
`prisma/migrations/` is **far behind** `schema.prisma`. `prisma migrate deploy` will
**not** reproduce the real schema. Migration files here are written by hand for the
record only (precedent: `20260719120000_add_agent_wallets`).

So the plan must not assume a clean migration history:

- The authoritative change is the edit to `schema.prisma` followed by `prisma db push`.
- A hand-written SQL file is committed **for the record**, and is also the exact
  statement to run if applying by `psql` instead.
- Do **not** run `prisma migrate dev` — it will try to reconcile the drifted history and
  will propose dropping things.

> ### ⚠️ **NEVER pass a real database URL as `--shadow-database-url`.**
>
> **Prisma RESETS the shadow database — it drops everything in it. Doing this already
> destroyed the tramway dev database on 2026-07-19.** There is no confirmation prompt
> and no undo.
>
> To diff a live database, use the **read-only** form only:
>
> ```bash
> prisma migrate diff \
>   --from-url "$DATABASE_URL" \
>   --to-schema-datamodel prisma/schema.prisma \
>   --script
> ```

---

## 7. The migration SQL

Nullability only. No renames, no type changes, no index changes.

```sql
-- docs record: relax NOT NULL on the Monica/Kalchm quantity columns so that an
-- unmeasured quantity can be stored as NULL instead of a fabricated literal.
BEGIN;

-- 1. historical_agents (prisma/schema.prisma:724-725)
ALTER TABLE "public"."historical_agents"
  ALTER COLUMN "kalchmConstant" DROP NOT NULL;

ALTER TABLE "public"."historical_agents"
  ALTER COLUMN "monicaConstant" DROP NOT NULL,
  ALTER COLUMN "monicaConstant" DROP DEFAULT;   -- was DEFAULT 0

-- 2. created_agents (prisma/schema.prisma:698)
ALTER TABLE "public"."created_agents"
  ALTER COLUMN "monicaConstant" DROP NOT NULL;

-- 3. user_natal_charts (prisma/schema.prisma:1278)
ALTER TABLE "public"."user_natal_charts"
  ALTER COLUMN "monicaConstant" DROP NOT NULL;

-- 4. user_profiles (prisma/schema.prisma:1311)
ALTER TABLE "public"."user_profiles"
  ALTER COLUMN "monicaConstant" DROP NOT NULL;

COMMIT;
```

`DROP NOT NULL` and `DROP DEFAULT` are catalogue-only operations in PostgreSQL — no table
rewrite, no full-table lock beyond a brief `ACCESS EXCLUSIVE`. Safe on a live table.
**[INFERRED]** from standard PostgreSQL behaviour; confirm against the deployed server
version before running in production.

Dropping `DEFAULT 0` on `historical_agents.monicaConstant` is **required**, not cosmetic:
`backend/crud.py` now omits the column when the quantity is unmeasured, so while the
default survives, Postgres keeps substituting `0` and the fix is inert on Postgres. The
same code already yields a true `NULL` on SQLite, where no default exists.

Corresponding `schema.prisma` edits — the authoritative change:

```prisma
// :698   created_agents
monicaConstant   Float?

// :724   historical_agents
kalchmConstant         Float?
// :725
monicaConstant         Float?     // @default(0) removed

// :1278  user_natal_charts
monicaConstant        Float?

// :1311  user_profiles
monicaConstant       Float?
```

Leave `@@index([kalchmConstant])` and `@@index([monicaConstant])` (`:811-812`) untouched.

### Also required, outside the schema

`backend/models.py:33` — remove the ORM client-side `default=0.5`:

```python
kalchmConstant = Column(Float)   # was: Column(Float, default=0.5)
```

Without this, SQLAlchemy keeps supplying `0.5` on every insert that omits the column and
the migration has no effect on the Python write path.

---

## 8. Order of operations

Schema, writers and readers cannot change together. This order keeps every intermediate
state deployable, because _widening_ a column to nullable is backward-compatible — old
writers that still send a number keep working.

**Phase 0 — stop the re-corruption (before anything else).**

0.1 Remove the Monica→Kalchm `COALESCE` from `backend/database.py:225` **and** `:320`.
Until this is gone, every backend startup re-launders Monica into Kalchm and will
undo Phase 3. Highest-risk item in the plan.
0.2 Fix `app/api/philosophers-stone/create/route.ts:93` — bind Kalchm and Monica to
**different** parameters (`$5, $5` → distinct placeholders), or drop `kalchmConstant`
from the insert entirely so it is simply not asserted.
0.3 Fix the dual-write seeds: `scripts/seed-moon-agents.ts:116-117`,
`backend/seed_moon_phase_agents.py:132-133`,
`backend/seed_3600_planetary_agents.py:155-156`.
0.4 ✅ **Done** — `backend/crud.py` no longer fabricates `0.5` and no longer copies
Monica into Kalchm.

**Phase 1 — make readers null-safe (deploy before the schema changes).**

1.1 `scripts/check-db-agents.ts:24` — guard the `.toFixed(2)`.
1.2 `lib/historical-agents-db.ts:300` — accept `number | null`; propagate `null` into the
four score columns instead of returning the "Dormant" quad.
1.3 `backend/utils.py:849-850` — drop-and-renormalise on absent Kalchm, mirroring the
Monica handling at `:856,872-877`.
1.4 Audit the "verify consumer" rows in §4.
1.5 Display layer: render `—` for absence, never `0`.

**Phase 2 — schema.** Edit `schema.prisma` per §7, commit the hand-written SQL for the
record, run `prisma db push`, then `bun run prisma:generate`. Types now widen to
`number | null`; `bunx tsc --noEmit` will surface any reader missed in Phase 1. **Treat
new type errors here as the real audit** — grep cannot attribute these symbols, the type
checker can.

**Phase 3 — writers stop inventing.** Remove `backend/models.py:33`'s `default=0.5`.
Replace the literals at `backend/main.py:1184`, `:1208`, `:1936`,
`backend/seed_planetary_agents.py:65`, `lib/user-provisioning.ts:77,106`,
`app/api/user-charts/route.ts:54`, `scripts/seed-historical-agents.ts:104` with omission
or explicit `null`.

**Phase 4 — backfill.** Only per the policy in §5. Recompute Kalchm where genuine ESMS
exists; otherwise `NULL`. Preferably add the provenance column instead.

**Phase 5 — the rename (separate task, separate migration).** Once the concurrent
`lib/monica/monica-constant.ts` rename lands, rename the four PAI columns
(`created_agents:698`, `historical_agents:725`, `user_natal_charts:1278`,
`user_profiles:1311`) to `phiAxisIndex`. **Not part of this migration** — keeping
nullability and renaming apart means either can be rolled back independently.

---

## 9. Rollback

Nullability widening is only reversible while no `NULL` has been written. **After
Phase 3 ships, rollback requires re-inventing the values that were legitimately recorded
as absent — which is the original bug.** Roll back Phase 2 only if it is caught before
Phase 3 is deployed.

```sql
-- Rollback for §7. FAILS if any NULL exists — that failure is correct and
-- protective: it means real absences have been recorded and cannot be restored
-- without fabricating numbers. Do NOT "fix" it by filling defaults.
BEGIN;

ALTER TABLE "public"."historical_agents"
  ALTER COLUMN "kalchmConstant" SET NOT NULL;
ALTER TABLE "public"."historical_agents"
  ALTER COLUMN "monicaConstant" SET DEFAULT 0,
  ALTER COLUMN "monicaConstant" SET NOT NULL;
ALTER TABLE "public"."created_agents"
  ALTER COLUMN "monicaConstant" SET NOT NULL;
ALTER TABLE "public"."user_natal_charts"
  ALTER COLUMN "monicaConstant" SET NOT NULL;
ALTER TABLE "public"."user_profiles"
  ALTER COLUMN "monicaConstant" SET NOT NULL;

COMMIT;
```

Revert `schema.prisma` alongside it and re-run `prisma db push`. Take a logical backup
(`pg_dump`) of the four tables before Phase 2 regardless.

---

## 10. Verification queries

**Before Phase 2 — confirm the starting state.**

```sql
SELECT table_name, column_name, is_nullable, column_default, data_type
FROM information_schema.columns
WHERE column_name IN ('monicaConstant', 'kalchmConstant')
ORDER BY table_name, column_name;
```

Expect five rows, all `is_nullable = 'NO'`, with `historical_agents.monicaConstant`
showing `column_default = 0`. **If the count is not five, stop** — the live schema has
drifted from `schema.prisma` and this plan's assumptions need re-checking first.

**After Phase 2 — the migration did what it claimed.**

```sql
-- All five must now be YES, and no defaults remain.
SELECT table_name, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE column_name IN ('monicaConstant', 'kalchmConstant')
ORDER BY table_name, column_name;

-- Both indexes must still exist.
SELECT indexname FROM pg_indexes
WHERE tablename = 'historical_agents'
  AND indexname IN (
    'historical_agents_kalchmConstant_idx',
    'historical_agents_monicaConstant_idx'
  );
```

**After Phase 3 — absence is actually being stored.** This is the test that proves the
fix is live rather than merely deployed; a green schema is not evidence that any writer
changed behaviour.

```sql
-- Must be > 0 once agents are created without a measured quantity.
-- If it stays 0, a writer is still inventing a value, or DEFAULT 0 was not dropped.
SELECT count(*) FILTER (WHERE "monicaConstant" IS NULL) AS monica_absent,
       count(*) FILTER (WHERE "kalchmConstant" IS NULL) AS kalchm_absent,
       count(*)                                          AS total
FROM historical_agents
WHERE "createdAt" > now() - interval '1 day';
```

**Standing check — the laundering has not returned.** Run after any deploy; `crud.py:29`,
`philosophers-stone/create:93`, the moon seeds and `database.py:225,320` all produced
exactly this signature.

```sql
-- Rows where Kalchm and Monica are bit-identical are almost certainly laundered.
-- Expect this to shrink to ~0 for new rows after Phase 0.
SELECT count(*) AS suspected_laundered
FROM historical_agents
WHERE "kalchmConstant" IS NOT NULL
  AND "monicaConstant" IS NOT NULL
  AND "kalchmConstant" = "monicaConstant";
```

**Value-distribution snapshot — take before Phase 4** so the backfill's effect is
measurable, and as evidence for the §5 finding:

```sql
SELECT "monicaConstant", count(*)
FROM historical_agents
GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

Spikes at exactly `0`, `0.5`, and `0.72` are the fingerprints of the literal writers in
§3 — but note again (§5) that an individual row at `0.5` still cannot be proven
fabricated.

---

## 11. Open items this plan does not close

- `backend/crud.py:89-90` (`update_agent`): an explicit `null` from a client currently
  hits the NOT NULL constraint. After Phase 2 it will succeed and clear the value. That
  is arguably correct, but it becomes a way to erase data via the API — decide whether
  `AgentUpdate` should distinguish "absent" from "set to absent".
- `server.ts:358-384` serves a non-canonical Monica over
  `GET /api/astrology/consensus` (CLAUDE.md, known-open). Out of scope.
- `lib/historical-agents-db.ts:306`'s comment documents the PAI formula as "Monica
  Constant", reinforcing the naming collision. Fix with the Phase 5 rename.
