# AAE thermodynamics alignment report

Round 1: 2026-07-25. Round 2: 2026-07-26.

This is a cumulative record. Sections 1-7 are the round-1 report and were not deleted. Where
round 2 corrected one of their claims, the round-1 text carries an inline pointer and section 8
holds the correction. Stale `file:line` references have been refreshed in place; findings have
not been rewritten.

The one-line summary of round 2: round 1 consolidated **Kalchm and Monica** and left
Heat/Entropy/Reactivity/Greg's Energy as call-site detail, and it counted **two** runtimes when
there are **three** executing ones. Both gaps were hiding live arithmetic defects.

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

**Round 2 scope extension.** Round 1's scope was the set of trees a TypeScript program and a
`backend/`-rooted Python walk could see. Round 2 added the trees that scope excluded: the Rust
crate `pa-rust-backend/`, the `notebooks/` tree, the five top-level TypeScript trees the gate
never enumerated, the Rust golden-fixture generator, and the FastAPI request boundary. It also
widened the quantity under audit from Kalchm/Monica alone to all four thermodynamic quantities.
Round 2 likewise performed no deployment, migration, on-chain transaction, or production write,
and modified no WTEN file.

## 1. Recon findings: reproduced and not reproduced

> **Partly superseded by round 2.** This section predates the discovery of the Rust engine. It
> inventories implementations of **Kalchm** only, in **TypeScript and Python** only. It does not
> count implementations of Heat/Entropy/Reactivity/Greg's Energy, and it does not reach
> `pa-rust-backend/` or `notebooks/` at all. Section 8.1 has the corrected runtime inventory and
> section 8.3 the defect that inventory gap was concealing.

| Hypothesis                                                                 | Result                                                                                     | Evidence                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three AAE Kalchm copies                                                    | Reproduced, but incomplete. There were five TypeScript copies and one FastAPI Python copy. | Current delegators are at `components/cosmic-agents/agent-adapter.ts:150-157`, `lib/agent-performance-optimizer.ts:56-64`, `lib/agents/alchemical-profiles.ts:45-49`, `lib/context-card/from-natal-chart.ts:114-120`, `lib/core-energy-rules.ts:232-238`, and `backend/utils.py:292-309`.    |
| Adapter returned 1 for a zero denominator axis and rounded to two decimals | Reproduced.                                                                                | The pre-change characterization measured both behaviors; the replacement seam and exact regression vectors are at `test/thermodynamics/kalchm-characterization.test.ts:25-74`.                                                                                                               |
| Optimizer and alchemical profiles were unfloored and likely exact          | Reproduced for non-negative finite input.                                                  | Healthy, one-zero, and two-zero cases now pin their exact values through the real public seams at `test/thermodynamics/kalchm-characterization.test.ts:56-69`.                                                                                                                               |
| `lib/alchemizer.ts` contained the referenced fourth formula                | Did not reproduce.                                                                         | The AST formula inventory found no self-exponentiation there; the comment was stale. The gate's positive canonical control is at `scripts/checkNoStrayKalchmFormula.ts:137-143`.                                                                                                             |
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

> **Partly superseded by round 2.** Same limitation as section 1: this is a Kalchm inventory
> across two runtimes. See section 8.1.

### Before consolidation

| Site                                        | Former zero/negative strategy                                    | Resolved callers                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `components/cosmic-agents/agent-adapter.ts` | Denominator-zero band returned 1; rounded to 2 decimals          | `craftedToCouncilAgent`; current wrapper at `components/cosmic-agents/agent-adapter.ts:150-157`                          |
| `lib/agent-performance-optimizer.ts`        | Raw/unfloored; non-finite fallback 1                             | Seven calls through `getKalchmValue`; current path at `lib/agent-performance-optimizer.ts:274-285`                       |
| `lib/agents/alchemical-profiles.ts`         | Raw/unfloored; non-finite fallback 1                             | `components/misc/enhanced-agent-card.tsx` plus tests; current wrapper at `lib/agents/alchemical-profiles.ts:45-49`       |
| `lib/context-card/from-natal-chart.ts`      | `axis \|\| 1`; rounded to 2 decimals                             | Same-file context-card builder plus tests; current wrapper at `lib/context-card/from-natal-chart.ts:114-120`             |
| `lib/core-energy-rules.ts`                  | Absolute-value epsilon `1e-10` plus odd-negative sign correction | Same-file advanced calculation and `lib/planetary-rules-index.ts`; current wrapper at `lib/core-energy-rules.ts:232-253` |
| `backend/utils.py`                          | `x <= 0 -> 1`; thermodynamic Monica defaulted to 1               | Live `alchemize` path; current delegation at `backend/utils.py:292-309`                                                  |

### After consolidation

The TypeScript source of truth is `lib/thermodynamics/kalchm.ts:58-70`. FastAPI needs a Python
runtime adapter, so `backend/thermodynamics.py:73-98` is pinned to the same cross-runtime golden
vectors in `backend/test_thermodynamics.py`. All old sites delegate.

Round 1 recorded this as “one behavioral engine with **two** language adapters, not one executable
module shared across runtimes”. **The behavioral claim holds; the count was wrong, and it was
exactly the blind spot the sibling repo's round-2 brief warned about.** Three runtimes execute the
formula set — TypeScript, Python and Rust — plus a fourth, non-shipped copy in a research
notebook. Section 8.1 has the corrected inventory. The uncounted Rust copy was carrying a live
reactivity defect (section 8.3) and a Monica sentinel that disagreed with the other two runtimes
(section 8.5) for as long as it went uncounted.

