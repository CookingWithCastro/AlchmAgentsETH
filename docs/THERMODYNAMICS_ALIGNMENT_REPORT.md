# AAE thermodynamics alignment report

Date: 2026-07-25

## Basis and scope

This audit treats a numeric constructor as an implementation and excludes static, curated agent
records, display-only thresholds, and consumers that only transform an already-computed value. It
covered the Next.js application, the legacy TypeScript backend, the FastAPI Python backend,
scripts, and tests. The TypeScript resolver scans those otherwise-disconnected trees explicitly
(`scripts/resolveThermoCallers.ts:22-53`), resolves import aliases and shorthand table references
(`scripts/resolveThermoCallers.ts:134-149`), and asserts a canonical cross-file call plus a
zero-call/live-value control (`scripts/resolveThermoCallers.ts:278-310`). Its final run covered
1,411 TypeScript-family files, including 41 under `backend/`.

WTEN's checked-out branch is older than the thermodynamics work, so I used immutable commit
`96f0c0bd` for executable reference evidence. No WTEN file was modified. No deployment, migration,
on-chain transaction, or production write was performed.

## 1. Recon findings: reproduced and not reproduced

| Hypothesis                                                                 | Result                                                                                     | Evidence                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three AAE Kalchm copies                                                    | Reproduced, but incomplete. There were five TypeScript copies and one FastAPI Python copy. | Current delegators are at `components/cosmic-agents/agent-adapter.ts:150-157`, `lib/agent-performance-optimizer.ts:56-64`, `lib/agents/alchemical-profiles.ts:45-49`, `lib/context-card/from-natal-chart.ts:114-120`, `lib/core-energy-rules.ts:232-238`, and `backend/utils.py:297-299`.    |
| Adapter returned 1 for a zero denominator axis and rounded to two decimals | Reproduced.                                                                                | The pre-change characterization measured both behaviors; the replacement seam and exact regression vectors are at `test/thermodynamics/kalchm-characterization.test.ts:25-74`.                                                                                                               |
| Optimizer and alchemical profiles were unfloored and likely exact          | Reproduced for non-negative finite input.                                                  | Healthy, one-zero, and two-zero cases now pin their exact values through the real public seams at `test/thermodynamics/kalchm-characterization.test.ts:56-69`.                                                                                                                               |
| `lib/alchemizer.ts` contained the referenced fourth formula                | Did not reproduce.                                                                         | The AST formula inventory found no self-exponentiation there; the comment was stale. The gate's positive canonical control is at `scripts/checkNoStrayKalchmFormula.ts:109-123`.                                                                                                             |
| Fabricated UI/API fallbacks at the listed sites                            | All reproduced.                                                                            | Representative corrected boundaries: agent page `app/(app)/agent/[id]/page.tsx:178-184,330-332`; prompts and group average `app/api/unified-multi-agent-chat/route.ts:1064,1133-1142,1334-1347`; Monica page `app/(app)/monica/page.tsx:118-134`; landing derivation `app/page.tsx:384-390`. |
| `[0,1]` staking clamp                                                      | Reproduced exactly.                                                                        | `lib/staking/yield-rate.ts:91-94`. It was deliberately not changed.                                                                                                                                                                                                                          |
| Disconnected `server.ts` formula                                           | Reproduced exactly.                                                                        | Constructor and tier thresholds are at `server.ts:350-365`; the result is returned at `server.ts:374-385`. It was deliberately not changed.                                                                                                                                                  |

The fallback AST pass initially found 42 direct numeric/truthiness substitutions, not only the
seven recon sites. Spec review then found five missed runtime constructions: three name-hash
generators in the live route, batch route, and client hook, a feed-card fallback object, and a
chart-to-agent adapter. They were removed: a missing calculator now returns
`CONSCIOUSNESS_NOT_COMPUTED`, the hook leaves its result absent, and council-feed agents without
measured ESMS carry null ESMS, Monica, and Kalchm
(`lib/consciousness/proxy-route.ts:4-40`, `hooks/useLiveConsciousness.ts:128-175`,
`components/cosmic-agents/feed-cards.tsx:29-38`,
`components/cosmic-agents/agent-adapter.ts:169-185`).
The detector now has controlled nullish-fallback, fallback-object, and chart-adapter defects
(`scripts/checkNoFabricatedMonicaFallback.ts:221-305,317-354`). Additional flow-derived
defaults—empty averages, cache metadata, score components, and a legacy backend error fallback—were
found manually and corrected as null/omitted components; examples are
`lib/agent-cache-system.ts:157-168`,
`app/api/moment-recommendations/enhanced-scoring.ts:79-84,112-123`, and
`backend/src/services/monica-constant-service.ts:53-80`.

