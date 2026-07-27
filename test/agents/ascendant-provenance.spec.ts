/**
 * Ascendant integrity for the historical-agent corpus.
 *
 * Round 3 gave every natal chart a provenance. The Ascendant then silently *inherited* it, which
 * is wrong: a planet's longitude depends only on the birth date, while the Ascendant depends on
 * the birth time and place and moves ~1 degree every 4 minutes. A chart can therefore have
 * hand-transcribed but plausible bodies and an Ascendant that was never derived from anything.
 *
 * The Ascendant is also the only angle with nothing beside it to check against: `ascendant` is a
 * bare number, and no chart in the corpus carries an `Ascendant` entry in `natalChart.planets`.
 * Consumers turn that bare number into a rising sign by dividing by 30
 * (`lib/agents/historical-feed-contract.ts:157`, `app/(app)/agent/[id]/page.tsx:171-173`), so an
 * unmeasured number is presented to users as a measured fact.
 *
 * This suite does two jobs:
 *
 *  1. It enforces that every chart states where its Ascendant came from, and that the stated
 *     provenance is consistent with the number actually stored.
 *  2. It **re-derives the corpus statistics quoted in the `AscendantProvenance` doc comment** in
 *     `lib/agent-types.ts`. A green test does not validate the prose beside it, so the prose is
 *     asserted here rather than trusted. If someone fixes a chart, these numbers change and the
 *     doc comment must be updated with them.
 */
import { describe, it, expect } from 'vitest'
import * as historicalAgents from '@/lib/agents/historical'
import {
  isAscendantMeasured,
  type AscendantProvenance,
  type HistoricalCraftedAgent,
} from '@/lib/agent-types'

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

const VALID: AscendantProvenance[] = [
  'measured',
  'sign-resolution',
  'unmeasured',
  'placeholder',
  'unattributed',
]

const agents = Object.values(historicalAgents).filter(
  (value): value is HistoricalCraftedAgent =>
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as HistoricalCraftedAgent).id === 'string' &&
    !!(value as HistoricalCraftedAgent).consciousness?.natalChart
)

const chartOf = (a: HistoricalCraftedAgent) => a.consciousness.natalChart
const ascOf = (a: HistoricalCraftedAgent) => chartOf(a).ascendant
const provOf = (a: HistoricalCraftedAgent) => chartOf(a).ascendantProvenance

/** An exact multiple of 30 is the first degree of a sign — the signature of sign resolution. */
const isSignStart = (n: number) => Number.isInteger(n) && n % 30 === 0

/** Decimal places in a number's literal form. A Swiss Ephemeris ascendant carries several. */
const decimals = (n: number) => {
  const s = String(n)
  const dot = s.indexOf('.')
  return dot < 0 ? 0 : s.length - dot - 1
}

const withProv = (p: AscendantProvenance) => agents.filter(a => provOf(a) === p)

