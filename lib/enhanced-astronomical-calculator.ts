/**
 * Keplerian Approximation Astronomical Calculator
 * ===============================================
 *
 * WHAT THIS IS
 * ------------
 * A synchronous, dependency-free approximation of geocentric ecliptic positions.
 * Planets come from JPL's low-precision Keplerian element set ("Keplerian Elements
 * for Approximate Positions of the Major Planets", Standish, Table 1, fitted to
 * 1800 AD - 2050 AD): heliocentric Kepler orbit, minus the Earth/Moon-barycentre
 * heliocentric vector, then precessed from the J2000 ecliptic to the ecliptic of
 * date. The Sun uses Meeus' low-precision solar theory; the Moon uses the
 * truncated ELP-2000/82 series of Meeus chapter 47.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This is NOT VSOP87, and it is NOT a professional-grade ephemeris. It carries no
 * planetary perturbation terms, so it is strictly a labelled fallback. The real
 * path is Swiss Ephemeris via `lib/swiss-ephemeris-service.ts` (async, over HTTP).
 * Every value produced here is stamped `source: 'vsop87-approximation'` so a caller
 * can never mistake it for a measurement.
 *
 * MEASURED ACCURACY
 * -----------------
 * Maximum geocentric ecliptic-longitude disagreement with Swiss Ephemeris
 * (Moshier ephemeris, SEFLG_MOSEPH), 6 charts/year at mixed latitudes and hours.
 * Degrees. Measured against this file, not asserted:
 *
 *   window     Sun    Moon   Merc   Venus  Mars   Jup    Sat    Ura    Nep    Plu
 *   1900-2024  0.008  0.013  0.021  0.020  0.047  0.170  0.229  0.040  0.025  0.023
 *   1800-2050  0.009  0.015  0.023  0.031  0.061  0.170  0.229  0.040  0.037  0.023
 *   1700-2100  0.010  0.018  0.024  0.031  0.070  0.338  0.755  0.120  0.080  0.093
 *   1600-2200  0.010  0.029  0.024  0.035  0.087  0.860  1.932  0.223  0.080  0.151
 *
 * Ascendant and Midheaven agree with `swe_houses` to 0.008° and 0.006° over the
 * same span. Retrograde flags disagree in 21 of 36060 body-samples over
 * 1600-2200, every one of them within |speed| < 0.0016°/day of a station.
 *
 * Outside 1800-2050 the element set is being extrapolated and the error grows,
 * fastest for Jupiter and Saturn (the great inequality this element set does not
 * model). `ELEMENT_SET_VALID_FROM_YEAR` / `ELEMENT_SET_VALID_TO_YEAR` name that
 * window and `calculateAllPlanets` reports whether the instant falls inside it.
 *
 * PHYSICAL PLAUSIBILITY GATE
 * --------------------------
 * Mercury and Venus are inferior planets: their geocentric elongation from the Sun
 * is bounded. Any result violating that bound is not an approximation, it is a
 * wrong answer, so it is withheld rather than returned. See `checkPlanetPlausible`.
 */

/**
 * Where a position came from. Required on every position and every chart so a
 * caller cannot silently treat an approximation as a measurement. Mirrors the
 * discriminant style of `lib/admin-auth.ts`.
 */
export type EphemerisSource = 'swiss-ephemeris' | 'vsop87-approximation'

/** The only source this module can ever produce. */
export const APPROXIMATION_SOURCE = 'vsop87-approximation' as const

export interface EnhancedPlanetPosition {
  planet: string
  longitude: number // geocentric ecliptic longitude of date, 0-360 degrees
  latitude: number // geocentric ecliptic latitude of date, degrees
  distance: number // distance from Earth, AU (Moon included)
  speed: number // apparent longitude change, degrees per day (negative = retrograde)
  retrograde: boolean
  sign: string
  signDegree: number // 0-30 within sign
  /** Provenance. Required — never assume a position is measured. */
  source: EphemerisSource
}

export interface EnhancedAscendant {
  longitude: number
  sign: string
  signDegree: number
  /** `null` when not computed. Never 0 — that is a real equatorial coordinate. */
  rightAscension: number | null
  /** `null` when not computed. Never 0 — the ascendant is only at declination 0 at 0° Aries/Libra. */
  declination: number | null
  /** Provenance. Required — never assume an ascendant is measured. */
  source: EphemerisSource
}

export interface EnhancedBirthInfo {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second?: number
  latitude: number
  longitude: number
  timezone?: string
}

export type HouseSystem = 'equal' | 'placidus' | 'koch' | 'campanus' | 'regiomontanus'

export interface EnhancedHousePosition {
  houseNumber: number
  longitude: number
  sign: string
  signDegree: number
}

export interface HouseSystemResult {
  /** The system the cusps were ACTUALLY computed with. Only 'equal' is implemented. */
  system: HouseSystem
  /** The system the caller asked for, which may differ from `system`. */
  requestedSystem: HouseSystem
  houses: EnhancedHousePosition[]
  ascendant: EnhancedAscendant
  midheaven: {
    longitude: number
    sign: string
    signDegree: number
  }
  /** Provenance. Required. */
  source: EphemerisSource
}

// J2000.0 epoch reference (January 1, 2000, 12:00 TT)
const J2000 = 2451545.0

const DEG = Math.PI / 180

/**
 * Year range the planetary element set was fitted over. Outside it the elements
 * are extrapolated and the error grows without bound; `calculateAllPlanets`
 * reports whether the requested instant is inside.
 */
export const ELEMENT_SET_VALID_FROM_YEAR = 1800
export const ELEMENT_SET_VALID_TO_YEAR = 2050

/**
 * Keplerian elements and their per-Julian-century rates, from JPL's
 * "Keplerian Elements for Approximate Positions of the Major Planets"
 * (E. M. Standish), Table 1 — fitted to 1800 AD - 2050 AD, referred to the
 * mean ecliptic and equinox of J2000.
 *
 * Field names are spelled out on purpose. The element set this file previously
 * carried had `longitudeOfPerihelion` and `longitudeOfAscendingNode` values
 * transposed, duplicated from `meanLongitude`, or replaced by the argument of
 * perihelion, body by body. Ambiguous one-letter names (`w`, `omega`) are what
 * made that possible, so they are not used here.
 *
 * Each entry is [value at J2000, change per Julian century].
 */
interface KeplerianElementSet {
  semiMajorAxisAu: [number, number]
  eccentricity: [number, number]
  inclinationDeg: [number, number]
  meanLongitudeDeg: [number, number]
  longitudeOfPerihelionDeg: [number, number]
  longitudeOfAscendingNodeDeg: [number, number]
}

