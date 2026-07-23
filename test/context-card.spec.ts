import { describe, it, expect } from 'vitest'
import {
  computeExtendedPoints,
  lonToSignDeg,
  type ComputeExtendedPointsInput,
} from '@/lib/context-card/extended-points'
import {
  computeTransits,
  synergyLead,
  DEMO_SKY,
  type SkySource,
} from '@/lib/context-card/transit-engine'
import { buildOutput, buildMultiChartOutput, fmtDegree } from '@/lib/context-card/serializers'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import type { ContextCardData, ExportOptions } from '@/lib/context-card/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const norm360 = (x: number) => ((x % 360) + 360) % 360

const ALL_OPTS: ExportOptions = {
  promptHeader: true,
  synopsis: true,
  houses: true,
  aspects: true,
  minorAspects: true,
  transits: true,
  alchm: true,
  annotated: false,
}

// ---------------------------------------------------------------------------
// Extended points
// ---------------------------------------------------------------------------

describe('computeExtendedPoints', () => {
  const base: ComputeExtendedPointsInput = {
    date: new Date(Date.UTC(1990, 5, 1, 14, 17)),
    observerLon: -73.9442,
    ascendantLon: 138,
    sunLon: 71,
    moonLon: 233,
  }

  it('returns Ascendant when provided', () => {
    const pts = computeExtendedPoints(base)
    const asc = pts.find(p => p.body === 'Ascendant')
    expect(asc).toBeDefined()
    expect(asc!.lon).toBe(138)
    expect(asc!.retro).toBe(false)
  })

  it('omits Ascendant when null', () => {
    const pts = computeExtendedPoints({ ...base, ascendantLon: null })
    expect(pts.find(p => p.body === 'Ascendant')).toBeUndefined()
  })

  it('returns Midheaven in 0..360 when observerLon given', () => {
    const pts = computeExtendedPoints(base)
    const mc = pts.find(p => p.body === 'Midheaven')
    expect(mc).toBeDefined()
    expect(mc!.lon).toBeGreaterThanOrEqual(0)
    expect(mc!.lon).toBeLessThan(360)
    expect(mc!.retro).toBe(false)
  })

  it('omits Midheaven when observerLon is undefined', () => {
    const pts = computeExtendedPoints({ ...base, observerLon: undefined })
    expect(pts.find(p => p.body === 'Midheaven')).toBeUndefined()
  })

  it('North and South Node are 180° apart and retrograde', () => {
    const pts = computeExtendedPoints(base)
    const nn = pts.find(p => p.body === 'North Node')!
    const sn = pts.find(p => p.body === 'South Node')!
    expect(nn.retro).toBe(true)
    expect(sn.retro).toBe(true)
    expect(Math.abs(norm360(sn.lon - nn.lon) - 180)).toBeLessThan(1e-6)
  })

  it('North Node for 1990-06-01 is in the Aquarius range (~290-325°)', () => {
    const pts = computeExtendedPoints(base)
    const nn = pts.find(p => p.body === 'North Node')!
    expect(nn.lon).toBeGreaterThan(290)
    expect(nn.lon).toBeLessThan(325)
  })

  it('returns Lilith in 0..360', () => {
    const pts = computeExtendedPoints(base)
    const lil = pts.find(p => p.body === 'Lilith')!
    expect(lil).toBeDefined()
    expect(lil.lon).toBeGreaterThanOrEqual(0)
    expect(lil.lon).toBeLessThan(360)
    expect(lil.retro).toBe(false)
  })

  it('Part of Fortune = Asc + Moon - Sun', () => {
    const pts = computeExtendedPoints(base)
    const pof = pts.find(p => p.body === 'Part of Fortune')!
    expect(pof).toBeDefined()
    const expected = norm360(138 + 233 - 71)
    expect(Math.abs(pof.lon - expected)).toBeLessThan(1e-6)
  })

  it('omits Part of Fortune when any input is null', () => {
    const pts = computeExtendedPoints({ ...base, sunLon: null })
    expect(pts.find(p => p.body === 'Part of Fortune')).toBeUndefined()
  })

  it('all longitudes are in 0..360', () => {
    const pts = computeExtendedPoints(base)
    for (const p of pts) {
      expect(p.lon).toBeGreaterThanOrEqual(0)
      expect(p.lon).toBeLessThan(360)
    }
  })
})