The TypeScript AST gate permits four self-exponentiation nodes only in the canonical module and has
an empty TypeScript allowlist (`scripts/checkNoStrayKalchmFormula.ts:34-51,138-141`). Its Python AST
counterpart permits four nodes only in `backend/thermodynamics.py`
(`scripts/check_no_stray_kalchm_formula.py:12-13`). Both gates run in CI
(`.github/workflows/ci.yml:20-34`). Round 1's coverage figures — “all 34 backend Python files”, one
scanned TypeScript tree set — were both short; section 8.9 has the measured round-2 coverage.

The pre-change result remains executable rather than living only in prose:
`scripts/measure-legacy-kalchm.ts:1-154` archives immutable commit
`c3151e9e843cface2e872824f690aa46fe64680e`, exposes the real private functions without replacing
their bodies, imports all five TypeScript implementations, and asserts the measured matrix in an
isolated Vitest run.

## 3. Monica constructor inventory

This inventory matters because “Monica Constant” is not one semantic quantity in AAE. Only the
first **three** rows are the thermodynamic `-energy / (reactivity * ln(kalchm))` construction —
round 1 said two, before the Rust runtime was counted.

| Constructor                                                            | Formula/strategy                                                                                    | Caller status                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `lib/thermodynamics/kalchm.ts:152-168`                                 | Thermodynamic Monica; exact equilibrium returns 1.618, malformed input is absent; sign is preserved | `lib/core-energy-rules.ts:244-253`, then same-file advanced constants and `lib/planetary-rules-index.ts` |
| `backend/thermodynamics.py:101-136`                                    | Python mirror of thermodynamic Monica                                                               | `backend/utils.py:308-309` through live `alchemize`                                                      |
| `pa-rust-backend/src/astro/alchemy.rs:336-352`                         | Rust mirror of thermodynamic Monica; **found in round 2**, `Option<f64>` since section 8.5          | Inline in `alchemize`; read by `pa-rust-backend/src/astro/kinetics.rs:135`                               |
| `lib/monica/monica-constant-validator.ts:97-139`                       | `(S*phi + E + elementalBonus)/(M+Su+1)`, rounded and clamped `[0,20]`                               | 32 resolved calls in 8 files; this is the dominant UI/creation constructor                               |
| `lib/monica/monica-constant.ts:43-55`                                  | `(S*phi+E)/(M+Su+1)`, rounded                                                                       | 5 resolved calls in 5 files, including create/profile APIs and Monica UI                                 |
| `pa-rust-backend/src/astro/consciousness.rs:8-10`                      | Rust `(S*phi+E)/(M+Su+1)`; **found in round 2**. NOT the thermodynamic Monica despite the name      | Same-crate `get_consciousness_level`; a port of `backend/utils.py:686-693`                               |
| `backend/src/services/monica-constant-service.ts:18-80`                | `phi*(1+balance/total)*(1+level/10)`                                                                | 4 calls in `backend/src/routes/consciousness.ts`; invalid results now return null                        |
| `backend/src/services/swiss-ephemeris.ts:169-222`                      | A second `phi*(1+E/T)*(1+C/10)` implementation                                                      | Zero direct calls, but live as a shorthand value in `swissEphemerisService` at lines 241-246             |
| `lib/swiss-ephemeris-service.ts:199-263`                               | Weighted Sun/Moon/Ascendant longitude pseudo-hash in `[0,1)`                                        | Zero direct calls, but live in the exported service table at lines 273-278                               |
| `app/page.tsx:363-369`                                                 | Local `(S*phi+E)/(M+Su+1)`                                                                          | Live landing-page `useMemo`                                                                              |
| `components/consciousness/real-time-consciousness-preview.tsx:118-121` | Local `(S*phi+E)/(M+Su+1)`                                                                          | Component-local; re-exported but no direct caller resolved                                               |
| `lib/enhanced-chart-calculator.ts:256-261`                             | Local `(S*phi+E)/(M+Su+1)`                                                                          | Enclosing calculator; no direct constructor caller found                                                 |
| `lib/demo-agents-data.ts:276-285`                                      | Local `(S*phi+E)/(M+Su+1)` helper                                                                   | Zero resolved callers                                                                                    |
| `backend/utils.py:686-693`                                             | Python `(S*phi+E)/(M+Su+1)` helper                                                                  | No direct caller found; the Rust port above is its twin                                                  |
| `lib/utils.ts:37-54`                                                   | ESMS sum                                                                                            | Live through four wrapper/API/component call paths plus tests                                            |
| `components/wizards/AgentCreationWizard.tsx:384-393`                   | ESMS sum                                                                                            | Live dynamic Philosopher's Stone wizard                                                                  |
| `backend/src/services/chart-synthesizer.ts:1-28`                       | ESMS sum with missing axes coerced to zero                                                          | Live route constructor                                                                                   |
| `backend/main.py:1001`                                                 | Moon phase table's Spirit value labeled as Monica                                                   | Live chat auto-registration                                                                              |
| `backend/main.py:1164`                                                 | Dignity/degree power heuristic labeled as Monica                                                    | Live planetary auto-registration                                                                         |
| `backend/main.py:1184`                                                 | Static `0.72` culinary registration value                                                           | Live Alchemical Chef auto-registration                                                                   |
| `backend/main.py:1208`                                                 | Static `0.5` historical registration fallback                                                       | Live generic chat auto-registration; persistence-schema blocker                                          |
| `backend/main.py:1931`                                                 | Static `0.5` sync registration fallback                                                             | Live internal sync; persistence-schema blocker                                                           |
| `app/(app)/philosophers-stone/modern-page-v2.tsx:196-205`              | Mean Sun/Moon/Ascendant longitude scaled to `[0,10]`                                                | Component-local                                                                                          |
| `lib/unified-agent-factory.ts:100-116,336-354`                         | Per-planet base table plus degree modifier                                                          | Live planetary-agent factory                                                                             |
| `server.ts:350-365`                                                    | Element average plus spread divided by 12                                                           | Live agent-generation response                                                                           |
| `lib/clients/tokens-client.ts:204-214`                                 | Geometric mean of four token rates, stored as `rates.monica`                                        | Live recommendation-service client                                                                       |
| `components/consciousness/agent-creation-wizard.tsx:346-354`           | Random preview value `4.8 + random*2`                                                               | Re-exported preview wizard; no deterministic basis                                                       |
| `lib/agents/planetary-degree-feed.ts:455-469,595-607`                  | Dignity/static constants for generated planetary feed profiles                                      | Live feed generator                                                                                      |

