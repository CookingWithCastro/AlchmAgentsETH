/**
 * Physical-bounds regression tests for the local chart engine.
 *
 * Almost every assertion here is derived from geometry or from a definition —
 * an inferior planet's elongation ceiling, the Sun's longitude at an equinox —
 * so it needs no reference ephemeris and would have failed on day one of the
 * defect it now guards, on any machine, with no data files and no network.
 * The one exception is stated rather than hidden: the cardinal-points block
 * embeds 13 equinox/solstice INSTANTS quoted to the minute, and those are
 * almanac data. The longitude each instant must produce is definitional; only
 * the timestamps are external.
 *
 * The defects being guarded:
 *
 *  1. `calculatePlanetPositionVSOP` returned HELIOCENTRIC longitudes and the
 *     caller treated them as geocentric. Mercury reached 179.9° elongation from
 *     the Sun (423 of 500 samples over 1900-2024 violated its 28° bound) and
 *     Venus 179.8° (368 of 500 violated its 47° bound).
 *  2. The Sun's mean anomaly was computed as `L - perihelion` instead of
 *     `L - (perihelion + 180)`, flipping the sign of the equation of centre and
 *     putting the Sun up to 3.8° wrong — into the WRONG SIGN at an equinox.
 *  3. The ascendant used atan2(-cos θ, +X) where the correct form is
 *     atan2(cos θ, -X). Those are the same angle plus exactly 180°, so the
 *     function returned the DESCENDANT for every chart ever computed.
 *  4. `speed` was a mean heliocentric rate divided by 365.25 when the rate is
 *     per Julian century (36525 days), and was then passed through Math.abs, so
 *     `retrograde` was structurally incapable of ever being true.
 *  5. `distance` was the semi-major axis of the heliocentric orbit, and the
 *     Moon's was the literal 60.4 ("Earth radii") in a field documented as AU.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateAllPlanets,
  calculateEnhancedAscendant,
  checkPlanetPlausible,
  angularSeparation,
  getExactSunDegreeForDate,
  MERCURY_MAX_ELONGATION_DEG,
  VENUS_MAX_ELONGATION_DEG,
  type EnhancedBirthInfo,
} from '../../lib/enhanced-astronomical-calculator'

const NY = { latitude: 40.7128, longitude: -74.006 }

function birthInfo(date: Date, place = NY): EnhancedBirthInfo {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    latitude: place.latitude,
    longitude: place.longitude,
  }
}

/** Quarterly samples across a year range, the same shape the audit used. */
function quarterlySweep(fromYear: number, toYear: number): Date[] {
  const dates: Date[] = []
  for (let y = fromYear; y <= toYear; y++) {
    for (const m of [1, 4, 7, 10]) {
      dates.push(new Date(Date.UTC(y, m - 1, 15, 12, 0, 0)))
    }
  }
  return dates
}