## 2. Exact Kalchm inventory and callers

### Before consolidation

| Site                                        | Former zero/negative strategy                                    | Resolved callers                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `components/cosmic-agents/agent-adapter.ts` | Denominator-zero band returned 1; rounded to 2 decimals          | `craftedToCouncilAgent`; current wrapper at `components/cosmic-agents/agent-adapter.ts:150-157`                          |
| `lib/agent-performance-optimizer.ts`        | Raw/unfloored; non-finite fallback 1                             | Seven calls through `getKalchmValue`; current path at `lib/agent-performance-optimizer.ts:274-285`                       |
| `lib/agents/alchemical-profiles.ts`         | Raw/unfloored; non-finite fallback 1                             | `components/misc/enhanced-agent-card.tsx` plus tests; current wrapper at `lib/agents/alchemical-profiles.ts:45-49`       |
| `lib/context-card/from-natal-chart.ts`      | `axis \|\| 1`; rounded to 2 decimals                             | Same-file context-card builder plus tests; current wrapper at `lib/context-card/from-natal-chart.ts:114-120`             |
| `lib/core-energy-rules.ts`                  | Absolute-value epsilon `1e-10` plus odd-negative sign correction | Same-file advanced calculation and `lib/planetary-rules-index.ts`; current wrapper at `lib/core-energy-rules.ts:232-253` |
| `backend/utils.py`                          | `x <= 0 -> 1`; thermodynamic Monica defaulted to 1               | Live `alchemize` path; current delegation at `backend/utils.py:297-299`                                                  |

### After consolidation

The TypeScript source of truth is `lib/thermodynamics/kalchm.ts:1-39`. FastAPI needs a Python
runtime adapter, so `backend/thermodynamics.py:1-43` is pinned to the same cross-runtime golden
vectors at `backend/test_thermodynamics.py:13-28`. All old sites delegate. This is one behavioral
engine with two language adapters, not one executable module shared across runtimes.

The TypeScript AST gate permits four self-exponentiation nodes only in the canonical module and has
an empty allowlist (`scripts/checkNoStrayKalchmFormula.ts:18-23,109-123,142-180`). Its Python AST
counterpart covers all 34 backend Python files and permits four nodes only in
`backend/thermodynamics.py` (`scripts/check_no_stray_kalchm_formula.py:1-66`). Both gates run in CI
(`.github/workflows/ci.yml:20-27`).

The pre-change result remains executable rather than living only in prose:
`scripts/measure-legacy-kalchm.ts:1-154` archives immutable commit
`c3151e9e843cface2e872824f690aa46fe64680e`, exposes the real private functions without replacing
their bodies, imports all five TypeScript implementations, and asserts the measured matrix in an
isolated Vitest run.

## 3. Monica constructor inventory

This inventory matters because “Monica Constant” is not one semantic quantity in AAE. Only the
first two rows are the thermodynamic `-energy / (reactivity * ln(kalchm))` construction.

