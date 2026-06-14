/**
 * Coordinate conversions used to place planets (and the ascendant) on the pentacle:
 * ecliptic → equatorial → horizontal (alt/az). Builds on gmstDegrees from visibility.ts.
 */

import { gmstDegrees } from './visibility'

const DEG = Math.PI / 180
const OBLIQUITY_DEG = 23.43929111

function norm360(d: number): number {
  return ((d % 360) + 360) % 360
}

/** Ecliptic (longitude, latitude≈0 for planets on the ecliptic) → equatorial (ra°, dec°). */
export function eclipticToEquatorial(
  lonDeg: number,
  latDeg = 0
): { raDeg: number; decDeg: number } {
  const lam = lonDeg * DEG
  const bet = latDeg * DEG
  const eps = OBLIQUITY_DEG * DEG
  const ra = Math.atan2(
    Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps),
    Math.cos(lam)
  )
  const dec = Math.asin(
    Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam)
  )
  return { raDeg: norm360((ra * 180) / Math.PI), decDeg: (dec * 180) / Math.PI }
}

/** Equatorial (ra°, dec°) → horizontal (alt°, az° from North) for an observer/instant. */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): { altDeg: number; azDeg: number; visible: boolean } {
  const lst = gmstDegrees(date) + lonDeg
  const hourAngle = ((((lst - raDeg) % 360) + 540) % 360) - 180
  const h = hourAngle * DEG
  const dec = decDeg * DEG
  const lat = latDeg * DEG

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h)
  const altDeg = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI

  const cosAz =
    (Math.sin(dec) - Math.sin(lat) * sinAlt) /
    (Math.cos(lat) * Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt)))) || 1e-9)
  let azDeg = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI
  if (Math.sin(h) > 0) azDeg = 360 - azDeg

  return { altDeg, azDeg, visible: altDeg > 0 }
}

/** Ecliptic longitude → horizontal, for placing planets / the ascendant point on the sky. */
export function eclipticToHorizontal(
  lonDeg: number,
  observer: { lat: number; lon: number },
  date: Date,
  latDeg = 0
): { altDeg: number; azDeg: number; visible: boolean } {
  const { raDeg, decDeg } = eclipticToEquatorial(lonDeg, latDeg)
  return equatorialToHorizontal(raDeg, decDeg, observer.lat, observer.lon, date)
}