describe('lonToSignDeg', () => {
  it('0° = Aries 0°', () => {
    const r = lonToSignDeg(0)
    expect(r.sign).toBe('Aries')
    expect(r.deg).toBe(0)
  })

  it('71° = Gemini 11°', () => {
    const r = lonToSignDeg(71)
    expect(r.sign).toBe('Gemini')
    expect(r.deg).toBe(11)
  })

  it('359.9° = Pisces ~29.9°', () => {
    const r = lonToSignDeg(359.9)
    expect(r.sign).toBe('Pisces')
    expect(r.deg).toBeCloseTo(29.9, 1)
  })

  it('wraps negative longitudes', () => {
    const r = lonToSignDeg(-30)
    expect(r.sign).toBe('Pisces')
    expect(r.deg).toBe(0)
  })

  it('wraps 360+ longitudes', () => {
    const r = lonToSignDeg(390)
    expect(r.sign).toBe('Taurus')
    expect(r.deg).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Transit engine
// ---------------------------------------------------------------------------

describe('computeTransits', () => {
  it('returns aspects sorted by orb (tightest first)', () => {
    const result = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY)
    for (let i = 1; i < result.aspects.length; i++) {
      expect(result.aspects[i].orb).toBeGreaterThanOrEqual(result.aspects[i - 1].orb)
    }
  })

  it('respects the cap parameter', () => {
    const full = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY, 100)
    const capped = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY, 3)
    expect(capped.aspects.length).toBeLessThanOrEqual(3)
    expect(full.aspects.length).toBeGreaterThanOrEqual(capped.aspects.length)
  })

  it('passes through sky meta unchanged', () => {
    const result = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY)
    expect(result.meta).toEqual(DEMO_SKY.meta)
  })

  it('produces valid aspect types', () => {
    const VALID = ['conjunction', 'opposition', 'trine', 'square', 'sextile', 'quincunx']
    const result = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY)
    for (const a of result.aspects) {
      expect(VALID).toContain(a.type)
    }
  })

  it('orbs are non-negative', () => {
    const result = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY)
    for (const a of result.aspects) {
      expect(a.orb).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns empty aspects for empty natal chart', () => {
    const result = computeTransits([], DEMO_SKY)
    expect(result.aspects).toHaveLength(0)
  })

  it('returns empty aspects for empty sky', () => {
    const emptySky: SkySource = { positions: [], meta: DEMO_SKY.meta }
    const result = computeTransits(DEMO_CARD_DATA.points, emptySky)
    expect(result.aspects).toHaveLength(0)
  })

  it('finds a conjunction when two bodies share the same degree', () => {
    const sky: SkySource = {
      positions: [{ planet: 'Mars', sign: 'Gemini', degree: 11.15 }],
      meta: DEMO_SKY.meta,
    }
    const result = computeTransits(DEMO_CARD_DATA.points, sky, 100)
    const hit = result.aspects.find(
      a => a.t === 'Mars' && a.n === 'Sun' && a.type === 'conjunction'
    )
    expect(hit).toBeDefined()
    expect(hit!.orb).toBe(0)
  })
})

describe('synergyLead', () => {
  it('produces a non-empty string with transit data', () => {
    const transits = computeTransits(DEMO_CARD_DATA.points, DEMO_SKY)
    const lead = synergyLead(transits)
    expect(lead.length).toBeGreaterThan(0)
    expect(lead).toContain(DEMO_SKY.meta.moonPhase)
  })

  it('handles zero aspects gracefully', () => {
    const transits = computeTransits([], DEMO_SKY)
    const lead = synergyLead(transits)
    expect(lead.length).toBeGreaterThan(0)
    expect(lead).not.toContain('Tightest contacts')
  })
})

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

