/**
 * Swiss Ephemeris Client
 * ======================
 *
 * The REAL ephemeris path. Asynchronous, because the computation lives in the
 * backend: `backend/src/services/swiss-ephemeris.ts` calls the native `swisseph`
 * module and is exposed over HTTP by `backend/src/routes/ephemeris.ts`. Nothing
 * is computed in this file — it is a typed client and nothing more.
 *
 * WHAT THE BACKEND ACTUALLY RUNS
 * ------------------------------
 * `SEFLG_MOSEPH` (backend/src/services/swiss-ephemeris.ts). That selects Swiss
 * Ephemeris' built-in Moshier analytical ephemeris, which needs NO `.se1` data
 * files — which is the only reason this path is deployable without shipping an
 * ephemeris data set. Verified locally: `swisseph` builds as a native module on
 * macOS arm64 and returns positions with no data files present, and its own
 * range check reports the Moshier span as JD 625000.5 .. 2818000.5 (roughly
 * 3000 BC to 3000 AD). Outside that span the library returns an error object
 * rather than a number. Chiron is NOT available under Moshier — it needs
 * `seas_18.se1` — so requesting it yields an error, not a position.
 *
 * WHICH BACKEND, AND WHY IT MATTERS
 * ---------------------------------
 * Swiss Ephemeris lives on the NODE backend, mounted at `/api/planets`
 * (`backend/src/index.ts`). It is NOT on the Python FastAPI backend: a grep of
 * `backend/*.py` for `swisseph` returns nothing, and that backend's
 * `/api/planetary/positions` serves `_planetary_positions_for`
 * (`backend/main.py`), which is a circular-orbit approximation —
 * `(offset + elapsed_days / period * 360) % 360`, with `isRetrograde` hardcoded
 * to False. Real motion is neither circular nor never-retrograde.
 *
 * This client therefore talks to `NEXT_PUBLIC_EPHEMERIS_BACKEND_URL` directly
 * and NOT through `lib/planetary-api-client.ts`, which is bound to
 * `NEXT_PUBLIC_BACKEND_URL` (the Python backend). Routing this module through
 * that client stamped `source: 'swiss-ephemeris'` on circular-orbit output —
 * a false provenance claim, which is worse than an unlabelled number because it
 * asserts an authority the value does not have. The two backends do not even
 * agree on field names (`longitude`/`speed` here versus
 * `exactLongitude`/`longitudeSpeed` there), so the mismatch also produced
 * silent NaNs.
 *
 * WHAT THIS CLIENT WILL NOT DO
 * ----------------------------
 * It will not fall back to the local Keplerian approximation
 * (`lib/enhanced-astronomical-calculator.ts`) and label the result
 * 'swiss-ephemeris'. If the backend is unreachable this module throws
 * `EphemerisUnavailableError`, and the caller decides — visibly — whether to
 * degrade. Provenance is EARNED, not assumed: a body is stamped
 * `source: 'swiss-ephemeris'` only after the response identifies itself as a
 * success and that body's own numbers validate as finite.
 */

import type { EphemerisSource } from '@/lib/enhanced-astronomical-calculator'

/**
 * The Node backend that actually runs Swiss Ephemeris. Deliberately its own
 * variable: pointing this at the Python backend silently downgrades every
 * result to a circular-orbit approximation while keeping the Swiss label.
 */
const EPHEMERIS_BACKEND_URL =
  process.env.NEXT_PUBLIC_EPHEMERIS_BACKEND_URL || 'http://localhost:3001'

