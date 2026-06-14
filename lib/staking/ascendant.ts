/**
 * The ascendant (rising degree) and star activation.
 *
 * The ascendant sweeps the ecliptic at ~15 arc-minutes per minute of clock time. A star
 * is "on the line of the ascendant" while its ecliptic longitude is within an orb of the
 * rising degree; with a ±2′ orb that window lasts ~16 seconds (the owner's figure), kept
 * astronomically real by treating "1 arc minute" as the orb rather than slowing the sky.
 */

import { calculateEnhancedAscendant } from '@/lib/enhanced-astronomical-calculator'
import { raDecToEclipticLongitude } from './elements'
import type { ObserverLocation } from './types'

/** Average ascendant speed: 360° per sidereal day ≈ 15 arc-minutes per minute. */
export const ASC_ARCMIN_PER_MINUTE = 15

/** Activation orb in arc-minutes (±). ±2′ → a ~16s window at the true ascendant rate. */
export const ACTIVATION_ORB_ARCMIN = Number(
  process.env.NEXT_PUBLIC_ASC_ACTIVATION_ORB_ARCMIN ?? '2'
)

/** Live rising degree (ecliptic longitude, 0..360) for an observer at an instant. */
export function ascendantLongitude(observer: ObserverLocation, at: Date = new Date()): number {
  const a = calculateEnhancedAscendant({
    year: at.getUTCFullYear(),
    month: at.getUTCMonth() + 1,
    day: at.getUTCDate(),
    hour: at.getUTCHours(),
    minute: at.getUTCMinutes(),
    second: at.getUTCSeconds(),
    latitude: observer.lat,
    longitude: observer.lon,
  })
  return a.longitude
}

/** Separation (arc-minutes) between a star's zodiacal degree and the ascendant. */
export function arcminFromAscendant(starLongitudeDeg: number, ascDeg: number): number {
  const d = Math.abs(((((starLongitudeDeg - ascDeg) % 360) + 540) % 360) - 180)
  return d * 60
}

/** Is the star within the activation orb of the rising degree? */
export function isStarOnAscendant(
  star: { ra: number; dec: number },
  ascDeg: number,
  orbArcmin: number = ACTIVATION_ORB_ARCMIN
): boolean {
  const lon = raDecToEclipticLongitude(star.ra, star.dec)
  return arcminFromAscendant(lon, ascDeg) <= orbArcmin
}

/** The activation window length in seconds implied by the orb + true ascendant rate. */
export function activationWindowSeconds(orbArcmin: number = ACTIVATION_ORB_ARCMIN): number {
  return ((2 * orbArcmin) / ASC_ARCMIN_PER_MINUTE) * 60
}