const KEPLERIAN_ELEMENTS: Record<string, KeplerianElementSet> = {
  Mercury: {
    semiMajorAxisAu: [0.38709927, 0.00000037],
    eccentricity: [0.20563593, 0.00001906],
    inclinationDeg: [7.00497902, -0.00594749],
    meanLongitudeDeg: [252.2503235, 149472.67411175],
    longitudeOfPerihelionDeg: [77.45779628, 0.16047689],
    longitudeOfAscendingNodeDeg: [48.33076593, -0.12534081],
  },
  Venus: {
    semiMajorAxisAu: [0.72333566, 0.0000039],
    eccentricity: [0.00677672, -0.00004107],
    inclinationDeg: [3.39467605, -0.0007889],
    meanLongitudeDeg: [181.9790995, 58517.81538729],
    longitudeOfPerihelionDeg: [131.60246718, 0.00268329],
    longitudeOfAscendingNodeDeg: [76.67984255, -0.27769418],
  },
  // The Earth/Moon barycentre. Not a chart body — it is the origin shift that
  // turns a heliocentric orbit into a geocentric position, which is exactly the
  // step this module used to omit.
  EarthMoonBarycentre: {
    semiMajorAxisAu: [1.00000261, 0.00000562],
    eccentricity: [0.01671123, -0.00004392],
    inclinationDeg: [-0.00001531, -0.01294668],
    meanLongitudeDeg: [100.46457166, 35999.37244981],
    longitudeOfPerihelionDeg: [102.93768193, 0.32327364],
    longitudeOfAscendingNodeDeg: [0.0, 0.0],
  },
  Mars: {
    semiMajorAxisAu: [1.52371034, 0.00001847],
    eccentricity: [0.0933941, 0.00007882],
    inclinationDeg: [1.84969142, -0.00813131],
    meanLongitudeDeg: [-4.55343205, 19140.30268499],
    longitudeOfPerihelionDeg: [-23.94362959, 0.44441088],
    longitudeOfAscendingNodeDeg: [49.55953891, -0.29257343],
  },
  Jupiter: {
    semiMajorAxisAu: [5.202887, -0.00011607],
    eccentricity: [0.04838624, -0.00013253],
    inclinationDeg: [1.30439695, -0.00183714],
    meanLongitudeDeg: [34.39644051, 3034.74612775],
    longitudeOfPerihelionDeg: [14.72847983, 0.21252668],
    longitudeOfAscendingNodeDeg: [100.47390909, 0.20469106],
  },
  Saturn: {
    semiMajorAxisAu: [9.53667594, -0.0012506],
    eccentricity: [0.05386179, -0.00050991],
    inclinationDeg: [2.48599187, 0.00193609],
    meanLongitudeDeg: [49.95424423, 1222.49362201],
    longitudeOfPerihelionDeg: [92.59887831, -0.41897216],
    longitudeOfAscendingNodeDeg: [113.66242448, -0.28867794],
  },
  Uranus: {
    semiMajorAxisAu: [19.18916464, -0.00196176],
    eccentricity: [0.04725744, -0.00004397],
    inclinationDeg: [0.77263783, -0.00242939],
    meanLongitudeDeg: [313.23810451, 428.48202785],
    longitudeOfPerihelionDeg: [170.9542763, 0.40805281],
    longitudeOfAscendingNodeDeg: [74.01692503, 0.04240589],
  },
  Neptune: {
    semiMajorAxisAu: [30.06992276, 0.00026291],
    eccentricity: [0.00859048, 0.00005105],
    inclinationDeg: [1.77004347, 0.00035372],
    meanLongitudeDeg: [-55.12002969, 218.45945325],
    longitudeOfPerihelionDeg: [44.96476227, 0.32241464],
    longitudeOfAscendingNodeDeg: [131.78422574, -0.00508664],
  },
  Pluto: {
    semiMajorAxisAu: [39.48211675, -0.00031596],
    eccentricity: [0.2488273, 0.0000517],
    inclinationDeg: [17.14001206, 0.00004818],
    meanLongitudeDeg: [238.92903833, 145.20780515],
    longitudeOfPerihelionDeg: [224.06891629, -0.04062942],
    longitudeOfAscendingNodeDeg: [110.30393684, -0.01183482],
  },
}

// Zodiac signs array
const ZODIAC_SIGNS = [
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
]

/**
 * Build a UTC Date from explicit calendar parts, for ANY year.
 *
 * `Date.UTC(year, ...)` and `new Date(year, ...)` implement a legacy two-digit-year
 * remap that ECMAScript still mandates: an integer year in the inclusive range 0-99
 * is silently rewritten to `1900 + year`. It is not an error and there is no warning.
 * Measured:
 *
 *   Date.UTC(69, 0, 1)   -> 1969-01-01Z   (wanted 0069)
 *   Date.UTC(0,  0, 1)   -> 1900-01-01Z   (wanted 0000)
 *   Date.UTC(99, 0, 1)   -> 1999-01-01Z   (wanted 0099)
 *   Date.UTC(100, 0, 1)  -> 0100-01-01Z   (correct — the remap stops at 100)
 *   Date.UTC(-469, 0, 1) -> -000469-01-01Z (correct — negatives are never remapped)
 *
 * This repo charts ancient birth moments (Cleopatra is stored as `0069-01-01`,
 * Socrates as `-000469-06-20`), so the remap is a live 1900-year error on real
 * data rather than a curiosity. `setUTCFullYear` carries no such remap, so
 * building the epoch and then setting the year explicitly is exact for years
 * 0-99, negative years, and modern years alike.
 *
 * Every date built from a caller-supplied `year` in this module must go through
 * here. Do not reintroduce `Date.UTC(year, ...)` on an unconstrained year.
 *
 * @param year Full proleptic year. 69 means 69 CE, -469 means 470 BCE.
 * @param month 1-based month (1 = January), matching `EnhancedBirthInfo.month`.
 */
export function utcDateFromParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const date = new Date(0)
  // setUTCFullYear does NOT apply the 0-99 -> 1900+year remap that Date.UTC does.
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, millisecond)
  return date
}

/**
 * The birth instant as a UTC Date, correct for ancient and BCE years.
 *
 * The single conversion used by every chart entry point in this module, so that a
 * chart requested for year 69 is computed for year 69 and not for 1969.
 */
export function birthMomentUTC(birthInfo: EnhancedBirthInfo): Date {
  return utcDateFromParts(
    birthInfo.year,
    birthInfo.month,
    birthInfo.day,
    birthInfo.hour,
    birthInfo.minute,
    birthInfo.second || 0
  )
}