/** The subset of `backend/src/services/swiss-ephemeris.ts:PlanetaryPosition` we consume. */
interface RawSwissPosition {
  longitude: number
  latitude: number
  distance: number
  speed: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * A body is only usable if every field it claims is a real number. A partially
 * numeric body would otherwise be stamped with Swiss provenance and carry
 * `undefined`/`NaN` into the chart.
 */
function asSwissPosition(value: unknown): RawSwissPosition | null {
  if (!value || typeof value !== 'object') return null
  const { longitude, latitude, distance, speed } = value as Record<string, unknown>
  if (![longitude, latitude, distance, speed].every(isFiniteNumber)) return null
  return {
    longitude: longitude as number,
    latitude: latitude as number,
    distance: distance as number,
    speed: speed as number,
  }
}

/** POST to the Swiss Ephemeris backend, returning its validated `data` payload. */
async function postEphemeris(path: string, body: unknown): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(`${EPHEMERIS_BACKEND_URL}/api/planets${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new EphemerisUnavailableError(
      `Swiss Ephemeris backend at ${EPHEMERIS_BACKEND_URL} is unreachable`,
      error
    )
  }

  if (!response.ok) {
    throw new EphemerisUnavailableError(
      `Swiss Ephemeris backend returned HTTP ${response.status} for ${path}`
    )
  }

  const payload = (await response.json()) as { success?: boolean; data?: unknown }
  // The route answers `{success: true, data}` (backend/src/routes/ephemeris.ts).
  // Anything else is a different service, so we must not claim Swiss provenance.
  if (payload?.success !== true || !payload.data || typeof payload.data !== 'object') {
    throw new EphemerisUnavailableError(
      `Response from ${EPHEMERIS_BACKEND_URL}${path} is not a Swiss Ephemeris payload`
    )
  }
  return payload.data as Record<string, unknown>
}

/** Provenance stamp for everything this module returns. */
export const SWISS_EPHEMERIS_SOURCE = 'swiss-ephemeris' as const

/**
 * The ephemeris backend could not be reached or refused the request.
 *
 * Distinct from "the body was not in the response", which is `null`. A caller
 * must be able to tell "we do not know" from "we asked and it is not there";
 * collapsing both into `null` is how an outage turns into silent bad data.
 */
export class EphemerisUnavailableError extends Error {
  override readonly name = 'EphemerisUnavailableError'

  constructor(message: string, cause?: unknown) {
    super(message, { cause })
  }
}

export interface SwissEphemPlanetPosition {
  planet: string
  sign: string
  degree: number // 0-29.9999 within sign
  longitude: number // 0-360 absolute longitude
  latitude: number
  distance: number
  speed: number
  retrograde: boolean
  /** Provenance. Required, and always 'swiss-ephemeris' from this module. */
  source: EphemerisSource
}

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
 * Convert longitude to sign and degree
 */
function longitudeToSignDegree(longitude: number): { sign: string; degree: number } {
  // Normalize longitude to 0-360
  let normalizedLongitude = ((longitude % 360) + 360) % 360

  // Calculate sign index (0-11)
  const signIndex = Math.floor(normalizedLongitude / 30)

  // Calculate degree within sign (0-29.9999)
  const degree = normalizedLongitude % 30

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: Math.max(0, Math.min(29.9999, degree)),
  }
}

/**
 * Every body the backend returned, keyed by capitalised name.
 *
 * A body the backend did not return is ABSENT from the record — there is no
 * placeholder entry and no default longitude. When coordinates are supplied,
 * `Ascendant` and `MC` are added if and only if the house-system call succeeded.
 *
 * @throws {EphemerisUnavailableError} when the backend cannot be reached or
 * returns an error. It never degrades to the local approximation: a caller that
 * wants that has to ask for it by name, so the provenance stays truthful.
 */
export async function getAllPlanetaryPositions(
  date: Date,
  latitude: number = 0,
  longitude: number = 0
): Promise<Record<string, SwissEphemPlanetPosition>> {
  const hasCoordinates = latitude !== 0 || longitude !== 0

  const backendPositions = await postEphemeris('/positions', {
    date: date.toISOString(),
    ...(hasCoordinates ? { latitude, longitude } : {}),
  })

  const positions: Record<string, SwissEphemPlanetPosition> = {}

  for (const [planetKey, raw] of Object.entries(backendPositions)) {
    const pos = asSwissPosition(raw)
    // A body whose numbers do not validate is ABSENT, not defaulted. Stamping
    // Swiss provenance on an unvalidated payload is the defect this guards.
    if (!pos) continue
    const planetName = planetKey.charAt(0).toUpperCase() + planetKey.slice(1)
    const { sign, degree } = longitudeToSignDegree(pos.longitude)

    positions[planetName] = {
      planet: planetName,
      sign,
      degree,
      longitude: pos.longitude,
      latitude: pos.latitude,
      distance: pos.distance,
      speed: pos.speed,
      retrograde: pos.speed < 0,
      source: SWISS_EPHEMERIS_SOURCE,
    }
  }

  if (hasCoordinates) {
    try {
      const rawHouses = await postEphemeris('/houses', {
        date: date.toISOString(),
        latitude,
        longitude,
        houseSystem: 'P',
      })
      const houses = rawHouses as { ascendant?: unknown; mc?: unknown }
      // Absent rather than defaulted: a non-numeric cusp means the backend did
      // not give us an ascendant, and 0 would read as 0°00′ Aries.
      if (!isFiniteNumber(houses.ascendant) || !isFiniteNumber(houses.mc)) {
        throw new EphemerisUnavailableError(
          `Swiss Ephemeris backend returned no usable house cusps for ${date.toISOString()}`
        )
      }

      const { sign: ascSign, degree: ascDegree } = longitudeToSignDegree(houses.ascendant)
      positions['Ascendant'] = {
        planet: 'Ascendant',
        sign: ascSign,
        degree: ascDegree,
        longitude: houses.ascendant,
        latitude: 0, // The ascendant is a point on the ecliptic; its ecliptic latitude is 0 by definition.
        distance: 0, // Not a body: no distance exists to report.
        speed: 0,
        retrograde: false,
        source: SWISS_EPHEMERIS_SOURCE,
      }

      const { sign: mcSign, degree: mcDegree } = longitudeToSignDegree(houses.mc)
      positions['MC'] = {
        planet: 'MC',
        sign: mcSign,
        degree: mcDegree,
        longitude: houses.mc,
        latitude: 0, // Also a point on the ecliptic.
        distance: 0,
        speed: 0,
        retrograde: false,
        source: SWISS_EPHEMERIS_SOURCE,
      }
    } catch (error) {
      // Deliberately not fatal and deliberately not filled in: the caller gets a
      // record with no Ascendant and no MC, which is the truth.
      console.warn(
        '[SwissEphemerisService] house-system call failed; Ascendant and MC are ABSENT from this result (not defaulted):',
        error
      )
    }
  }

  return positions
}

/**
 * One body's position.
 *
 * Returns `null` only when the backend answered successfully and that body was
 * not in the answer.
 *
 * @throws {EphemerisUnavailableError} when the backend could not be reached.
 * Returning `null` for an outage would make "we could not ask" indistinguishable
 * from "we asked and it is not there".
 */
export async function getPlanetPosition(
  planetName: string,
  date: Date
): Promise<SwissEphemPlanetPosition | null> {
  const planetKey = planetName.toLowerCase()

  const backendPositions = await postEphemeris('/positions', {
    date: date.toISOString(),
    planets: [planetKey],
  })

  // `null` here means the successful response simply omitted the body — a
  // different fact from the backend being unreachable, which throws above.
  const pos = asSwissPosition(backendPositions[planetKey])
  if (!pos) return null

  const { sign, degree } = longitudeToSignDegree(pos.longitude)

  return {
    planet: planetName,
    sign,
    degree,
    longitude: pos.longitude,
    latitude: pos.latitude,
    distance: pos.distance,
    speed: pos.speed,
    retrograde: pos.speed < 0,
    source: SWISS_EPHEMERIS_SOURCE,
  }
}

/**
 * Close Swiss Ephemeris (no-op now, kept for API compatibility)
 */
export function closeSwissEphemeris(): void {
  // No-op: backend handles cleanup
  console.log('[SwissEphemerisService] Close called (delegated to backend)')
}

/**
 * Calculates a consciousness profile based on planetary positions.
 * This is the core logic for the Philosopher's Stone agent creation.
 */
export async function calculateConsciousness(date: Date, latitude: number, longitude: number) {
  const positions = await getAllPlanetaryPositions(date, latitude, longitude)

  // Elemental Mapping
  const elementMap: Record<string, 'Fire' | 'Water' | 'Air' | 'Earth'> = {
    Aries: 'Fire',
    Leo: 'Fire',
    Sagittarius: 'Fire',
    Cancer: 'Water',
    Scorpio: 'Water',
    Pisces: 'Water',
    Gemini: 'Air',
    Libra: 'Air',
    Aquarius: 'Air',
    Taurus: 'Earth',
    Virgo: 'Earth',
    Capricorn: 'Earth',
  }

  const elements = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
  let totalPoints = 0

  // Simple weighting system for planets
  const weights: Record<string, number> = {
    Sun: 3,
    Moon: 3,
    Ascendant: 3,
    Mercury: 2,
    Venus: 2,
    Mars: 2,
    Jupiter: 1,
    Saturn: 1,
    Uranus: 1,
    Neptune: 1,
    Pluto: 1,
  }

  for (const [planet, pos] of Object.entries(positions)) {
    const weight = weights[planet] || 1
    const element = elementMap[pos.sign]
    if (element) {
      elements[element] += weight
      totalPoints += weight
    }
  }

  // Normalize elements to percentages
  const normalizedElements = {
    Fire: totalPoints > 0 ? elements.Fire / totalPoints : 0,
    Water: totalPoints > 0 ? elements.Water / totalPoints : 0,
    Air: totalPoints > 0 ? elements.Air / totalPoints : 0,
    Earth: totalPoints > 0 ? elements.Earth / totalPoints : 0,
  }

  // Determine dominant element
  const dominantElement = Object.entries(normalizedElements).sort(([, a], [, b]) => b - a)[0][0]

  // NOTE: this `monicaConstant` is NOT the thermodynamic Monica of
  // `lib/thermodynamics/kalchm.ts`. It is a deterministic pseudo-hash of three
  // longitudes, kept only because `app/api/philosophers-stone/calculate/route.ts`
  // consumes it. Do not read it as a measurement of anything.
  let monicaSum = 0
  if (positions['Sun']) monicaSum += positions['Sun'].longitude
  if (positions['Moon']) monicaSum += positions['Moon'].longitude * 1.5
  if (positions['Ascendant']) monicaSum += positions['Ascendant'].longitude * 2

  const monicaConstant = (monicaSum % 360) / 360.0

  return {
    positions,
    elements: normalizedElements,
    dominantElement,
    monicaConstant,
  }
}

// Export singleton instance
export const swissEphemerisService = {
  getAllPlanetaryPositions,
  getPlanetPosition,
  calculateConsciousness,
  close: closeSwissEphemeris,
}