| Constructor                                                            | Formula/strategy                                                                                    | Caller status                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `lib/thermodynamics/kalchm.ts:41-68`                                   | Thermodynamic Monica; exact equilibrium returns 1.618, malformed input is absent; sign is preserved | `lib/core-energy-rules.ts:244-253`, then same-file advanced constants and `lib/planetary-rules-index.ts` |
| `backend/thermodynamics.py:46-68`                                      | Python mirror of thermodynamic Monica                                                               | `backend/utils.py:297-299` through live `alchemize`                                                      |
| `lib/monica/monica-constant-validator.ts:97-139`                       | `(S*phi + E + elementalBonus)/(M+Su+1)`, rounded and clamped `[0,20]`                               | 32 resolved calls in 8 files; this is the dominant UI/creation constructor                               |
| `lib/monica/monica-constant.ts:43-55`                                  | `(S*phi+E)/(M+Su+1)`, rounded                                                                       | 5 resolved calls in 5 files, including create/profile APIs and Monica UI                                 |
| `backend/src/services/monica-constant-service.ts:18-80`                | `phi*(1+balance/total)*(1+level/10)`                                                                | 4 calls in `backend/src/routes/consciousness.ts`; invalid results now return null                        |
| `backend/src/services/swiss-ephemeris.ts:169-222`                      | A second `phi*(1+E/T)*(1+C/10)` implementation                                                      | Zero direct calls, but live as a shorthand value in `swissEphemerisService` at lines 241-246             |
| `lib/swiss-ephemeris-service.ts:199-263`                               | Weighted Sun/Moon/Ascendant longitude pseudo-hash in `[0,1)`                                        | Zero direct calls, but live in the exported service table at lines 273-278                               |
| `app/page.tsx:363-369`                                                 | Local `(S*phi+E)/(M+Su+1)`                                                                          | Live landing-page `useMemo`                                                                              |
| `components/consciousness/real-time-consciousness-preview.tsx:118-121` | Local `(S*phi+E)/(M+Su+1)`                                                                          | Component-local; re-exported but no direct caller resolved                                               |
| `lib/enhanced-chart-calculator.ts:256-261`                             | Local `(S*phi+E)/(M+Su+1)`                                                                          | Enclosing calculator; no direct constructor caller found                                                 |
| `lib/demo-agents-data.ts:276-285`                                      | Local `(S*phi+E)/(M+Su+1)` helper                                                                   | Zero resolved callers                                                                                    |
| `backend/utils.py:676-683`                                             | Python `(S*phi+E)/(M+Su+1)` helper                                                                  | No caller found                                                                                          |
| `lib/utils.ts:37-54`                                                   | ESMS sum                                                                                            | Live through four wrapper/API/component call paths plus tests                                            |
| `components/wizards/AgentCreationWizard.tsx:384-393`                   | ESMS sum                                                                                            | Live dynamic Philosopher's Stone wizard                                                                  |
| `backend/src/services/chart-synthesizer.ts:1-28`                       | ESMS sum with missing axes coerced to zero                                                          | Live route constructor                                                                                   |
| `backend/main.py:956`                                                  | Moon phase table's Spirit value labeled as Monica                                                   | Live chat auto-registration                                                                              |
| `backend/main.py:1119`                                                 | Dignity/degree power heuristic labeled as Monica                                                    | Live planetary auto-registration                                                                         |
| `backend/main.py:1139`                                                 | Static `0.72` culinary registration value                                                           | Live Alchemical Chef auto-registration                                                                   |
| `backend/main.py:1163`                                                 | Static `0.5` historical registration fallback                                                       | Live generic chat auto-registration; persistence-schema blocker                                          |
| `backend/main.py:1886`                                                 | Static `0.5` sync registration fallback                                                             | Live internal sync; persistence-schema blocker                                                           |
| `app/(app)/philosophers-stone/modern-page-v2.tsx:196-205`              | Mean Sun/Moon/Ascendant longitude scaled to `[0,10]`                                                | Component-local                                                                                          |
| `lib/unified-agent-factory.ts:100-116,336-354`                         | Per-planet base table plus degree modifier                                                          | Live planetary-agent factory                                                                             |
| `server.ts:350-365`                                                    | Element average plus spread divided by 12                                                           | Live agent-generation response                                                                           |
| `lib/clients/tokens-client.ts:204-214`                                 | Geometric mean of four token rates, stored as `rates.monica`                                        | Live recommendation-service client                                                                       |
| `components/consciousness/agent-creation-wizard.tsx:346-354`           | Random preview value `4.8 + random*2`                                                               | Re-exported preview wizard; no deterministic basis                                                       |
| `lib/agents/planetary-degree-feed.ts:455-469,595-607`                  | Dignity/static constants for generated planetary feed profiles                                      | Live feed generator                                                                                      |