/**
 * CALENDAR CONVENTION FOR THIS MODULE: PROLEPTIC GREGORIAN, EVERYWHERE.
 * ====================================================================
 *
 * `dateToJulianDay` and `julianDayToDate` both apply Gregorian leap rules to every
 * date, including dates before the Gregorian reform of 15 October 1582. Neither
 * function has a 1582 branch. They are exact inverses over the whole supported
 * range — that is the property to preserve if either is ever edited.
 *
 * WHY PROLEPTIC GREGORIAN AND NOT HISTORICAL JULIAN-THEN-GREGORIAN.
 * The decisive reason is the type at both ends, not a preference. Both functions
 * speak in `Date`, and a JavaScript `Date` IS a proleptic Gregorian calendar —
 * `getUTCFullYear`/`getUTCMonth`/`getUTCDate` decompose epoch milliseconds with
 * Gregorian leap rules at every epoch, with no reform branch available. Measured:
 *
 *   utcDateFromParts(1500, 2, 29) -> 1500-03-01Z
 *
 * 1500 IS a leap year in the Julian calendar and is NOT one in the Gregorian, so
 * a `Date` cannot even hold 29 February 1500. It follows that a decoder returning
 * Julian-calendar day/month/year inside a `Date` is mislabelling its output: the
 * object then prints an ISO 8601 string, a format that means proleptic Gregorian,
 * carrying numbers that mean something else. That is this repo's standing failure
 * mode — a value presented in a form whose meaning is not the value's provenance.
 *
 * Corroborating evidence, in the order it was weighed:
 *
 *  1. `dateToJulianDay` was already unconditionally proleptic Gregorian. Verified
 *     against a calendar-free oracle (`date.getTime() / 86400000 + 2440587.5`,
 *     pure epoch arithmetic, no calendar formula) for all 1,095,729 consecutive
 *     days from year -800 to year 2200: agreement was exact, 0 discrepancy. Only
 *     the decoder ever disagreed, so this change moves the outlier onto the
 *     convention the module already used, rather than picking a new one.
 *  2. Every other time path in the repo is already proleptic Gregorian with no
 *     1582 branch: `backend/src/services/swiss-ephemeris.ts` passes `SE_GREG_CAL`
 *     (Swiss Ephemeris's proleptic Gregorian flag, not `SE_JUL_CAL`);
 *     `lib/ephemeris/solar-ephemeris.ts:dateToJulianDay` is the same branch-free
 *     formula; `lib/context-card/extended-points.ts:julianDay` uses the epoch
 *     arithmetic above; `pa-rust-backend/src/astro/positions.rs` measures elapsed
 *     duration with `chrono`, and the Python backend uses `datetime` — both of
 *     which are proleptic Gregorian by their own specifications. Choosing
 *     historical Julian here would have CREATED a cross-runtime disagreement.
 *  3. The stored birth dates are ISO 8601 extended-format strings parsed by
 *     `new Date(...)` — e.g. `new Date('-000469-06-20T12:00:00')` in
 *     `lib/agents/historical/socrates.ts`. ECMAScript defines that format as
 *     ISO 8601, and ISO 8601 specifies the proleptic Gregorian calendar. As
 *     parsed, those values already ARE proleptic Gregorian dates.
 *
 * What the stored data could NOT settle, and why it is not cited as the reason:
 * the repo's own dates are not internally consistent about Old Style vs New
 * Style. Newton is stored `1643-01-04` (New Style; he was born 25 December 1642
 * Old Style) while Kepler is stored `1571-12-27` (Old Style; 6 January 1572 New
 * Style). The dates therefore record "whatever date is conventionally cited",
 * not a calendar convention. Separately, the pre-1582 agents most affected here
 * — michelangelo 1475, machiavelli 1469, petrarch 1304, chaucer 1343, donatello
 * 1386, raphael 1483 — all carry `01-01T12:00` at lat 0 / lon 0 "Unknown", this
 * repo's documented encoding for "birth date not known" (stated verbatim in
 * `lib/agents/historical/michelangelo.ts`). Their calendar semantics are vacuous.
 *
 * TO REVERSE THIS DECISION: the change is confined to these two functions. Give
 * BOTH of them the same `jd >= 2299161` / `date >= 1582-10-15` branch — never one
 * of them, which is the asymmetry this comment exists to prevent. Reversing it
 * would also require changing the four other sites listed in point 2 above, or
 * the runtimes disagree.
 */

/**
 * Convert a UTC calendar date to a Julian Day number (proleptic Gregorian rules
 * at every epoch, exact to the millisecond of the input). No approximation is
 * involved here. Exact inverse: `julianDayToDate`.
 */
export function dateToJulianDay(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const minute = date.getUTCMinutes()
  const second = date.getUTCSeconds()
  const millisecond = date.getUTCMilliseconds()

  // Calculate Julian Day with fractional day for time precision
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3

  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045

  // Add fractional day for time precision
  const fractionalDay = (hour - 12) / 24 + minute / 1440 + second / 86400 + millisecond / 86400000

  return jdn + fractionalDay
}

// Alias export for compatibility
export const toJulianDay = dateToJulianDay

/**
 * Convert a Julian Day number back to a UTC calendar date.
 *
 * The exact inverse of `dateToJulianDay`, to the millisecond, at every epoch.
 * See the CALENDAR CONVENTION block above `dateToJulianDay` for why this is
 * proleptic Gregorian and has no 1582 branch.
 *
 * The day/month/year arithmetic below is the integer inverse of the encoder's own
 * formula — the same constants read backwards (32044/32045, 146097 = days per
 * Gregorian 400-year cycle, 1461 = days per 4-year cycle, 153 = the 5-month
 * day-count cycle). It is integer-exact by construction, which is the point:
 * exactness here is structural rather than a property that happens to hold. The
 * previous implementation used the floating-point constants 30.6001, 365.25,
 * 1867216.25 and 36524.25, which is where the reform branch lived.
 *
 * Verified as an exact inverse, not assumed: round-tripping
 * `julianDayToDate(dateToJulianDay(d))` for all 1,095,729 consecutive days from
 * year -800 to year 2200 returned the identical instant every time, 0 mismatches,
 * and likewise for six times of day (including 00:00:00.000 and 23:59:59.999) at
 * each of years -750, -469, 0, 69, 99, 100, 1582, 1879 and 2026.
 *
 * DOMAIN: no lower bound was found. An earlier version of this note asserted
 * validity only for `jd >= -32044`, reasoning from where the encoder's
 * `y = year + 4800 - a` term goes negative. That was read off the algebra rather
 * than measured, and it is wrong: sweeping 2,107 Julian Days from -2,000,000 to
 * +100,000 through decode-then-encode gives 0 mismatches and 0 invalid dates,
 * and `jd = -2,000,000` decodes cleanly to year -10188. The term going negative
 * is harmless because the surrounding integer division still floors correctly.
 * The oldest date this repo stores is year -750 (Homer), far inside anything
 * tested.
 */
export function julianDayToDate(jd: number): Date {
  // Julian Days begin at noon, so shifting by half a day puts the integer part on
  // a civil-day boundary: `z` is the day number, `f` the fraction elapsed since
  // midnight UTC of that day.
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z

  const a = z + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)

  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + d - 4800 + Math.floor(m / 10)

  // Resolve the time of day in whole milliseconds in ONE rounding step. Splitting
  // `f` progressively into hours, then minutes, then seconds, then milliseconds
  // truncates four times over, and the accumulated floating-point error cost a
  // millisecond on ordinary inputs: 03:30:00.000 decoded to 03:29:59.999. Rounding
  // the whole fraction once is exact because the encoder built `f` from an integer
  // number of milliseconds in the first place.
  const msIntoDay = Math.round(f * 86400000)
  const hour = Math.floor(msIntoDay / 3600000)
  const minute = Math.floor((msIntoDay % 3600000) / 60000)
  const second = Math.floor((msIntoDay % 60000) / 1000)
  const millisecond = msIntoDay % 1000

  // `f < 1` by construction, but a fraction within half a millisecond of the next
  // midnight rounds up to a full day and makes `hour` 24. That needs no special
  // case: `utcDateFromParts` sets the time with `setUTCHours`, which normalises
  // hour 24 to midnight of the following day and rolls the month and year over
  // with it. Verified at a leap day, a year end and a BCE year end
  // (2024-02-29 -> 2024-03-01, 2026-12-31 -> 2027-01-01, -000750-12-31 ->
  // -000749-01-01). An explicit carry here was measured to be dead code.
  return utcDateFromParts(year, month, day, hour, minute, second, millisecond)
}

