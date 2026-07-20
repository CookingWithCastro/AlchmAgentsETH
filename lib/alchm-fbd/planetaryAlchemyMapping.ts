/**
 * Planetary Alchemy Mapping - Authoritative Source
 *
 * This module contains the ONLY correct method for calculating ESMS properties
 * (Spirit, Essence, Matter, Substance) from planetary positions.
 *
 * CRITICAL: ESMS values CANNOT be derived from elemental properties (Fire/Water/Earth/Air).
 * They MUST be calculated from planetary alchemy values.
 *
 * Based on the core alchemizer engine specification.
 *
 * Sectarian Logic (January 2026):
 * Each planet has two elemental natures - one for the day sect (diurnal) and one
 * for the night sect (nocturnal). Saturn, for example, is Air by day and Earth by
 * night. These sectarian elements drive the dynamic elemental profile of the sky.
 */

import {
  PLANET_WEIGHTS,
  normalizePlanetWeight,
  PLANET_ALCHM_PERIODS,
  normalizeAlchmWeight,
} from './planetData'
import type { DignityType, ElementalProperties } from './types'
import type { AlchemicalProperties } from './types'
import { calculateAspectESMSModifications, type AspectWithStrength } from './aspectESMSEffects'
import { getDignityScore } from './dignityScales'

export type { AlchemicalProperties }

/**
 * Planetary Alchemy Values (Authoritative from Alchemizer Engine)
 *
 * Each planet contributes specific ESMS values:
 * - Sun: Pure Spirit (consciousness, vitality)
 * - Moon: Essence + Matter (emotion, substance)
 * - Mercury: Spirit + Substance (intellect, communication)
 * - Venus: Essence + Matter (beauty, harmony)
 * - Mars: Essence + Matter (action, energy)
 * - Jupiter: Spirit + Essence (expansion, wisdom)
 * - Saturn: Spirit + Matter (structure, discipline)
 * - Uranus: Essence + Matter (innovation, change)
 * - Neptune: Essence + Substance (intuition, dissolution)
 * - Pluto: Essence + Matter (transformation, power)
 */
export const PLANETARY_ALCHEMY = {
  Sun: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
  Moon: { Spirit: 0, Essence: 1, Matter: 1, Substance: 0 },
  Mercury: { Spirit: 1, Essence: 0, Matter: 0, Substance: 1 },
  Venus: { Spirit: 0, Essence: 1, Matter: 1, Substance: 0 },
  Mars: { Spirit: 0, Essence: 1, Matter: 1, Substance: 0 },
  Jupiter: { Spirit: 1, Essence: 1, Matter: 0, Substance: 0 },
  Saturn: { Spirit: 1, Essence: 0, Matter: 1, Substance: 0 },
  Uranus: { Spirit: 0, Essence: 1, Matter: 1, Substance: 0 },
  Neptune: { Spirit: 0, Essence: 1, Matter: 0, Substance: 1 },
  Pluto: { Spirit: 0, Essence: 1, Matter: 1, Substance: 0 },
} as const

/**
 * Planetary Sectarian ESMS - Day vs Night Alchemy
 *
 * Based on traditional astrological sect (day/night planetary dignity),
 * planets express different ESMS qualities depending on whether the chart
 * is diurnal (day) or nocturnal (night).
 *
 * Key principle: Day sect emphasizes Spirit (consciousness, vitality);
 * Night sect emphasizes Matter/Substance (material, emotional, transformative).
 *
 * User's Dignity Table Data:
 * - Day (Diurnal): Sun, Mercury, Jupiter, Saturn → Spirit
 * - Night (Nocturnal):
 *   - Moon, Venus, Mars, Saturn, Uranus, Pluto → Matter
 *   - Mercury, Neptune → Substance
 *   - Jupiter → Essence
 *   - Sun → always Spirit
 */