Static historical-agent values and downstream scoring/threshold transforms are intentionally not
counted as constructors. Five additional runtime Monica constructions existed before this change:
three name-hash outage generators, the feed fallback, and the chart-to-agent static value. They
were removed rather than retained as constructors. Round 1 counted 26 executable constructors: 2
thermodynamic adapters and 24 semantically disconnected constructions. **Round 2's runtime sweep
adds the two Rust rows above, making it 28: 3 thermodynamic runtime adapters and 25 semantically
disconnected constructions.** The conclusion is unchanged and now stronger: wholesale “Monica
consolidation” would merge different objects and is unsafe without an owner-approved domain model.
The thermodynamic constructor alone was consolidated — and Rust holds both a thermodynamic Monica
and a same-named non-thermodynamic one in adjacent modules, which is the sharpest example of why
the names must be separated before the values are.

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
`test/thermodynamics/canonical-kalchm.test.ts` and in Python at `backend/test_thermodynamics.py`.
Round 2 extended the Python file with cross-runtime vectors for all four quantities and a
regression test naming the lost-parens reactivity form directly
(`backend/test_thermodynamics.py:127`), and pinned the Rust runtime through
`pa-rust-backend/tests/golden.rs`.

## 5. Changes made and deliberately withheld

Changed:

- Consolidated all thermodynamic Kalchm copies into exact, total runtime adapters
  (`lib/thermodynamics/kalchm.ts:58-70`, `backend/thermodynamics.py:73-98`). Round 2 added the
  other three quantities to the same engine — see section 8.2.
- Made exact thermodynamic equilibrium return φ while malformed and singular inputs remain absent,
  preserving negative healthy values (`lib/thermodynamics/kalchm.ts:152-168`).
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
  `scripts/checkNoStrayKalchmFormula.ts:34-51,138-141`, `.github/workflows/ci.yml:20-34`). Round 2
  widened both gates to four runtimes and split the Python gate into its own CI step — section 8.9.

Deliberately not changed:

- The staking clamp remains exactly as found at `lib/staking/yield-rate.ts:91-94`; changing it
  changes an economic input.
- The disconnected server heuristic and tiers remain exactly as found at `server.ts:350-365`.
  **Round 2 changed the tiers only** — the constructor is still as found, but the two provably
  unreachable tiers were deleted. See the updated “Server heuristic” subsection below.
- The non-thermodynamic Monica constructors remain separate because their domains and scales
  are not equivalent (24 at round 1; 25 after round 2 found the Rust twin).
- Database nullability/defaults were not migrated. `historical_agents.monicaConstant` still has a
  default zero and both thermodynamic columns are non-nullable
  (`prisma/schema.prisma:724-725`), and `user_profiles.monicaConstant` remains
  non-nullable (`prisma/schema.prisma:1278` (`user_natal_charts`) and `:1311` (`user_profiles`)). Placeholder writes remain at
  `app/api/user-charts/route.ts:48-55` and `lib/user-provisioning.ts:69-80,100-108`. Correcting
  those requires an owner-approved schema/onboarding migration, prohibited by this task.
  **Re-verified 2026-07-26: still true, and still deliberately deferred.** The migration is
  approved in principle but belongs to its own session, because it changes what the database can
  represent, not what the engine computes.
- FastAPI creation still defaults missing Monica to `0.5` and copies it into Kalchm
  (`backend/crud.py:27-29`); generic chat and sync registration also inject `0.5`
  (`backend/main.py:1208,1931`). A verification attempt to persist null failed against the actual
  `kalchmConstant NOT NULL` constraint. Those writes were restored to avoid breaking registration
  and are reported as migration-blocked rather than falsely marked fixed.
  **Re-verified 2026-07-26: unchanged.** `backend/crud.py:27-28` still reads
  `if agent_data.get("monicaConstant") is None: agent_data["monicaConstant"] = 0.5`, and
  `backend/crud.py:29` still assigns `agent_data["kalchmConstant"] = agent_data["monicaConstant"]`
  unconditionally — so Kalchm is overwritten with Monica even when a real Kalchm was supplied.
  This is OPEN, not fixed.
- FastAPI's runtime schema repair still creates/backfills Kalchm with `0.5` or Monica
  (`backend/database.py:137-141,221-226,244-249,316-321`). It is itself a database-writing
  migration path and was therefore reported, not edited or executed.

## 6. Contradictions and human decisions

### WTEN contradiction — RESOLVED in round 2