describe('fmtDegree', () => {
  it('formats integer degrees', () => {
    expect(fmtDegree(15)).toBe("15°00'")
  })

  it('formats fractional degrees', () => {
    expect(fmtDegree(11.15)).toBe("11°09'")
  })

  it('rounds 60 minutes up to next degree', () => {
    expect(fmtDegree(11.999)).toBe("12°00'")
  })

  it('handles 0°', () => {
    expect(fmtDegree(0)).toBe("0°00'")
  })
})

describe('buildOutput — Markdown', () => {
  const md = buildOutput(DEMO_CARD_DATA, 'md', ALL_OPTS)

  it('starts with the top-level heading', () => {
    expect(md).toContain('# ASTROLOGICAL CONTEXT CARD')
  })

  it('includes the prompt header', () => {
    expect(md).toContain('## HOW TO USE THIS FILE')
  })

  it('includes birth data', () => {
    expect(md).toContain('Self · Council Native')
    expect(md).toContain('Brooklyn, New York, USA')
  })

  it('includes big three', () => {
    expect(md).toContain('**Sun** in Gemini')
    expect(md).toContain('**Moon** in Scorpio')
    expect(md).toContain('**Rising / Ascendant** in Leo')
  })

  it('includes placements table', () => {
    expect(md).toContain('| Sun | Gemini |')
    expect(md).toContain('| Saturn | Capricorn |')
  })

  it('includes points table', () => {
    expect(md).toContain('## ANGLES & POINTS')
    expect(md).toContain('Ascendant')
    expect(md).toContain('North Node')
  })

  it('includes house cusps', () => {
    expect(md).toContain('## HOUSE CUSPS')
  })

  it('includes aspects', () => {
    expect(md).toContain('## ASPECTS')
    expect(md).toContain('### Major')
  })

  it('includes minor aspects when opted in', () => {
    expect(md).toContain('### Minor')
    expect(md).toContain('quincunx')
  })

  it('excludes minor aspects when opted out', () => {
    const noMinor = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, minorAspects: false })
    expect(noMinor).not.toContain('### Minor')
    expect(noMinor).not.toContain('quincunx')
  })

  it('includes alchm layer', () => {
    expect(md).toContain('## ALCHM LAYER')
    expect(md).toContain('Sacred 7')
    expect(md).toContain('Planetary 12')
  })

  it('includes transit synergy when data present', () => {
    const dataWithTransits = {
      ...DEMO_CARD_DATA,
      transits: computeTransits(DEMO_CARD_DATA.points, DEMO_SKY),
    }
    const out = buildOutput(dataWithTransits, 'md', ALL_OPTS)
    expect(out).toContain('## CURRENT SKY')
  })

  it('ends with END CONTEXT CARD', () => {
    expect(md).toContain('<!-- END CONTEXT CARD -->')
  })
})

describe('buildOutput — omitted sections', () => {
  it('omits prompt header when opted out', () => {
    const out = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, promptHeader: false })
    expect(out).not.toContain('HOW TO USE THIS FILE')
  })

  it('omits houses when opted out', () => {
    const out = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, houses: false })
    expect(out).not.toContain('HOUSE CUSPS')
  })

  it('omits aspects when opted out', () => {
    const out = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, aspects: false })
    expect(out).not.toContain('## ASPECTS')
  })

  it('omits alchm when opted out', () => {
    const out = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, alchm: false })
    expect(out).not.toContain('ALCHM LAYER')
  })

  it('omits synopsis when opted out', () => {
    const out = buildOutput(DEMO_CARD_DATA, 'md', { ...ALL_OPTS, synopsis: false })
    expect(out).not.toContain('## SYNOPSIS')
  })

  it('omits transit section when no transit data', () => {
    const noTransits = { ...DEMO_CARD_DATA, transits: undefined }
    const out = buildOutput(noTransits, 'md', ALL_OPTS)
    expect(out).not.toContain('CURRENT SKY')
  })
})

describe('buildOutput — TXT format', () => {
  const txt = buildOutput(DEMO_CARD_DATA, 'txt', ALL_OPTS)

  it('starts with a rule line and title', () => {
    expect(txt).toContain('ASTROLOGICAL CONTEXT CARD')
    expect(txt).toContain('====')
  })

  it('includes the subject block', () => {
    expect(txt).toContain('Handle : Self · Council Native')
  })

  it('ends with END CONTEXT CARD', () => {
    expect(txt).toContain('END CONTEXT CARD')
  })
})