export const PLANETARY_SECTARIAN_ESMS = {
  Sun: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 }, // Sun always contributes Spirit
  },
  Moon: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  Mercury: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 }, // Day: Spirit
    nocturnal: { Spirit: 0, Essence: 0, Matter: 0, Substance: 1 }, // Night: Substance
  },
  Venus: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  Mars: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  Jupiter: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 }, // Day: Spirit
    nocturnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 }, // Night: Essence
  },
  Saturn: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 }, // Day: Spirit
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  Uranus: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  Neptune: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 0, Substance: 1 }, // Night: Substance
  },
  Pluto: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 }, // Night: Matter
  },
  /**
   * Ascendant — Physical Vessel / Grounding Constant
   *
   * The Ascendant (column AJ in Dignity Tables) contributes (+++) to ALL
   * principles. It represents the "Physical Vessel" — the embodied reality
   * that grounds Spirit/Essence into the material world.
   *
   * Critically, this provides the baseline Matter and Substance values that
   * prevent the Reactivity formula from division-by-zero in pure Day charts.
   * The Ascendant's sect-invariance (same day and night) reflects that the
   * physical body exists in both states equally.
   */
  Ascendant: {
    diurnal: { Spirit: 1, Essence: 1, Matter: 1, Substance: 1 }, // (+++) to all
    nocturnal: { Spirit: 1, Essence: 1, Matter: 1, Substance: 1 }, // sect-invariant
  },
} as const

/**
 * Zodiac Sign to Element Mapping
 *
 * Used to aggregate elemental properties from planetary positions.
 * Each planet's sign contributes its element to the total.
 */
export const ZODIAC_ELEMENTS = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
} as const

export type ZodiacSignType = keyof typeof ZODIAC_ELEMENTS
export type PlanetName = keyof typeof PLANETARY_ALCHEMY
export type AlchemicalElement = 'Fire' | 'Water' | 'Earth' | 'Air'
export type ZodiacQuality = 'Cardinal' | 'Fixed' | 'Mutable'

/**
 * Planetary Sectarian Elements - Traditional Western Astrology
 *
 * In classical astrology each planet belongs to a sect (diurnal or nocturnal).
 * When it functions within its preferred sect it expresses one element; in the
 * contrary sect it expresses another. This produces the dynamic "live sky" profile
 * that shifts at every sunrise and sunset.
 *
 * Day sect planets: Sun, Jupiter, Saturn
 * Night sect planets: Moon, Venus, Mars
 * Mercury is adaptable - it joins whichever sect it rises with
 *
 * Diurnal / Nocturnal element assignments (traditional authority).
 *
 * ⚠️ This table is TRANSCRIBED FROM THE CODE BELOW, which is authoritative.
 * It previously disagreed with its own code for FOUR of the ten planets
 * (Venus, Jupiter, Uranus, Pluto had their pairs swapped or altered), so
 * anyone hand-porting the engine from this header — as the sibling repos
 * must — encoded four wrong sect elements. Sect drives the 0.4-weight pull
 * vector on every FBD card, so a wrong pair silently tilts the elemental
 * push. If you change the code, change this list in the same commit.
 *
 *   Sun     Fire  / Fire    (luminary - always Fire)
 *   Moon    Water / Water   (luminary - always Water)
 *   Mercury Air   / Earth   (adapts to sect)
 *   Venus   Water / Earth
 *   Mars    Fire  / Water
 *   Jupiter Air   / Fire
 *   Saturn  Air   / Earth   ← key correction (was wrong before)
 *   Uranus  Water / Air     (modern)
 *   Neptune Water / Water   (modern - watery by nature)
 *   Pluto   Earth / Water   (modern - transformative)
 */