Static historical-agent values and downstream scoring/threshold transforms are intentionally not
counted as constructors. Five additional runtime Monica constructions existed before this change:
three name-hash outage generators, the feed fallback, and the chart-to-agent static value. They
were removed rather than retained as constructors. The current inventory is 26 executable constructors: 2
thermodynamic adapters and 24 semantically disconnected constructions. It proves that wholesale
“Monica consolidation” would merge different objects and is unsafe without an owner-approved
domain model. The thermodynamic constructor alone was consolidated.

## 4. Measured divergence

The exact regression vectors are defined at
`test/thermodynamics/kalchm-characterization.test.ts:25-45` and exercised through every current
delegate at lines 56-69. The pre-delegation matrix is independently reproducible from the real
fixed-point source with `bun run measure:kalchm-legacy`
(`scripts/measure-legacy-kalchm.ts:12-112`). Before delegation, measured output was:

| Site              |                      Healthy | One denominator zero | Two denominator zeros |          Negative Matter |
| ----------------- | ---------------------------: | -------------------: | --------------------: | -----------------------: |
| Exact definition  |            0.949805110713276 |   0.6583525144933101 |    0.5128934190374708 |       0.7399512873857882 |
| Adapter           |                         0.95 |                    1 |                     1 |                    `NaN` |
| Context card      |                         0.95 |                 0.66 |                  0.51 |                        1 |
| Profiles          |                        exact |                exact |                 exact |                        1 |
| Optimizer         |                        exact |                exact |                 exact |                        1 |
| Core energy rules |                        exact |   0.6583525160092228 |    0.5128934213994323 |      -1.0464491461164132 |
| FastAPI           | exact for these finite cases |                exact |                 exact | exact non-negative clamp |

The two unfloored implementations were already bit-for-bit exact on all non-negative cases, as
predicted. The core's `1e-10` floor differed by `2.3025850115487856e-7%` per zero denominator axis,
which equals `eps^(-eps)-1`. Independent checks also reproduced `+0.6932%` at `eps=.001`,
`+4.7129%` at `.01`, and `+25.8925%` at `.1`. The adapter's zero band did not obey that law
because it substituted 1 rather than flooring an axis.

Current canonical totality, exact zero axes, negative clamping, negative Monica preservation, exact
equilibrium φ, and malformed-input absence are pinned in TypeScript at
`test/thermodynamics/canonical-kalchm.test.ts:4-61` and in Python at
`backend/test_thermodynamics.py:13-48`.

## 5. Changes made and deliberately withheld

Changed:

- Consolidated all thermodynamic Kalchm copies into exact, total runtime adapters
  (`lib/thermodynamics/kalchm.ts:1-39`, `backend/thermodynamics.py:1-43`).
- Made exact thermodynamic equilibrium return φ while malformed and singular inputs remain absent,
  preserving negative healthy values (`lib/thermodynamics/kalchm.ts:41-68`).
- Replaced direct fabricated Monica fallbacks with null propagation and explicit “not computed”
  rendering. Group aggregates now average only finite observations
  (`app/api/unified-multi-agent-chat/route.ts:1334-1347`).
- Replaced the legacy Node backend's fabricated phi-on-error result with null and explicit route
  failure; tests cover finite and invalid inputs
  (`backend/src/services/monica-constant-service.ts:53-80`,
  `test/thermodynamics/monica-null-propagation.test.ts:16-38`).
- Replaced the natal-chart service's hard-coded 2.1 with a reproducible calculation from measured
  ESMS output (`lib/services/natal-chart-storage.ts:474-488`).
- Made crafted-agent creation derive Kalchm from synthesized ESMS and persist Monica separately
  (`app/api/create-agent/route.ts:558-575`, `lib/historical-agents-db.ts:924-967`).
- Removed five fabricated runtime constructors. Backend absence is now an explicit 503, the council
  adapter preserves absent ESMS/Monica/Kalchm, and no reviewed path produces plausible replacement
  values (`test/thermodynamics/consciousness-absence-routes.test.ts:9-45`,
  `test/thermodynamics/monica-null-propagation.test.ts:61-72`).
