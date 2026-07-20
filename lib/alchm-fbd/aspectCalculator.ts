import { _logger } from './logger'
import type { AspectType } from './types'
import type { AspectWithStrength } from './aspectESMSEffects'

/**
 * Utility for calculating comprehensive aspects between planets
 * based on the astrocharts.com data format
 */

// Interface for position data
export interface PlanetaryPositionData {
  sign: string
  /** Degree WITHIN the sign (0–29.999), not an absolute ecliptic longitude. */
  degree: number
  /** Absolute ecliptic longitude (0–360). */
  exactLongitude?: number
  isRetrograde?: boolean
}

const ZODIAC_ORDER = [
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

/**
 * Convert a sign + degree-within-sign into an absolute ecliptic longitude.
 *
 * Aspects are angular separations, so they need absolute longitudes (0–360).
 * `degree` is sign-relative (see `positions.ts`, which derives it as
 * `longitude % 30`), so using it as a longitude collapses every planet into the
 * first 30° of the zodiac and turns almost every pair into a false conjunction.
 *
 * @returns the longitude, or null if the sign is unrecognized — callers must not
 *   substitute a guess, since a wrong longitude yields confidently wrong aspects.
 */
export function signDegreeToLongitude(sign: string, degree: number, minute = 0): number | null {
  const signIndex = ZODIAC_ORDER.indexOf(String(sign).toLowerCase())
  if (signIndex < 0) return null
  return signIndex * 30 + degree + minute / 60
}

// Interface for aspect data
export interface AspectData {
  planet1: string
  planet2: string
  type: AspectType
  orb: number
  strength: number
  influence?: number
}

const ASPECT_TYPE_ALIASES: Record<string, AspectType> = {
  _quincunx: 'quincunx',
  _semisextile: 'semi-sextile',
  _sesquiquadrate: 'sesquisquare',
  _semisquare: 'semisquare',
  _quintile: 'quintile',
  _biquintile: 'biquintile',
}

function normalizeAspectType(type: string): AspectType | null {
  if (type in ASPECT_TYPE_ALIASES) {
    return ASPECT_TYPE_ALIASES[type]
  }

  switch (type) {
    case 'conjunction':
    case 'opposition':
    case 'trine':
    case 'square':
    case 'sextile':
    case 'quincunx':
    case 'inconjunct':
    case 'semi-sextile':
    case 'semisquare':
    case 'sesquisquare':
    case 'quintile':
    case 'biquintile':
      return type
    default:
      return null
  }
}

/**
 * Calculate aspects between planets based on astrocharts.com data
 * This implements a comprehensive aspect calculation with proper orbs
 * based on the April 2025 chart data from astrocharts.com
 *
 * @param positions Record of planetary positions
 * @returns Array of aspects between planets
 */
export function calculateComprehensiveAspects(
  positions: Record<string, PlanetaryPositionData>
): AspectData[] {
  const aspects: AspectData[] = []

  // Define all aspects and their orbs based on astrocharts.com
  const aspectDefinitions: Record<string, { angle: number; maxOrb: number }> = {
    conjunction: { angle: 0, maxOrb: 8 },
    opposition: { angle: 180, maxOrb: 8 },
    trine: { angle: 120, maxOrb: 8 },
    square: { angle: 90, maxOrb: 7 },
    sextile: { angle: 60, maxOrb: 6 },
    _quincunx: { angle: 150, maxOrb: 5 },
    _semisextile: { angle: 30, maxOrb: 4 },
    _sesquiquadrate: { angle: 135, maxOrb: 3 },
    _semisquare: { angle: 45, maxOrb: 3 },
    _quintile: { angle: 72, maxOrb: 2 },
    _biquintile: { angle: 144, maxOrb: 2 },
    _septile: { angle: 51.428, maxOrb: 2 },
  }

  // Helper function to get longitude from sign and degree
  const getLongitude = (position: PlanetaryPositionData): number => {
    // Use exactLongitude if available
    if (position.exactLongitude !== undefined) {
      return position.exactLongitude
    }

    // Otherwise, calculate from sign and degree
    if (!position || !position.sign) {
      _logger.warn('Invalid position object encountered: ', position)
      return 0 // Return default value
    }

    const longitude = signDegreeToLongitude(position.sign, position.degree)
    if (longitude === null) {
      _logger.warn(`Unknown zodiac sign in aspect calculation: ${position.sign}`)
      return 0
    }
    return longitude
  }

  // Calculate aspects between each planet pair
  const planets = Object.keys(positions)

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i]
      const planet2 = planets[j]

      const pos1 = positions[planet1]
      const pos2 = positions[planet2]

      // Skip if missing position data
      if (!pos1 || !pos2 || !pos1.sign || !pos2.sign) continue

      const long1 = getLongitude(pos1)
      const long2 = getLongitude(pos2)

      // Calculate angular difference
      let diff = Math.abs(long1 - long2)
      if (diff > 180) diff = 360 - diff

      // Adjust orbs based on planetary importance (Sun/Moon have larger orbs).
      // Case-insensitive: every live caller keys positions by the canonical
      // capitalized planet name ("Sun", "Moon" — see RealAlchemizeService's
      // planetaryAlchemy table and every position-source convention in the
      // repo), so a strict lowercase match here never fires in practice.
      let orbMultiplier = 1.0
      const p1Lower = planet1.toLowerCase()
      const p2Lower = planet2.toLowerCase()
      if (p1Lower === 'sun' || p1Lower === 'moon' || p2Lower === 'sun' || p2Lower === 'moon') {
        orbMultiplier = 1.2 // 20% larger orbs for aspects involving Sun or Moon
      }

      // Check each aspect type
      let bestAspect: { type: string; orb: number; strength: number } | null = null

      for (const [type, definition] of Object.entries(aspectDefinitions)) {
        const adjustedMaxOrb = definition.maxOrb * orbMultiplier
        const orb = Math.abs(diff - definition.angle)

        if (orb <= adjustedMaxOrb) {
          // Cosine Bell Curve for smooth, non-linear degree of influence
          const orbRatio = orb / adjustedMaxOrb
          const strength = (1 + Math.cos(Math.PI * orbRatio)) / 2

          // Check if this is the best aspect so far
          if (!bestAspect || strength > bestAspect.strength) {
            bestAspect = {
              type,
              orb,
              strength,
            }
          }
        }
      }

      // Add the best aspect if found
      if (bestAspect) {
        const normalizedType = normalizeAspectType(bestAspect.type)
        if (!normalizedType) {
          continue
        }

        // Determine influence: positive for harmonious aspects, negative for challenging ones
        let influence = 0
        const type = normalizedType
        if (type === 'conjunction' || type === 'trine' || type === 'sextile') {
          influence = bestAspect.strength
        } else if (type === 'opposition' || type === 'square') {
          influence = -bestAspect.strength
        }

        aspects.push({
          planet1,
          planet2,
          type: normalizedType,
          orb: bestAspect.orb,
          strength: bestAspect.strength,
          influence,
        })
      }
    }
  }

  // Sort aspects by strength (descending)
  return aspects.sort((a, b) => b.strength - a.strength)
}

