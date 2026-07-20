// Planetary data

/**
 * Planetary mass relative to Earth (Earth = 1.0).
 *
 * Source: NASA planetary fact sheets.
 * These are the **actual** physical mass ratios — not pre-computed scoring
 * coefficients.  Scoring code normalizes them internally (log₁₀ scale).
 *
 * NOTE: PLANET_WEIGHTS is used by the WhatToEatNext FOOD-recommendation layer
 * (ingredient scoring, recipe matching). It correctly privileges massive bodies
 * (Sun, Jupiter) because physical presence matters for culinary archetypes.
 *
 * For the ALCHM thermodynamic engine, use PLANET_ALCHM_PERIODS instead.
 */
export const PLANET_WEIGHTS: Record<string, number> = {
  Sun: 333054.2532, // 1.989 × 10³⁰ kg
  Jupiter: 317.8165, // 1.898 × 10²⁷ kg
  Saturn: 95.1608, // 5.683 × 10²⁶ kg
  Neptune: 17.1467, // 1.024 × 10²⁶ kg
  Uranus: 14.5362, // 8.681 × 10²⁵ kg
  Earth: 1.0, // 5.972 × 10²⁴ kg  (reference)
  Venus: 0.815, // 4.867 × 10²⁴ kg
  Mars: 0.107, // 6.390 × 10²³ kg
  Mercury: 0.055, // 3.285 × 10²³ kg
  Moon: 0.0123, // 7.342 × 10²² kg
  Pluto: 0.0022, // 1.309 × 10²² kg
}

/**
 * Normalizes a relative-mass value to [0, 1] via log₁₀.
 * Pluto → 0.0, Sun → 1.0.
 * Used by food-recommendation scoring; not for Alchm thermodynamics.
 */
const _MASS_LOG_MIN = Math.log10(0.0022) // Pluto
const _MASS_LOG_MAX = Math.log10(333054.2532) // Sun
export function normalizePlanetWeight(relMass: number): number {
  return (Math.log10(Math.max(relMass, 1e-9)) - _MASS_LOG_MIN) / (_MASS_LOG_MAX - _MASS_LOG_MIN)
}

/**
 * Orbital periods in Earth years.
 *
 * Used by the ALCHM thermodynamic engine (RealAlchemizeService, planetaryAlchemyMapping).
 * Slower planets carry higher "alchemical volume":
 *   - Pluto (P=248y) creates generational tides — highest weight
 *   - Moon  (P≈0.075y) creates personal ripples — lowest weight
 *
 * Includes Ascendant as the "Physical Vessel" grounding constant (P=1 day ≈ 0.003y),
 * which anchors the reactivity denominator even in pure diurnal charts.
 *
 * Source: NASA/IAU mean sidereal periods.
 */
export const PLANET_ALCHM_PERIODS: Record<string, number> = {
  Pluto: 247.94, // P=248y  — generational, deepest tide
  Neptune: 164.79, // P=165y
  Uranus: 84.01, // P=84y
  Saturn: 29.46, // P=29.5y
  Jupiter: 11.86, // P=12y
  Mars: 1.88, // P=1.9y
  Sun: 1.0, // P=1y   (solar year — ecliptic reference)
  Venus: 0.615, // P=225d
  Mercury: 0.241, // P=88d
  Moon: 0.075, // P=27.3d
  Ascendant: 0.003, // P=1d — Physical Vessel grounding constant
}

/**
 * Normalises an orbital-period value to [0, 1] via log₁₀.
 *
 * Moon (P=0.075y) → ≈ 0.0   (lowest alchemical volume)
 * Pluto (P=248y)  → ≈ 1.0   (highest alchemical volume)
 *
 * Used exclusively by the Alchm thermodynamic engine.
 */
const _PERIOD_LOG_MIN = Math.log10(0.003) // Ascendant (1 day)
const _PERIOD_LOG_MAX = Math.log10(247.94) // Pluto
export function normalizeAlchmWeight(periodYears: number): number {
  return (
    (Math.log10(Math.max(periodYears, 1e-9)) - _PERIOD_LOG_MIN) /
    (_PERIOD_LOG_MAX - _PERIOD_LOG_MIN)
  )
}

export const planetaryData = {
  Sun: {
    element: 'Fire',
    foodCorrespondences: ['sunflower seeds', 'oranges', 'cinnamon'],
    cookingMethods: ['grilling', 'roasting'],
    governs: ['vitality', 'ego', 'expression'],
    physicalWeight: PLANET_WEIGHTS.Sun,
  },
  Moon: {
    element: 'Water',
    foodCorrespondences: ['milk', 'cucumber', 'melon'],
    cookingMethods: ['steaming', 'poaching'],
    governs: ['emotions', 'intuition', 'nurturing'],
    physicalWeight: PLANET_WEIGHTS.Moon,
  },
  Mercury: {
    element: 'Air',
    foodCorrespondences: ['nuts', 'beans', 'herbs'],
    cookingMethods: ['quick sautéing', 'stir-frying'],
    governs: ['communication', 'intellect', 'perception'],
    physicalWeight: PLANET_WEIGHTS.Mercury,
  },
  Venus: {
    element: 'Earth',
    foodCorrespondences: ['apples', 'berries', 'chocolate'],
    cookingMethods: ['baking', 'confectionery'],
    governs: ['love', 'beauty', 'harmony'],
    physicalWeight: PLANET_WEIGHTS.Venus,
  },
  Mars: {
    element: 'Fire',
    foodCorrespondences: ['red meat', 'spicy foods', 'garlic'],
    cookingMethods: ['grilling', 'high-heat cooking'],
    governs: ['energy', 'passion', 'action'],
    physicalWeight: PLANET_WEIGHTS.Mars,
  },
  Jupiter: {
    element: 'Fire',
    foodCorrespondences: ['fruits', 'honey', 'nutmeg'],
    cookingMethods: ['roasting', 'slow cooking'],
    governs: ['expansion', 'abundance', 'optimism'],
    physicalWeight: PLANET_WEIGHTS.Jupiter,
  },
  Saturn: {
    element: 'Earth',
    foodCorrespondences: ['root vegetables', 'grains', 'bitter foods'],
    cookingMethods: ['slow cooking', 'fermenting'],
    governs: ['discipline', 'structure', 'time'],
    physicalWeight: PLANET_WEIGHTS.Saturn,
  },
}

export default planetaryData