describe('historical agent ascendants', () => {
  // ---------------------------------------------------------------- controls

  it('loads a non-empty corpus with the agents these assertions depend on', () => {
    expect(agents.length).toBeGreaterThanOrEqual(70)
    const ids = agents.map(a => a.id)
    // carl-jung and frida-kahlo are the only genuinely computed charts; several assertions
    // below filter to them, and would pass vacuously if they disappeared.
    expect(ids).toContain('carl-jung')
    expect(ids).toContain('frida-kahlo')
    // socrates is a known sign-resolution ascendant (exactly 180).
    expect(ids).toContain('socrates')
  })

  it('has a working sign-start detector', () => {
    // Control for the instrument itself: if isSignStart were broken, the headline assertion
    // below would pass no matter what the corpus contained.
    expect(isSignStart(0)).toBe(true)
    expect(isSignStart(180)).toBe(true)
    expect(isSignStart(330)).toBe(true)
    expect(isSignStart(301.55)).toBe(false)
    expect(isSignStart(94.2)).toBe(false)
    expect(isSignStart(45)).toBe(false)
    // And it must actually fire on the real corpus, not just on literals.
    expect(agents.filter(a => isSignStart(ascOf(a))).length).toBeGreaterThan(0)
  })

  // ------------------------------------------------------- provenance stated

  it('declares a valid ascendantProvenance on every chart', () => {
    const missing = agents
      .filter(a => !VALID.includes(provOf(a) as AscendantProvenance))
      .map(a => `${a.id} -> ${String(provOf(a))}`)

    expect(
      missing,
      'every historical chart must say where its Ascendant came from; the chart-level ' +
        'provenance does not cover it. See AscendantProvenance in lib/agent-types.ts'
    ).toEqual([])
  })

  // ------------------------------------------------- the headline assertion

  it('never lets a measured ascendant sit on a sign boundary', () => {
    const measured = withProv('measured')
    expect(
      measured.length,
      'no measured ascendants to check — assertion would be vacuous'
    ).toBeGreaterThan(0)

    const suspicious = measured
      .filter(a => isSignStart(ascOf(a)))
      .map(a => `${a.id}: ascendant ${ascOf(a)} is exactly ${ascOf(a) / 30} * 30`)

    expect(
      suspicious,
      'an exact multiple of 30 is the first degree of a sign, which is what sign resolution ' +
        'produces — not what an ephemeris produces. A chart claiming a measured Ascendant may ' +
        'not carry one. Either the number is wrong or the provenance is; relabel it ' +
        "'sign-resolution' rather than widening the claim."
    ).toEqual([])
  })

  it('keeps sub-degree precision on every measured ascendant', () => {
    const measured = withProv('measured')
    expect(measured.length, 'vacuous without measured charts').toBeGreaterThan(0)

    const tooRound = measured
      .filter(a => decimals(ascOf(a)) < 2)
      .map(a => `${a.id}: ascendant ${ascOf(a)} has ${decimals(ascOf(a))} decimal place(s)`)

    expect(
      tooRound,
      'the Ascendant moves ~1 degree every 4 minutes of birth time, so an ephemeris reports it ' +
        'to sub-degree precision (production returns values like 135.0341). A whole or ' +
        'one-decimal number claiming to be measured is almost certainly a hand-entered sign or ' +
        'degree that was relabelled rather than recomputed.'
    ).toEqual([])
  })

  // ------------------------------------------- label agrees with the number

  it("only labels an ascendant 'sign-resolution' when it really is on a sign boundary", () => {
    const resolved = withProv('sign-resolution')
    expect(resolved.length, 'vacuous without sign-resolution charts').toBeGreaterThan(0)

    const mislabelled = resolved
      .filter(a => !isSignStart(ascOf(a)))
      .map(a => `${a.id}: ascendant ${ascOf(a)} is not a multiple of 30`)

    expect(
      mislabelled,
      "'sign-resolution' means the number is signIndex * 30 and encodes only the sign. A value " +
        'that is not a multiple of 30 carries some other claim and must not use this label.'
    ).toEqual([])
  })

  it('never claims a measured Ascendant on a chart whose bodies were not computed', () => {
    const overclaimed = agents
      .filter(a => isAscendantMeasured(chartOf(a)) && chartOf(a).provenance !== 'computed')
      .map(a => `${a.id}: ascendant 'measured' but chart provenance '${chartOf(a).provenance}'`)

    expect(
      overclaimed,
      'a measured Ascendant requires a known birth time and place run through a verified ' +
        'ephemeris — the same run that produces the bodies. It cannot be measured on a chart ' +
        'that was hand-entered or is filler.'
    ).toEqual([])
  })

  it("marks the Ascendant 'placeholder' on every placeholder chart", () => {
    const placeholderCharts = agents.filter(a => chartOf(a).provenance === 'placeholder')
    expect(placeholderCharts.length, 'vacuous without placeholder charts').toBeGreaterThan(0)

    const inconsistent = placeholderCharts
      .filter(a => provOf(a) !== 'placeholder')
      .map(a => `${a.id}: chart is placeholder but ascendant is '${String(provOf(a))}'`)

    expect(
      inconsistent,
      "if the chart is not this person's, neither is its Ascendant. Whatever the number is, " +
        'it cannot be attributed to the individual.'
    ).toEqual([])
  })

  it('agrees with the ascendant longitude wherever a chart also stores an Ascendant body', () => {
    // Currently no chart stores one, so this would be vacuous. Prove the comparison works on a
    // constructed case first, then apply it to the corpus so it starts biting the moment a
    // chart gains an Ascendant entry.
    const signAt = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]
    expect(signAt(301.55)).toBe('Aquarius')
    expect(signAt(94.2)).toBe('Cancer')
    expect(signAt(0)).toBe('Aries')

    const disagreements: string[] = []
    for (const a of agents) {
      const chart = chartOf(a)
      const entry = Object.entries(chart.planets).find(([k]) => /^ascendant$/i.test(k))
      if (!entry) continue
      const [, placement] = entry
      const expected = signAt(chart.ascendant)
      if (placement.sign !== expected) {
        disagreements.push(
          `${a.id}: planets.Ascendant.sign='${placement.sign}' but ascendant ${chart.ascendant} is in ${expected}`
        )
      }
    }
    expect(disagreements).toEqual([])
  })

  it('exposes a conservative isAscendantMeasured guard', () => {
    expect(isAscendantMeasured(undefined)).toBe(false)
    expect(isAscendantMeasured(null)).toBe(false)
    expect(isAscendantMeasured({})).toBe(false)
    expect(isAscendantMeasured({ ascendantProvenance: 'unattributed' })).toBe(false)
    expect(isAscendantMeasured({ ascendantProvenance: 'sign-resolution' })).toBe(false)
    expect(isAscendantMeasured({ ascendantProvenance: 'placeholder' })).toBe(false)
    expect(isAscendantMeasured({ ascendantProvenance: 'unmeasured' })).toBe(false)
    expect(isAscendantMeasured({ ascendantProvenance: 'measured' })).toBe(true)
    // And it must classify the real corpus, not just literals.
    expect(agents.filter(a => isAscendantMeasured(chartOf(a))).length).toBe(2)
  })

  // ------------------------------------------------------------- the ratchet

  it('does not grow the stock of unmeasured ascendants', () => {
    const notMeasured = agents.filter(a => !isAscendantMeasured(chartOf(a)))
    expect(
      notMeasured.length,
      'ascendants of unknown origin must only ever decrease. An ascendant is fixed by ' +
        'computing it from a known birth time and place with a verified ephemeris — never by ' +
        'inventing a number, and never by relabelling one.'
    ).toBeLessThanOrEqual(70)
  })

  // ------------------------------- the measurements quoted in agent-types.ts

  describe('corpus statistics quoted in the AscendantProvenance doc comment', () => {
    it('counts 72 charts, of which 26 sit on a sign boundary and 24 more are whole degrees', () => {
      expect(agents.length).toBe(72)
      expect(agents.filter(a => isSignStart(ascOf(a))).length).toBe(26)
      expect(agents.filter(a => Number.isInteger(ascOf(a)) && !isSignStart(ascOf(a))).length).toBe(
        24
      )
      expect(agents.filter(a => !Number.isInteger(ascOf(a))).length).toBe(22)
    })

    it('finds no ascendant carrying 4 or more decimal places', () => {
      const precise = agents.filter(a => decimals(ascOf(a)) >= 4).map(a => a.id)
      // A real Swiss Ephemeris ascendant does (production returns e.g. 135.0341). That none of
      // the 72 does is the population-level evidence that these are not measured angles.
      expect(precise).toEqual([])
      // Control: the detector is not simply always empty.
      expect(decimals(135.0341)).toBe(4)
    })

    it('shows the Aries and Cancer pile-ups that real angles would not produce', () => {
      const bySign = new Map<string, number>()
      for (const a of agents) {
        const s = SIGNS[Math.floor((((ascOf(a) % 360) + 360) % 360) / 30)]
        bySign.set(s, (bySign.get(s) ?? 0) + 1)
      }
      // 72 charts over 12 signs is 6 expected per sign if these were real angles.
      expect(bySign.get('Aries')).toBe(19)
      expect(bySign.get('Cancer')).toBe(18)
    })

    it('shows midheaven derived from ascendant by a flat 90 degrees in 49 of 72 charts', () => {
      // The MC/ASC angle is latitude-dependent; a constant 90 degrees is equal-house schematic
      // arithmetic. Neither genuinely computed chart satisfies it, which is the point.
      const flat = agents.filter(a => {
        const c = chartOf(a)
        return Math.abs(((((c.ascendant - 90) % 360) + 360) % 360) - c.midheaven) < 1e-9
      })
      expect(flat.length).toBe(49)
      expect(flat.map(a => a.id)).not.toContain('carl-jung')
      expect(flat.map(a => a.id)).not.toContain('frida-kahlo')
    })

    it('has no chart carrying an Ascendant entry among its planets', () => {
      const withAscBody = agents
        .filter(a => Object.keys(chartOf(a).planets).some(k => /^ascendant$/i.test(k)))
        .map(a => a.id)
      // This is why the bare number is the entire claim: there is no sign stored beside it.
      // If this ever becomes non-empty that is an improvement, and the cross-check test above
      // starts doing real work.
      expect(withAscBody).toEqual([])
    })

    it('breaks down as 2 measured, 24 sign-resolution, 26 unmeasured, 20 placeholder', () => {
      expect(
        withProv('measured')
          .map(a => a.id)
          .sort()
      ).toEqual(['carl-jung', 'frida-kahlo'])
      expect(withProv('sign-resolution').length).toBe(24)
      expect(withProv('unmeasured').length).toBe(26)
      expect(withProv('placeholder').length).toBe(20)
      expect(withProv('unattributed').length).toBe(0)
    })
  })
})