export const PLANETARY_SECTARIAN_ELEMENTS = {
  Sun: { diurnal: 'Fire' as AlchemicalElement, nocturnal: 'Fire' as AlchemicalElement },
  Moon: { diurnal: 'Water' as AlchemicalElement, nocturnal: 'Water' as AlchemicalElement },
  Mercury: { diurnal: 'Air' as AlchemicalElement, nocturnal: 'Earth' as AlchemicalElement },
  Venus: { diurnal: 'Water' as AlchemicalElement, nocturnal: 'Earth' as AlchemicalElement },
  Mars: { diurnal: 'Fire' as AlchemicalElement, nocturnal: 'Water' as AlchemicalElement },
  Jupiter: { diurnal: 'Air' as AlchemicalElement, nocturnal: 'Fire' as AlchemicalElement },
  Saturn: { diurnal: 'Air' as AlchemicalElement, nocturnal: 'Earth' as AlchemicalElement },
  Uranus: { diurnal: 'Water' as AlchemicalElement, nocturnal: 'Air' as AlchemicalElement },
  Neptune: { diurnal: 'Water' as AlchemicalElement, nocturnal: 'Water' as AlchemicalElement },
  Pluto: { diurnal: 'Earth' as AlchemicalElement, nocturnal: 'Water' as AlchemicalElement },
} as const

export const PLANETARY_SECTARIAN_ALCHEMICAL = {
  Sun: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
  },
  Moon: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
  Mercury: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 0, Substance: 1 },
  },
  Venus: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
  Mars: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
  Jupiter: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
  },
  Saturn: {
    diurnal: { Spirit: 1, Essence: 0, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
  Uranus: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
  Neptune: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 0, Substance: 1 },
  },
  Pluto: {
    diurnal: { Spirit: 0, Essence: 1, Matter: 0, Substance: 0 },
    nocturnal: { Spirit: 0, Essence: 0, Matter: 1, Substance: 0 },
  },
} as const

/**
 * Zodiac Sign Qualities (Modalities)
 *
 * Each sign belongs to one of three qualities that describe the MODE of its action:
 *   Cardinal - initiates, begins, leads (Aries, Cancer, Libra, Capricorn)
 *   Fixed    - sustains, concentrates, endures (Taurus, Leo, Scorpio, Aquarius)
 *   Mutable  - adapts, disperses, transitions (Gemini, Virgo, Sagittarius, Pisces)
 */
export const ZODIAC_QUALITIES: Record<string, ZodiacQuality> = {
  Aries: 'Cardinal',
  Taurus: 'Fixed',
  Gemini: 'Mutable',
  Cancer: 'Cardinal',
  Leo: 'Fixed',
  Virgo: 'Mutable',
  Libra: 'Cardinal',
  Scorpio: 'Fixed',
  Sagittarius: 'Mutable',
  Capricorn: 'Cardinal',
  Aquarius: 'Fixed',
  Pisces: 'Mutable',
}

/**
 * Determine whether the current moment is diurnal (day) or nocturnal (night).
 *
 * A fully precise answer requires the observer's geographic coordinates and the
 * local sidereal time to compute the Sun's altitude above the horizon. Without
 * location data this function uses UTC hour as a reasonable approximation:
 * 06:00–18:00 UTC → diurnal, otherwise → nocturnal.
 *
 * @param date - Optional date/time to evaluate (defaults to now)
 * @returns true if diurnal (day), false if nocturnal (night)
 */
export function isSectDiurnal(date?: Date): boolean {
  const d = date ?? new Date()
  const hour = d.getUTCHours()
  return hour >= 6 && hour < 18
}

/**
 * Determine the sect of a *birth* moment.
 *
 * Birth times arrive as timezone-less wall-clock strings ("1990-05-15T14:30")
 * and so are parsed in whatever zone the host runs in. The astrologize payload
 * reads that Date back with the local getters, so the wall clock round-trips and
 * the chart itself is host-independent — but {@link isSectDiurnal} reads
 * getUTCHours(), which is not. On a UTC host (Vercel) the two agree; on any other
 * host the same birth flips day/night, which swings the whole ESMS profile
 * (day ~32/49/9/9 vs night ~14/16/47/22).
 *
 * Re-projecting the wall clock into UTC keeps sect on the same hour the chart was
 * computed from, on every host. This is a no-op in production.
 *
 * Note: like isSectDiurnal, this is still a 06:00–18:00 local-clock approximation
 * of "sun above the horizon", not a true altitude calculation.
 *
 * @param birth - the birth instant, as parsed from a wall-clock string
 * @returns true if diurnal (day), false if nocturnal (night)
 */
