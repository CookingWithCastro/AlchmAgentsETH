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

/**
 * The eight axes the four thermodynamic quantities are computed from.
 */
export interface ThermodynamicAxes {
  spirit: number
  essence: number
  matter: number
  substance: number
  fire: number
  water: number
  air: number
  earth: number
}

export interface Thermodynamics {
  heat: number
  entropy: number
  reactivity: number
  gregsEnergy: number
}

export const KALCHM_EQUILIBRIUM = 1
export const MONICA_EQUILIBRIUM = 1.618

/**
 * AAE's denominator convention: a zero denominator falls back to 1.
 *
 * This is AAE's own convention, shared by backend/thermodynamics.py and the
 * Rust engine, and is deliberately NOT WTEN's THERMO_DEN_FLOOR of 0.01. The
 * two differ by 100x whenever a numerator is non-zero over a zero denominator,
 * so the choice is load-bearing and must not be changed in one runtime alone.
 */
const denominatorOr1 = (denominator: number) => (denominator > 0 ? denominator : 1)

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
 * Canonical thermodynamic quantities.
 *
 * BASIS: DERIVED. Each is a sum of squares over a SQUARED SUM of axes:
 *
 *   Heat       = (S² + Fire²)                     / (Su + E + M + W + A + Ea)²
 *   Entropy    = (S² + Su² + Fire² + Air²)        / (E + M + Ea + W)²
 *   Reactivity = (S² + Su² + E² + Fire² + Air² + W²) / (M + Ea)²
 *   GregsEnergy = Heat - Entropy · Reactivity
 *
 * Every denominator is a PARENTHESISED SUM, THEN SQUARED. Transcribing any of
 * them as `num / term + other²` silently moves a term out of the denominator
 * and re-adds it — the two forms coincide only at isolated points (reactivity's
 * forms agree only when Earth = 0 and Matter = 1), so the error hides in tests
 * that happen to sit on the coincidence. Reactivity carried exactly that defect
 * in this repo's Python and Rust engines until it was corrected against these
 * definitions; that is why all four now live here rather than at each call site.
 */
export function calculateThermodynamics({
  spirit,
  essence,
  matter,
  substance,
  fire,
  water,
  air,
  earth,
}: ThermodynamicAxes): Thermodynamics {
  const heat =
    (Math.pow(spirit, 2) + Math.pow(fire, 2)) /
    denominatorOr1(Math.pow(substance + essence + matter + water + air + earth, 2))

  const entropy =
    (Math.pow(spirit, 2) + Math.pow(substance, 2) + Math.pow(fire, 2) + Math.pow(air, 2)) /
    denominatorOr1(Math.pow(essence + matter + earth + water, 2))

  const reactivity =
    (Math.pow(spirit, 2) +
      Math.pow(substance, 2) +
      Math.pow(essence, 2) +
      Math.pow(fire, 2) +
      Math.pow(air, 2) +
      Math.pow(water, 2)) /
    denominatorOr1(Math.pow(matter + earth, 2))

  return { heat, entropy, reactivity, gregsEnergy: heat - entropy * reactivity }
}

/**
 * Canonical thermodynamic Monica formula.
 *
 * BASIS: DERIVED from M = -energy / (reactivity · ln(K_alchm)).
 *
 * The raw formula is preserved, including its sign. Exact Kalchm equilibrium
 * resolves to the documented equilibrium value. Malformed inputs are ABSENT
 * rather than being made indistinguishable from a legitimate equilibrium.
 *
 * NO NEAR-EQUILIBRIUM BAND IS APPLIED, and this is now a MEASURED result rather
 * than an assertion. WTEN derives its band as the midpoint of a bimodal gap, a
 * derivation their own measurement script says is only available when the gap
 * exists: "If there is no gap, the band cannot be derived this way and any
 * epsilon is a threshold on a continuum." AAE ran that measurement over its own
 * population — the census is committed as backend/test_ln_kalchm_population.py,
 * so these figures are reproducible and fail loudly if the population moves —
 * and the gap COLLAPSES as bodies are added, rather than staying open:
 *
 *   bodies   population        |ln K| exactly 0   smallest non-zero |ln K|
 *   1        264 (exhaustive)  216                0.09564719034165112
 *   2        15 840            6 912              0.00419218084488104
 *   3        570 240           124 416            0.0000322455078457
 *   complete 20 000 sampled    0                  bounded above 2.0
 *
 * So AAE's distribution is a CONTINUUM, not two clusters, and no band is
 * derivable here; any epsilon would be an arbitrary threshold that also
 * swallowed legitimate results (26 882 of the 570 240 three-body cells fall
 * inside WTEN's constant alone). Complete charts — the only kind this server
 * generates — never approach equilibrium at all. The near-singular values are
 * reachable only from PARTIAL charts, so they are excluded at the boundary
 * where they enter (backend/main.py validates request.customPlanets) rather
 * than by widening this test into a threshold the data does not support.
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