**Round 1's position, kept for the record.** The supplied canonical description said single-body
degeneracy is structural `Essence === 0`. WTEN commit `96f0c0bd` does not: it derives
`MONICA_LN_EPSILON=0.10939293407637272` from a measured `|ln(kalchm)|` gap
(`WTEN@96f0c0bd:src/data/unified/alchemicalCalculations.ts:104-135`) and applies that band in
`calculateMonica` (`.../alchemicalCalculations.ts:244-268`). Its own derivation test says explicitly
that single-body's degenerate cluster is **not** the `Essence==0` set
(`WTEN@96f0c0bd:src/__tests__/monicaLnEpsilonDerivation.test.ts:143-153`). Round 1 also flagged that
the same derivation-test comment overstates that every zero-axis chart has `kalchm==1`; AAE's
counterexample with one zero denominator axis is exactly `0.6583525144933101`
(`test/thermodynamics/canonical-kalchm.test.ts`). A zero factor contributes `0^0=1`; it does not
force the whole ratio to 1.

**Resolution.** WTEN's round-2 brief conceded both points, in its words: “Round 1's brief was wrong
on both of these. Your audit was right to push back.” Single-body degeneracy is a derived
`|ln kalchm|` band, not a structural `Essence == 0` test, and a zeroed axis does not imply
`kalchm == 1`. The contradiction is closed; neither claim stands against AAE's reading of WTEN's own
code.

### Near-equilibrium band — still declined, now for a MEASURED reason

Round 1 declined the band because the supplied rationale was disputed. That reason is now obsolete.
**Round 2 declines it on AAE's own measurement instead**, which is a stronger position: not “we
could not verify their derivation”, but “we ran their derivation on our population and it does not
apply”.

WTEN derives the band as the **midpoint of a bimodal gap**, a derivation their own measurement
script says is available only when the gap exists. AAE ran that measurement over its own population
— choose `k` of the 11 bodies in `backend/utils.py:208-220`, each in one of 12 signs, times 2 sects:

| Bodies   | Population        | `abs(ln K)` exactly 0 | Smallest non-zero `abs(ln K)` |
| -------- | ----------------- | --------------------: | ----------------------------: |
| 1        | 264 (exhaustive)  |                   216 |           0.09564719034165112 |
| 2        | 15 840            |                 6 912 |           0.00419218084488104 |
| 3        | 570 240           |               124 416 |            0.0000322455078457 |
| complete | 584 000 (sampled) |                     0 |             2.201243967316488 |

The gap does not stay open as bodies are added — it **collapses**. So AAE's distribution is a
continuum, not two clusters, and no band is derivable from it; any epsilon would be an arbitrary
threshold on a continuum. WTEN's own constant, imported unchanged, would swallow 26 882 of the
570 240 legitimate three-body cells. Complete charts — the only kind this server generates — never
approach equilibrium at all.

The near-singular values are therefore reachable only from **partial** charts, and the root cause
was fixed where partial charts enter rather than by widening an exact test into a threshold: see
section 8.7. The decision and its measurement are recorded in the engines themselves at
`lib/thermodynamics/kalchm.ts:129-151` and `backend/thermodynamics.py:104-117`, and asserted in
Rust at `pa-rust-backend/src/astro/alchemy.rs:334-335`. All three still test `ln K == 0` exactly and
apply no band.

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

### Server heuristic — AAE's own, and two tiers now DELETED

**Attribution first, because it has been misread.** This heuristic is **AAE's own code in
`server.ts`**. It is not a WTEN finding, not imported from WTEN, and WTEN has no equivalent
heuristic at the pinned commit `96f0c0bd`. The only WTEN fact in this subsection is the sync
behaviour in the last paragraph.

The reproducible exhaustive generator is `scripts/measure-server-monica-heuristic.ts:1-54`. It
enumerates all 286 four-element compositions of the ten planets used by `server.ts`. Because
elemental balance is a rounded percentage of planet counts
(`lib/chart-geometry-extractor.ts:536-576`), the heuristic can produce only `[2.50,5.21]`:
216 Emerging, 70 Developing, 0 Advanced, 0 Master. Two advertised tiers are unreachable.

**Round 2 deleted the two unreachable tiers.** The four elemental percentages always sum to 100, so
the average is fixed at 25 and the spread peaks at 150 for a single-element chart, capping the value
at `(25 + 150 / 4) / 12 = 5.21`. `Master` (`>= 8`) and `Advanced` (`>= 6`) were therefore provably
unreachable and were removed; `server.ts:364` now reads
`const consciousnessLevel = monicaConstant >= 4 ? 'Developing' : 'Emerging'`, with the enumeration
recorded in the comment above it (`server.ts:358-363`). The constructor itself (`server.ts:350-357`)
is unchanged — only the advertised classification was corrected to what the formula can produce.

WTEN does ignore an inbound sync `monicaConstant` and recomputes from the name at immutable commit
`96f0c0bd` (`WTEN@96f0c0bd:src/app/api/internal/agent-sync/route.ts:118-129`). That protects WTEN,
not AAE's own displays or economic paths. The owner should still choose whether to rename this value
or replace it with one of the explicit constructions; deleting the dead tiers does not answer that.

### Other owner decisions

- Choose and document domain names for the 25 non-thermodynamic constructors before consolidation.
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
| One Monica namespace inventory              | 26 constructors as counted at round 1: 2 thermodynamic runtime adapters and 24 semantically disconnected constructors; 5 fabricated runtime constructors removed. Round 2 raises this to 28  |

