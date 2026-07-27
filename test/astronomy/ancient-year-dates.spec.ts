/**
 * Ancient years must survive the trip into a chart.
 * =================================================
 *
 * `Date.UTC(year, ...)` and `new Date(year, ...)` implement a legacy two-digit-year
 * remap that ECMAScript still mandates: an integer year in the inclusive range 0-99
 * is rewritten to `1900 + year`. Silently. No error, no warning, and the resulting
 * Date is perfectly well-formed — it is simply 1900 years away from the one asked for.
 *
 * This repo charts ancient birth moments. Cleopatra is stored as `0069-01-01`, so
 * every chart engine that reached `Date.UTC(69, ...)` computed her sky for 1969 and
 * returned it with the same shape, the same provenance stamp and the same confidence
 * as a correct answer. That is the repo's standing failure mode in a new costume: a
 * number presented as measured whose provenance is not the measurement asked for.
 *
 * These tests assert on BEHAVIOUR — that a chart or date requested for year 69 lands
 * in year 69 — rather than on the source text of the calculators. A grep for
 * `Date.UTC` would pass the moment someone reformatted the call; these do not.
 *
 * WOULD THESE HAVE FAILED BEFORE THE FIX? Yes — measured, not assumed. The
 * assertions here that use only pre-existing APIs (`calculateAllPlanets`,
 * `calculateEnhancedAscendant`, `calculateProfessionalHouses`, `julianDayToDate`,
 * `getDatesForZodiacDegree`, `generateProfessionalHoroscope`, all unchanged in
 * signature) were run against the unmodified calculators: 6 of 7 failed, each with
 * `expected 1969 to be 69` or with the year-69 and year-1969 results comparing
 * deeply equal, because every engine built its birth moment with
 * `Date.UTC(birthInfo.year, ...)`.
 *
 * The 7th is the reason this file asserts the way it does. A whole-object
 * `calculateAllPlanets(69) !== calculateAllPlanets(1969)` PASSED against the buggy
 * engine — not because the sky was right, but because `withinElementSetRange` is the
 * one field derived from `birthInfo.year` rather than from the remapped date, so a
 * single boolean differed while every number was byte-identical. That assertion has
 * been narrowed to the sky itself. A green test is not evidence; this one was
 * checked against the failure it claims to catch.
 */

import { describe, expect, it } from 'vitest'
import {
  birthMomentUTC,
  calculateAllPlanets,
  calculateEnhancedAscendant,
  calculateProfessionalHouses,
  dateToJulianDay,
  julianDayToDate,
  utcDateFromParts,
  type EnhancedBirthInfo,
} from '../../lib/enhanced-astronomical-calculator'
import { getDatesForZodiacDegree } from '../../lib/ephemeris/solar-ephemeris'
import { generateProfessionalHoroscope } from '../../lib/monica/horoscope-generator'

/**
 * 0-99 is the trap range; 100 is the first year the remap does NOT touch, and the
 * negative years are the BCE agents that were always fine and must stay fine.
 * -469 is Socrates, -750 is Homer, 69 is Cleopatra as stored, 1879 and 2026 are
 * ordinary modern years that must not regress.
 */
const REQUIRED_YEARS = [-750, -469, 0, 69, 99, 100, 1879, 2026]

/** Alexandria — Cleopatra's birthplace, so the ancient cases are the real ones. */
const ALEXANDRIA = { latitude: 31.2, longitude: 29.9 }

const birthAt = (year: number): EnhancedBirthInfo => ({
  year,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  ...ALEXANDRIA,
})

describe('the platform behaviour these tests exist to defend against', () => {
  it('Date.UTC silently remaps years 0-99 into the 1900s', () => {
    // Not a bug in the engine — specified ECMAScript behaviour. Documented here so
    // that if a future runtime ever changed it, this file says why the helper exists.
    expect(new Date(Date.UTC(69, 0, 1)).getUTCFullYear()).toBe(1969)
    expect(new Date(Date.UTC(0, 0, 1)).getUTCFullYear()).toBe(1900)
    expect(new Date(Date.UTC(99, 0, 1)).getUTCFullYear()).toBe(1999)
  })

  it('leaves years >= 100 and negative years alone', () => {
    expect(new Date(Date.UTC(100, 0, 1)).getUTCFullYear()).toBe(100)
    expect(new Date(Date.UTC(-469, 0, 1)).getUTCFullYear()).toBe(-469)
  })
})

