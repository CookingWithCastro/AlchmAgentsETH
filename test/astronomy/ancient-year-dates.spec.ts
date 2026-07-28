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
 *
 * SECOND DEFECT, NOW ALSO FIXED: THE CALENDAR CONVENTION.
 * ------------------------------------------------------
 * This file previously PINNED a second, separate defect as known-and-unfixed:
 * `dateToJulianDay` and `julianDayToDate` were not inverses before 1582, because the
 * encoder applied proleptic Gregorian rules unconditionally while the decoder
 * switched to the Julian calendar below JD 2299161. That has been corrected — the
 * repo now commits to proleptic Gregorian at every epoch in both directions — and
 * the block that asserted the drift has been replaced by the round-trip-exactness
 * assertions in the `julianDayToDate` describe below. The decision, its evidence and
 * how to reverse it are documented at the CALENDAR CONVENTION block above
 * `dateToJulianDay` in lib/enhanced-astronomical-calculator.ts.
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

/**
 * The round-trip years. `REQUIRED_YEARS` plus 1582, the year of the Gregorian
 * reform, which is where the calendar convention is decided and therefore the year
 * most likely to break if either conversion regrows a reform branch on its own.
 */
const ROUND_TRIP_YEARS = [-750, -469, 0, 69, 99, 100, 1582, 1879, 2026]

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
   * THE CALENDAR CONVENTION, PINNED.
   * ================================
   *
   * These assertions replace a block that PINNED THE OPPOSITE BEHAVIOUR as a known
   * defect. `dateToJulianDay` encoded with proleptic Gregorian rules unconditionally
   * while `julianDayToDate` decoded with the JULIAN calendar below JD 2299161
   * (`if (z >= 2299161)`), so the two were not inverses before the Gregorian reform
   * and the day-of-month drifted by the accumulated divergence, ~3 days per 400
   * years: +8 days at year -750, +5 at -469, +2 at 0/69/99, +1 at 100, -10 at 1582.
   * The old block asserted exactly those numbers.
   *
   * The repo now commits to PROLEPTIC GREGORIAN AT EVERY EPOCH, in both directions,
   * with no reform branch in either function. The reasoning and the evidence are in
   * the CALENDAR CONVENTION block above `dateToJulianDay` in
   * lib/enhanced-astronomical-calculator.ts; the short version is that both
   * functions speak in `Date`, and a JavaScript `Date` is itself a proleptic
   * Gregorian calendar, so a Julian-calendar day/month/year placed inside one is
   * mislabelled rather than converted.
   *
   * WOULD THESE HAVE FAILED BEFORE THE FIX? Yes — measured, not assumed. Run against
   * the unmodified `julianDayToDate` (git stash of the calculator only, this spec
   * left as it is now), the six assertions below failed: every pre-1582 round trip
   * came back off by the drift above, and the millisecond case came back a
   * millisecond short. The two genuinely modern round trips (1879 and 2026) passed,
   * as they must — the defect never touched post-reform dates, which is why
   * year-scoped assertions had missed it. 1582 is in this list as the reform year
   * itself, not as a modern control; it is the boundary the old decoder branched on.
   */
  it.each(ROUND_TRIP_YEARS)(
    'round-trips year %i through a Julian Day with day, month and year all intact',
    year => {
      // June 15 12:00 is the case the old pinned block used, so this is the same
      // measurement inverted: it asserted the drift, this asserts its absence.
      const original = utcDateFromParts(year, 6, 15, 12, 0, 0)
      const roundTripped = julianDayToDate(dateToJulianDay(original))
      expect(roundTripped.getUTCFullYear()).toBe(year)
      expect(roundTripped.getUTCMonth()).toBe(5)
      expect(roundTripped.getUTCDate()).toBe(15)
      // The whole instant, not just the three fields above.
      expect(roundTripped.toISOString()).toBe(original.toISOString())
    }
  )

  it.each(ROUND_TRIP_YEARS)(
    'round-trips year %i exactly at every hour boundary of the calendar year',
    year => {
      // A day-of-month assertion on a single date can pass on a coincidence. Sweep
      // month ends, leap-day candidates and both year boundaries instead.
      for (const [month, day] of [
        [1, 1],
        [2, 28],
        [3, 1],
        [6, 15],
        [10, 4],
        [10, 15],
        [12, 31],
      ] as const) {
        for (const [h, mi, s, ms] of [
          [0, 0, 0, 0],
          [12, 0, 0, 0],
          [23, 59, 59, 999],
          [3, 30, 0, 0],
        ] as const) {
          const original = utcDateFromParts(year, month, day, h, mi, s, ms)
          const roundTripped = julianDayToDate(dateToJulianDay(original))
          expect(roundTripped.toISOString()).toBe(original.toISOString())
        }
      }
    }
  )

  /**
   * Rounding the day fraction in one step (rather than truncating four times) is
   * what buys the millisecond exactness above, but it creates an input the
   * round-trip sweeps never produce: a Julian Day whose fraction sits within half a
   * millisecond of the next midnight rounds up to a FULL day, making the decoded
   * hour 24.
   *
   * HONEST SCOPE OF THIS TEST: it does not guard a branch, because there is no
   * branch — `utcDateFromParts` sets the time with `setUTCHours`, which normalises
   * hour 24 to midnight of the next day on its own. That was measured, and an
   * explicit carry was removed from `julianDayToDate` as dead code once it was.
   * What this test pins is the RESULT that normalisation is relied upon to give,
   * at the boundaries where a hand-rolled carry would have got it wrong. It would
   * fail if the decoder were ever changed to clamp, truncate, or reject hour 24.
   */
  it('resolves a day-rounding overflow to the next date rather than an hour-24 date', () => {
    const endOfDay = (year: number, month: number, day: number) =>
      Math.floor(dateToJulianDay(utcDateFromParts(year, month, day, 12, 0, 0)) + 0.5) + 0.5 - 5e-9

    // Each case straddles a boundary the carry must not corrupt: a month end, a
    // leap day, a year end, and a year end in a negative (BCE) year.
    expect(julianDayToDate(endOfDay(2024, 2, 29)).toISOString()).toBe('2024-03-01T00:00:00.000Z')
    expect(julianDayToDate(endOfDay(2026, 12, 31)).toISOString()).toBe('2027-01-01T00:00:00.000Z')
    expect(julianDayToDate(endOfDay(1582, 12, 31)).toISOString()).toBe('1583-01-01T00:00:00.000Z')
    expect(julianDayToDate(endOfDay(-750, 12, 31)).toISOString()).toBe(
      '-000749-01-01T00:00:00.000Z'
    )
  })

  it('preserves the time of day to the millisecond, not to the second', () => {
    // The previous decoder split the day fraction into hours, then minutes, then
    // seconds, then milliseconds, truncating at each step; the accumulated float
    // error lost a millisecond on ordinary inputs. Measured before the fix:
    // 1879-03-14T11:30:00.000Z decoded back as 11:29:59.999Z. That is a MODERN
    // year, so this defect was never confined to ancient dates.
    const einstein = utcDateFromParts(1879, 3, 14, 11, 30, 0, 0)
    expect(julianDayToDate(dateToJulianDay(einstein)).toISOString()).toBe(
      '1879-03-14T11:30:00.000Z'
    )

    const ancient = utcDateFromParts(69, 6, 20, 14, 37, 9, 250)
    expect(julianDayToDate(dateToJulianDay(ancient)).toISOString()).toBe('0069-06-20T14:37:09.250Z')
  })

  /**
   * The convention itself, named so that reverting it is a deliberate act that
   * fails a test rather than a silent change of meaning. JD 2299160 is the day
   * before the Gregorian reform took effect. Under the historical Julian-then-
   * Gregorian convention it decodes to 1582-10-04; under this repo's proleptic
   * Gregorian convention it decodes to 1582-10-14. Both are the same instant —
   * they are two calendars' names for it — and this repo uses the second.
   */
  it('decodes across the 1582 reform with proleptic Gregorian rules, not Julian ones', () => {
    expect(julianDayToDate(2299161).toISOString()).toBe('1582-10-15T12:00:00.000Z')
    expect(julianDayToDate(2299160).toISOString()).toBe('1582-10-14T12:00:00.000Z')
    // The Julian reading of the same instant, explicitly NOT what this repo returns.
    expect(julianDayToDate(2299160).getUTCDate()).not.toBe(4)
  })

  it('agrees with calendar-free epoch arithmetic, which has no reform branch to get wrong', () => {
    // An independent oracle: epoch milliseconds are proleptic Gregorian by
    // specification and involve no calendar formula at all, so this cross-checks
    // dateToJulianDay's convention without reusing its own arithmetic.
    const epochJulianDay = (d: Date) => d.getTime() / 86400000 + 2440587.5
    for (const year of ROUND_TRIP_YEARS) {
      const d = utcDateFromParts(year, 6, 15, 12, 0, 0)
      expect(dateToJulianDay(d)).toBe(epochJulianDay(d))
    }
  })

  it('is a true inverse for a Julian Day the engine produced itself', () => {
    // Closes the loop with the chart engine: the instant a chart reports is the
    // instant it was asked for, for the oldest pre-1582 agent in the repo.
    const socrates = {
      year: -469,
      month: 6,
      day: 20,
      hour: 12,
      minute: 0,
      second: 0,
      ...ALEXANDRIA,
    }
    const chart = calculateAllPlanets(socrates as EnhancedBirthInfo)
    expect(julianDayToDate(chart.julianDay).toISOString()).toBe('-000469-06-20T12:00:00.000Z')
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
