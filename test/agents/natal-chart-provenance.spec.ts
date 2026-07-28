/**
 * Natal-chart integrity for the historical-agent corpus.
 *
 * Every agent in `lib/agents/historical/` names a real person, so the natal chart attached to one
 * is a claim about that person's birth sky. Before this suite existed the corpus contained charts
 * that were provably not anybody's:
 *
 *   - one byte-identical chart shared verbatim by 8 pre-Common-Era agents;
 *   - two all-zero placeholders (ten bodies stacked on Aries 0 degrees, house 1);
 *   - 29 charts placing Mercury or Venus at an elongation from the Sun that the solar system
 *     does not permit.
 *
 * None of that was caught, because the existing tests only asserted that longitudes fell in
 * [0, 360) and degrees in [0, 30) — which every one of those broken charts satisfies. The
 * assertions below are the ones that actually discriminate.
 *
 * The physical bound is the sharp instrument. Mercury and Venus are inferior planets: they orbit
 * inside Earth's orbit and therefore can never appear far from the Sun. Maximum elongation is
 * ~28 degrees for Mercury and ~47 degrees for Venus. A chart that breaks those bounds was not
 * measured, whatever it claims. That check is enforced only against charts marked `'computed'`,
 * which is precisely what makes the provenance field earn its keep: a chart may be wrong, but it
 * may not be wrong *and* claim to have been measured.
 */
import { describe, it, expect } from 'vitest'
import * as historicalAgents from '@/lib/agents/historical'
import type { HistoricalCraftedAgent, NatalChartProvenance } from '@/lib/agent-types'

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

const VALID_PROVENANCE: NatalChartProvenance[] = [
  'computed',
  'authored',
  'placeholder',
  'unattributed',
]

/** Maximum elongation from the Sun, in degrees, for the two inferior planets. */
const MAX_ELONGATION: Record<string, number> = { Mercury: 28, Venus: 47 }

const agents = Object.values(historicalAgents).filter(
  (value): value is HistoricalCraftedAgent =>
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as HistoricalCraftedAgent).id === 'string' &&
    !!(value as HistoricalCraftedAgent).consciousness?.natalChart
)

/** Ecliptic longitude in degrees for a stored `{ sign, degree }` placement. */
function longitudeOf(placement: { sign: string; degree: number }): number {
  const index = SIGNS.indexOf(placement.sign as (typeof SIGNS)[number])
  if (index < 0) throw new Error(`unknown zodiac sign: ${placement.sign}`)
  return index * 30 + placement.degree
}

/** Angular separation between two ecliptic longitudes, folded into [0, 180]. */
function separation(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180)
}

/** Stable identity of a chart's *numbers* — provenance metadata deliberately excluded. */
function chartFingerprint(agent: HistoricalCraftedAgent): string {
  const chart = agent.consciousness.natalChart
  return JSON.stringify({
    planets: chart.planets,
    houses: chart.houses,
    aspects: chart.aspects,
    ascendant: chart.ascendant,
    midheaven: chart.midheaven,
  })
}