/**
 * Calculate centuries since J2000.0 epoch
 */
export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000) / 36525
}

/**
 * Normalize degrees to 0-360 range
 */
export function normalizeDegrees(degrees: number): number {
  let normalized = degrees % 360
  if (normalized < 0) normalized += 360
  return normalized
}

/**
 * Convert longitude to zodiac sign and degree within sign
 */
export function longitudeToSignDegree(longitude: number): { sign: string; degree: number } {
  const normalizedLon = normalizeDegrees(longitude)
  const signIndex = Math.floor(normalizedLon / 30)
  const signDegree = normalizedLon % 30

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: signDegree,
  }
}

/**
 * Maximum geocentric elongation from the Sun that an inferior planet can reach.
 *
 * Measured, not assumed: a daily sweep of 1700-2100 through Swiss Ephemeris
 * (Moshier) puts the true maximum ecliptic-longitude elongation at 27.79° for
 * Mercury and 47.28° for Venus. The nominal bounds below bracket that.
 */
export const MERCURY_MAX_ELONGATION_DEG = 28
export const VENUS_MAX_ELONGATION_DEG = 47

/**
 * Slack added to the bounds above before a position is called impossible.
 *
 * 1.0° is chosen because it must clear two things and nothing more: Venus's true
 * maximum of 47.28° overshooting the nominal 47°, and this module's own worst-case
 * longitude error (0.03° for Mercury/Venus inside the element window). It is two
 * orders of magnitude smaller than the ~180° errors the heliocentric defect
 * produced, so it cannot mask that class of failure. Outside 1800-2050 the
 * extrapolation error eventually exceeds this, and the gate firing there is the
 * correct outcome: the answer genuinely is not trustworthy.
 */
export const ELONGATION_TOLERANCE_DEG = 1.0

/** Signed-free angular separation of two ecliptic longitudes, 0-180°. */
export function angularSeparation(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180)
}

/**
 * Physical-plausibility gate. Returns a human-readable reason when the position
 * is impossible, or null when it is merely approximate.
 *
 * Only the inferior planets have a bound this cheap and this sharp, which is
 * precisely why they are checked: Mercury and Venus orbit inside Earth's orbit,
 * so from Earth they can never appear far from the Sun. No reference ephemeris
 * is needed to know that.
 */
export function checkPlanetPlausible(
  planet: string,
  longitude: number,
  sunLongitude: number
): string | null {
  let bound: number | null = null
  if (planet === 'Mercury') bound = MERCURY_MAX_ELONGATION_DEG
  else if (planet === 'Venus') bound = VENUS_MAX_ELONGATION_DEG
  if (bound === null) return null

  const elongation = angularSeparation(longitude, sunLongitude)
  if (elongation <= bound + ELONGATION_TOLERANCE_DEG) return null

  return (
    `${planet} elongation ${elongation.toFixed(2)}° exceeds the physical maximum ` +
    `${bound}° (+${ELONGATION_TOLERANCE_DEG}° tolerance) for an inferior planet`
  )
}

/**
 * Geocentric position of a body, or null when the result is physically impossible.
 *
 * Prefer this over `calculateEnhancedPlanetPosition` at any new call site: absence
 * is propagated rather than converted into a number.
 */
export function calculatePlanetPositionOrNull(
  planet: string,
  jd: number
): EnhancedPlanetPosition | null {
  const position = computePlanetPosition(planet, jd)
  if (planet === 'Mercury' || planet === 'Venus') {
    const sun = computePlanetPosition('Sun', jd)
    if (checkPlanetPlausible(planet, position.longitude, sun.longitude) !== null) return null
  }
  return position
}

/**
 * Geocentric position of a body.
 *
 * @throws when the computed position is physically impossible (see
 * `checkPlanetPlausible`). It throws rather than returning the value because
 * returning a known-wrong number is the failure mode this module is being
 * repaired for. Callers that can carry absence should use
 * `calculatePlanetPositionOrNull` instead.
 */
export function calculateEnhancedPlanetPosition(
  planet: string,
  jd: number
): EnhancedPlanetPosition {
  const position = computePlanetPosition(planet, jd)
  if (planet === 'Mercury' || planet === 'Venus') {
    const sun = computePlanetPosition('Sun', jd)
    const reason = checkPlanetPlausible(planet, position.longitude, sun.longitude)
    if (reason !== null) throw new Error(`[astronomical-calculator] ${reason}`)
  }
  return position
}

/**
 * Raw computation with no plausibility gate. Module-private on purpose — nothing
 * outside this file should be able to obtain an unchecked position.
 */
function computePlanetPosition(planet: string, jd: number): EnhancedPlanetPosition {
  if (planet === 'Sun') return calculateSunPosition(jd)
  if (planet === 'Moon') return calculateMoonPosition(jd)
  return calculateGeocentricPlanetPosition(planet, jd)
}

/**
 * Precess ecliptic coordinates from the mean equinox of J2000 to the mean equinox
 * of date (Meeus, Astronomical Algorithms, chapter 21).
 *
 * The Keplerian element set is referred to J2000; the tropical zodiac is referred
 * to the equinox of date. Skipping this step costs ~1.4° per century — it was the
 * second-largest error in this module after the missing geocentric conversion.
 */
function precessEclipticFromJ2000(
  longitudeDeg: number,
  latitudeDeg: number,
  T: number
): { longitude: number; latitude: number } {
  const arcsec = 1 / 3600
  const eta = (47.0029 * T - 0.03302 * T * T + 0.00006 * T * T * T) * arcsec
  const bigPi = 174.876384 + (-869.8089 * T + 0.03536 * T * T) * arcsec
  const p = (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) * arcsec

  const lam = longitudeDeg * DEG
  const bet = latitudeDeg * DEG
  const etaR = eta * DEG
  const piR = bigPi * DEG

  const A = Math.cos(etaR) * Math.cos(bet) * Math.sin(piR - lam) - Math.sin(etaR) * Math.sin(bet)
  const B = Math.cos(bet) * Math.cos(piR - lam)
  const C = Math.cos(etaR) * Math.sin(bet) + Math.sin(etaR) * Math.cos(bet) * Math.sin(piR - lam)

  return {
    longitude: normalizeDegrees(p + bigPi - Math.atan2(A, B) / DEG),
    latitude: Math.asin(Math.max(-1, Math.min(1, C))) / DEG,
  }
}