- Added controlled AST gates and CI wiring
  (`scripts/checkNoFabricatedMonicaFallback.ts:221-354`,
  `scripts/checkNoStrayKalchmFormula.ts:97-180`, `.github/workflows/ci.yml:20-27`).

Deliberately not changed:

- The staking clamp remains exactly as found at `lib/staking/yield-rate.ts:91-94`; changing it
  changes an economic input.
- The disconnected server heuristic and tiers remain exactly as found at `server.ts:350-365`.
- The 24 non-thermodynamic Monica constructors remain separate because their domains and scales
  are not equivalent.
- Database nullability/defaults were not migrated. `historical_agents.monicaConstant` still has a
  default zero and both thermodynamic columns are non-nullable
  (`prisma/schema.prisma:724-725`), and `user_profiles.monicaConstant` remains
  non-nullable (`prisma/schema.prisma:1303-1312`). Placeholder writes remain at
  `app/api/user-charts/route.ts:48-55` and `lib/user-provisioning.ts:69-80,100-108`. Correcting
  those requires an owner-approved schema/onboarding migration, prohibited by this task.
- FastAPI creation still defaults missing Monica to `0.5` and copies it into Kalchm
  (`backend/crud.py:27-29`); generic chat and sync registration also inject `0.5`
  (`backend/main.py:1163,1886`). A verification attempt to persist null failed against the actual
  `kalchmConstant NOT NULL` constraint. Those writes were restored to avoid breaking registration
  and are reported as migration-blocked rather than falsely marked fixed.
- FastAPI's runtime schema repair still creates/backfills Kalchm with `0.5` or Monica
  (`backend/database.py:137-141,221-226,244-249,316-321`). It is itself a database-writing
  migration path and was therefore reported, not edited or executed.

## 6. Contradictions and human decisions

### WTEN contradiction

The supplied canonical description says single-body degeneracy is structural
`Essence === 0`. WTEN commit `96f0c0bd` does not: it derives
`MONICA_LN_EPSILON=0.10939293407637272` from a measured `|ln(kalchm)|` gap
(`WTEN@96f0c0bd:src/data/unified/alchemicalCalculations.ts:104-135`) and applies that band in
`calculateMonica` (`.../alchemicalCalculations.ts:244-268`). Its own derivation test says explicitly
that single-body's degenerate cluster is **not** the `Essence==0` set
(`WTEN@96f0c0bd:src/__tests__/monicaLnEpsilonDerivation.test.ts:143-153`).

AAE has no measured single-body population from which to derive either rule. Therefore the new
thermodynamic adapter totalizes only the exact algebraic singularity `ln(k)==0` and does not import
an unverified band or structural rule (`lib/thermodynamics/kalchm.ts:46-66`). The owner must choose
which construction AAE means before near-equilibrium classification can be aligned.

WTEN's same derivation-test comment also overstates that every zero-axis chart has `kalchm==1`;
AAE's counterexample with one zero denominator axis is exactly `0.6583525144933101`
(`test/thermodynamics/canonical-kalchm.test.ts:7-15`). A zero factor contributes `0^0=1`; it does
not force the whole ratio to 1.

### Economic clamp

The read-only measurement generator is `scripts/measure-staking-monica.ts:1-133`. On 2026-07-25:

- `user_natal_charts`: `ABSENT`, count 0. There is no real staking population from which to derive
  a scale.
- Repository historical agents: measured `n=72`, range `[0.817,7.77]`, median `4.66`; 69 values
  exceed 1, so the current clamp pins 69/72 at the maximum 0.5 contribution.
- A provisional `tanh(m/3.885)*.5`, where 3.885 is `abs(max)/2`, spreads contributions from
  `0.1036249065` to `0.4820137900`; the extremum was unique and its chart signature was not
  duplicated. This is **not** approval to use it: those are curated historical-agent values, not
  full-chart staking values.

The main Pentacles UI sends only `dominantElement`
(`app/(app)/pentacles/pentacles-client.tsx:84-87`), so the Monica clamp is dormant there. The claim
API nevertheless accepts a caller-supplied `natal` object
(`app/api/staking/claim-attestation/route.ts:44-47,59-67`), making trust and attestation validation
an owner/security decision as well as a mapping decision.

