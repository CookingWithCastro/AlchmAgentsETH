/**
 * Agent Type Model — canonical definition of the agent kinds, their economy
 * roles, and their interactions. This is the single source of truth the
 * economy/feed/leveling code classifies against.
 *
 * THREE KINDS
 * 1. HISTORICAL  (~71 canonical + user-crafted) — economy role "wallet".
 *      Earns ESMS (daily yield + bestowals), levels up (XP/EV, 1–100), posts to
 *      the feed. The "real" agents.
 * 2. PLANETARY DEGREE (~3,600: <planet>-<sign>-<degree>) — role "reservoir".
 *      A dignity-derived ESMS reservoir it RADIATES; never leveled. When a
 *      transit hits a historical agent's natal point, this degree auto-bestows
 *      a slice of its reservoir + raises that planet's planetary-12 stat on the
 *      agent (see INTERACTION constants). A "sky sprite".
 * 3. MOON  (moon-phase / moon-degree) — role "lunar-reservoir".
 *      Like a degree sprite, but the reservoir is driven by the lunar PHASE
 *      cycle rather than zodiacal dignity, and is Essence-weighted.
 *  (MONICA — the onboarding guide — has role "none": no economy, no leveling.)
 *
 * SUPPLY: bestowals TRANSFER tokens out of a reservoir into the agent's wallet;
 * a daily refresh re-mints each reservoir from its current dignity/phase, so
 * total ESMS supply stays pegged to the live sky (controlled, not inflationary).
 *
 * Design locked via the May 2026 sky-economy Q&A; mechanics are built on top of
 * the classifiers + tables below.
 */

export type UnifiedAgentType = 'historical' | 'planetary' | 'monica'
export type AgentEconomyRole = 'wallet' | 'reservoir' | 'lunar-reservoir' | 'none'
export type DignityTier = 'exaltation' | 'domicile' | 'peregrine' | 'detriment' | 'fall'

export interface EsmsVector {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export interface AgentClassification {
  type: UnifiedAgentType
  economyRole: AgentEconomyRole
  /** reservoir or lunar-reservoir → a non-leveling "sky sprite". */
  isSprite: boolean
  planet?: string
  sign?: string
  degree?: number
  lunar?: boolean
}

// ── Zodiac + planets ─────────────────────────────────────────────────────────
export const ZODIAC = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const
export type Sign = (typeof ZODIAC)[number]

export const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'chiron',
] as const
export type Planet = (typeof PLANETS)[number]

// ── Classification by agentId ────────────────────────────────────────────────
// Degree sprites: optional `planetary-` prefix, then <planet>-<sign>-<degree>.
const DEGREE_RE = new RegExp(
  `^(?:planetary-)?(${PLANETS.join('|')})-(${ZODIAC.join('|')})-(\\d{1,2})$`,
  'i'
)
const MOON_RE = /^moon[-_]/i

export function classifyAgent(agentId: string): AgentClassification {
  const id = (agentId || '').trim().toLowerCase()

  if (MOON_RE.test(id)) {
    return {
      type: 'planetary',
      economyRole: 'lunar-reservoir',
      isSprite: true,
      lunar: true,
      planet: 'moon',
    }
  }

  const m = id.match(DEGREE_RE)
  if (m) {
    return {
      type: 'planetary',
      economyRole: 'reservoir',
      isSprite: true,
      planet: m[1].toLowerCase(),
      sign: m[2].toLowerCase(),
      degree: parseInt(m[3], 10),
    }
  }

  if (id === 'monica') {
    return { type: 'monica', economyRole: 'none', isSprite: false }
  }

  // Everything else (name slugs like `socrates`, `albert-einstein`, crafted ids).
  return { type: 'historical', economyRole: 'wallet', isSprite: false }
}

/** Wallets are the only agents that accrue daily yield + level up. */
export function isEconomyWallet(agentId: string): boolean {
  return classifyAgent(agentId).economyRole === 'wallet'
}

/** Reservoir/lunar-reservoir sprites — radiate ESMS, never leveled. */
export function isSkySprite(agentId: string): boolean {
  return classifyAgent(agentId).isSprite
}

/**
 * Short tier label a sky sprite shows INSTEAD of a level number (sprites don't
 * level — the Set-4 decision repurposes their "level" surface as a tier):
 *   - degree sprite → essential-dignity tier (Exalted/Domicile/Peregrine/…)
 *   - lunar sprite  → moon phase (from a `moon-phase-<slug>-<degree>` id) or 'Lunar'
 * Returns null for wallets / monica (they keep their numeric level).
 */