export function isSectDiurnalForBirth(birth: Date): boolean {
  const wallClock = new Date(
    Date.UTC(
      birth.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
      birth.getHours(),
      birth.getMinutes()
    )
  )
  return isSectDiurnal(wallClock)
}

/**
 * Get the sectarian element for a planet given the current sect.
 *
 * @param planet - Planet name (capitalised: "Sun", "Moon", etc.)
 * @param diurnal - true if the current sect is diurnal (day), false for nocturnal
 * @returns The element the planet expresses under the current sect
 */
export function getPlanetarySectElement(planet: string, diurnal: boolean): AlchemicalElement {
  const entry = PLANETARY_SECTARIAN_ELEMENTS[planet as keyof typeof PLANETARY_SECTARIAN_ELEMENTS]
  if (!entry) return 'Air' // safe fallback
  return diurnal ? entry.diurnal : entry.nocturnal
}

/**
 * Get the quality (modality) for a zodiac sign.
 *
 * @param sign - Zodiac sign name (any capitalisation)
 * @returns Cardinal, Fixed, or Mutable
 */
export function getZodiacQuality(sign: string): ZodiacQuality {
  const key = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()
  return ZODIAC_QUALITIES[key] ?? 'Mutable'
}

/**
 * Calculate ESMS (Alchemical) Properties from Planetary Positions
 *
 * This is the ONLY correct method for deriving Spirit, Essence, Matter, and Substance.
 *
 * @param planetaryPositions - Map of planet names to zodiac sign positions
 * @returns Alchemical properties (Spirit, Essence, Matter, Substance)
 *
 * @example
 * const positions = {
 *   Sun: 'Gemini',
 *   Moon: 'Leo',
 *   Mercury: 'Taurus',
 *   Venus: 'Gemini',
 *   Mars: 'Aries',
 *   Jupiter: 'Gemini',
 *   Saturn: 'Pisces',
 *   Uranus: 'Taurus',
 *   Neptune: 'Aries',
 *   Pluto: 'Aquarius'
 * };
 * const alchemical = calculateAlchemicalFromPlanets(positions);
 * // Result: { Spirit: 4, Essence: 6, Matter: 6, Substance: 2 }
 */
export function calculateAlchemicalFromPlanets(
  planetaryPositions: { [planet: string]: string },
  diurnal: boolean = true
): AlchemicalProperties {
  const totals: AlchemicalProperties = {
    Spirit: 0,
    Essence: 0,
    Matter: 0,
    Substance: 0,
  }

  const ignoredBodies = new Set([
    'Ascendant',
    'Midheaven',
    'True Node',
    'South Node',
    'Chiron',
    'Lilith',
    'Vertex',
    'Pars Fortune',
    'Mean Node',
    'NorthNode',
    'SouthNode',
    'MC',
  ])

  for (const planet in planetaryPositions) {
    if (ignoredBodies.has(planet)) {
      continue
    }

    const entry =
      PLANETARY_SECTARIAN_ALCHEMICAL[planet as keyof typeof PLANETARY_SECTARIAN_ALCHEMICAL]

    // Fallback to legacy PLANETARY_ALCHEMY if missing, though it shouldn't be
    const legacyPlanetData = PLANETARY_ALCHEMY[planet as PlanetName]
    const planetData = entry ? (diurnal ? entry.diurnal : entry.nocturnal) : legacyPlanetData

    if (!planetData) {
      console.warn(`Unknown planet in alchemical calculation: ${planet}`)
      continue
    }

    // Weight each planet's ESMS contribution by its log-normalized physical
    // mass so that massive bodies (Sun, Jupiter) dominate the chart profile.
    // Sun (w=1.0) → full contribution; Mercury (w≈0.17) → ~17% contribution.
    const relMass = PLANET_WEIGHTS[planet] ?? 1.0
    const w = normalizePlanetWeight(relMass)

    totals.Spirit += planetData.Spirit * w
    totals.Essence += planetData.Essence * w
    totals.Matter += planetData.Matter * w
    totals.Substance += planetData.Substance * w
  }

  return totals
}