describe('historical agent natal charts', () => {
  // Control: if this fails, every other assertion in the file is vacuously passing.
  it('loads the historical agent corpus', () => {
    expect(agents.length).toBeGreaterThanOrEqual(70)
    expect(agents.map(a => a.id)).toContain('carl-jung')
  })

  it('declares a valid provenance on every chart', () => {
    const missing = agents
      .filter(a => !VALID_PROVENANCE.includes(a.consciousness.natalChart.provenance))
      .map(a => `${a.id} -> ${String(a.consciousness.natalChart.provenance)}`)

    expect(
      missing,
      'every historical agent chart must declare where its numbers came from; ' +
        'see NatalChartProvenance in lib/agent-types.ts'
    ).toEqual([])
  })

  /**
   * A chart is a claim about one person's birth sky, so two agents sharing one byte for byte is
   * always a defect. The corpus still contains one such group: 8 pre-Common-Era figures whose
   * birth dates are not known (Homer's existence is disputed; Plato's and Herodotus's years are
   * approximate) share a single fabricated chart. Fabricating 8 distinct charts to satisfy this
   * test would be far worse than the bug, so the group is tolerated on exactly one condition —
   * every member declares provenance 'placeholder', which is a statement that the numbers are not
   * that individual's. Sharing while claiming 'authored' or 'computed' fails hard.
   *
   * Deleting the chart outright would be more honest still (see the note on the inventory test
   * below); labelling is what is reachable without changing `natalChart` to optional.
   */
  it('never presents the same chart as two different people as if it were theirs', () => {
    const byFingerprint = new Map<string, HistoricalCraftedAgent[]>()
    for (const agent of agents) {
      const key = chartFingerprint(agent)
      const bucket = byFingerprint.get(key)
      if (bucket) bucket.push(agent)
      else byFingerprint.set(key, [agent])
    }

    const sharedGroups = [...byFingerprint.values()].filter(group => group.length > 1)

    const claimedAsOwn = sharedGroups
      .filter(group => group.some(a => a.consciousness.natalChart.provenance !== 'placeholder'))
      .map(group =>
        group
          .map(a => `${a.id}:${a.consciousness.natalChart.provenance}`)
          .sort()
          .join(', ')
      )

    expect(
      claimedAsOwn,
      'these agents carry a byte-identical natal chart while claiming it is their own. A chart ' +
        "cannot belong to two people. Mark every copy provenance:'placeholder', or give the " +
        'agent its own chart computed from a verified ephemeris.'
    ).toEqual([])
  })

  it('has no chart with every body stacked on one sign and degree', () => {
    const collapsed: string[] = []
    for (const agent of agents) {
      const bodies = Object.values(agent.consciousness.natalChart.planets)
      if (bodies.length < 2) continue
      const distinct = new Set(bodies.map(p => `${p.sign}|${p.degree}`))
      if (distinct.size === 1) {
        collapsed.push(`${agent.id} (all ${bodies.length} bodies at ${[...distinct][0]})`)
      }
    }

    expect(
      collapsed,
      'ten bodies cannot share a single degree of the ecliptic. A chart like this is ' +
        'zero-filled padding, not a chart.'
    ).toEqual([])
  })

  it('keeps every computed chart inside the physical bounds on the inferior planets', () => {
    const computed = agents.filter(a => a.consciousness.natalChart.provenance === 'computed')
    // Control: the bound is only meaningful if something is actually being checked.
    expect(computed.length).toBeGreaterThan(0)

    const violations: string[] = []
    for (const agent of computed) {
      const planets = agent.consciousness.natalChart.planets
      const sun = planets.Sun
      expect(sun, `${agent.id}: a computed chart must include the Sun`).toBeTruthy()
      const sunLongitude = longitudeOf(sun)

      for (const [body, maxDegrees] of Object.entries(MAX_ELONGATION)) {
        const placement = planets[body]
        if (!placement) continue
        const elongation = separation(longitudeOf(placement), sunLongitude)
        if (elongation > maxDegrees) {
          violations.push(
            `${agent.id}: ${body} is ${elongation.toFixed(1)} degrees from the Sun ` +
              `(physical maximum ~${maxDegrees})`
          )
        }
      }
    }

    expect(
      violations,
      "a chart marked provenance:'computed' is asserting it came from a real ephemeris. " +
        'These positions are impossible, so the source is not a real ephemeris. Note that ' +
        'lib/enhanced-astronomical-calculator.ts is known to fail this bound and must not be ' +
        'used to produce a computed chart.'
    ).toEqual([])
  })

  it('records a reproducible source note on every computed chart', () => {
    const computed = agents.filter(a => a.consciousness.natalChart.provenance === 'computed')
    // Control: without this the filter could empty and the assertion below would
    // pass by checking nothing — the exact failure mode this suite exists to end.
    expect(
      computed.length,
      'no computed charts to check — assertion would be vacuous'
    ).toBeGreaterThan(0)
    const undocumented = computed
      .filter(a => (a.consciousness.natalChart.provenanceNote ?? '').trim().length < 40)
      .map(a => a.id)

    expect(
      undocumented,
      "provenance:'computed' claims the numbers are reproducible, so provenanceNote must name " +
        'the tool, its version and the UT instant used'
    ).toEqual([])
  })

  it('explains every placeholder chart so it is never mistaken for a measurement', () => {
    const placeholders = agents.filter(a => a.consciousness.natalChart.provenance === 'placeholder')
    // Control, same reason as above.
    expect(
      placeholders.length,
      'no placeholder charts to check — assertion would be vacuous'
    ).toBeGreaterThan(0)
    const unexplained = placeholders
      .filter(a => (a.consciousness.natalChart.provenanceNote ?? '').trim().length < 40)
      .map(a => a.id)

    expect(
      unexplained,
      'a placeholder chart must say what the filler is and what would be needed to replace it'
    ).toEqual([])
  })

  /**
   * A ratchet, not a target. 12 of the 72 shipped charts are known filler:
   *   - 8 pre-Common-Era agents sharing one fabricated chart;
   *   - cleopatra, donatello, geoffrey-chaucer and raphael, whose stored birthData is the
   *     "date not known" encoding (1 January, 12:00, sometimes lat 0 / lon 0 named "Unknown").
   * Every one of the 12 also breaks the inferior-planet bound.
   *
   * It was 20 until `scripts/compute-historical-natal-charts.py` replaced 8 of them with charts
   * computed from Swiss Ephemeris and cross-checked against astronomy-engine. Those four are
   * what is left of that group because their birth date is genuinely not recoverable, and the
   * script refuses to emit a chart for them: Cleopatra's sources give "early 69 BC or late
   * 70 BC"; Donatello's and Chaucer's give a circa year; Raphael's give "28 March or 6 April
   * 1483", two dates nine days — and 118 degrees of Moon — apart. Each one's `provenanceNote`
   * now records that finding, so the research is not repeated.
   *
   * This count may only go down. It goes down either by computing a real chart from a verified
   * ephemeris, or — more honest where the birth date genuinely is not known — by removing the
   * chart entirely, which needs `natalChart` to become optional on CraftedAgent. That change was
   * measured: 16 type errors across components/agents/agent-detail-modal.tsx,
   * lib/agents/scrabble-league.ts and lib/enhanced-astronomical-calculator.ts, all of which
   * dereference the chart without a null check.
   */
  it('does not grow the stock of placeholder charts', () => {
    const placeholders = agents.filter(a => a.consciousness.natalChart.provenance === 'placeholder')
    expect(
      placeholders.length,
      `placeholder charts must only ever decrease. Currently: ${placeholders
        .map(a => a.id)
        .sort()
        .join(', ')}`
    ).toBeLessThanOrEqual(12)
  })

  it('keeps zodiac signs and degrees well-formed', () => {
    const malformed: string[] = []
    for (const agent of agents) {
      for (const [body, placement] of Object.entries(agent.consciousness.natalChart.planets)) {
        if (!SIGNS.includes(placement.sign as (typeof SIGNS)[number])) {
          malformed.push(`${agent.id}.${body}: unknown sign ${placement.sign}`)
        }
        if (!(placement.degree >= 0 && placement.degree < 30)) {
          malformed.push(`${agent.id}.${body}: degree ${placement.degree} outside [0, 30)`)
        }
      }
    }
    expect(malformed).toEqual([])
  })
})
