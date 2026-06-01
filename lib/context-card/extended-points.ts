import { SIGN_ORDER } from './types'

/**
 * Computes the extended chart points the backend ephemeris does not return,
 * using standard mean-element formulae. Accuracy tracks the birth time
 * (angles like the MC are time-sensitive). Chiron and the Vertex are
 * intentionally omitted — Chiron needs an orbital ephemeris we don't have, and
 * the Vertex needs more derivation than is warranted here.
 */

const DEG = Math.PI / 180
const norm360 = (x: number) => ((x % 360) + 360) % 360

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

export interface ExtendedPointLon {
  body: string
  /** absolute ecliptic longitude 0–360 */
  lon: number
  retro: boolean
}

export interface ComputeExtendedPointsInput {
  date: Date
  /** observer longitude, east-positive (birth place); MC is skipped if undefined */
  observerLon?: number
  ascendantLon: number | null
  sunLon: number | null
  moonLon: number | null
}

/**
 * Returns the extended points as absolute longitudes. Each is omitted when its
 * inputs are unavailable. `lonToSignDeg` converts a result to sign + degree.
 */
export function computeExtendedPoints(input: ComputeExtendedPointsInput): ExtendedPointLon[] {
  const { date, observerLon, ascendantLon, sunLon, moonLon } = input
  const jd = julianDay(date)
  const d = jd - 2451545.0
  const T = d / 36525

  const out: ExtendedPointLon[] = []

  // Ascendant (already known) — surface it as a point so transits can hit it.
  if (ascendantLon != null) {
    out.push({ body: 'Ascendant', lon: norm360(ascendantLon), retro: false })
  }

  // Midheaven — from local sidereal time + obliquity.
  if (typeof observerLon === 'number' && Number.isFinite(observerLon)) {
    const gmst = norm360(280.46061837 + 360.98564736629 * d)
    const ramc = norm360(gmst + observerLon) * DEG
    const obliquity = 23.4392911 * DEG
    const mc = norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(obliquity)) / DEG)
    out.push({ body: 'Midheaven', lon: mc, retro: false })
  }

  // Mean lunar nodes (always retrograde).
  const node = norm360(125.04452 - 1934.136261 * T)
  out.push({ body: 'North Node', lon: node, retro: true })
  out.push({ body: 'South Node', lon: norm360(node + 180), retro: true })

  // Black Moon Lilith — mean lunar apogee (perigee + 180°).
  const perigee = 83.3532465 + 4069.0137287 * T
  out.push({ body: 'Lilith', lon: norm360(perigee + 180), retro: false })

  // Part of Fortune — day formula: Asc + Moon − Sun.
  if (ascendantLon != null && sunLon != null && moonLon != null) {
    out.push({
      body: 'Part of Fortune',
      lon: norm360(ascendantLon + moonLon - sunLon),
      retro: false,
    })
  }

  return out
}

export function lonToSignDeg(lon: number): { sign: string; deg: number } {
  const n = norm360(lon)
  const idx = Math.floor(n / 30)
  return { sign: SIGN_ORDER[idx] || 'Aries', deg: n % 30 }
}