### Server heuristic

The reproducible exhaustive generator is `scripts/measure-server-monica-heuristic.ts:1-54`. It
enumerates all 286 four-element compositions of the ten planets used by `server.ts`. Because
elemental balance is a rounded percentage of planet counts
(`lib/chart-geometry-extractor.ts:536-576`), the heuristic can produce only `[2.50,5.21]`:
216 Emerging, 70 Developing, 0 Advanced, 0 Master. Two advertised tiers are unreachable.

WTEN does ignore an inbound sync `monicaConstant` and recomputes from the name at immutable commit
`96f0c0bd` (`WTEN@96f0c0bd:src/app/api/internal/agent-sync/route.ts:118-129`). That protects WTEN,
not AAE's own displays or economic paths. The owner should choose whether to rename this value,
replace it with one of the explicit constructions, or remove the tiers before changing it.

### Other owner decisions

- Choose and document domain names for the 24 non-thermodynamic constructors before consolidation.
- Decide whether random preview Monica (`components/consciousness/agent-creation-wizard.tsx:346-354`)
  and dignity/static feed Monica (`lib/agents/planetary-degree-feed.ts:455-469,595-607`) are valid
  generators or should become absent.
- Approve a nullable Monica migration/onboarding-state model before removing the remaining
  persistent zeros.
- Install/restore the legacy `backend/` Node package dependencies and missing source modules before
  treating its TypeScript backend as buildable. Its isolated typecheck currently stops on missing
  `jest`, `node`, Express-family packages, and pre-existing missing
  `services/thermodynamics.js`/`services/kinetics-service.js`.

## 7. Defects found per unit of work

| Unit                                        | Yield                                                                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One Kalchm formula inventory                | 6 executable copies found vs 3 hypothesized; 3 missed sites, 2 correct unfloored sites, 1 stale `lib/alchemizer.ts` reference                                                                |
| One fabricated-fallback AST pass            | 42 direct defects corrected; review found and removed 5 missed runtime constructors; 3 positive-control shapes now prevent the same false all-clear                                          |
| One cross-language follow-up                | 1 unscanned Python formula copy, 1 fabricated thermodynamic fallback, 5 FastAPI registration constructors, 4 Python `.5` reader/write defaults, and a runtime schema-repair write path found |
| One staking clamp audit                     | No valid real-data scale (database population empty), plus dormant UI wiring and an API trust-boundary risk; no economic change shipped                                                      |
| One exhaustive server heuristic enumeration | 2 unreachable tiers from 286/286 possible inputs                                                                                                                                             |
| One Monica namespace inventory              | 26 current constructors: 2 thermodynamic runtime adapters and 24 semantically disconnected constructors; 5 fabricated runtime constructors removed                                           |

The highest-yield work was mechanical inventory and fallback detection. The lowest-yield area for a
safe code change was staking: measurement proved the required population is absent, so changing
the clamp would have replaced one unsupported constant with another.

## Verification commands

```text
bunx vitest run test/
backend/.venv/bin/python -m pytest backend
bun run measure:kalchm-legacy
bunx tsc --noEmit
bun run lint
bun run check:no-fabricated-monica
bun run check:no-stray-kalchm
bun run scripts/resolveThermoCallers.ts
bun run scripts/measure-staking-monica.ts
bun run scripts/measure-server-monica-heuristic.ts
backend/.venv/bin/python -m ruff check backend/thermodynamics.py backend/test_thermodynamics.py backend/utils.py backend/crud.py backend/models.py backend/main.py scripts/check_no_stray_kalchm_formula.py
bun run build
```

Final results: the frontend suite passed 80 files and 798 tests with 7 skipped; the backend suite
passed 85 tests with 1 skipped. ESLint, TypeScript, Ruff, both AST gates, caller resolution, the
immutable legacy characterization, and both measurement generators passed. The production build
completed all 510 static pages and exited successfully; it retained existing dynamic-dependency
warnings plus missing optional Galileo/Anthropic-key notices.