describe('utcDateFromParts', () => {
  it.each(REQUIRED_YEARS)('carries year %i through without remapping it', year => {
    expect(utcDateFromParts(year, 1, 1, 12, 0, 0).getUTCFullYear()).toBe(year)
  })

  it('preserves the rest of the calendar parts for an ancient year', () => {
    const d = utcDateFromParts(69, 6, 20, 14, 37, 9, 250)
    expect(d.getUTCFullYear()).toBe(69)
    expect(d.getUTCMonth()).toBe(5) // month is 1-based on the way in, 0-based on Date
    expect(d.getUTCDate()).toBe(20)
    expect(d.getUTCHours()).toBe(14)
    expect(d.getUTCMinutes()).toBe(37)
    expect(d.getUTCSeconds()).toBe(9)
    expect(d.getUTCMilliseconds()).toBe(250)
  })

  it('defaults the time of day to midnight UTC rather than carrying epoch state', () => {
    const d = utcDateFromParts(69, 3, 20)
    expect(d.toISOString()).toBe('0069-03-20T00:00:00.000Z')
  })
})

describe('birthMomentUTC', () => {
  it("resolves Cleopatra's stored birth year to 0069, not 1969", () => {
    expect(birthMomentUTC(birthAt(69)).toISOString()).toBe('0069-01-01T12:00:00.000Z')
  })

  it.each(REQUIRED_YEARS)('resolves a birth moment in year %i to that year', year => {
    expect(birthMomentUTC(birthAt(year)).getUTCFullYear()).toBe(year)
  })
})

describe('calculateAllPlanets', () => {
  it.each(REQUIRED_YEARS)(
    'computes the chart for year %i at that year, per its own Julian Day',
    year => {
      const chart = calculateAllPlanets(birthAt(year))
      // julianDay is the number every body in the chart was actually derived from,
      // so decoding it back is the engine reporting which instant it really used.
      expect(julianDayToDate(chart.julianDay).getUTCFullYear()).toBe(year)
      expect(chart.julianDay).toBe(dateToJulianDay(utcDateFromParts(year, 1, 1, 12, 0, 0)))
    }
  )

  it('does not return the 1969 sky when asked for the year 69 sky', () => {
    const ancient = calculateAllPlanets(birthAt(69))
    const modern = calculateAllPlanets(birthAt(1969))

    // Assert on the SKY, not on the whole result object. Verified against the
    // unmodified engine: a whole-object `not.toEqual` PASSED before the fix, and
    // passed for the wrong reason — every number (planets, ascendant, julianDay)
    // was byte-identical between the two, and only the boolean
    // `withinElementSetRange` differed, because that flag alone is derived from
    // `birthInfo.year` directly rather than from the remapped date. A green
    // whole-object assertion would therefore have certified the bug as fixed.
    expect(ancient.planets).not.toEqual(modern.planets)
    expect(ancient.ascendant).not.toEqual(modern.ascendant)
    expect(ancient.julianDay).not.toBe(modern.julianDay)
  })

  it('reports a fit-window flag that agrees with the instant it actually computed', () => {
    // The flag is derived from birthInfo.year; the numbers are derived from the
    // birth Date. Before the fix those two disagreed silently for ancient years:
    // the flag said "year 69, outside the 1800-2050 fit window" while the sky was
    // computed for 1969, which is inside it.
    const ancient = calculateAllPlanets(birthAt(69))
    expect(ancient.withinElementSetRange).toBe(false)
    expect(julianDayToDate(ancient.julianDay).getUTCFullYear()).toBe(69)
  })

  it('places the year-69 Julian Day 1900 years before the year-1969 one', () => {
    const ancient = calculateAllPlanets(birthAt(69)).julianDay
    const modern = calculateAllPlanets(birthAt(1969)).julianDay
    const daysApart = modern - ancient
    // 1900 Julian years of 365.25 days = 693975; Gregorian leap rules trim a few.
    expect(daysApart).toBeGreaterThan(693_000)
    expect(daysApart).toBeLessThan(695_000)
  })
})

describe('calculateEnhancedAscendant', () => {
  it('does not return the 1969 ascendant when asked for the year 69 ascendant', () => {
    expect(calculateEnhancedAscendant(birthAt(69))).not.toEqual(
      calculateEnhancedAscendant(birthAt(1969))
    )
  })
})

describe('calculateProfessionalHouses', () => {
  it('does not return the 1969 houses when asked for the year 69 houses', () => {
    expect(calculateProfessionalHouses(birthAt(69), 'placidus')).not.toEqual(
      calculateProfessionalHouses(birthAt(1969), 'placidus')
    )
  })
})