/**
 * Enhanced ESMS Calculation with Sect, Dignity, and Aspects
 *
 * This is the NEW authoritative method for calculating ESMS properties
 * with full three-layer modification system:
 *
 * LAYER 1: Base ESMS from sect-aware planetary alchemy (PLANETARY_SECTARIAN_ESMS)
 * LAYER 2: Dignity modifications using +10/+7 scale (getDignityScore from dignityScales)
 * LAYER 3: Aspect modifications based on planet-pair interactions (aspectESMSEffects)
 *
 * The three-layer calculation flow:
 * 1. Get base ESMS from PLANETARY_SECTARIAN_ESMS based on sect (day/night)
 * 2. Apply dignity weighting: multiplier = 1 + (dignityScore / 100)
 *    - Domicile (+10): 1.10 multiplier (10% boost)
 *    - Fall (-10): 0.90 multiplier (10% reduction)
 * 3. Apply aspect modifications scaled by aspect strength (orb tightness)
 *
 * @param planetaryPositions - Map of planet names to zodiac sign positions
 * @param diurnal - true if day chart, false if night chart (defaults to true)
 * @param aspects - Optional array of aspects with strength values
 * @returns Enhanced alchemical properties with all modifications applied
 *
 * @example
 * const positions = {
 *   Sun: 'Aries',     // Sun in Aries (exaltation +7)
 *   Moon: 'Taurus',   // Moon in Taurus (exaltation +7)
 *   Mercury: 'Gemini' // Mercury in Gemini (domicile +10)
 * };
 * const aspects = [
 *   { planet1: 'Sun', planet2: 'Moon', type: 'opposition', strength: 0.95 }
 * ];
 * const alch = calculateEnhancedAlchemicalFromPlanets(positions, true, aspects);
 * // Result includes all three layers of modification
 */
export function calculateEnhancedAlchemicalFromPlanets(
  planetaryPositions: { [planet: string]: string },
  diurnal: boolean = true,
  aspects?: AspectWithStrength[]
): AlchemicalProperties {
  return calculateEnhancedAlchemicalFromPlanetsDetailed(planetaryPositions, diurnal, aspects).totals
}

/** One body's Layer-1 × Layer-2 contribution to the ESMS totals. */
export interface EnhancedPlanetContribution {
  /** baseESMS(sect) × alchmWeight × dignityMultiplier — this body's share. */
  esms: AlchemicalProperties
  /** The sign fed in (as provided). */
  sign: string
  /** Orbital-period weight (log-normalized; Ascendant pinned to 1.0). */
  alchmWeight: number
  /** Classical dignity type from the authoritative dual-scale table. */
  dignityType: DignityType
  /** ESMS-scale points (+10 domicile … −10 fall) — NOT the food scale. */
  dignityEsmsScale: number
  /** The multiplier actually applied: 1 + esmsScale/100. */
  dignityMultiplier: number
  /** True for the Physical-Vessel Ascendant grounding constant. */
  isGroundingVessel: boolean
}

export interface EnhancedAlchemicalDetail {
  /** Identical to what {@link calculateEnhancedAlchemicalFromPlanets} returns. */
  totals: AlchemicalProperties
  /** Per-body Layer 1×2 contributions. Guaranteed: Σ perPlanet + aspectModifications = totals. */
  perPlanet: Record<string, EnhancedPlanetContribution>
  /** Layer-3 total (0 when no aspects were supplied). */
  aspectModifications: AlchemicalProperties
  /** True when the grounding Ascendant was injected rather than supplied. */
  ascendantInjected: boolean
}

/**
 * The three-layer ESMS calculation, exposing its per-body decomposition.
 *
 * {@link calculateEnhancedAlchemicalFromPlanets} is a thin wrapper over this,
 * so the parts provably reconcile with the whole:
 *   Σ perPlanet[*].esms + aspectModifications === totals
 *
 * Surfaces that attribute ESMS to individual planets (the free-body-diagram
 * cards) MUST read this rather than recomputing a parallel decomposition —
 * a lookalike loop that misses the Ascendant grounding constant or uses the
 * food-scale dignity table silently reports Matter/Substance of 0 for every
 * planet in a day chart.
 */