/** Heliocentric rectangular ecliptic coordinates (J2000 frame), in AU. */
function heliocentricRectangular(
  elements: KeplerianElementSet,
  T: number
): { x: number; y: number; z: number } {
  const a = elements.semiMajorAxisAu[0] + elements.semiMajorAxisAu[1] * T
  const e = elements.eccentricity[0] + elements.eccentricity[1] * T
  const inclination = (elements.inclinationDeg[0] + elements.inclinationDeg[1] * T) * DEG
  const meanLongitude = elements.meanLongitudeDeg[0] + elements.meanLongitudeDeg[1] * T
  const longitudeOfPerihelion =
    elements.longitudeOfPerihelionDeg[0] + elements.longitudeOfPerihelionDeg[1] * T
  const longitudeOfNode =
    elements.longitudeOfAscendingNodeDeg[0] + elements.longitudeOfAscendingNodeDeg[1] * T

  // Argument of perihelion, not the longitude of perihelion.
  const argPerihelion = (longitudeOfPerihelion - longitudeOfNode) * DEG
  const node = longitudeOfNode * DEG

  // Mean anomaly, folded to -180..+180 so Kepler's equation converges from the
  // short side of the orbit.
  const meanAnomaly = ((((meanLongitude - longitudeOfPerihelion) % 360) + 540) % 360) - 180
  const M = meanAnomaly * DEG

  // Kepler's equation by Newton-Raphson. The previous fixed-point iteration
  // (E = M + e sin E, 10 passes) does not converge for Pluto's e = 0.249.
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 60; i++) {
    const deltaE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E))
    E += deltaE
    if (Math.abs(deltaE) < 1e-12) break
  }

  const xOrbital = a * (Math.cos(E) - e)
  const yOrbital = a * Math.sqrt(1 - e * e) * Math.sin(E)

  const cosW = Math.cos(argPerihelion)
  const sinW = Math.sin(argPerihelion)
  const cosN = Math.cos(node)
  const sinN = Math.sin(node)
  const cosI = Math.cos(inclination)
  const sinI = Math.sin(inclination)

  return {
    x:
      (cosW * cosN - sinW * sinN * cosI) * xOrbital +
      (-sinW * cosN - cosW * sinN * cosI) * yOrbital,
    y:
      (cosW * sinN + sinW * cosN * cosI) * xOrbital +
      (-sinW * sinN + cosW * cosN * cosI) * yOrbital,
    z: sinW * sinI * xOrbital + cosW * sinI * yOrbital,
  }
}

/** Geocentric ecliptic longitude/latitude/distance of date, without derivatives. */
function geocentricEcliptic(
  planet: string,
  T: number
): { longitude: number; latitude: number; distance: number } {
  const elements = KEPLERIAN_ELEMENTS[planet]
  if (!elements || planet === 'EarthMoonBarycentre') {
    throw new Error(`No orbital elements found for planet: ${planet}`)
  }

  const body = heliocentricRectangular(elements, T)
  const earth = heliocentricRectangular(KEPLERIAN_ELEMENTS.EarthMoonBarycentre, T)

  // The step this module used to omit entirely: heliocentric -> geocentric.
  const x = body.x - earth.x
  const y = body.y - earth.y
  const z = body.z - earth.z

  const distance = Math.sqrt(x * x + y * y + z * z)
  const j2000Longitude = normalizeDegrees(Math.atan2(y, x) / DEG)
  const j2000Latitude = Math.atan2(z, Math.sqrt(x * x + y * y)) / DEG

  const ofDate = precessEclipticFromJ2000(j2000Longitude, j2000Latitude, T)
  return { longitude: ofDate.longitude, latitude: ofDate.latitude, distance }
}

/**
 * Geocentric position of a planet, with apparent speed obtained by central
 * difference. A real derivative is what makes retrograde motion detectable at
 * all; the previous `speed = L1 / 365.25` was both a mean heliocentric rate and
 * a factor-100 unit error (L1 is per Julian century, i.e. 36525 days), and being
 * unconditionally positive it made `retrograde` unconditionally false.
 */
function calculateGeocentricPlanetPosition(planet: string, jd: number): EnhancedPlanetPosition {
  const T = centuriesSinceJ2000(jd)
  const here = geocentricEcliptic(planet, T)

  const halfStepDays = 0.5
  const before = geocentricEcliptic(planet, centuriesSinceJ2000(jd - halfStepDays))
  const after = geocentricEcliptic(planet, centuriesSinceJ2000(jd + halfStepDays))
  // Shortest-arc difference so the wrap at 360° does not read as a huge speed.
  const delta = ((((after.longitude - before.longitude) % 360) + 540) % 360) - 180
  const speed = delta / (2 * halfStepDays)

  const position = longitudeToSignDegree(here.longitude)

  return {
    planet,
    longitude: here.longitude,
    latitude: here.latitude,
    distance: here.distance,
    speed,
    retrograde: speed < 0,
    sign: position.sign,
    signDegree: position.degree,
    source: APPROXIMATION_SOURCE,
  }
}

/**
 * Apparent geocentric ecliptic longitude of the Sun (Meeus chapter 25, low
 * precision) with nutation and aberration.
 *
 * The mean anomaly here is the EARTH's, which is the Sun's geocentric mean
 * longitude minus (perihelion longitude + 180°). This module previously used
 * `L - perihelion`, i.e. the anomaly 180° out of phase, which flipped the sign of
 * the equation of centre. That put the Sun up to 3.8° wrong — enough to place it
 * in the wrong sign at an equinox, which is the single most visible number in a
 * natal chart.
 */
function sunApparentLongitude(T: number): { longitude: number; distanceAu: number } {
  const L = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T
  const MRad = M * DEG

  // Equation of centre
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(MRad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * MRad) +
    0.000289 * Math.sin(3 * MRad)

  const trueLongitude = L + C
  const trueAnomaly = (M + C) * DEG
  const distanceAu = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly))

  // Nutation + aberration, giving the apparent (not geometric) longitude.
  const omega = 125.04 - 1934.136 * T
  const apparent = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEG)

  return { longitude: normalizeDegrees(apparent), distanceAu }
}

function calculateSunPosition(jd: number): EnhancedPlanetPosition {
  const T = centuriesSinceJ2000(jd)
  const { longitude, distanceAu } = sunApparentLongitude(T)

  const before = sunApparentLongitude(centuriesSinceJ2000(jd - 0.5)).longitude
  const after = sunApparentLongitude(centuriesSinceJ2000(jd + 0.5)).longitude
  const speed = ((((after - before) % 360) + 540) % 360) - 180

  const position = longitudeToSignDegree(longitude)

  return {
    planet: 'Sun',
    longitude,
    latitude: 0, // The Sun's geocentric ecliptic latitude is <0.0002° by definition of the ecliptic.
    distance: distanceAu,
    speed,
    retrograde: false, // The Sun is never retrograde from Earth.
    sign: position.sign,
    signDegree: position.degree,
    source: APPROXIMATION_SOURCE,
  }
}