The highest-yield work was mechanical inventory and fallback detection. The lowest-yield area for a
safe code change was staking: measurement proved the required population is absent, so changing
the clamp would have replaced one unsupported constant with another.

Round 2's yield is in section 8.12; the single highest-yield unit across both rounds was
**enumerating the runtimes instead of assuming the gate's scope equalled the project's**.

## 8. Round 2 (2026-07-26): the other quantities, the other runtimes, the input boundary

Round 1 consolidated Kalchm and Monica and treated Heat, Entropy, Reactivity and Greg's Energy as
call-site detail. That was wrong in two directions at once. Those four quantities were transcribed
independently at each call site, and the call sites were spread across more runtimes than round 1
counted. Both gaps were live: two distinct arithmetic defects were sitting in code that every gate
reported clean.

### 8.1 Runtime inventory — the correction to “two language adapters”

| Runtime    | File                                   | Entry points                                                       | Status after round 2                                                |
| ---------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| TypeScript | `lib/thermodynamics/kalchm.ts`         | `calculateThermodynamics`, `calculateKalchm`, `calculateMonica`    | Canonical. All four quantities live here                            |
| Python     | `backend/thermodynamics.py`            | `calculate_thermodynamics`, `calculate_kalchm`, `calculate_monica` | Runtime adapter; `backend/utils.py` delegates                       |
| Rust       | `pa-rust-backend/src/astro/alchemy.rs` | inline in `alchemize` / `alchemize_detailed`                       | Runtime adapter; pinned by `pa-rust-backend/tests/golden.rs`        |
| Notebook   | `notebooks/current-moment-chart.ipynb` | teaching cells, mirrored from the canonical engine                 | Not shipped, never imported; corrected in round 2, then allowlisted |

They are not layered — none calls another — so they are kept in lockstep by hand, by the shared
golden vectors and by the gate in section 8.9. `pa-rust-backend/README.md` now carries the same
table plus the shared conventions (`or1` / `denominatorOr1` / `_denominator_or_1`,
`MONICA_EQUILIBRIUM`, no band) so the crate's own docs cannot drift from this one.

The notebook was **corrected**, not preserved as-is. Its `calculate_kalchm_safe` used to return a
Kalchm through `abs()` with a sign factor — which could go **negative**, violating the positivity
contract every other runtime holds — and floored zero axes to `1e-10` instead of relying on
`0**0 === 1`. Both behaviours are retired, and the cells now mirror `backend/thermodynamics.py`
branch for branch. Its narrative was rewritten to match, since correcting the engine changed the
notebook's own results: this chart's signed `alchemy_effects` are not the non-negative ESMS totals
Kalchm is defined over, so all four axes clamp to zero and the chart is `K = 1` exactly —
degenerate, with Monica at equilibrium. The old code returned `0.000311` for the same input, a
number with no more basis than the degenerate result but far easier to mistake for a reading.

It remains allowlisted because a teaching notebook restating the algebra inline is the point of it,
and it cannot import the TypeScript engine. The allowlist pins an exact site count (5), so adding a
copy there fails the gate rather than passing silently. Shipped code must still delegate.

### 8.2 The canonical thermodynamics layer

Both engines now own all four quantities, not two.

```text
Heat        = (S^2 + Fire^2)                             / (Su + E + M + W + A + Ea)^2
Entropy     = (S^2 + Su^2 + Fire^2 + Air^2)              / (E + M + Ea + W)^2
Reactivity  = (S^2 + Su^2 + E^2 + Fire^2 + Air^2 + W^2)  / (M + Ea)^2
GregsEnergy = Heat - Entropy * Reactivity
```

**Every denominator is a parenthesised sum, THEN squared.** That sentence is the entire content of
section 8.3.

| Runtime    | Constructor                                                                        | Returns                                     |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| TypeScript | `lib/thermodynamics/kalchm.ts:90-118` `calculateThermodynamics(ThermodynamicAxes)` | `{heat, entropy, reactivity, gregsEnergy}`  |
| Python     | `backend/thermodynamics.py:29-70` `calculate_thermodynamics(...)`                  | `{heat, entropy, reactivity, gregs_energy}` |

The zero-denominator convention is shared and load-bearing: **a zero denominator falls back to
`1`**, via `denominatorOr1` (`lib/thermodynamics/kalchm.ts:56`), `_denominator_or_1`
(`backend/thermodynamics.py:18-26`) and `or1` (`pa-rust-backend/src/astro/alchemy.rs:300`). This is
AAE's convention and is deliberately **not** WTEN's `THERMO_DEN_FLOOR` of `0.01`; the two differ by
100x for a non-zero numerator over a zero denominator, so it must never be changed in one runtime
alone.

### 8.3 The lost-parens reactivity defect (Python and Rust)

Two runtimes had transcribed reactivity's denominator with one paren pair missing:

| Runtime | Site                                   | Was                                               | Now                                                                                                                 |
| ------- | -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Python  | `backend/utils.py` (pre-delegation)    | `(reactivity_num / (Matter or 1.0)) + Earth ** 2` | delegates to `calculate_thermodynamics` (`backend/utils.py:292-305`)                                                |
| Rust    | `pa-rust-backend/src/astro/alchemy.rs` | `(reactivity_num / or1(matter)) + earth.powi(2)`  | `let reactivity_den = (matter + earth).powi(2);` then `reactivity_num / or1(reactivity_den)` (`alchemy.rs:320-321`) |

