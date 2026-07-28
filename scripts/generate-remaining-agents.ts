/**
 * DISABLED — this script manufactured historical agents whose natal charts were invented, and
 * it wrote them over files that have since been corrected by hand.
 *
 * It is kept as a refusal rather than deleted, for the same reason as its sibling
 * `scripts/generate-natal-charts.ts`: anyone reaching for "just regenerate the agent files"
 * lands here and reads why that is the wrong move. Deleting it would remove the warning while
 * leaving the idea intact in git history.
 *
 * WHAT IT USED TO DO (see git history for the body): it held a hardcoded list of five authors —
 * jane-austen, fyodor-dostoevsky, oscar-wilde, emily-dickinson, lewis-carroll — plus a
 * greg-castro special case, and wrote each one to `lib/agents/historical/<id>.ts` from a
 * template, then string-patched `lib/agents/historical/index.ts`.
 *
 * THREE INDEPENDENT REASONS IT MUST NOT RUN. Each was verified against the current tree, not
 * inferred from the code's intent.
 *
 * 1. IT EMITTED THE WRONG TYPE, WHICH DEFEATS THE ROUND-3 COMPILE-TIME GATE.
 *    The template declared `export const X: CraftedAgent`. Round 3 introduced
 *    `HistoricalCraftedAgent` in `lib/agent-types.ts`, whose `consciousness.natalChart` is an
 *    `AttributedNatalChart` with `provenance` and `ascendantProvenance` both REQUIRED, and
 *    annotated all 72 files in `lib/agents/historical/` with it. That gate works by making an
 *    unclassified chart fail to compile. `CraftedAgent` is the wider type — its `natalChart` is
 *    a plain `NatalChart` where both fields are optional — so a generated agent slid past the
 *    gate with no provenance at all and `bunx tsc --noEmit` stayed green. `HISTORICAL_AGENTS`
 *    is itself declared `CraftedAgent[]` (`lib/agents/historical/index.ts:176`), so nothing
 *    downstream would have caught it either.
 *
 * 2. THE CHART IT EMITTED WAS INVENTED, AND THE ASCENDANT WAS THE WORST PART.
 *    The template wrote `natalChart: { planets: {}, houses: {}, aspects: [], ascendant: 0,
 *    midheaven: 0 }`. An empty `planets` map is at least visibly empty. `ascendant: 0` is not:
 *    0 is a real ecliptic longitude — 0 degrees Aries — and consumers turn the bare number into
 *    a rising sign by dividing by 30 (`lib/agents/historical-feed-contract.ts:157`,
 *    `app/(app)/agent/[id]/page.tsx:171-173`). So every generated agent would have been shown
 *    to users as Aries rising, a fact about a named real person, derived from nothing.
 *    Measured: **0 of the 72 shipped charts now carry `ascendant: 0`**. The two that did (the
 *    all-zero placeholders described in `test/agents/natal-chart-provenance.spec.ts:9`) were
 *    carl-jung and frida-kahlo, and both now carry genuinely computed charts. This script was
 *    the machine that would put that value back.
 *
 * 3. ITS SIX OUTPUT PATHS ALREADY EXIST, AND ALL SIX ARE STRICTLY BETTER THAN WHAT IT WRITES.
 *    `fs.writeFileSync` is unconditional — there was no "skip if present" check — so running it
 *    today is a destructive overwrite, not a no-op:
 *      - jane-austen, fyodor-dostoevsky, oscar-wilde, emily-dickinson and lewis-carroll are all
 *        `HistoricalCraftedAgent` today, each with ten bodies, `provenance: 'placeholder'`,
 *        `ascendantProvenance: 'placeholder'` and a `provenanceNote` naming the filler and what
 *        would be needed to replace it. The template replaces that with an empty, unlabelled
 *        chart — it destroys the honest labelling and leaves numbers behind.
 *      - `lib/agents/historical/greg-castro.ts` is 13,003 bytes and carries a real ten-body
 *        chart with `provenance: 'authored'`. The template is ~4 KB and would delete it.
 *    The `index.ts` patcher is also already broken: it looks for the literal
 *    `'export const HISTORICAL_AGENTS = ['`, but the real declaration is
 *    `export const HISTORICAL_AGENTS: CraftedAgent[] = [` (index.ts:176) — 0 matches. So even
 *    on a genuinely new agent it would add the `export` and the `import` and silently fail to
 *    register the agent in the array.
 *
 * WHY NOT SIMPLY FIX THE TEMPLATE? Because a fixed template still cannot produce an acceptable
 * agent, and this is the part worth understanding rather than working around.
 *
 * The script has no birth time or place for anyone. Its `birthData` was
 * `date: new Date('<year>-01-01T12:00:00')` with `location: { lat: 0, lon: 0, name: 'Unknown' }`
 * — which is precisely this repo's encoding for "birth date not known or never entered", and a
 * point in the Atlantic Ocean where nobody was born. Read the `provenanceNote` on
 * `lib/agents/historical/jane-austen.ts` or `lib/agents/historical/aristotle.ts`: that filler is
 * *the stated reason* 20 of the 72 charts are placeholders. So the best chart this generator
 * could ever honestly emit is `provenance: 'placeholder'`.
 *
 * And a correctly-labelled placeholder agent still fails three committed assertions the moment
 * it lands:
 *   - `test/agents/ascendant-provenance.spec.ts:259` — `expect(agents.length).toBe(72)`, with
 *     the sign-distribution and midheaven counts beside it pinned to that same corpus;
 *   - `test/agents/natal-chart-provenance.spec.ts:256` — placeholder charts `<= 20`, a ratchet
 *     that may only go down;
 *   - `test/agents/ascendant-provenance.spec.ts:252` — unmeasured ascendants `<= 70`, likewise.
 *
 * Teaching the generator to satisfy the round-3 compile gate with a canned
 * `provenance: 'placeholder'` would be the worst outcome available: it converts a stop sign into
 * a form to fill in, and industrialises production of exactly the charts the corpus is ratcheting
 * away. The gate is meant to stop you and make you go find a real chart. So the template is
 * documented below as the shape a *human* must write, and nothing is emitted.
 *
 * WHAT TO DO INSTEAD — to add a historical agent
 *   1. Write `lib/agents/historical/<id>.ts` by hand, annotated `HistoricalCraftedAgent` (never
 *      `CraftedAgent` — the wider type is what let unprovenanced charts through). Register it in
 *      `lib/agents/historical/index.ts`: the `export`, the `import`, and the `HISTORICAL_AGENTS`
 *      array entry, all three.
 *   2. Establish birth date, time and place. If any of the three is unknown, STOP. There is no
 *      number to write in `ascendant`, and writing one anyway is the defect this file exists to
 *      prevent. `ascendant: number` is still required by the type, so absence is currently
 *      unrepresentable — see the `AscendantProvenance` doc comment in `lib/agent-types.ts`,
 *      which records why nulling it is the correct next step and what has to be removed first
 *      (`lib/agents/persona/derive-sacred-stats.ts:41` and
 *      `app/(app)/agent/[id]/page.tsx:173` both swallow a null into 0, i.e. into Aries). Until
 *      then the honest outcome for an unknown birth time is to ship no agent, not a placeholder.
 *   3. If you do have the three, compute with the Swiss Ephemeris already in this repo —
 *      `backend/src/services/swiss-ephemeris.ts`, `backend/src/routes/ephemeris.ts`,
 *      `lib/swiss-ephemeris-service.ts`. Do NOT use `lib/enhanced-astronomical-calculator.ts`:
 *      it stamps its own output `source: 'vsop87-approximation'`, so anything built from it is
 *      `'authored'`, never `'computed'`.
 *   4. Sanity-check before committing: Mercury <= 28 deg and Venus <= 47 deg elongation from the
 *      Sun, Sun in the sign the birth date implies, and a midheaven that is not just
 *      `ascendant - 90` (that flat offset is equal-house schematic arithmetic, present in 49 of
 *      72 charts and in neither computed one).
 *   5. Record `provenance: 'computed'` with a `provenanceNote` naming the tool, its version and
 *      the exact UT instant, and `ascendantProvenance: 'measured'` only if the birth time was
 *      genuinely known. Both provenance suites enforce the consistency between the label and the
 *      number.
 *
 * The correct chart block — what the template SHOULD have emitted, for a chart that is genuinely
 * this person's:
 *
 *     import type {
 *       HistoricalCraftedAgent, Element, Modality, ConsciousnessLevel,
 *     } from '../../agent-types'
 *
 *     export const EXAMPLE: HistoricalCraftedAgent = {
 *       // ...
 *       consciousness: {
 *         // ...
 *         natalChart: {
 *           provenance: 'computed',
 *           provenanceNote: '<tool + version + exact UT instant, so this is reproducible>',
 *           planets: { Sun: { sign: '...', degree: 0, retrograde: false, house: 1 }, ... },
 *           houses: { ASC: 0, MC: 0 },
 *           aspects: [],
 *           ascendant: 0,                        // a real angle, sub-degree, from the ephemeris
 *           ascendantProvenance: 'measured',     // only if the birth TIME was known
 *           midheaven: 0,                        // computed, not ascendant - 90
 *         },
 *       },
 *     }
 *
 * Worked examples: `lib/agents/historical/carl-jung.ts` and `lib/agents/historical/frida-kahlo.ts`
 * (the two `'computed'` charts, ascendant `'measured'`); `lib/agents/historical/aristotle.ts` and
 * `lib/agents/historical/jane-austen.ts` (`'placeholder'` done honestly, with the note that says
 * why).
 * Enforced by: `test/agents/natal-chart-provenance.spec.ts`,
 * `test/agents/ascendant-provenance.spec.ts`.
 */