/**
 * Periodic terms for the Moon's longitude and distance (Meeus chapter 47,
 * table 47.A). Columns: D, M, M', F, coefficient of sin (1e-6 degrees) for
 * longitude, coefficient of cos (1e-3 km) for distance.
 */
const MOON_LONGITUDE_DISTANCE_TERMS: Array<[number, number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
]

/**
 * Periodic terms for the Moon's ecliptic latitude (Meeus table 47.B).
 * Columns: D, M, M', F, coefficient of sin (1e-6 degrees).
 */
const MOON_LATITUDE_TERMS: Array<[number, number, number, number, number]> = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, -1, -1, 1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, -1, 1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, -1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [0, 0, 3, 1, -1335],
  [4, 0, 0, -1, 1107],
  [4, 0, -1, 1, 1021],
  [4, 0, -2, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, -1, 671],
  [2, 0, -3, -1, 607],
  [2, 0, -1, 3, 596],
  [2, -1, -2, -1, 491],
  [2, 0, -3, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -4, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, 1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -3, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
]

/** Astronomical unit in kilometres (IAU 2012 definition). */
const AU_KM = 149597870.7

/**
 * Geocentric position of the Moon from the truncated ELP-2000/82 series of
 * Meeus chapter 47, plus the principal nutation term so the result is referred
 * to the true equinox of date like everything else here.
 *
 * Latitude and distance were previously hard-coded to `0` and `60.4` ("Earth
 * radii, approximate") while the field contract said degrees and AU. Both are
 * now computed.
 */
function moonEcliptic(T: number): { longitude: number; latitude: number; distanceAu: number } {
  const Lp = normalizeDegrees(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      (T * T * T) / 538841 -
      (T * T * T * T) / 65194000
  )
  const D = normalizeDegrees(
    297.8501921 +
      445267.1114034 * T -
      0.0018819 * T * T +
      (T * T * T) / 545868 -
      (T * T * T * T) / 113065000
  )
  const M = normalizeDegrees(
    357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000
  )
  const Mp = normalizeDegrees(
    134.9633964 +
      477198.8675055 * T +
      0.0087414 * T * T +
      (T * T * T) / 69699 -
      (T * T * T * T) / 14712000
  )
  const F = normalizeDegrees(
    93.272095 +
      483202.0175233 * T -
      0.0036539 * T * T -
      (T * T * T) / 3526000 +
      (T * T * T * T) / 863310000
  )

  const A1 = normalizeDegrees(119.75 + 131.849 * T)
  const A2 = normalizeDegrees(53.09 + 479264.29 * T)
  const A3 = normalizeDegrees(313.45 + 481266.484 * T)

  // Eccentricity correction for terms involving the Sun's mean anomaly.
  const E = 1 - 0.002516 * T - 0.0000074 * T * T

  let sumL = 0
  let sumR = 0
  for (const [d, m, mp, f, cl, cr] of MOON_LONGITUDE_DISTANCE_TERMS) {
    const eccentricityFactor = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1
    const argument = (d * D + m * M + mp * Mp + f * F) * DEG
    sumL += cl * eccentricityFactor * Math.sin(argument)
    sumR += cr * eccentricityFactor * Math.cos(argument)
  }
  sumL += 3958 * Math.sin(A1 * DEG) + 1962 * Math.sin((Lp - F) * DEG) + 318 * Math.sin(A2 * DEG)

  let sumB = 0
  for (const [d, m, mp, f, cb] of MOON_LATITUDE_TERMS) {
    const eccentricityFactor = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1
    sumB += cb * eccentricityFactor * Math.sin((d * D + m * M + mp * Mp + f * F) * DEG)
  }
  sumB +=
    -2235 * Math.sin(Lp * DEG) +
    382 * Math.sin(A3 * DEG) +
    175 * Math.sin((A1 - F) * DEG) +
    175 * Math.sin((A1 + F) * DEG) +
    127 * Math.sin((Lp - Mp) * DEG) -
    115 * Math.sin((Lp + Mp) * DEG)

  // Nutation in longitude, principal terms (Meeus chapter 22).
  const omega = normalizeDegrees(125.04452 - 1934.136261 * T)
  const solarL = normalizeDegrees(280.4665 + 36000.7698 * T)
  const deltaPsi =
    (-17.2 * Math.sin(omega * DEG) -
      1.32 * Math.sin(2 * solarL * DEG) -
      0.23 * Math.sin(2 * Lp * DEG) +
      0.21 * Math.sin(2 * omega * DEG)) /
    3600

  return {
    longitude: normalizeDegrees(Lp + sumL / 1000000 + deltaPsi),
    latitude: sumB / 1000000,
    distanceAu: (385000.56 + sumR / 1000) / AU_KM,
  }
}

function calculateMoonPosition(jd: number): EnhancedPlanetPosition {
  const here = moonEcliptic(centuriesSinceJ2000(jd))

  const before = moonEcliptic(centuriesSinceJ2000(jd - 0.5)).longitude
  const after = moonEcliptic(centuriesSinceJ2000(jd + 0.5)).longitude
  const speed = ((((after - before) % 360) + 540) % 360) - 180

  const position = longitudeToSignDegree(here.longitude)

  return {
    planet: 'Moon',
    longitude: here.longitude,
    latitude: here.latitude,
    distance: here.distanceAu,
    speed,
    retrograde: speed < 0, // The Moon never retrogrades, but this is measured, not asserted.
    sign: position.sign,
    signDegree: position.degree,
    source: APPROXIMATION_SOURCE,
  }
}

/** Local sidereal time in degrees, and the mean obliquity, for an instant + longitude. */
function localSiderealTime(
  jd: number,
  observerLongitudeDeg: number
): { lstDeg: number; obliquityDeg: number } {
  const T = centuriesSinceJ2000(jd)
  const jd0 = Math.floor(jd - 0.5) + 0.5 // Julian day at 0h UT
  const H = (jd - jd0) * 24 // Hours since 0h UT
  const T0 = (jd0 - J2000) / 36525

  let gmst0 = 24110.54841 + 8640184.812866 * T0 + 0.093104 * T0 * T0 - 0.0000062 * T0 * T0 * T0
  gmst0 = (gmst0 / 3600) % 24
  if (gmst0 < 0) gmst0 += 24

  const gmst = (gmst0 + H * 1.00273790935) % 24

  return {
    lstDeg: normalizeDegrees(gmst * 15 + observerLongitudeDeg),
    obliquityDeg: 23.43929111 - 0.013004167 * T - 0.000001639 * T * T + 0.000000504 * T * T * T,
  }
}

/**
 * Rising degree (ascendant) for a birth moment and place.
 *
 * ASC = atan2( cos θ, -(sin θ cos ε + tan φ sin ε) ), θ = local sidereal time.
 *
 * The signs matter and they were both wrong here: the previous form,
 * atan2(-cos θ, +(sin θ cos ε + tan φ sin ε)), is that expression negated in both
 * arguments, which is the SAME angle plus exactly 180°. This function was
 * therefore returning the DESCENDANT, every time, for every chart — verified as
 * exactly 180.000° from `swe_houses` across 704 latitude/time samples. A rising
 * sign six signs off is not a precision problem, it is the wrong answer.
 */