describe('buildOutput — JSON format', () => {
  it('produces valid JSON', () => {
    const raw = buildOutput(DEMO_CARD_DATA, 'json', ALL_OPTS)
    const parsed = JSON.parse(raw)
    expect(parsed).toBeDefined()
  })

  it('includes _meta with schema version', () => {
    const parsed = JSON.parse(buildOutput(DEMO_CARD_DATA, 'json', ALL_OPTS))
    expect(parsed._meta.schema).toBe('alchm.context-card/v1')
  })

  it('includes big_three in subject', () => {
    const parsed = JSON.parse(buildOutput(DEMO_CARD_DATA, 'json', ALL_OPTS))
    expect(parsed.subject.big_three).toEqual({ sun: 'Gemini', moon: 'Scorpio', rising: 'Leo' })
  })

  it('includes Sacred 7 in alchm when present', () => {
    const parsed = JSON.parse(buildOutput(DEMO_CARD_DATA, 'json', ALL_OPTS))
    expect(parsed.alchm.sacred7).toBeDefined()
    expect(parsed.alchm.sacred7.power).toBe(62)
  })

  it('omits Sacred 7 when empty', () => {
    const emptyStats: ContextCardData = {
      ...DEMO_CARD_DATA,
      alchm: { ...DEMO_CARD_DATA.alchm, sacred7: {} },
    }
    const parsed = JSON.parse(buildOutput(emptyStats, 'json', ALL_OPTS))
    expect(parsed.alchm.sacred7).toBeUndefined()
  })

  it('includes how_to_use before subject when promptHeader is on', () => {
    const raw = buildOutput(DEMO_CARD_DATA, 'json', ALL_OPTS)
    const howIdx = raw.indexOf('"how_to_use"')
    const subjIdx = raw.indexOf('"subject"')
    expect(howIdx).toBeLessThan(subjIdx)
  })

  it('omits how_to_use when promptHeader is off', () => {
    const parsed = JSON.parse(
      buildOutput(DEMO_CARD_DATA, 'json', { ...ALL_OPTS, promptHeader: false })
    )
    expect(parsed.how_to_use).toBeUndefined()
  })
})