export function spriteTierLabel(agentId: string): string | null {
  const c = classifyAgent(agentId)
  if (!c.isSprite) return null
  if (c.lunar) {
    const m = (agentId || '').toLowerCase().match(/^moon[-_]phase[-_]([a-z-]+?)[-_]\d+$/)
    if (m) {
      return m[1]
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    return 'Lunar'
  }
  if (c.planet && c.sign) {
    const labels: Record<DignityTier, string> = {
      exaltation: 'Exalted',
      domicile: 'Domicile',
      peregrine: 'Peregrine',
      detriment: 'Detriment',
      fall: 'Fall',
    }
    return labels[dignityOf(c.planet, c.sign)]
  }
  return 'Sprite'
}

// ── Essential dignity (5-tier) ───────────────────────────────────────────────
const DOMICILE: Record<Planet, Sign[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius'],
  uranus: ['aquarius'],
  neptune: ['pisces'],
  pluto: ['scorpio'],
  chiron: ['virgo'],
}
const EXALTATION: Partial<Record<Planet, Sign>> = {
  sun: 'aries',
  moon: 'taurus',
  mercury: 'virgo',
  venus: 'pisces',
  mars: 'capricorn',
  jupiter: 'cancer',
  saturn: 'libra',
}
const opposite = (sign: Sign): Sign => ZODIAC[(ZODIAC.indexOf(sign) + 6) % 12]

/**
 * 5-tier essential dignity of a planet in a sign:
 *   domicile (rules) > exaltation > peregrine (neutral) > detriment (opp. rule) > fall (opp. exalt).
 */
export function dignityOf(planet: string, sign: string): DignityTier {
  const p = planet.toLowerCase() as Planet
  const s = sign.toLowerCase() as Sign
  if (!PLANETS.includes(p) || !ZODIAC.includes(s)) return 'peregrine'
  if ((DOMICILE[p] || []).includes(s)) return 'domicile'
  if (EXALTATION[p] === s) return 'exaltation'
  if ((DOMICILE[p] || []).some(d => opposite(d) === s)) return 'detriment'
  if (EXALTATION[p] && opposite(EXALTATION[p] as Sign) === s) return 'fall'
  return 'peregrine'
}

export const DIGNITY_FACTOR: Record<DignityTier, number> = {
  exaltation: 1.2,
  domicile: 1.0,
  peregrine: 0.5,
  detriment: 0.25,
  fall: 0.1,
}

// ── Planet → planetary-12 stat (the parameter a degree sprite buffs) ─────────
export const PLANET_STAT: Record<Planet, string> = {
  sun: 'solarAgency',
  moon: 'lunarReceptivity',
  mercury: 'mercurialVelocity',
  venus: 'venusianCoherence',
  mars: 'martialImpetus',
  jupiter: 'jovianExpansion',
  saturn: 'saturnianStructure',
  chiron: 'chironicAdaptation',
  uranus: 'uranianSurprisal',
  neptune: 'neptunianResonance',
  pluto: 'plutonicIntegration',
}

// ── Planet → ESMS affinity (weights sum to 1) — by element/temperament ───────
export const PLANET_ESMS: Record<Planet, EsmsVector> = {
  sun: { spirit: 0.7, essence: 0.0, matter: 0.1, substance: 0.2 }, // Fire, hot/dry
  moon: { spirit: 0.0, essence: 0.8, matter: 0.1, substance: 0.1 }, // Water, cold/moist
  mercury: { spirit: 0.1, essence: 0.1, matter: 0.3, substance: 0.5 }, // Air/Earth
  venus: { spirit: 0.1, essence: 0.5, matter: 0.3, substance: 0.1 }, // Water/Earth
  mars: { spirit: 0.7, essence: 0.1, matter: 0.1, substance: 0.1 }, // Fire
  jupiter: { spirit: 0.5, essence: 0.1, matter: 0.1, substance: 0.3 }, // Fire/Air
  saturn: { spirit: 0.0, essence: 0.1, matter: 0.7, substance: 0.2 }, // Earth, cold/dry
  uranus: { spirit: 0.1, essence: 0.0, matter: 0.2, substance: 0.7 }, // Air
  neptune: { spirit: 0.1, essence: 0.7, matter: 0.0, substance: 0.2 }, // Water
  pluto: { spirit: 0.1, essence: 0.3, matter: 0.5, substance: 0.1 }, // Water/Earth
  chiron: { spirit: 0.1, essence: 0.1, matter: 0.4, substance: 0.4 }, // bridge
}

// ── Reservoir + interaction constants ────────────────────────────────────────
export const BASE_RESERVOIR = 100 // ESMS units at dignity factor 1.0 (domicile)
export const BESTOW_FRACTION = 0.1 // a degree bestows 10% of its current reservoir per attune
/** planetary-12 buff per attune, scaled by the degree's dignity factor. */
export const STAT_BUFF_BASE = 1.0
/** Soft cap for diminishing returns on the planetary-12 stat. */
export const STAT_SOFT_CAP = 50

const scaleEsms = (v: EsmsVector, k: number): EsmsVector => ({
  spirit: v.spirit * k,
  essence: v.essence * k,
  matter: v.matter * k,
  substance: v.substance * k,
})

/**
 * A planetary degree sprite's reservoir = BASE × dignityFactor, split into ESMS
 * by the planet's affinity. Recomputed daily against the live sky.
 */
export function degreeReservoir(planet: string, sign: string): EsmsVector {
  const p = planet.toLowerCase() as Planet
  if (!PLANETS.includes(p)) return { spirit: 0, essence: 0, matter: 0, substance: 0 }
  const factor = DIGNITY_FACTOR[dignityOf(p, sign)]
  return scaleEsms(PLANET_ESMS[p], BASE_RESERVOIR * factor)
}

/**
 * Lunar sprite reservoir, driven by the PHASE cycle (0 = new → 0.5 = full → 1 = new),
 * Essence-weighted. Waxing fills toward Full; waning drains toward New.
 * `illumination` is 0..1 (fraction lit).
 */
export function lunarReservoir(illumination: number): EsmsVector {
  const lit = Math.max(0, Math.min(1, illumination))
  // Essence-dominant, sized by illumination (min floor so New isn't fully dry).
  const total = BASE_RESERVOIR * (0.15 + 0.85 * lit)
  return scaleEsms({ spirit: 0.05, essence: 0.8, matter: 0.05, substance: 0.1 }, total)
}

/** Diminishing-returns planetary-12 buff for an attune, scaled by dignity. */
export function statBuff(currentStat: number, planet: string, sign: string): number {
  const factor = DIGNITY_FACTOR[dignityOf(planet, sign)]
  const remaining = Math.max(0, 1 - currentStat / STAT_SOFT_CAP)
  return STAT_BUFF_BASE * factor * remaining
}
