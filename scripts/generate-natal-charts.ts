/**
 * DISABLED — this script used to manufacture natal charts with no astronomy in it.
 *
 * It is kept as a refusal rather than deleted so the failure mode cannot be reinvented. Anyone
 * reaching for "generate the missing charts" lands here and reads why that is the wrong move.
 *
 * WHAT IT USED TO DO (see git history for the body):
 *   - Sun sign  : looked up in a hardcoded date-range table.
 *   - Sun degree: `Math.floor((day / 30) * 30)` — the day of the month, relabelled as a degree.
 *   - Moon      : `(day * 13) % 360` — the day of the month times 13, as if the Moon's position
 *                 depended on the calendar day rather than on the epoch.
 *   - Houses    : `((month + day) % 12) + 1` — arithmetic on the date, unrelated to any horizon.
 *   - Ascendant : the Sun's sign, offset 15 degrees.
 * It also emitted only `{ sun, moon, ascendant }`, which is not even the shape the app ships
 * (`{ planets: { Sun..Pluto }, houses, aspects, ascendant, midheaven }`), and keyed its birth-date
 * table on agent ids that no longer exist.
 *
 * WHY THAT IS THE REAL BUG: none of those numbers are measurements, but nothing in the output
 * said so, so they were indistinguishable from a real chart once pasted into an agent file. The
 * repo's standing rule is that a literal substituted for an absent measurement invents data.
 * Deriving from data you have is fine; defaulting is not. A chart is a claim about where the
 * bodies actually were, and there is no way to answer that from a calendar date alone.
 *
 * WHAT TO DO INSTEAD
 *   1. Establish the birth date, time and place. If any of the three is unknown, STOP — the
 *      correct outcome is `provenance: 'placeholder'` (or no chart at all), not a guess. Twenty
 *      of the shipped charts exist only because this step was skipped.
 *   2. Compute the positions with a real ephemeris. The repo already ships one:
 *      `backend/src/services/swiss-ephemeris.ts` (swisseph, SEFLG_MOSEPH — no data files needed),
 *      served by `backend/src/routes/ephemeris.ts`, with `lib/swiss-ephemeris-service.ts` as the
 *      Next.js-side async client.
 *      DO NOT use `lib/enhanced-astronomical-calculator.ts`. It is a labelled approximation that
 *      stamps its output `source: 'vsop87-approximation'`, and a chart built from it is `authored`,
 *      never `computed`. (It was additionally wrong by up to 179.9 deg for the inner planets until
 *      round 3 corrected it; the label, not that history, is the reason to keep it out of here.)
 *      Substituting its output for this script's output would replace a fake chart with a
 *      differently-fake chart that merely looks computed.
 *   3. Sanity-check before you commit: Mercury <= 28 deg and Venus <= 47 deg from the Sun, and the
 *      Sun in the sign the birth date implies. Cross-check against a second implementation.
 *   4. Record `provenance: 'computed'` plus a `provenanceNote` naming the tool, its version and
 *      the exact UT instant, so the numbers are reproducible. See `NatalChartProvenance` in
 *      `lib/agent-types.ts`; `test/agents/natal-chart-provenance.spec.ts` enforces all of this.
 *
 * `lib/agents/historical/carl-jung.ts` and `lib/agents/historical/frida-kahlo.ts` are worked
 * examples of the whole procedure.
 */

const MESSAGE = `
scripts/generate-natal-charts.ts is disabled and will not emit chart data.

It never used an ephemeris. It derived "positions" from arithmetic on the calendar date
(Moon longitude = day-of-month * 13, houses = (month + day) % 12 + 1), and printed them in a
format indistinguishable from a measured chart. That is how 20 of the 72 shipped historical
agents ended up with charts that are not theirs.

To add a real chart:
  1. Establish birth date, time and place. If any is unknown, stop: use
     provenance: 'placeholder', or ship no chart. Do not guess.
  2. Compute with the Swiss Ephemeris already in this repo:
       backend/src/services/swiss-ephemeris.ts  (swisseph, SEFLG_MOSEPH)
       backend/src/routes/ephemeris.ts          (HTTP surface)
       lib/swiss-ephemeris-service.ts           (async Next.js client)
     Do NOT use lib/enhanced-astronomical-calculator.ts — its inner planets are physically
     impossible (Mercury measured at 179.9 deg elongation; the ceiling is ~28 deg).
  3. Sanity-check: Mercury <= 28 deg and Venus <= 47 deg from the Sun; Sun in the sign the
     birth date implies. Cross-check against a second implementation.
  4. Record provenance: 'computed' and a provenanceNote naming the tool, its version and the
     UT instant used. See NatalChartProvenance in lib/agent-types.ts.

Worked examples: lib/agents/historical/carl-jung.ts, lib/agents/historical/frida-kahlo.ts.
Enforced by: test/agents/natal-chart-provenance.spec.ts
`

console.error(MESSAGE)
process.exit(1)