/**
 * Build the strength-weighted aspect list the ESMS engine's Layer 3 consumes,
 * from any loose position record carrying sign + (exactLongitude or degree).
 *
 * This is the single place that adapts a position bag into aspects — every
 * caller of `calculateEnhancedAlchemicalFromPlanets` that has real positions
 * should route through here rather than re-inlining the mapping, since an
 * omitted or malformed aspect pass silently collapses ESMS toward a constant.
 *
 * Prefers `exactLongitude`; falls back to `degree` (sign-relative) only when the
 * longitude is absent. Bodies missing a sign are skipped, and fewer than two
 * usable bodies yields no aspects.
 */
export function buildAspectsWithStrength(positions: Record<string, unknown>): AspectWithStrength[] {
  const normalized: Record<string, PlanetaryPositionData> = {}
  for (const [planet, raw] of Object.entries(positions)) {
    if (!raw || typeof raw !== 'object') continue
    const pos = raw as { sign?: unknown; degree?: unknown; exactLongitude?: unknown }
    if (pos.sign == null) continue
    const exactLongitude = typeof pos.exactLongitude === 'number' ? pos.exactLongitude : undefined
    const degree =
      typeof pos.degree === 'number'
        ? pos.degree
        : exactLongitude !== undefined
          ? exactLongitude % 30
          : 0
    normalized[planet] = {
      sign: String(pos.sign).toLowerCase(),
      degree,
      exactLongitude,
    }
  }

  if (Object.keys(normalized).length < 2) return []

  return calculateComprehensiveAspects(normalized).map(aspect => ({
    planet1: aspect.planet1,
    planet2: aspect.planet2,
    type: aspect.type,
    strength: aspect.strength,
  }))
}

/**
 * Build aspects from a NatalChart's `planets[]` array, whose `position` field is
 * an absolute ecliptic longitude. Convenience over {@link buildAspectsWithStrength}
 * for the many callers holding the chart's planet list rather than a keyed bag.
 *
 * Only planets carrying a real absolute longitude participate (position <= 0
 * means unknown/legacy, per `PlanetInfo.position`'s documented contract) —
 * otherwise every legacy sign-only chart collapses all planets to longitude 0
 * and reports mutual exact conjunctions. Matches the guard in
 * `birth-chart/page.tsx`.
 */
export function buildAspectsFromChartPlanets(
  planets: ReadonlyArray<{ name?: unknown; sign?: unknown; position?: unknown }> | null | undefined
): AspectWithStrength[] {
  if (!Array.isArray(planets)) return []
  const positions: Record<string, unknown> = {}
  for (const planet of planets) {
    if (
      typeof planet?.name === 'string' &&
      typeof planet?.position === 'number' &&
      planet.position > 0
    ) {
      positions[planet.name] = { sign: planet.sign, exactLongitude: planet.position }
    }
  }
  return buildAspectsWithStrength(positions)
}

/**
 * Get zodiac sign and degree from longitude
 * @param longitude Longitude in degrees (0-360)
 * @returns Object with sign and degree
 */
export function getSignAndDegreeFromLongitude(longitude: number): {
  sign: string
  degree: number
} {
  const signs = [
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

  // Normalize longitude to 0-360 range
  const normalizedLong = ((longitude % 360) + 360) % 360

  // Calculate sign index (0-11)
  const signIndex = Math.floor(normalizedLong / 30)

  // Calculate degree within sign (0-29.999...)
  const degree = normalizedLong % 30

  return {
    sign: signs[signIndex],
    degree: parseFloat(degree.toFixed(2)),
  }
}
