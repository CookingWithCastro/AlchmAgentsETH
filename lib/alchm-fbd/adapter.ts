/**
 * Adapter: this repo's ephemeris shapes → the vendored FBD engine's input.
 *
 * This is the ONLY file that should know about both sides. Keep the vendored
 * engine files untouched so they can be re-synced from upstream; absorb every
 * shape difference here.
 */

import { buildFreeBodyDiagrams, type FBDPositionInput, type FBDResult } from './planetaryFBD'

/** The ten bodies that get a card. The Ascendant grounds ESMS but has no card. */
const TEN_PLANETS = [
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

const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]

/** Shape used by `components/zodiac-wheel.tsx` and the transits page. */
export interface WheelPosition {
  planet: string
  longitude: number
  sign: string
  /** Signed deg/day. Absent on most of this repo's paths — see below. */
  speed?: number
  isRetrograde?: boolean
}

/**
 * A speed of exactly 0 is a SENTINEL for "not computed", not a standstill.
 * Astronomy engines initialise speed to 0 and only overwrite on success, and
 * this repo's backend coerces a missing speed to 0. Treating it as real motion
 * would draw a zero-length momentum arrow and claim applying/separating
 * kinematics the data cannot support. Undefined is the honest answer, and the
 * card degrades to "motion unavailable" on its own.
 */
function realSpeed(speed: number | undefined): number | undefined {
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed === 0) return undefined
  return speed
}

/**
 * Retrograde state, or `undefined` when it genuinely isn't known.
 *
 * ⚠️ This repo cannot currently determine retrograde motion at all. Its speed
 * values are absolute (`Math.abs`), heliocentric, and time-invariant, so a
 * negative longitude rate — the thing that DEFINES retrograde from an Earth
 * observer — is structurally unrepresentable. Deriving it from that speed would
 * always yield "direct", which is a fabricated answer, not a measured one.
 *
 * So: trust an explicit flag if a caller supplies one, trust a genuinely signed
 * speed if one ever arrives, and otherwise claim nothing.
 */
function retrogradeOf(pos: WheelPosition): boolean | undefined {
  if (typeof pos.isRetrograde === 'boolean') return pos.isRetrograde
  const speed = realSpeed(pos.speed)
  if (speed === undefined) return undefined
  return speed < 0
}

/**
 * Absolute ecliptic longitude, or null when unusable.
 *
 * `0` is genuinely ambiguous: it is both 0°00′ Aries and the "unknown" value a
 * legacy record carries. Upstream shipped a bug where sign-only charts stored
 * `0` for every planet and the wheel drew 45 phantom exact conjunctions. Here
 * the sign is carried separately, so a longitude of 0 with a real sign that
 * isn't Aries is incoherent — reject it rather than plot it.
 */
function resolveLongitude(pos: WheelPosition): number | null {
  const { longitude, sign } = pos
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null
  const normalized = ((longitude % 360) + 360) % 360
  const signIndex = SIGNS.indexOf(String(sign ?? '').toLowerCase())
  if (signIndex < 0) return normalized || null
  const impliedIndex = Math.floor(normalized / 30)
  if (normalized === 0 && signIndex !== 0) return null
  // Longitude and sign disagreeing means one of them is fabricated; trusting
  // either silently would produce confidently wrong aspects.
  if (impliedIndex !== signIndex) return null
  return normalized
}

export interface BuildFromWheelOptions {
  /** Day charts map every planet to Spirit/Essence, so this flips the model. */
  diurnal: boolean
  /** Restrict to specific bodies; defaults to the ten planets present. */
  planets?: string[]
}

/**
 * Build free-body diagrams from this repo's wheel/transit positions.
 *
 * Returns `null` when fewer than two bodies survive validation — with one body
 * there are no aspects and the diagram would be a lone sign vector pretending
 * to be a force diagram.
 */
export function buildFBDFromWheelPositions(
  positions: readonly WheelPosition[] | null | undefined,
  options: BuildFromWheelOptions
): FBDResult | null {
  if (!Array.isArray(positions) || positions.length === 0) return null

  const input: Record<string, FBDPositionInput> = {}
  for (const pos of positions) {
    const name = pos?.planet
    if (typeof name !== 'string' || !name) continue
    const longitude = resolveLongitude(pos)
    if (longitude === null) continue

    input[name] = {
      sign: String(pos.sign).toLowerCase(),
      degree: longitude % 30,
      exactLongitude: longitude,
      // Only claim retrograde when we actually know it. `?? false` would
      // assert DIRECT motion for every planet, since this repo supplies
      // neither an explicit flag nor a usable signed speed — a false-direct
      // claim on bodies that may well be retrograde. Undefined means "not
      // claimed", which is the honest reading of no data.
      isRetrograde: retrogradeOf(pos),
      longitudeSpeed: realSpeed(pos.speed),
    }
  }

  if (Object.keys(input).length < 2) return null

  return buildFreeBodyDiagrams({
    positions: input,
    diurnal: options.diurnal,
    planets: options.planets ?? TEN_PLANETS.filter(p => input[p] !== undefined),
  })
}

/**
 * Sect for a moment, from the Sun's position relative to the horizon.
 *
 * Without an Ascendant this cannot be computed properly, so callers that have
 * one should pass it. The fallback is a UTC-hour heuristic, which is a real
 * approximation — it is wrong near sunrise/sunset and for far-from-Greenwich
 * observers. It is flagged rather than hidden so a caller can pass something
 * better.
 */
export function isDiurnal(date: Date, ascendantLongitude?: number, sunLongitude?: number): boolean {
  if (typeof ascendantLongitude === 'number' && typeof sunLongitude === 'number') {
    // Sun above the horizon = within 180° "above" the ascendant going backwards
    // through the houses (ASC → MC → DSC is the day half).
    const rel = (((sunLongitude - ascendantLongitude) % 360) + 360) % 360
    return rel > 180
  }
  const hour = date.getUTCHours()
  return hour >= 6 && hour < 18
}
