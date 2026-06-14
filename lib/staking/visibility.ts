/**
 * Horizon visibility — the on-chain-impossible "180 visible degrees" computed here.
 *
 * Given a star's equatorial coords (ra, dec) and an observer's latitude/longitude at
 * an instant, returns the star's altitude above the horizon. Yield only accrues while
 * `visible` is true (altitude > 0) — the off-chain mirror of ConstellationAMM's
 * "pools only open while the constellation is risen" gate.
 */

export interface AltitudeResult {
  altitudeDeg: number
  azimuthDeg: number
  visible: boolean
}

/** Julian Date for an instant (UTC). */
export function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5
}

/** Greenwich Mean Sidereal Time in degrees (IAU 1982 polynomial). */
export function gmstDegrees(date: Date): number {
  const jd = julianDate(date)
  const d = jd - 2_451_545.0
  const t = d / 36_525
  const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38_710_000
  return ((gmst % 360) + 360) % 360
}

/**
 * Altitude/azimuth of a star for an observer. `ra` may be in hours (|ra|<=24) or
 * degrees; `lonDeg` is east-positive; `latDeg` is north-positive.
 */
export function starAltitude(
  ra: number,
  dec: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): AltitudeResult {
  const raDeg = Math.abs(ra) <= 24 ? ra * 15 : ra
  const lst = gmstDegrees(date) + lonDeg // local sidereal time (deg)
  // Hour angle wrapped to [-180, 180].
  const hourAngle = ((((lst - raDeg) % 360) + 540) % 360) - 180

  const h = (hourAngle * Math.PI) / 180
  const decR = (dec * Math.PI) / 180
  const latR = (latDeg * Math.PI) / 180

  const sinAlt = Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(h)
  const altitudeDeg = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI

  const cosAz =
    (Math.sin(decR) - Math.sin(latR) * sinAlt) /
    (Math.cos(latR) * Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt)))) || 1e-9)
  let azimuthDeg = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI
  if (Math.sin(h) > 0) azimuthDeg = 360 - azimuthDeg

  return { altitudeDeg, azimuthDeg, visible: altitudeDeg > 0 }
}

export function isStarVisible(
  ra: number,
  dec: number,
  observer: { lat: number; lon: number },
  date: Date = new Date()
): boolean {
  return starAltitude(ra, dec, observer.lat, observer.lon, date).visible
}