const MESSAGE = `
scripts/generate-remaining-agents.ts is disabled and will not write any agent files.

It emitted 'export const X: CraftedAgent' — the WIDER type — so generated agents bypassed the
HistoricalCraftedAgent gate that requires every historical chart to declare its provenance, and
tsc stayed green. The chart it wrote was:

    natalChart: { planets: {}, houses: {}, aspects: [], ascendant: 0, midheaven: 0 }

ascendant 0 is not an absence. It is 0 degrees Aries, and consumers divide it by 30 to name a
rising sign, so every generated agent was presented to users as Aries rising on the strength of
nothing. 0 of the 72 shipped charts still carry that value; this script would put it back.

It is also destructive. All six of its output paths already exist and are better than what it
writes: the five authors now carry ten-body charts with provenance 'placeholder' and a note
explaining the filler, and lib/agents/historical/greg-castro.ts is 13,003 bytes with an
'authored' chart. writeFileSync was unconditional, so running it overwrites all six. Its
index.ts patcher no longer matches the HISTORICAL_AGENTS declaration either, so a new agent
would be exported and imported but never registered.

Fixing the template would not help. The script has no birth time or place for anyone — its
birthData is January 1, 12:00, lat 0 / lon 0 "Unknown", which is this repo's encoding for
"birth date not known". The best chart it could honestly emit is provenance: 'placeholder', and
the corpus ratchets forbid growing that stock:

    test/agents/ascendant-provenance.spec.ts:259   expect(agents.length).toBe(72)
    test/agents/natal-chart-provenance.spec.ts:256 placeholder charts <= 20
    test/agents/ascendant-provenance.spec.ts:252   unmeasured ascendants <= 70

To add a historical agent:
  1. Write lib/agents/historical/<id>.ts by hand, typed HistoricalCraftedAgent — never
     CraftedAgent. Register all three of the export, the import and the HISTORICAL_AGENTS entry
     in lib/agents/historical/index.ts.
  2. Establish birth date, time AND place. If any is unknown, stop: there is no number to put in
     'ascendant', and inventing one is the defect this file prevents. Ship no agent rather than
     a placeholder.
  3. Compute with the Swiss Ephemeris already in this repo:
       backend/src/services/swiss-ephemeris.ts   (swisseph, SEFLG_MOSEPH)
       backend/src/routes/ephemeris.ts           (HTTP surface)
       lib/swiss-ephemeris-service.ts            (async Next.js client)
     Do NOT use lib/enhanced-astronomical-calculator.ts — it labels itself
     'vsop87-approximation', so its output is 'authored', never 'computed'.
  4. Sanity-check: Mercury <= 28 deg and Venus <= 47 deg from the Sun; Sun in the sign the birth
     date implies; midheaven not merely ascendant - 90.
  5. Record provenance: 'computed' with a provenanceNote naming the tool, version and UT instant,
     and ascendantProvenance: 'measured' only if the birth time was genuinely known.

Worked examples: lib/agents/historical/carl-jung.ts, lib/agents/historical/frida-kahlo.ts
                 (computed); lib/agents/historical/aristotle.ts (placeholder, done honestly).
Enforced by:     test/agents/natal-chart-provenance.spec.ts,
                 test/agents/ascendant-provenance.spec.ts
See also:        scripts/generate-natal-charts.ts, disabled for the same reason.
`

console.error(MESSAGE)
process.exit(1)
