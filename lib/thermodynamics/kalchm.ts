/**
 * Canonical Kalchm engine.
 *
 * BASIS: DERIVED from K_alchm = (S^S · E^E) / (M^M · Su^Su).
 *
 * JavaScript's `0 ** 0 === 1` is the exact limiting value of x^x as x tends
 * to zero, so zero axes require no floor. Negative axes are clamped to zero
 * because a negative base with a fractional exponent is not real. The final
 * guard preserves a finite, positive totality contract for non-finite input.
 */
export interface KalchmAxes {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export interface MonicaInputs {
  energy: number
  reactivity: number
  kalchm: number
}

export const KALCHM_EQUILIBRIUM = 1
export const MONICA_EQUILIBRIUM = 1.618

export function calculateKalchm({ spirit, essence, matter, substance }: KalchmAxes): number {
  const nonNegative = (value: number) => (value > 0 ? value : 0)
  const safeSpirit = nonNegative(spirit)
  const safeEssence = nonNegative(essence)
  const safeMatter = nonNegative(matter)
  const safeSubstance = nonNegative(substance)

  const numerator = Math.pow(safeSpirit, safeSpirit) * Math.pow(safeEssence, safeEssence)
  const denominator = Math.pow(safeMatter, safeMatter) * Math.pow(safeSubstance, safeSubstance)
  const kalchm = numerator / denominator

  return Number.isFinite(kalchm) && kalchm > 0 ? kalchm : KALCHM_EQUILIBRIUM
}

/**
 * Canonical thermodynamic Monica formula.
 *
 * BASIS: DERIVED from M = -energy / (reactivity · ln(K_alchm)).
 *
 * The raw formula is preserved, including its sign. Exact Kalchm equilibrium
 * resolves to the documented equilibrium value. Malformed inputs are ABSENT
 * rather than being made indistinguishable from a legitimate equilibrium.
 * No near-equilibrium band is applied: AAE has no measured population basis
 * for one, and the inspected WTEN history conflicts with the supplied
 * structural-degeneracy description.
 */
export function calculateMonica({ energy, reactivity, kalchm }: MonicaInputs): number | null {
  if (
    !Number.isFinite(energy) ||
    !Number.isFinite(reactivity) ||
    !Number.isFinite(kalchm) ||
    kalchm <= 0
  ) {
    return null
  }

  const lnKalchm = Math.log(kalchm)
  if (lnKalchm === 0) return MONICA_EQUILIBRIUM
  if (reactivity === 0) return null

  const monica = -energy / (reactivity * lnKalchm)
  return Number.isFinite(monica) ? monica : null
}