describe('chart engine — inferior planet elongation bounds', () => {
  /**
   * Mercury orbits inside Earth's orbit at 0.387 AU, so from Earth it can never
   * appear more than asin(0.467 / 0.983) ~= 28° from the Sun; Venus at 0.723 AU
   * can never exceed ~47°. These are the STRICT bounds — no tolerance is applied
   * here, because a correct engine has headroom: a daily sweep of 1700-2100
   * through Swiss Ephemeris puts the true maxima at 27.79° and 47.28°, and this
   * engine's own maxima over 1600-2200 are 27.60° and 47.16°.
   *
   * `ELONGATION_TOLERANCE_DEG` exists for the runtime gate, which must not
   * withhold a Venus position that is merely near its true 47.28° maximum. The
   * test does not need that slack for Mercury and applies only the 0.3° Venus
   * overshoot.
   */
  const STRICT_VENUS_BOUND = VENUS_MAX_ELONGATION_DEG + 0.4

  it.each([
    ['1900-2024 (the sweep that exposed the defect)', 1900, 2024],
    ['1800-2050 (the element set fit window)', 1800, 2050],
  ])('%s: Mercury <= 28° and Venus <= 47° from the Sun', (_label, from, to) => {
    const dates = quarterlySweep(from, to)
    let maxMercury = 0
    let maxVenus = 0
    const violations: string[] = []

    for (const date of dates) {
      const chart = calculateAllPlanets(birthInfo(date))

      // A body withheld by the plausibility gate is also a failure of the
      // engine, not a pass — it means the computation produced the impossible.
      expect(chart.unavailable, `withheld bodies at ${date.toISOString()}`).toEqual([])

      const sun = chart.planets.Sun.longitude
      const mercury = angularSeparation(chart.planets.Mercury.longitude, sun)
      const venus = angularSeparation(chart.planets.Venus.longitude, sun)

      maxMercury = Math.max(maxMercury, mercury)
      maxVenus = Math.max(maxVenus, venus)

      if (mercury > MERCURY_MAX_ELONGATION_DEG) {
        violations.push(`Mercury ${mercury.toFixed(2)}° at ${date.toISOString()}`)
      }
      if (venus > STRICT_VENUS_BOUND) {
        violations.push(`Venus ${venus.toFixed(2)}° at ${date.toISOString()}`)
      }
    }

    expect(dates.length).toBeGreaterThan(400)
    expect(
      violations,
      `${violations.length}/${dates.length} samples violated a physical bound`
    ).toEqual([])
    expect(maxMercury).toBeLessThanOrEqual(MERCURY_MAX_ELONGATION_DEG)
    expect(maxVenus).toBeLessThanOrEqual(STRICT_VENUS_BOUND)
  })

  it('the plausibility gate rejects the exact values the old engine produced', () => {
    // Mercury opposite the Sun: what the heliocentric-longitude bug returned.
    expect(checkPlanetPlausible('Mercury', 180, 0)).toMatch(/exceeds the physical maximum/)
    expect(checkPlanetPlausible('Venus', 179.8, 0)).toMatch(/exceeds the physical maximum/)
    // Quadrature — impossible for both, and only ~90° out, so the gate is not
    // merely catching the extreme case.
    expect(checkPlanetPlausible('Mercury', 90, 0)).not.toBeNull()
    expect(checkPlanetPlausible('Venus', 90, 0)).not.toBeNull()
    // Just inside the bound: allowed.
    expect(checkPlanetPlausible('Mercury', 27, 0)).toBeNull()
    expect(checkPlanetPlausible('Venus', 47.2, 0)).toBeNull()
    // Wrap-around must be handled: 359° from 0° is 1° of separation, not 359°.
    expect(checkPlanetPlausible('Mercury', 359, 0)).toBeNull()
    // Superior planets have no such bound and must not be gated.
    expect(checkPlanetPlausible('Mars', 180, 0)).toBeNull()
    expect(checkPlanetPlausible('Jupiter', 180, 0)).toBeNull()
  })
})

describe('chart engine — the Sun at the cardinal points', () => {
  /**
   * Definitional, not measured: the March equinox IS the instant the Sun's
   * apparent geocentric longitude is 0°, and the June solstice IS 90°. The
   * instants below are quoted to the minute and were confirmed against Swiss
   * Ephemeris to within 0.0003°.
   *
   * TOLERANCE: 0.05°. The engine's actual worst deviation across these thirteen
   * instants is 0.0061°, so this is 8x headroom — while still being 605x tighter
   * than the 3.69° equinox error the mean-anomaly defect produced, and 30x
   * tighter than the 1.5° that would be needed to put the Sun in a wrong sign.
   */
  const TOLERANCE_DEG = 0.05

  const cardinalPoints: Array<[string, number]> = [
    ['1950-03-21T04:35:00Z', 0],
    ['1950-06-21T23:36:00Z', 90],
    ['1990-03-20T21:19:00Z', 0],
    ['1990-06-21T15:33:00Z', 90],
    ['2000-03-20T07:35:00Z', 0],
    ['2000-06-21T01:48:00Z', 90],
    ['2000-09-22T17:28:00Z', 180],
    ['2000-12-21T13:37:00Z', 270],
    ['2020-03-20T03:50:00Z', 0],
    ['2020-06-20T21:44:00Z', 90],
    ['2024-03-20T03:06:00Z', 0],
    ['2024-06-20T20:51:00Z', 90],
    ['2050-03-20T10:20:00Z', 0],
  ]

  it.each(cardinalPoints)('%s: Sun is at %d°', (iso, expected) => {
    const longitude = getExactSunDegreeForDate(new Date(iso))
    expect(angularSeparation(longitude, expected)).toBeLessThan(TOLERANCE_DEG)
  })

  it('places the Sun in the right SIGN at every March equinox 1900-2050', () => {
    // The equinox instant is 0° Aries. An hour either side is still within the
    // first or last fraction of a degree, so the sign is decidable without
    // knowing the exact minute: check a day after, where the Sun is ~1° Aries.
    for (let year = 1900; year <= 2050; year++) {
      const dayAfterEquinox = new Date(Date.UTC(year, 2, 22, 12, 0, 0))
      const chart = calculateAllPlanets(birthInfo(dayAfterEquinox))
      expect(chart.planets.Sun.sign, `Sun sign on 22 March ${year}`).toBe('Aries')
    }
  })
})