export function calculateEnhancedAlchemicalFromPlanetsDetailed(
  planetaryPositions: { [planet: string]: string },
  diurnal: boolean = true,
  aspects?: AspectWithStrength[]
): EnhancedAlchemicalDetail {
  const totals: AlchemicalProperties = {
    Spirit: 0,
    Essence: 0,
    Matter: 0,
    Substance: 0,
  }
  const perPlanet: Record<string, EnhancedPlanetContribution> = {}

  // Physical-Vessel grounding: in the diurnal sect every planet maps to
  // Spirit/Essence, so Matter & Substance collapse to 0 in any day chart lacking
  // an Ascendant. Natal charts carry a computed Ascendant; a location-less "live
  // sky" set does not — so inject one when absent, the single grounding chokepoint
  // for all callers. The Ascendant's dignity is always Neutral so the sign is
  // irrelevant (flat +1 to all four). Injected into a copy (never mutate the
  // caller's input); since only signs feed ESMS, it can't become a phantom aspect.
  const positions = planetaryPositions.Ascendant
    ? planetaryPositions
    : { ...planetaryPositions, Ascendant: 'aries' }

  // NOTE: the Ascendant is intentionally NOT ignored — see grounding note above.
  const ignoredBodies = new Set([
    'Midheaven',
    'True Node',
    'North Node',
    'South Node',
    'Chiron',
    'Lilith',
    'Vertex',
    'Pars Fortune',
    'Mean Node',
    'NorthNode',
    'SouthNode',
    'northNode',
    'southNode',
    'MC',
  ])

  // LAYER 1 & 2: Base ESMS with sect and dignity modifications
  for (const planet in positions) {
    if (ignoredBodies.has(planet)) {
      continue
    }
    const sign = positions[planet]

    // Get sect-based ESMS from new PLANETARY_SECTARIAN_ESMS constant
    const sectEntry = PLANETARY_SECTARIAN_ESMS[planet as keyof typeof PLANETARY_SECTARIAN_ESMS]

    if (!sectEntry) {
      console.warn(`Unknown planet in enhanced alchemical calculation: ${planet}`)
      continue
    }

    // LAYER 1: Get base ESMS based on sect (day vs night)
    const baseESMS = diurnal ? sectEntry.diurnal : sectEntry.nocturnal

    // Alchm weight: orbital-period based (slower = higher alchemical volume)
    // Pluto (P=248y) → weight = 1.0; Moon (P=27d) → weight ≈ 0.28
    //
    // NOTE: this is the ORBITAL-PERIOD scale (normalizeAlchmWeight), which is
    // NOT the mass scale (normalizePlanetWeight) used a few hundred lines up.
    // The two disagree per planet — e.g. Mercury is ≈0.39 here but ≈0.17 by
    // mass. The stale "Moon ≈ 0.17" this line used to carry was Mercury's MASS
    // weight copied across the two scales. Don't transcribe between them.
    //
    // SPECIAL CASE: The Ascendant is the "Physical Vessel" grounding constant.
    // It provides a fixed (+1) to all principles to anchor the system,
    // as it represents the immediate physical body.
    const period = PLANET_ALCHM_PERIODS[planet] ?? 1.0
    const alchmWeight = planet === 'Ascendant' ? 1.0 : normalizeAlchmWeight(period)

    // LAYER 2: Apply dignity modifications
    const dignityScore = getDignityScore(planet, sign)
    const dignityMultiplier = 1 + dignityScore.esmsScale / 100
    // Examples: +10 → 1.10 (10% boost), -10 → 0.90 (10% reduction)

    // Apply weighted ESMS with both alchm-period and dignity modifiers
    const contribution: AlchemicalProperties = {
      Spirit: baseESMS.Spirit * alchmWeight * dignityMultiplier,
      Essence: baseESMS.Essence * alchmWeight * dignityMultiplier,
      Matter: baseESMS.Matter * alchmWeight * dignityMultiplier,
      Substance: baseESMS.Substance * alchmWeight * dignityMultiplier,
    }
    totals.Spirit += contribution.Spirit
    totals.Essence += contribution.Essence
    totals.Matter += contribution.Matter
    totals.Substance += contribution.Substance

    perPlanet[planet] = {
      esms: contribution,
      sign,
      alchmWeight,
      dignityType: dignityScore.type,
      dignityEsmsScale: dignityScore.esmsScale,
      dignityMultiplier,
      isGroundingVessel: planet === 'Ascendant',
    }
  }

  // LAYER 3: Apply aspect modifications
  const aspectModifications: AlchemicalProperties = {
    Spirit: 0,
    Essence: 0,
    Matter: 0,
    Substance: 0,
  }
  if (aspects && aspects.length > 0) {
    const aspectMods = calculateAspectESMSModifications(aspects)

    aspectModifications.Spirit = aspectMods.Spirit
    aspectModifications.Essence = aspectMods.Essence
    aspectModifications.Matter = aspectMods.Matter
    aspectModifications.Substance = aspectMods.Substance

    totals.Spirit += aspectMods.Spirit
    totals.Essence += aspectMods.Essence
    totals.Matter += aspectMods.Matter
    totals.Substance += aspectMods.Substance
  }

  return {
    totals,
    perPlanet,
    aspectModifications,
    ascendantInjected: !planetaryPositions.Ascendant,
  }
}

