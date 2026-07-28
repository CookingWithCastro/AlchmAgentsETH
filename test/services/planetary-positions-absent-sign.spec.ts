/**
 * A body the upstream did not place must stay unplaced.
 *
 * lib/services/planetary-positions-service.ts had three parse boundaries reading
 * `sign: pos.sign || 'Aries'` (one per fallback tier: Swiss Ephemeris, the enhanced
 * calculator, basic transits). Aries is a Fire sign and 0° is a real degree, so an
 * unplaced body was not merely mislabelled — it was injected into every downstream
 * elemental total as Fire weight indistinguishable from a measurement.
 *
 * These tests pin the corrected behaviour: absence propagates as omission.
 *
 * Each test resets the module registry and re-imports the service, because the
 * circuit breakers and the response cache are module-level singletons that would
 * otherwise leak state between cases.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SwissBody = Record<string, unknown>

/** Load the service with the three upstream tiers mocked. */
async function loadService(mocks: {
  swiss?: () => unknown
  enhanced?: () => unknown
  transits?: () => unknown
}) {
  vi.resetModules()

  vi.doMock('@/lib/swiss-ephemeris-service', () => ({
    swissEphemerisService: {
      getAllPlanetaryPositions: vi.fn(async () => {
        if (!mocks.swiss) throw new Error('swiss unavailable')
        return mocks.swiss()
      }),
    },
  }))

  vi.doMock('@/lib/enhanced-astronomical-calculator', () => ({
    calculateAllPlanets: vi.fn(() => {
      if (!mocks.enhanced) throw new Error('enhanced unavailable')
      return mocks.enhanced()
    }),
  }))

  vi.doMock('@/lib/calculate-transits', () => ({
    getCurrentPlanetaryPositions: vi.fn(() => {
      if (!mocks.transits) throw new Error('transits unavailable')
      return mocks.transits()
    }),
  }))

  const mod = await import('@/lib/services/planetary-positions-service')
  return mod.planetaryPositionsService
}

const AT = new Date('2026-07-27T12:00:00.000Z')

/** A Swiss-shaped body. */
function swissBody(sign: unknown, degree: unknown, longitude?: number): SwissBody {
  return { sign, degree, longitude, retrograde: false, speed: 1 }
}