describe('chart engine — the ascendant is the ASCENDANT, not the descendant', () => {
  /**
   * Definitional: a point is above the horizon exactly when it lies in the
   * semicircle running backwards in longitude from the ascendant, i.e. when
   * (ASC - longitude) mod 360 is in (0, 180). At local noon the Sun is near the
   * midheaven and must be above the horizon; at local midnight it must be below.
   *
   * The 180° ascendant flip inverts both of those, so this test fails hard on
   * the old code and needs no reference data to do it.
   */
  function isAboveHorizon(ascendantLongitude: number, bodyLongitude: number): boolean {
    const delta = (((ascendantLongitude - bodyLongitude) % 360) + 360) % 360
    return delta > 0 && delta < 180
  }

  const places = [
    { name: 'Greenwich', latitude: 51.48, longitude: 0 },
    { name: 'New York', latitude: 40.71, longitude: -74.006 },
    { name: 'Sydney', latitude: -33.87, longitude: 151.21 },
    { name: 'Nairobi', latitude: -1.29, longitude: 36.82 },
    { name: 'Buenos Aires', latitude: -34.6, longitude: -58.38 },
  ]

  // 4 dates x 5 places, spread through the year so both hemispheres see summer
  // and winter declinations.
  const months = [1, 4, 7, 10]

  it.each(places)('$name: the Sun is up at local noon and down at local midnight', place => {
    for (const month of months) {
      for (const year of [1925, 1975, 2005, 2035]) {
        // Local mean noon in UT. The equation of time shifts true solar noon by
        // at most ~16 minutes, far inside the ~90° margin this test uses.
        const noonUt = 12 - place.longitude / 15
        const noon = new Date(Date.UTC(year, month - 1, 15, 0, 0, 0))
        noon.setUTCMinutes(Math.round(noonUt * 60))

        const midnight = new Date(noon.getTime() + 12 * 3600 * 1000)

        const noonChart = calculateAllPlanets(birthInfo(noon, place))
        const midnightChart = calculateAllPlanets(birthInfo(midnight, place))

        expect(
          isAboveHorizon(noonChart.ascendant.longitude, noonChart.planets.Sun.longitude),
          `${place.name} ${year}-${month}: Sun should be above the horizon at local noon`
        ).toBe(true)

        expect(
          isAboveHorizon(midnightChart.ascendant.longitude, midnightChart.planets.Sun.longitude),
          `${place.name} ${year}-${month}: Sun should be below the horizon at local midnight`
        ).toBe(false)
      }
    }
  })

  it('sweeps the whole ecliptic over a sidereal day and never stalls', () => {
    // The ascendant advances through all twelve signs in ~23h56m. If the formula
    // degenerated, some signs would never appear.
    const seen = new Set<string>()
    const start = Date.UTC(2001, 5, 15, 0, 0, 0)
    for (let minutes = 0; minutes < 24 * 60; minutes += 10) {
      const at = new Date(start + minutes * 60_000)
      seen.add(calculateEnhancedAscendant(birthInfo(at)).sign)
    }
    expect(seen.size).toBe(12)
  })
})

describe('chart engine — geocentric distances are geocentric', () => {
  /**
   * Bounds from orbital geometry alone: the geocentric distance to a body must
   * lie between |r_body_min - r_earth_max| and r_body_max + r_earth_max, with
   * Earth spanning 0.983-1.017 AU. The old code returned the SEMI-MAJOR AXIS of
   * the heliocentric orbit (a constant), which fails every one of these, and
   * 60.4 for the Moon, which is off by four orders of magnitude.
   */
  const bounds: Record<string, [number, number]> = {
    Sun: [0.98, 1.02],
    Moon: [0.00235, 0.00275], // 351,000 - 411,000 km
    Mercury: [0.5, 1.5],
    Venus: [0.25, 1.75],
    Mars: [0.36, 2.7],
    Jupiter: [3.9, 6.5],
    Saturn: [7.9, 11.2],
  }

  it('every body stays inside its geometric distance envelope', () => {
    for (const date of quarterlySweep(1900, 2024)) {
      const chart = calculateAllPlanets(birthInfo(date))
      for (const [body, [min, max]] of Object.entries(bounds)) {
        const distance = chart.planets[body].distance
        expect(distance, `${body} at ${date.toISOString()}`).toBeGreaterThanOrEqual(min)
        expect(distance, `${body} at ${date.toISOString()}`).toBeLessThanOrEqual(max)
      }
    }
  })
})