One lost paren pair produced **three** deviations simultaneously: Earth left the denominator,
Matter's square was dropped, and Earth returned as an additive term. The two forms coincide **only**
when `Earth = 0` and `Matter = 1`, which is why the defect survived every test that happened to sit
on the coincidence — and why the correct fix was to move the formula into one engine rather than
patch two call sites.

Measured impact, read directly from the regenerated Rust golden fixture
(`pa-rust-backend/tests/fixtures/golden.json`, a complete generated chart):

| Quantity                       |              Before |                After | Change                      |
| ------------------------------ | ------------------: | -------------------: | --------------------------- |
| `reactivity`                   |  17.547892922247286 |   1.9658479370265296 | 8.93x smaller               |
| `gregsEnergy`                  | -1.4180953014912818 | -0.13225259038544768 | 10.72x smaller in magnitude |
| `monica`                       | 0.01797878760150712 | 0.014966981622420323 | -16.75%                     |
| kinetics `potentialDifference` | -0.6187732452415352 | -0.05770723903981993 | 10.72x smaller in magnitude |
| kinetics `forceMagnitude`      |  1.7726191268680462 |  0.16531573801139057 | 10.72x smaller              |

An independent measurement on a real 10-body chart gave the same shape at different magnitudes:
reactivity `22.06 -> 1.24` (17.8x), gregsEnergy `-1.262 -> -0.046`, and Monica moved 34.4%. The
defect was never a rounding difference; it was an order of magnitude, and it propagated out of
thermodynamics into kinetics.

### 8.4 The missing-Essence entropy defect (three TypeScript files)

Entropy's denominator is `(E + M + Ea + W)^2`. Three TypeScript files had transcribed it as
`(M + Ea + W)^2` — **Essence missing entirely** — measured at 2.31x too large. Reproduced on the
golden fixture's ESMS and element totals: canonical `0.082520793151696664` against
`0.19028022217573951`, a factor of **2.3058**. Essence is the largest of the four ESMS axes on that
chart (`4.84`), so dropping it from a squared denominator is not a small error.

| File                                      | Now delegates at                                  |
| ----------------------------------------- | ------------------------------------------------- |
| `lib/alchemizer.ts`                       | `lib/alchemizer.ts:707-716`                       |
| `lib/agents/derived-stats.ts`             | `lib/agents/derived-stats.ts:158-161`             |
| `lib/spacetime/hooks/useLiveEphemeris.ts` | `lib/spacetime/hooks/useLiveEphemeris.ts:216-222` |

All three now call `calculateThermodynamics` and keep only their own output-shape adaptation —
`lib/alchemizer.ts` and `lib/agents/derived-stats.ts` retain their `|| 0` guards so the
malformed-input contract their callers already depend on is unchanged, and
`lib/agents/derived-stats.ts` renames `gregsEnergy` to the `energy` key `LiveStats` exposes.

Note the shape of this defect against section 8.3's: **the same quantity was wrong in different
ways in different runtimes.** Python and Rust had reactivity wrong and entropy right; TypeScript
had entropy wrong and reactivity right. Independent transcription is the mechanism, and one engine
is the only fix that scales.

### 8.5 Rust Monica: `Option<f64>` and `MONICA_EQUILIBRIUM`

`AlchemizeResult.monica` was `f64` initialised to a `1.0` sentinel. It is now
`Option<f64>` (`pa-rust-backend/src/astro/alchemy.rs:173`), where `None` means **ABSENT** and
serialises as JSON `null` — deliberately with no `skip_serializing_if`, so absence stays
distinguishable from a value rather than vanishing from the payload.

The sentinel disagreed with the other two runtimes in two distinct ways at once:

| Case                                                   | TS / Python | Rust before | Rust now                   |
| ------------------------------------------------------ | ----------- | ----------- | -------------------------- |
| Exact Kalchm equilibrium (`ln K == 0`)                 | `1.618`     | `1.0`       | `Some(MONICA_EQUILIBRIUM)` |
| Non-finite inputs, `kalchm <= 0`, or `reactivity == 0` | ABSENT      | `1.0`       | `None`                     |

`MONICA_EQUILIBRIUM = 1.618` is now a named constant in all three runtimes
(`pa-rust-backend/src/astro/alchemy.rs:188`, `lib/thermodynamics/kalchm.ts:46`,
`backend/thermodynamics.py:11`). The Rust branch structure at `alchemy.rs:336-352` mirrors
`calculateMonica` branch for branch.

`pa-rust-backend/tests/golden.rs:137-152` asserts **both** branches: a numeric fixture value must
be matched, and a `null` fixture value must be `None` — a golden test that only ever compared
numbers could not have caught the sentinel. The one downstream consumer,
`pa-rust-backend/src/astro/kinetics.rs:135`, now reads `.unwrap_or(0.0)`, so an absent Monica
contributes no term to the electromagnetic force instead of silently standing in as `1.0`.

### 8.6 The golden-fixture generator was pointed at another repository

`pa-rust-backend/tests/fixtures/golden_gen.py` used to `sys.path.insert` a hardcoded absolute path
to a **different checkout** (`~/Desktop/planetary_agents-main/backend`) and write `golden.json` back
into that other repo's tree. The consequence is worth stating plainly: `pa-rust-backend/tests/golden.rs`
was **green while pinning a different codebase's values**, including that codebase's buggy
reactivity. The Rust engine was being validated against something no one in this repository was
editing.

Three changes:

- Every path is derived from the script's own location — `FIXTURES_DIR.parents[2]` resolves this
  repo root, `BACKEND_DIR` this repo's `backend/`, and `golden.json` is written next to the script
  (`golden_gen.py:25-30,167-172`).