describe('planetary-positions-service: an unplaced body is omitted, never defaulted to Aries', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.doUnmock('@/lib/swiss-ephemeris-service')
    vi.doUnmock('@/lib/enhanced-astronomical-calculator')
    vi.doUnmock('@/lib/calculate-transits')
  })

  // -- CONTROL -------------------------------------------------------------
  // If this fails, every "the body is gone" assertion below is vacuous, because
  // the filter would be dropping bodies that ARE measured.
  it('CONTROL: a fully-placed Swiss payload keeps every body, with its own sign', async () => {
    const service = await loadService({
      swiss: () => ({
        Sun: swissBody('Leo', 4.2, 124.2),
        Moon: swissBody('Scorpio', 25.7, 235.7),
        Mercury: swissBody('Cancer', 16.3, 106.3),
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.planetaryPositions).toHaveLength(3)
    expect(data.planetaryPositions.map(p => `${p.planet} ${p.sign}`).sort()).toEqual([
      'Mercury Cancer',
      'Moon Scorpio',
      'Sun Leo',
    ])
    // Degree 0 is a real measurement and must survive the finiteness check.
    expect(data.planetaryPositions.find(p => p.planet === 'Sun')?.degree).toBe(4.2)
  })

  it('Swiss tier: a body with no sign is omitted, and no Aries placement appears', async () => {
    const service = await loadService({
      swiss: () => ({
        Sun: swissBody('Leo', 4.2, 124.2),
        Moon: swissBody('Scorpio', 25.7, 235.7),
        Mars: swissBody(undefined, 17.4, 77.4), // upstream did not place Mars
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.planetaryPositions.map(p => p.planet)).not.toContain('Mars')
    expect(data.planetaryPositions.map(p => p.sign)).not.toContain('Aries')
    // Non-empty control: the two measured bodies survive untouched.
    expect(data.planetaryPositions).toHaveLength(2)
    expect(data.planetaryPositions.map(p => p.sign).sort()).toEqual(['Leo', 'Scorpio'])
  })

  it('Swiss tier: a body with a sign but no degree is omitted rather than placed at 0°', async () => {
    const service = await loadService({
      swiss: () => ({
        Sun: swissBody('Leo', 4.2, 124.2),
        Venus: swissBody('Virgo', undefined, undefined), // sign known, degree not
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.planetaryPositions.map(p => p.planet)).toEqual(['Sun'])
    expect(data.planetaryPositions.some(p => p.degree === 0)).toBe(false)
  })

  it('Enhanced-calculator tier: an unplaced body is omitted', async () => {
    const service = await loadService({
      // Swiss absent -> the chain falls to the enhanced calculator.
      enhanced: () => ({
        planets: {
          Sun: { sign: 'Cancer', signDegree: 5.1, longitude: 95.1, retrograde: false },
          Jupiter: { sign: null, signDegree: 4.0, longitude: 124.0, retrograde: false },
        },
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.source).toBe('enhanced-calculator')
    expect(data.planetaryPositions.map(p => p.planet)).toEqual(['Sun'])
    expect(data.planetaryPositions.map(p => p.sign)).not.toContain('Aries')
  })

  it('Basic-transits tier: an unplaced body is omitted', async () => {
    const service = await loadService({
      transits: () => ({
        Sun: { sign: 'Leo', degree: '4.2', retrograde: false },
        Pluto: { sign: '', degree: '4.0', retrograde: true },
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.source).toBe('basic-transits')
    expect(data.planetaryPositions.map(p => p.planet)).toEqual(['Sun'])
    expect(data.planetaryPositions.map(p => p.sign)).not.toContain('Aries')
  })

  it('a lowercase sign is canonicalised, not dropped and not turned into Aries', async () => {
    const service = await loadService({
      swiss: () => ({ Saturn: swissBody('scorpio', 14.7, 224.7) }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.planetaryPositions).toHaveLength(1)
    // Canonical capitalisation matters: downstream SIGN_STARTS lookups are
    // case-sensitive object indexes that fall back to Aries's slot on a miss.
    expect(data.planetaryPositions[0].sign).toBe('Scorpio')
  })

  it('an unrecognised sign label is not accepted as a placement', async () => {
    const service = await loadService({
      swiss: () => ({
        Sun: swissBody('Leo', 4.2, 124.2),
        Moon: swissBody('Ophiuchus', 25.7, 235.7),
      }),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.planetaryPositions.map(p => p.planet)).toEqual(['Sun'])
  })

  it('a payload where nothing is placeable does not masquerade as a high-accuracy result', async () => {
    const service = await loadService({
      // Ten bodies, none of them placed. The old code turned this into ten
      // Aries placements reported as source 'external-api', accuracy 'high'.
      swiss: () =>
        Object.fromEntries(
          [
            'Sun',
            'Moon',
            'Mercury',
            'Venus',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune',
            'Pluto',
          ].map(p => [p, swissBody(undefined, undefined, undefined)])
        ),
      // enhanced + transits absent -> the chain must reach the static fallback.
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })

    expect(data.source).toBe('static-fallback')
    expect(data.accuracy).toBe('fallback')
    expect(data.planetaryPositions.filter(p => p.sign === 'Aries')).toHaveLength(2) // Saturn+Neptune, genuinely
  })
})

describe('an omitted body does not shift ESMS toward Fire', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.doUnmock('@/lib/swiss-ephemeris-service')
    vi.doUnmock('@/lib/enhanced-astronomical-calculator')
    vi.doUnmock('@/lib/calculate-transits')
  })

  it('measures the same axes as the truthful subset, and strictly less Fire than a fabricated Aries', async () => {
    // An Aries-free, water/earth chart: any Aries injection is unambiguously visible.
    const CHART: Record<string, string> = {
      Sun: 'Cancer',
      Moon: 'Taurus',
      Mercury: 'Cancer',
      Venus: 'Virgo',
      Mars: 'Capricorn',
      Jupiter: 'Pisces',
      Saturn: 'Scorpio',
      Uranus: 'Capricorn',
      Neptune: 'Pisces',
      Pluto: 'Virgo',
    }
    // Mars and Jupiter each carry +2.0 Fire when fabricated as Aries; Uranus carries
    // none, but shifts Essence and Matter by +1.0 each. Both kinds of drift are
    // covered, so this cannot pass by picking a body alchemize happens to ignore.
    const UNPLACED = ['Mars', 'Jupiter', 'Uranus']

    const service = await loadService({
      swiss: () =>
        Object.fromEntries(
          Object.entries(CHART).map(([planet, sign]) => [
            planet,
            swissBody(UNPLACED.includes(planet) ? undefined : sign, 10),
          ])
        ),
    })

    const data = await service.getPlanetaryPositions(AT, { useCache: false })
    const { alchemize } = await import('@/lib/alchemizer')

    // `_probe` defeats alchemize's birth_info-keyed cache, which ignores the
    // horoscope entirely and would return the first variant for all three.
    const axesOf = (bodies: Array<{ planet: string; sign: string }>, probe: number) => {
      const result = alchemize(
        {
          year: 2026,
          month: 7,
          day: 27,
          hour: 12,
          minute: 0,
          latitude: 0,
          longitude: 0,
          _probe: probe,
        },
        {
          tropical: {
            CelestialBodies: {
              all: bodies.map(b => ({
                label: b.planet,
                Sign: { label: b.sign },
                House: { label: '1' },
              })),
            },
          },
        }
      )
      return {
        spirit: result['Alchemy Effects']?.['Total Spirit'] ?? 0,
        essence: result['Alchemy Effects']?.['Total Essence'] ?? 0,
        matter: result['Alchemy Effects']?.['Total Matter'] ?? 0,
        substance: result['Alchemy Effects']?.['Total Substance'] ?? 0,
        fire: result['Total Effect Value']?.['Fire'] ?? 0,
      }
    }

    const fromService = axesOf(data.planetaryPositions, 1)
    const truthfulSubset = axesOf(
      Object.entries(CHART)
        .filter(([planet]) => !UNPLACED.includes(planet))
        .map(([planet, sign]) => ({ planet, sign })),
      2
    )
    const fabricatedAries = axesOf(
      Object.entries(CHART).map(([planet, sign]) => ({
        planet,
        sign: UNPLACED.includes(planet) ? 'Aries' : sign,
      })),
      3
    )

    expect(data.planetaryPositions).toHaveLength(7) // non-empty control

    // What the service now yields is exactly the truthful subset, on every axis.
    expect(fromService).toEqual(truthfulSubset)

    // The drift being prevented is real, not hypothetical: the old `|| 'Aries'`
    // moved Fire AND the alchemical axes away from the truthful subset.
    expect(fabricatedAries.fire).toBeGreaterThan(truthfulSubset.fire)
    expect(fabricatedAries.essence).toBeGreaterThan(truthfulSubset.essence)
    expect(fromService.fire).toBeLessThan(fabricatedAries.fire)
  })
})