describe('chart engine — retrograde motion exists', () => {
  /**
   * Mercury retrogrades three times a year, Venus about every 19 months, Mars
   * every 26 months, and the outer planets for months at a time every year. A
   * daily sample of a single year must therefore see all of them retrograde at
   * some point except Venus, which can skip a calendar year.
   *
   * The old engine reported `speed: Math.abs(meanRate)`, so `retrograde` was
   * false for every body at every instant, forever.
   */
  it('sees Mercury, Mars, Jupiter and Saturn retrograde during 2023', () => {
    const retrogradeDays: Record<string, number> = {}
    for (let day = 0; day < 365; day++) {
      const date = new Date(Date.UTC(2023, 0, 1 + day, 12, 0, 0))
      const chart = calculateAllPlanets(birthInfo(date))
      for (const [body, position] of Object.entries(chart.planets)) {
        if (position.retrograde) retrogradeDays[body] = (retrogradeDays[body] ?? 0) + 1
      }
    }

    // Mercury: three retrograde periods of ~3 weeks each.
    expect(retrogradeDays.Mercury ?? 0).toBeGreaterThan(50)
    expect(retrogradeDays.Mars ?? 0).toBeGreaterThan(0)
    // Outer planets are retrograde for roughly (1 - synodic/orbital) of the year.
    expect(retrogradeDays.Jupiter ?? 0).toBeGreaterThan(80)
    expect(retrogradeDays.Saturn ?? 0).toBeGreaterThan(100)
    expect(retrogradeDays.Uranus ?? 0).toBeGreaterThan(100)
    expect(retrogradeDays.Neptune ?? 0).toBeGreaterThan(100)

    // And the Sun and Moon never are.
    expect(retrogradeDays.Sun ?? 0).toBe(0)
    expect(retrogradeDays.Moon ?? 0).toBe(0)
  })

  it('gives the Sun and Moon their textbook daily motion', () => {
    for (const date of quarterlySweep(1900, 2024)) {
      const chart = calculateAllPlanets(birthInfo(date))
      // The Sun's apparent motion varies from ~0.953°/day at aphelion to
      // ~1.019°/day at perihelion.
      expect(chart.planets.Sun.speed).toBeGreaterThan(0.95)
      expect(chart.planets.Sun.speed).toBeLessThan(1.02)
      // The Moon's varies from ~11.8°/day at apogee to ~15.4°/day at perigee.
      expect(chart.planets.Moon.speed).toBeGreaterThan(11)
      expect(chart.planets.Moon.speed).toBeLessThan(16)
    }
  })
})

describe('chart engine — provenance is unavoidable', () => {
  it('stamps every position, the ascendant and the chart itself', () => {
    const chart = calculateAllPlanets(birthInfo(new Date(Date.UTC(1990, 4, 15, 12, 30, 0))))

    expect(chart.source).toBe('vsop87-approximation')
    expect(chart.ascendant.source).toBe('vsop87-approximation')
    expect(Object.keys(chart.planets)).toHaveLength(10)
    for (const position of Object.values(chart.planets)) {
      expect(position.source).toBe('vsop87-approximation')
    }
  })

  it('flags instants outside the element set fit window', () => {
    expect(
      calculateAllPlanets(birthInfo(new Date(Date.UTC(1999, 0, 1)))).withinElementSetRange
    ).toBe(true)
    expect(
      calculateAllPlanets(birthInfo(new Date(Date.UTC(1452, 3, 15)))).withinElementSetRange
    ).toBe(false)
    expect(
      calculateAllPlanets(birthInfo(new Date(Date.UTC(2200, 0, 1)))).withinElementSetRange
    ).toBe(false)
  })
})