describe('julianDayToDate', () => {
  it.each(REQUIRED_YEARS)('decodes a year-%i Julian Day back to year %i', year => {
    const original = utcDateFromParts(year, 6, 15, 12, 0, 0)
    const roundTripped = julianDayToDate(dateToJulianDay(original))
    expect(roundTripped.getUTCFullYear()).toBe(year)
    expect(roundTripped.getUTCMonth()).toBe(5)
  })

  it('is the true inverse of dateToJulianDay below 100 CE, not an inverse offset by 1900', () => {
    // JD 1746263 is 0069-01-01T12:00Z. Date.UTC would have decoded it to 1969.
    const jd = dateToJulianDay(utcDateFromParts(69, 1, 1, 12, 0, 0))
    expect(julianDayToDate(jd).getUTCFullYear()).toBe(69)
    expect(julianDayToDate(jd).getUTCFullYear()).not.toBe(1969)
  })

  /**
   * KNOWN SEPARATE DEFECT, pinned rather than fixed — NOT the Date.UTC trap.
   *
   * `dateToJulianDay` encodes with proleptic Gregorian rules unconditionally
   * (lib/enhanced-astronomical-calculator.ts, no 1582 branch), while
   * `julianDayToDate` decodes with the JULIAN calendar below JD 2299161
   * (= 1582-10-15, the branch at `if (z >= 2299161)`). The two are therefore not
   * inverses for any date before the Gregorian switch: the day-of-month drifts by
   * the accumulated calendar divergence, ~3 days per 400 years.
   *
   * This is pinned, not corrected, because correcting it would silently move the
   * calendar date of every pre-1582 chart in the repo — a decision for the owner,
   * not a side effect of a Date.UTC fix. The YEAR is unaffected away from January
   * and December boundaries, which is why the assertions above are year-scoped.
   */
  it.each([
    [-750, 8],
    [-469, 5],
    [0, 2],
    [69, 2],
    [99, 2],
    [100, 1],
    [1879, 0],
    [2026, 0],
  ])('drifts the day-of-month by %i -> %i days (Julian/Gregorian mismatch)', (year, drift) => {
    const roundTripped = julianDayToDate(dateToJulianDay(utcDateFromParts(year, 6, 15, 12, 0, 0)))
    expect(roundTripped.getUTCDate() - 15).toBe(drift)
  })
})

describe('getDatesForZodiacDegree (solar ephemeris)', () => {
  it.each(REQUIRED_YEARS)('returns dates inside year %i when asked for year %i', year => {
    const range = getDatesForZodiacDegree(year, 0) // 0° Aries — the equinox
    expect(range.start).toBeInstanceOf(Date)
    expect(range.start.getUTCFullYear()).toBe(year)
    // The equinox is in March; a remapped year would still be March, so the year is
    // the load-bearing assertion and the month is a sanity check on the search.
    expect(range.start.getUTCMonth()).toBe(2)
  })

  it('does not answer a year-69 request with the year-1969 equinox', () => {
    expect(getDatesForZodiacDegree(69, 0).start.getUTCFullYear()).not.toBe(1969)
  })
})

describe('generateProfessionalHoroscope', () => {
  /**
   * The end-to-end path that the historical-agent chart filler
   * (`scripts/fill-historical-natal-charts.ts`) runs. This is where the bug was
   * observable as a wrong answer about a real person rather than as a wrong Date.
   */
  const cleopatra = { year: 69, month: 1, day: 1, hour: 12, minute: 0, ...ALEXANDRIA }
  const nineteenSixtyNine = { ...cleopatra, year: 1969 }

  it('produces a different sky for year 69 than for year 1969', () => {
    const ancient = generateProfessionalHoroscope(cleopatra as never)
    const modern = generateProfessionalHoroscope(nineteenSixtyNine as never)
    expect(ancient).not.toEqual(modern)
  })

  it('puts the Moon in a different sign for year 69 than the remap did', () => {
    // The Moon moves ~13°/day, so a 1900-year error relocates it entirely. This is
    // the single most legible symptom: the remapped chart gave Cleopatra the Moon
    // sign belonging to 1 January 1969.
    const moonSign = (info: unknown) => {
      const h = generateProfessionalHoroscope(info as never) as {
        tropical: { CelestialBodies: { all: Array<{ label: string; Sign: { label: string } }> } }
      }
      return h.tropical.CelestialBodies.all.find(b => b.label === 'Moon')?.Sign.label
    }
    const ancientMoon = moonSign(cleopatra)
    const modernMoon = moonSign(nineteenSixtyNine)
    expect(ancientMoon).toBeDefined()
    expect(ancientMoon).not.toBe(modernMoon)
  })
})