/**
 * Aggregate Elemental Properties from Zodiac Sign Positions
 *
 * Each planet's zodiac sign contributes its element to the total.
 * Results are normalized to sum to 1.0.
 *
 * @param planetaryPositions - Map of planet names to zodiac sign positions
 * @returns Normalized elemental properties (Fire, Water, Earth, Air)
 *
 * @example
 * const positions = { Sun: 'Gemini', Moon: 'Leo', Mercury: 'Taurus' };
 * const elementals = aggregateZodiacElementals(positions);
 * // Result: { Fire: 0.33, Water: 0, Earth: 0.33, Air: 0.33 }
 */
export function aggregateZodiacElementals(planetaryPositions: {
  [planet: string]: string
}): ElementalProperties {
  const totals = {
    Fire: 0,
    Water: 0,
    Earth: 0,
    Air: 0,
  }

  let count = 0

  for (const planet in planetaryPositions) {
    const sign = planetaryPositions[planet] as ZodiacSignType
    const element = ZODIAC_ELEMENTS[sign]

    if (!element) {
      console.warn(`Unknown zodiac sign in elemental aggregation: ${sign}`)
      continue
    }

    // Weight elemental contribution by planet's normalized physical mass.
    // Jupiter in Sagittarius adds ~7× more Fire than Mercury in Sagittarius.
    const relMass = PLANET_WEIGHTS[planet] ?? 1.0
    const w = normalizePlanetWeight(relMass)
    totals[element] += w
    count += w
  }

  // Normalize to sum = 1.0
  if (count === 0) {
    // Default to balanced if no valid positions
    return { Fire: 0.25, Water: 0.25, Earth: 0.25, Air: 0.25 }
  }

  return {
    Fire: totals.Fire / count,
    Water: totals.Water / count,
    Earth: totals.Earth / count,
    Air: totals.Air / count,
  }
}

/**
 * Enhanced Aggregate Elemental Properties from Zodiac Sign Positions
 * Includes sectarian shifts in the calculation:
 * Elemental mix = 60% sign element + 40% sect element
 */