describe('buildOutput — empty data guards', () => {
  const lean: ContextCardData = {
    ...DEMO_CARD_DATA,
    points: DEMO_CARD_DATA.points.filter(p => p.kind === 'planet'),
    houses: [],
    aspects: [],
    synopsis: [],
    alchm: { ...DEMO_CARD_DATA.alchm, sacred7: {}, planetary12: {} },
    transits: undefined,
  }

  it('MD skips ANGLES & POINTS when no points exist', () => {
    const out = buildOutput(lean, 'md', ALL_OPTS)
    expect(out).not.toContain('## ANGLES & POINTS')
  })

  it('MD skips HOUSE CUSPS when no houses exist', () => {
    const out = buildOutput(lean, 'md', ALL_OPTS)
    expect(out).not.toContain('## HOUSE CUSPS')
  })

  it('MD skips ASPECTS when list is empty', () => {
    const out = buildOutput(lean, 'md', ALL_OPTS)
    expect(out).not.toContain('## ASPECTS')
  })

  it('MD skips Sacred 7 / Planetary 12 when empty', () => {
    const out = buildOutput(lean, 'md', ALL_OPTS)
    expect(out).not.toContain('### Sacred 7')
    expect(out).not.toContain('### Planetary 12')
  })

  it('JSON omits points key when no points exist', () => {
    const parsed = JSON.parse(buildOutput(lean, 'json', ALL_OPTS))
    expect(parsed.points).toBeUndefined()
  })

  it('JSON omits aspects key when empty', () => {
    const parsed = JSON.parse(buildOutput(lean, 'json', ALL_OPTS))
    expect(parsed.aspects).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Weighted cost distribution (inline since the function is not exported)
// ---------------------------------------------------------------------------

describe('weightedAmounts (inline reimplementation)', () => {
  type TokenType = 'spirit' | 'essence' | 'matter' | 'substance'
  const TOKEN_TYPES: TokenType[] = ['spirit', 'essence', 'matter', 'substance']

  function weightedAmounts(
    balances: Partial<Record<TokenType, unknown>> | null,
    total = 12
  ): Record<TokenType, number> {
    const bals = TOKEN_TYPES.map(t => Math.max(0, Number(balances?.[t]) || 0))
    const sum = bals.reduce((a, b) => a + b, 0)
    if (sum <= 0) {
      const even = total / 4
      return { spirit: even, essence: even, matter: even, substance: even }
    }
    const raw = bals.map(b => (total * b) / sum)
    const result = raw.map(Math.floor)
    let remainder = total - result.reduce((a, b) => a + b, 0)
    const byFrac = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < byFrac.length && remainder > 0; k++) {
      result[byFrac[k].i] += 1
      remainder -= 1
    }
    return { spirit: result[0], essence: result[1], matter: result[2], substance: result[3] }
  }

  it('sums to total for balanced wallet', () => {
    const w = weightedAmounts({ spirit: 10, essence: 10, matter: 10, substance: 10 })
    expect(w.spirit + w.essence + w.matter + w.substance).toBe(12)
  })

  it('sums to total for skewed wallet', () => {
    const w = weightedAmounts({ spirit: 100, essence: 3, matter: 0, substance: 7 })
    expect(w.spirit + w.essence + w.matter + w.substance).toBe(12)
  })

  it('takes more from abundant tokens', () => {
    const w = weightedAmounts({ spirit: 100, essence: 1, matter: 1, substance: 1 })
    expect(w.spirit).toBeGreaterThan(w.essence)
    expect(w.spirit).toBeGreaterThan(w.matter)
  })

  it('even split when balances are null', () => {
    const w = weightedAmounts(null)
    expect(w).toEqual({ spirit: 3, essence: 3, matter: 3, substance: 3 })
  })

  it('even split when all balances are zero', () => {
    const w = weightedAmounts({ spirit: 0, essence: 0, matter: 0, substance: 0 })
    expect(w).toEqual({ spirit: 3, essence: 3, matter: 3, substance: 3 })
  })

  it('handles non-integer balances', () => {
    const w = weightedAmounts({ spirit: 5.5, essence: 3.3, matter: 2.2, substance: 1.1 })
    expect(w.spirit + w.essence + w.matter + w.substance).toBe(12)
  })

  it('all amounts are non-negative integers', () => {
    const w = weightedAmounts({ spirit: 50, essence: 0, matter: 0, substance: 50 })
    for (const v of Object.values(w)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('buildMultiChartOutput', () => {
  const DEFAULT_OPTS: ExportOptions = {
    promptHeader: true,
    synopsis: true,
    houses: true,
    aspects: true,
    minorAspects: true,
    transits: true,
    alchm: true,
    annotated: true,
  }

  it('builds combined markdown report for multiple chart profiles', () => {
    const chart1 = DEMO_CARD_DATA
    const chart2 = {
      ...DEMO_CARD_DATA,
      birth: { ...DEMO_CARD_DATA.birth, handle: 'Partner Chart' },
    }
    const output = buildMultiChartOutput([chart1, chart2], 'md', DEFAULT_OPTS)
    expect(output).toContain('# MULTI-CHART ASTROLOGICAL CONTEXT ATTACHMENT')
    expect(output).toContain('## INCLUDED CHARTS (2)')
    expect(output).toContain('# CHART 1: SELF · COUNCIL NATIVE')
    expect(output).toContain('# CHART 2: PARTNER CHART')
    expect(output).toContain('# MULTI-CHART SYNASTRY & ELEMENTAL OVERLAY')
  })

  it('builds combined JSON report for multiple chart profiles', () => {
    const chart1 = DEMO_CARD_DATA
    const chart2 = {
      ...DEMO_CARD_DATA,
      birth: { ...DEMO_CARD_DATA.birth, handle: 'Partner Chart' },
    }
    const output = buildMultiChartOutput([chart1, chart2], 'json', DEFAULT_OPTS)
    const json = JSON.parse(output)
    expect(json._meta.chartCount).toBe(2)
    expect(json.charts).toHaveLength(2)
  })
})
