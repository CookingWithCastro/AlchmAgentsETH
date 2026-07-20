/**
 * Aspect kinematics — applying/separating dynamics for a planet pair.
 *
 * Extracted from /api/alchm-quantities/aspects so any surface (that route,
 * the free-body-diagram builder, future forecast views) derives the same
 * applying/separating verdicts from the same finite-difference model.
 */

/** Below this |orb velocity| (deg/day) the pair is treated as stationary. */
export const STATIONARY_EPS = 1e-4

/**
 * Finite-difference step in days. One minute: small enough that even the Moon
 * (~13°/day) moves under 0.01°, so the step can't jump a feature of the curve.
 */
const DT_DAYS = 1 / 1440

/**
 * Minimal angular separation from an aspect's ideal angle.
 * Returns a value in [0, 180].
 */
export function computeOrb(long1: number, long2: number, aspectAngle: number): number {
  return Math.abs(signedOrb(long1, long2, aspectAngle))
}

/**
 * Orb WITH a sign: negative before the ideal angle, positive past it.
 *
 * Differencing the unsigned orb is what makes a near-exact aspect read as
 * separating: |orb| reflects at exact, so any step that crosses exact comes
 * back larger and the verdict flips at peak strength — worst for the Moon,
 * which is the body most likely to be near exact. The signed value passes
 * smoothly through zero, so its derivative stays meaningful there.
 */
export function signedOrb(long1: number, long2: number, aspectAngle: number): number {
  let diff = Math.abs(long1 - long2) % 360
  if (diff > 180) diff = 360 - diff
  return diff - aspectAngle
}

export interface AspectKinematics {
  /** Signed rate of change of orb in degrees/day (negative = applying). */
  orbVelocity: number
  /** true = approaching exact, false = moving away or stationary. */
  applying: boolean
  /** Coupling state — applying stores energy, separating discharges. */
  state: 'applying' | 'separating' | 'stationary'
  /** Days until (applying) or since (separating) exact. 9999 when stationary. */
  daysToExact: number
  /** Relative angular velocity speed1 − speed2 in degrees/day (signed). */
  relativeAngularVelocity: number
}

/**
 * Compute the kinematic state of an aspect from both bodies' longitudes and
 * signed daily motions (deg/day, negative while retrograde).
 */
export function computeAspectKinematics(
  long1: number,
  long2: number,
  aspectAngle: number,
  speed1: number,
  speed2: number
): AspectKinematics {
  // Differentiate the SIGNED orb (smooth through exact), then convert to the
  // rate of change of the unsigned orb the callers report.
  const signedNow = signedOrb(long1, long2, aspectAngle)
  const long1Next = (long1 + speed1 * DT_DAYS + 360) % 360
  const long2Next = (long2 + speed2 * DT_DAYS + 360) % 360
  const signedNext = signedOrb(long1Next, long2Next, aspectAngle)

  const currentOrb = Math.abs(signedNow)
  const signedRate = (signedNext - signedNow) / DT_DAYS
  // d|s|/dt = sign(s) · ds/dt. Exactly at exact (s = 0) the orb can only grow,
  // so report the outbound rate rather than a spurious "applying".
  const orbVelocity = signedNow === 0 ? Math.abs(signedRate) : Math.sign(signedNow) * signedRate
  const applying = orbVelocity < -STATIONARY_EPS
  const state: AspectKinematics['state'] =
    Math.abs(orbVelocity) < STATIONARY_EPS ? 'stationary' : applying ? 'applying' : 'separating'

  // Days to exact (positive both ways: time until exact when applying, time
  // since exact when separating — matches the aspects API contract).
  const daysToExact = Math.abs(orbVelocity) > 1e-6 ? currentOrb / Math.abs(orbVelocity) : 9999

  return {
    orbVelocity,
    applying,
    state,
    daysToExact,
    relativeAngularVelocity: speed1 - speed2,
  }
}