export function aggregateEnhancedZodiacElementals(
  planetaryPositions: Record<string, string>,
  isDiurnal: boolean = true
): ElementalProperties {
  const totals = {
    Fire: 0,
    Water: 0,
    Earth: 0,
    Air: 0,
  }

  let count = 0

  for (const planet in planetaryPositions) {
    const sign = planetaryPositions[planet] as ZodiacSignType
    const signElement = ZODIAC_ELEMENTS[sign]

    const sectInfo = PLANETARY_SECTARIAN_ELEMENTS[planet as PlanetName]
    let sectElement = signElement
    if (sectInfo) {
      sectElement = isDiurnal ? sectInfo.diurnal : sectInfo.nocturnal
    }

    if (!signElement || !sectElement) {
      continue
    }

    // Weight elemental contribution by planet's normalized physical mass.
    const relMass = PLANET_WEIGHTS[planet as PlanetName] ?? 1.0
    const w = normalizePlanetWeight(relMass)

    // Blended elemental property
    totals[signElement] += w * 0.6
    totals[sectElement] += w * 0.4
    count += w
  }

  // Normalize to sum = 1.0
  if (count === 0) {
    return { Fire: 0.25, Water: 0.25, Earth: 0.25, Air: 0.25 }
  }

  return {
    Fire: totals.Fire / count,
    Water: totals.Water / count,
    Earth: totals.Earth / count,
    Air: totals.Air / count,
  }
}

/**
 * Get the dominant alchemical property
 *
 * @param alchemical - Alchemical properties
 * @returns The name of the dominant property
 */
export function getDominantAlchemicalProperty(
  alchemical: AlchemicalProperties
): keyof AlchemicalProperties {
  const entries = Object.entries(alchemical) as Array<[keyof AlchemicalProperties, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

/**
 * Get the dominant element from elemental properties
 *
 * @param elemental - Elemental properties
 * @returns The name of the dominant element
 */
export function getDominantElement(elemental: ElementalProperties): keyof ElementalProperties {
  const entries = Object.entries(elemental) as Array<[keyof ElementalProperties, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

/**
 * Get the full contribution profile for a single planet at a given moment.
 *
 * Returns:
 *   - ESMS values (from PLANETARY_ALCHEMY — the authoritative source)
 *   - The sect element the planet expresses under the current sect
 *   - The sign element (derived from the zodiac sign, if provided)
 *
 * This is the convenience function the UI should call for each planet card.
 *
 * @param planet   - Planet name (capitalised: "Sun", "Moon", etc.)
 * @param diurnal  - true if the current sect is diurnal (day)
 * @param sign     - Optional zodiac sign the planet occupies (for sign element)
 */
export function getCurrentPlanetaryContribution(
  planet: string,
  diurnal: boolean,
  sign?: string
): {
  esms: AlchemicalProperties
  sectElement: AlchemicalElement
  signElement: AlchemicalElement | null
} {
  const entry =
    PLANETARY_SECTARIAN_ALCHEMICAL[planet as keyof typeof PLANETARY_SECTARIAN_ALCHEMICAL]
  const legacyAlchemy = PLANETARY_ALCHEMY[planet as PlanetName]
  const resolvedAlchemy = entry ? (diurnal ? entry.diurnal : entry.nocturnal) : legacyAlchemy

  const esms: AlchemicalProperties = resolvedAlchemy
    ? {
        Spirit: resolvedAlchemy.Spirit,
        Essence: resolvedAlchemy.Essence,
        Matter: resolvedAlchemy.Matter,
        Substance: resolvedAlchemy.Substance,
      }
    : { Spirit: 0, Essence: 0, Matter: 0, Substance: 0 }

  const sectElement = getPlanetarySectElement(planet, diurnal)

  let signElement: AlchemicalElement | null = null
  if (sign) {
    const normalised = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()
    signElement = ZODIAC_ELEMENTS[normalised as ZodiacSignType] ?? null
  }

  return { esms, sectElement, signElement }
}

/**
 * Validate planetary positions object
 *
 * @param positions - Object to validate
 * @returns True if valid, false otherwise
 */
export function validatePlanetaryPositions(
  positions: unknown
): positions is { [planet: string]: string } {
  if (typeof positions !== 'object' || positions === null) {
    return false
  }

  const posObj = positions as { [key: string]: unknown }

  // Check that all values are strings
  for (const key in posObj) {
    if (typeof posObj[key] !== 'string') {
      return false
    }
  }

  return true
}
