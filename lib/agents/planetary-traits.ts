/**
 * Canonical per-planet trait maps — the single source of truth for the ten
 * planetary temperaments.
 *
 * These tables were historically inlined as private methods inside
 * `lib/unified-agent-factory.ts`. They are lifted here so the factory AND the
 * Word Duel strategy engine (`lib/agents/duel/planet-strategy.ts`) read the
 * SAME temperament data instead of maintaining parallel definitions. The
 * values and fallbacks are preserved verbatim from the factory so behavior is
 * unchanged.
 *
 * Each planet is also tied to its dominant "Sacred" dimension — the per-agent
 * score columns that live on the `historical_agents` table (martialImpetus,
 * jovianExpansion, …). For a synthetic planetary opponent there is no DB row,
 * so the dimension is used as a *semantic label* that names the word-selection
 * axis in a duel (Mars → raw firepower, Jupiter → length, Mercury → score).
 */

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

export const PLANETS: readonly Planet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const

export function isPlanet(value: unknown): value is Planet {
  return typeof value === 'string' && (PLANETS as readonly string[]).includes(value)
}

export interface PlanetaryTrait {
  specialty: string
  wisdomDomains: string[]
  teachingStyle: string
  resonance: string
  aura: string
  /** Dominant Sacred-dimension column this planet embodies (semantic label). */
  dominantDimension: string
}

export const PLANETARY_TRAITS: Record<Planet, PlanetaryTrait> = {
  Sun: {
    specialty: 'Identity & Leadership',
    wisdomDomains: ['Leadership', 'Self-Expression', 'Vitality', 'Authority'],
    teachingStyle: 'Authoritative-Inspiring',
    resonance: 'Energetic',
    aura: 'radiant',
    dominantDimension: 'solarAgency',
  },
  Moon: {
    specialty: 'Emotions & Intuition',
    wisdomDomains: ['Emotions', 'Intuition', 'Memory', 'Nurturing'],
    teachingStyle: 'Nurturing-Intuitive',
    resonance: 'Emotional',
    aura: 'flowing',
    dominantDimension: 'lunarReceptivity',
  },
  Mercury: {
    specialty: 'Communication & Logic',
    wisdomDomains: ['Communication', 'Learning', 'Analysis', 'Adaptability'],
    teachingStyle: 'Analytical-Communicative',
    resonance: 'Intellectual',
    aura: 'crackling',
    dominantDimension: 'mercurialVelocity',
  },
  Venus: {
    specialty: 'Love & Harmony',
    wisdomDomains: ['Relationships', 'Beauty', 'Values', 'Harmony'],
    teachingStyle: 'Harmonious-Aesthetic',
    resonance: 'Magnetic',
    aura: 'shimmering',
    dominantDimension: 'venusianCoherence',
  },
  Mars: {
    specialty: 'Action & Energy',
    wisdomDomains: ['Action', 'Courage', 'Competition', 'Initiative'],
    teachingStyle: 'Direct-Energetic',
    resonance: 'Energetic',
    aura: 'burning',
    dominantDimension: 'martialImpetus',
  },
  Jupiter: {
    specialty: 'Wisdom & Expansion',
    wisdomDomains: ['Philosophy', 'Growth', 'Optimism', 'Higher Learning'],
    teachingStyle: 'Philosophical-Expansive',
    resonance: 'Spiritual',
    aura: 'pulsing',
    dominantDimension: 'jovianExpansion',
  },
  Saturn: {
    specialty: 'Structure & Discipline',
    wisdomDomains: ['Responsibility', 'Discipline', 'Limits', 'Maturity'],
    teachingStyle: 'Structured-Disciplined',
    resonance: 'Practical',
    aura: 'crystalline',
    dominantDimension: 'saturnianStructure',
  },
  Uranus: {
    specialty: 'Innovation & Rebellion',
    wisdomDomains: ['Innovation', 'Freedom', 'Technology', 'Rebellion'],
    teachingStyle: 'Revolutionary-Innovative',
    resonance: 'Creative',
    aura: 'crackling',
    dominantDimension: 'uranianSurprisal',
  },
  Neptune: {
    specialty: 'Dreams & Spirituality',
    wisdomDomains: ['Spirituality', 'Imagination', 'Compassion', 'Transcendence'],
    teachingStyle: 'Mystical-Transcendent',
    resonance: 'Spiritual',
    aura: 'swirling',
    dominantDimension: 'neptunianResonance',
  },
  Pluto: {
    specialty: 'Transformation & Power',
    wisdomDomains: ['Transformation', 'Psychology', 'Power', 'Regeneration'],
    teachingStyle: 'Transformative-Penetrating',
    resonance: 'Psychological',
    aura: 'pulsing',
    dominantDimension: 'plutonicIntegration',
  },
}

// ---------------------------------------------------------------------------
// String-tolerant getters — preserve the exact fallbacks the factory relied on
// so `unified-agent-factory.ts` can delegate to these without behavior change.
// ---------------------------------------------------------------------------

export function planetarySpecialty(planet: string): string {
  return PLANETARY_TRAITS[planet as Planet]?.specialty || 'Universal Energy'
}

export function planetaryWisdomDomains(planet: string): string[] {
  return PLANETARY_TRAITS[planet as Planet]?.wisdomDomains || ['Universal Wisdom']
}

export function planetaryTeachingStyle(planet: string): string {
  return PLANETARY_TRAITS[planet as Planet]?.teachingStyle || 'Balanced-Universal'
}

export function planetaryResonance(planet: string): string {
  return PLANETARY_TRAITS[planet as Planet]?.resonance || 'Universal'
}

export function planetaryAuraType(planet: string): string {
  return PLANETARY_TRAITS[planet as Planet]?.aura || 'shimmering'
}