export function calculateEnhancedAscendant(birthInfo: EnhancedBirthInfo): EnhancedAscendant {
  // Create UTC date to ensure consistent astronomical calculations
  const birthDate = birthMomentUTC(birthInfo)

  const jd = dateToJulianDay(birthDate)
  const { lstDeg, obliquityDeg } = localSiderealTime(jd, birthInfo.longitude)

  const latRad = birthInfo.latitude * DEG
  const lstRad = lstDeg * DEG
  const epsilonRad = obliquityDeg * DEG

  const ascLongitude = normalizeDegrees(
    Math.atan2(
      Math.cos(lstRad),
      -(Math.sin(lstRad) * Math.cos(epsilonRad) + Math.tan(latRad) * Math.sin(epsilonRad))
    ) / DEG
  )

  const position = longitudeToSignDegree(ascLongitude)

  return {
    longitude: ascLongitude,
    sign: position.sign,
    signDegree: position.degree,
    // ABSENT, not defaulted. `rightAscension` previously reported the local
    // sidereal time, which is the MC's right ascension, not the ascendant's
    // (measured against swe_houses: 33.73 vs 286.13 at one sample). `declination`
    // was a flat 0, which is only true when the ascendant sits at 0° Aries or
    // Libra. Neither is computed here, and a wrong number under a right name is
    // worse than no number, so both are null until something computes them.
    rightAscension: null,
    declination: null,
    source: APPROXIMATION_SOURCE,
  }
}

/** A body that was computed but withheld, with the reason it was withheld. */
export interface UnavailableBody {
  planet: string
  reason: string
}

/**
 * A chart. `planets` contains only bodies that survived the plausibility gate —
 * an impossible position is ABSENT from the record and named in `unavailable`,
 * never returned and never replaced with a substitute value.
 */
export interface EnhancedChartResult {
  planets: Record<string, EnhancedPlanetPosition>
  ascendant: EnhancedAscendant
  julianDay: number
  /** Provenance. Required: a caller cannot read this chart without seeing it. */
  source: EphemerisSource
  /** Bodies withheld as physically impossible. Empty when everything passed. */
  unavailable: UnavailableBody[]
  /** False when the instant falls outside the element set's 1800-2050 fit window. */
  withinElementSetRange: boolean
}

export const CHART_BODIES = [
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
] as const

/**
 * Calculate all bodies for a birth moment.
 *
 * Every result is stamped `source: 'vsop87-approximation'`. Callers that need a
 * measured position must go through `lib/swiss-ephemeris-service.ts` instead.
 */
export function calculateAllPlanets(birthInfo: EnhancedBirthInfo): EnhancedChartResult {
  // Create UTC date to ensure consistent astronomical calculations
  const birthDate = birthMomentUTC(birthInfo)

  const jd = dateToJulianDay(birthDate)

  const planets: Record<string, EnhancedPlanetPosition> = {}
  const unavailable: UnavailableBody[] = []

  const sun = computePlanetPosition('Sun', jd)

  for (const planetName of CHART_BODIES) {
    const position = planetName === 'Sun' ? sun : computePlanetPosition(planetName, jd)
    const reason = checkPlanetPlausible(planetName, position.longitude, sun.longitude)
    if (reason !== null) {
      unavailable.push({ planet: planetName, reason })
      continue
    }
    planets[planetName] = position
  }

  const ascendant = calculateEnhancedAscendant(birthInfo)

  return {
    planets,
    ascendant,
    julianDay: jd,
    source: APPROXIMATION_SOURCE,
    unavailable,
    withinElementSetRange:
      birthInfo.year >= ELEMENT_SET_VALID_FROM_YEAR && birthInfo.year <= ELEMENT_SET_VALID_TO_YEAR,
  }
}

/**
 * Midheaven: the ECLIPTIC longitude where the meridian crosses the ecliptic.
 *
 * MC = atan2( sin θ, cos θ cos ε ). This is not the same number as the local
 * sidereal time θ, which is what this function used to return — the two differ
 * by up to 2.5° (verified against `swe_houses` across 3825 samples; the proper
 * form agrees to 0.005°, the old one to 2.473°).
 */
function calculateMidheaven(
  birthInfo: EnhancedBirthInfo,
  jd: number
): { longitude: number; sign: string; signDegree: number } {
  const { lstDeg, obliquityDeg } = localSiderealTime(jd, birthInfo.longitude)
  const lstRad = lstDeg * DEG
  const epsilonRad = obliquityDeg * DEG

  const mcLongitude = normalizeDegrees(
    Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsilonRad)) / DEG
  )
  const position = longitudeToSignDegree(mcLongitude)

  return {
    longitude: mcLongitude,
    sign: position.sign,
    signDegree: position.degree,
  }
}

/**
 * House cusps.
 *
 * ONLY the equal house system is implemented. Placidus, Koch, Campanus and
 * Regiomontanus are not, and asking for one of them returns EQUAL houses with
 * `system: 'equal'` and `requestedSystem` naming what was asked for. Previously
 * those four returned an empty cusp array while `system` still echoed the
 * requested name, so a caller reading `.system` was told it had Placidus cusps
 * when it had none at all.
 */
export function calculateProfessionalHouses(
  birthInfo: EnhancedBirthInfo,
  system: HouseSystem = 'placidus'
): HouseSystemResult {
  // Create UTC date to ensure consistent astronomical calculations
  const birthDate = birthMomentUTC(birthInfo)

  const jd = dateToJulianDay(birthDate)
  const ascendant = calculateEnhancedAscendant(birthInfo)
  const midheaven = calculateMidheaven(birthInfo, jd)

  return {
    system: 'equal',
    requestedSystem: system,
    houses: calculateEqualHouses(ascendant),
    ascendant,
    midheaven,
    source: APPROXIMATION_SOURCE,
  }
}

/**
 * Equal House System - simplest, each house is exactly 30°
 */

function calculateEqualHouses(ascendant: EnhancedAscendant): EnhancedHousePosition[] {
  const houses: EnhancedHousePosition[] = []

  for (let i = 0; i < 12; i++) {
    const houseLongitude = normalizeDegrees(ascendant.longitude + i * 30)
    const position = longitudeToSignDegree(houseLongitude)

    houses.push({
      houseNumber: i + 1,
      longitude: houseLongitude,
      sign: position.sign,
      signDegree: position.degree,
    })
  }

  return houses
}

/**
 * Approximate apparent geocentric longitude of the Sun (degrees, 0-360).
 *
 * Agrees with Swiss Ephemeris to within 0.01° over 1800-2050 and hits the
 * equinox and solstice points to within 0.006°. Still an approximation, not a
 * measurement — see `EphemerisSource`.
 */
export function getExactSunDegreeForDate(date: Date): number {
  return calculateSunPosition(dateToJulianDay(date)).longitude
}