- It imports this repo's `backend/thermodynamics.py` alongside `backend/utils.py`.
- `_assert_canonical_thermodynamics` (`golden_gen.py:100-137`) refuses to write a fixture whose
  heat/entropy/reactivity/Greg's-energy/monica did not come out of the canonical engine, and exits
  non-zero instead. Its element totals are summed from the engine's **own** per-planet breakdown, so
  the check re-derives nothing. A call-site transcription can no longer be pinned as golden.

`golden.json` was regenerated from this repo's corrected engine; the deltas are the table in
section 8.3.

### 8.7 Partial charts are rejected at the boundary

`backend/main.py` assigned `request.customPlanets` to `current_pos` with no validation. A 3-body
payload drove Kalchm to `0.99996` and Monica to `-6309.85` — finite, plausible-looking, and served,
because `backend/schemas.py:358,409` declares `monica: float` and hands it straight back to the
caller. Nothing downstream could tell that reading from a real one.

`_require_complete_chart` (`backend/main.py:600-634`) now raises **HTTP 422** naming the missing
bodies, and is applied at `backend/main.py:1831`. Properties worth keeping:

- It **never fills defaults**. An invented body is invented data; a short chart is a client error.
- Required bodies are exactly the ten in `PLANETARY_PERIODS_DAYS` (`backend/main.py:526-537`), which
  is exactly what `_planetary_positions_for` always supplies — so every chart this server generates
  passes unchanged.
- It validates the **normalised** view, because `utils.ensure_planetary_positions_dict` silently
  drops entries that are neither a sign string nor a position dict, which is the same defect as
  omitting them outright.
- The 422 detail names every missing body so the caller can fix the request, and singularises
  “body”/“bodies” correctly.

`backend/test_main.py:422-462` pins both directions: a two-body payload is rejected with all eight
missing bodies named, and a complete ten-body payload is still accepted and still honours the
supplied signs.

This is the concrete alternative to a near-equilibrium band. The near-singular Monica values are
reachable only from partial charts, so they are excluded where they enter rather than by widening an
exact equality test into a threshold the population does not support.

### 8.8 Still no near-equilibrium band — see section 6

Recorded above under “Near-equilibrium band — still declined, now for a MEASURED reason”, with the
four-row population measurement. Summary: the round-1 reason (a disputed rationale) is obsolete
because WTEN conceded both disputed points; the round-2 reason is that AAE's own population is a
continuum rather than a bimodal gap, so no band is derivable from it.

### 8.9 The stray-formula gate now covers four runtimes

A TypeScript gate proves “one engine” only for TypeScript. Measured coverage changes:

| Gate                                       | Before                                   | After                                                                             |
| ------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `scripts/checkNoStrayKalchmFormula.ts`     | 6 TypeScript roots, 1 418 in-scope files | 11 TypeScript roots, 1 449 in-scope files, plus Rust and notebook text scans      |
| `scripts/check_no_stray_kalchm_formula.py` | `backend` only, 34 files                 | `backend`, `scripts`, `pa-rust-backend` — 34 + 1 + 1 = 36 files, per-root asserts |
| `.github/workflows/ci.yml`                 | Python gate ran only via the TS gate     | Python gate is its own step with `if: '!cancelled()'`                             |

Details:

- **TypeScript roots.** `SOURCE_ROOTS` gained `desktop-shell`, `hooks`, `src`, `types` and `utils`
  (`scripts/checkNoStrayKalchmFormula.ts:34-46`), including `hooks/`, a tree the Kalchm work itself
  had to edit. `examples`, `scratch` and `stories` stay excluded because they cannot reach a build
  output. The in-scope file count measured 1 418 before and 1 449 after, i.e. **31 files newly
  scanned**. The code comment at `scripts/checkNoStrayKalchmFormula.ts:26-33` states 57 invisible
  first-party files; that figure was not reproducible from this branch and the 31 above is the
  measured delta. The discrepancy is in the count, not the finding — the trees were unscanned
  either way.
- **Rust and notebooks** are scanned by controlled text match for self-exponentiation
  (`x.powf(x)`, `x ** x`) at `scripts/checkNoStrayKalchmFormula.ts:163-244`, with a
  `NON_TS_ALLOWLIST` carrying a per-file reason.
- **A CONTROL guards the weaker detector.** Text matching is weaker than an AST, so the gate fails
  outright if it stops finding the known site in `pa-rust-backend/src/astro/alchemy.rs`
  (`scripts/checkNoStrayKalchmFormula.ts:236-243`). A zero there means the scanner broke, not that
  the repo got clean — which is the exact failure mode the gate exists to prevent.
- **A notebook that is not valid JSON is still scanned**, as raw text, rather than skipped; the run
  reports which ones degraded. Silently dropping an unparseable file would turn a broken parse into
  a clean all-clear.
- **Per-root coverage assertions** in the Python gate
  (`scripts/check_no_stray_kalchm_formula.py:46-53`) fail loudly if a newly added root matches
  nothing, instead of reporting a clean zero.
- **CI ordering.** `check:no-stray-kalchm` delegates to the Python gate only after every TypeScript
  check passes, so a TypeScript failure previously stopped the Python runtime from being policed at
  all. The Python gate now also runs as its own step (`.github/workflows/ci.yml:28-34`).

### 8.10 Server tiers deleted

Recorded above under “Server heuristic — AAE's own, and two tiers now DELETED”.

### 8.11 Still open after round 2 — do not read these as fixed

