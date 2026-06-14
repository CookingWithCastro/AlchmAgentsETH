/**
 * Star-staking domain types. Shared by the yield engine, the attestor, the API
 * routes and the pentacle UI. Kept dependency-free so it can be imported from both
 * server (attestor, routes) and client (hooks, components).
 */

export type Element = 'Fire' | 'Water' | 'Earth' | 'Air'

/** ESMS token ids — must match EsmsToken.sol / lib/esms-chain. */
export type EsmsId = 0 | 1 | 2 | 3

export type PlanetName =
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

/** A star you can stake on — a SpacetimeDB `star_node` enriched with its element. */
export interface StakeableStar {
  hipId: number
  name: string
  /** Right ascension (hours if |ra|<=24, else degrees — matches the live ephemeris). */
  ra: number
  /** Declination (degrees). */
  dec: number
  magnitude: number
  heldBy: PlanetName | null
  /** SpacetimeDB zone id (`region_hint`), 0..10 for the 11 pentacle zones. */
  regionHint: number
  /** Dominant element, from the sign the star's ecliptic longitude falls in. */
  element: Element
  /** The ESMS id this star pays yield in (Fire→Spirit, Water→Essence, Earth→Matter, Air→Substance). */
  esmsId: EsmsId
}

/** A live transiting planet position (from useLiveEphemeris or the REST ephemeris). */
export interface LivePlanet {
  planet: PlanetName
  sign: string
  degree: number
  retrograde?: boolean
}

/** The chart-derived inputs that personalize a staker's rate. */
export interface NatalAffinity {
  dominantElement?: Element | string | null
  /** 0..1 harmonic alignment constant. */
  monicaConstant?: number | null
  /** Per-element affinity scores from user_natal_charts (roughly 0..100). */
  spiritScore?: number | null // Fire
  essenceScore?: number | null // Water
  matterScore?: number | null // Earth
  substanceScore?: number | null // Air
}

export interface ObserverLocation {
  lat: number
  lon: number
}

export interface YieldRateInputs {
  star: StakeableStar
  planets: LivePlanet[]
  natal?: NatalAffinity | null
  observer?: ObserverLocation | null
  at?: Date
}

export interface YieldRateBreakdown {
  esmsId: EsmsId
  element: Element
  /** Base ESMS minted per 1 USDC staked per day, before multipliers. */
  baseDailyRate: number
  /** Sky elemental-dominance multiplier (~0.5..2.0). */
  zoneDominance: number
  /** Natal-chart affinity multiplier (~0.5..2.5). */
  chartAffinity: number
  /** Transiting-planet dignity multiplier (~1.0..2.0). */
  planetDignity: number
  /** Is the star currently above the observer's horizon? */
  visible: boolean
  altitudeDeg: number
  /** Composite ESMS per USDC per day (0 while the star is set). */
  dailyRatePerUsdc: number
  /** Illustrative annualized headline for the UI. */
  apyPct: number
  /** Live boost from the star's zone (aspect pools + ascendant activations), 1 if none. */
  zoneBoost?: number
}