/**
 * Approximate absolute ecliptic longitude (0-360°) for any supported body.
 *
 * @throws when the body's computed position is physically impossible. A number
 * has to be returned here, so failing loudly is the only alternative to
 * returning a known-wrong one. Use `calculatePlanetPositionOrNull` where absence
 * can be carried.
 */
export function getExactPlanetDegreeForDate(planet: string, date: Date): number {
  const jd = dateToJulianDay(date)
  return normalizeDegrees(calculateEnhancedPlanetPosition(planet, jd).longitude)
}

/**
 * Convert a zodiac sign + within-sign degree (0-30) to absolute ecliptic longitude (0-360).
 * Returns null when the sign is unrecognized.
 */
export function signDegreeToLongitude(sign: string, degree: number): number | null {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.toLowerCase() === sign?.toLowerCase())
  if (signIndex === -1) return null
  return normalizeDegrees(signIndex * 30 + degree)
}

/**
 * The window during which the Sun occupies a given whole degree of the zodiac,
 * or null when the search does not find one.
 *
 * Returns NULL rather than a guess. The previous version fell back to
 * "March 20 plus floor(degree) days" and returned that as if it had been found,
 * which is a fabricated answer wearing the same shape as a measured one.
 */
export function getDatesForSunDegree(
  degree: number,
  year: number
): { start: Date; end: Date } | null {
  const targetDegree = normalizeDegrees(degree)

  // Approximate starting date based on degree
  // Sun at 0° Aries around March 20
  const daysFromAries = targetDegree
  // `year` is an unconstrained caller-supplied parameter, so it can be 0-99.
  const baseDate = utcDateFromParts(year, 3, 20, 12, 0, 0) // March 20 noon
  const searchStart = new Date(baseDate)
  searchStart.setUTCDate(searchStart.getUTCDate() + Math.floor(daysFromAries) - 2)

  let entryTime: Date | null = null
  let exitTime: Date | null = null

  // Search with 1-hour precision over 5 days
  for (let hours = 0; hours < 120; hours++) {
    const checkTime = new Date(searchStart)
    checkTime.setUTCHours(searchStart.getUTCHours() + hours)

    const sunDegree = getExactSunDegreeForDate(checkTime)
    const currentDegreeFloor = Math.floor(sunDegree)

    if (!entryTime && currentDegreeFloor === Math.floor(targetDegree)) {
      // Refine to minute precision
      entryTime = refineDegreeTime(checkTime, targetDegree, true)
    } else if (entryTime && currentDegreeFloor !== Math.floor(targetDegree)) {
      // Refine exit time
      const prevHour = new Date(checkTime)
      prevHour.setUTCHours(prevHour.getUTCHours() - 1)
      exitTime = refineDegreeTime(prevHour, targetDegree + 1, true)
      break
    }
  }

  // Absence, not a substitute. If the entry was never found the window is
  // unknown; if only the exit is missing the Sun is still inside the degree at
  // the end of the search span, which is also not a window we can report.
  if (!entryTime || !exitTime) return null

  return { start: entryTime, end: exitTime }
}

/**
 * Refine degree crossing time to minute precision
 */
function refineDegreeTime(nearTime: Date, targetDegree: number, isEntry: boolean): Date {
  let low = new Date(nearTime)
  let high = new Date(nearTime)
  high.setUTCHours(high.getUTCHours() + 1)

  // Binary search to minute precision
  while (high.getTime() - low.getTime() > 60000) {
    // 1 minute
    const mid = new Date((low.getTime() + high.getTime()) / 2)
    const midDegree = getExactSunDegreeForDate(mid)

    if (isEntry) {
      if (Math.floor(midDegree) < Math.floor(targetDegree)) {
        low = mid
      } else {
        high = mid
      }
    } else {
      if (Math.floor(midDegree) <= Math.floor(targetDegree)) {
        low = mid
      } else {
        high = mid
      }
    }
  }

  return isEntry ? high : low
}

export interface StarHorizonPosition {
  name: string
  hipId: number
  element: 'Fire' | 'Air' | 'Water' | 'Earth'
  esmsToken: 'Spirit' | 'Substance' | 'Essence' | 'Matter'
  rightAscension: number
  declination: number
  altitude: number
  azimuth: number
  isRisen: boolean
  baseApy: number
  multiplier: number
  effectiveApy: number
}

export const STAR_CATALOG_DATA = [
  {
    hipId: 32349,
    name: 'Sirius',
    element: 'Fire' as const,
    esmsToken: 'Spirit' as const,
    baseApy: 248,
    ra: 6.7525,
    dec: -16.7161,
  },
  {
    hipId: 69673,
    name: 'Arcturus',
    element: 'Air' as const,
    esmsToken: 'Substance' as const,
    baseApy: 195,
    ra: 14.2612,
    dec: 19.1825,
  },
  {
    hipId: 91262,
    name: 'Vega',
    element: 'Water' as const,
    esmsToken: 'Essence' as const,
    baseApy: 210,
    ra: 18.6156,
    dec: 38.7837,
  },
  {
    hipId: 11767,
    name: 'Polaris',
    element: 'Earth' as const,
    esmsToken: 'Matter' as const,
    baseApy: 180,
    ra: 2.5303,
    dec: 89.2641,
  },
]

export function calculateStarHorizonPositions(
  date: Date = new Date(),
  latitude = 40.7128,
  longitude = -74.006
): StarHorizonPosition[] {
  const jd = dateToJulianDay(date)
  const d = jd - 2451545.0
  const T = d / 36525.0

  let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000.0
  gmst = normalizeDegrees(gmst)

  const lst = normalizeDegrees(gmst + longitude)
  const latRad = (latitude * Math.PI) / 180

  return STAR_CATALOG_DATA.map(star => {
    const raDeg = star.ra * 15
    const decRad = (star.dec * Math.PI) / 180

    let ha = normalizeDegrees(lst - raDeg)
    if (ha > 180) ha -= 360
    const haRad = (ha * Math.PI) / 180

    const sinAlt =
      Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
    const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
    const altitude = Number(((altRad * 180) / Math.PI).toFixed(2))

    const cosAz =
      (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)) /
      (Math.cos(latRad) * Math.cos(altRad))
    const sinAz = (-Math.cos(decRad) * Math.sin(haRad)) / Math.cos(altRad)
    const azRad = Math.atan2(sinAz, cosAz)
    const azimuth = Number(normalizeDegrees((azRad * 180) / Math.PI).toFixed(2))

    const isRisen = altitude > 0
    const multiplier = isRisen
      ? Number((1.2 + 0.8 * Math.sin(Math.max(0, altRad))).toFixed(2))
      : 1.0
    const effectiveApy = Math.round(star.baseApy * multiplier)

    return {
      name: star.name,
      hipId: star.hipId,
      element: star.element,
      esmsToken: star.esmsToken,
      rightAscension: star.ra,
      declination: star.dec,
      altitude,
      azimuth,
      isRisen,
      baseApy: star.baseApy,
      multiplier,
      effectiveApy,
    }
  })
}