| Item                                                                            | Where                                                                                                                                      | Status                                                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Nullable Monica/Kalchm migration                                                | `prisma/schema.prisma:698,724,725,1278,1311`; `backend/crud.py:27-29`                                                                      | APPROVED in principle, DEFERRED to its own session. ABSENT is unrepresentable |
| Second, non-canonical heat/entropy/reactivity set, served publicly              | `server.ts:917-920`                                                                                                                        | OPEN. Unsquared denominators; unrelated to the canonical engine               |
| `(Spirit*PHI + Essence)/(Matter + Substance + 1)` shipped under the Monica name | `lib/monica/monica-constant.ts:43-55`, `lib/monica/monica-constant-validator.ts:97-139`, `pa-rust-backend/src/astro/consciousness.rs:8-10` | OPEN. A different quantity sharing a name; a naming decision, not a math one  |
| FastAPI response schema cannot express an ABSENT Monica                         | `backend/schemas.py:358,409` (`monica: float`)                                                                                             | OPEN, observed not diagnosed. Same shape as the nullable-Monica migration     |

The Rust request boundary was OPEN when this table was first written and has since been closed, so
the row was removed rather than left to rot. `ensure_complete_from_value`
(`pa-rust-backend/src/astro/alchemy.rs`) checks the normalised view against `PLANETARY_PERIODS_DAYS`
and returns `IncompleteChart`, which `pa-rust-backend/src/error.rs` maps to a **422** carrying the
same `{"detail": ...}` string Python produces — same missing-body order, same singular/plural
wording. It is wired into both HTTP routes and the `get_chart_alchemy` MCP tool, and pinned by
`pa-rust-backend/tests/chart_completeness.rs` (17 tests). Closing it surfaced a genuine disagreement
between the runtimes on `customPlanets: {}`: Python's guard was a truthiness check, so an
explicitly-supplied empty chart silently received the server's own. Python now tests
`is not None` (`backend/main.py`), so both runtimes reject it. `compute_synastry_overlay` is
deliberately unguarded — its charts reach only pairwise angular separations, never `alchemize`.

### 8.12 Defects found per unit of work, round 2

| Unit                                     | Yield                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| One runtime enumeration                  | 1 entire uncounted executing runtime (Rust) plus 1 notebook copy; round 1 had recorded “two language adapters”                            |
| One four-quantity formula audit          | 2 distinct arithmetic defects in 5 files across 3 runtimes: reactivity in Python + Rust, entropy in 3 TypeScript files                    |
| One golden-fixture provenance check      | The Rust golden test was pinning a **different repository's** values, including its buggy reactivity                                      |
| One Monica-absence sweep in Rust         | 1 sentinel disagreeing with TS/Python in 2 ways (equilibrium value, and value-vs-absent), plus 1 downstream kinetics consumer             |
| One request-boundary audit               | 1 unvalidated `customPlanets` assignment serving Monica `-6309.85` from a 3-body payload as if it were a reading                          |
| One gate-scope audit                     | 5 unscanned first-party TypeScript trees (31 files, measured), 2 unscanned Python roots, 2 unscanned runtimes, 1 CI ordering defect       |
| One near-equilibrium band re-examination | 4 population measurements showing the gap collapses; band correctly declined, and the true root cause found at the input boundary instead |

The pattern across both rounds is one finding: **a check's scope is not the project's scope unless
the scope is enumerated and asserted.** Every defect in this section was inside something already
covered by a green test or a passing gate.

## Verification commands

### Round 1

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

Round 1 results: the frontend suite passed 80 files and 798 tests with 7 skipped; the backend suite
passed 85 tests with 1 skipped. ESLint, TypeScript, Ruff, both AST gates, caller resolution, the
immutable legacy characterization, and both measurement generators passed. The production build
completed all 510 static pages and exited successfully; it retained existing dynamic-dependency
warnings plus missing optional Galileo/Anthropic-key notices.

### Round 2 — the third runtime and the gate must be run too

Round 1's command list cannot detect a round-2 defect: it never builds the Rust crate and never
regenerates the golden fixture. Add these, and run all three runtimes in the same pass whenever the
formula set moves — regenerating `golden.json` alone would make Rust agree with Python while
silently drifting from TypeScript.

```text
bunx vitest run test/thermodynamics/
backend/.venv/bin/python -m pytest backend/test_thermodynamics.py backend/test_main.py
cd pa-rust-backend && cargo test
python3 pa-rust-backend/tests/fixtures/golden_gen.py   # needs Python 3.10+ (PEP 604 unions)
bun run scripts/checkNoStrayKalchmFormula.ts
python3 scripts/check_no_stray_kalchm_formula.py
```

Round 2 results, as run on 2026-07-26 from this branch:

| Command                                                      | Result                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `bunx vitest run test/thermodynamics/`                       | 5 files, 40 tests, all passing                                                            |
| `pytest backend/test_thermodynamics.py backend/test_main.py` | 57 passed                                                                                 |
| `cargo test --test golden` (`pa-rust-backend`)               | 8 passed, 0 failed                                                                        |
| `bun run scripts/checkNoStrayKalchmFormula.ts`               | 4 canonical sites; 1 449 in-scope TypeScript files; 2 non-TypeScript files, both expected |
| `python3 scripts/check_no_stray_kalchm_formula.py`           | 4 canonical sites; 36 Python files across `backend`, `scripts`, `pa-rust-backend`         |

The TypeScript gate additionally reports that one notebook
(`notebooks/personalized-ai-research.ipynb`) is not valid JSON and was scanned as raw text rather
than skipped — that is the intended degraded path, not a failure.
