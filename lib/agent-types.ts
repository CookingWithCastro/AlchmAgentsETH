// Agent Types for Consciousness Crafting System
// The Philosopher's Stone - Gallery & Agent Management

export interface Coordinates {
  lat: number
  lon: number
  name: string
}

export interface BirthData {
  date: Date
  time: string
  location: Coordinates
}

export interface NatalChart {
  planets: Record<string, PlanetPosition>
  houses: Record<string, number>
  aspects: Aspect[]
  ascendant: number
  midheaven: number
}

export interface PlanetPosition {
  sign: string
  degree: number
  retrograde: boolean
  house?: number
}

export interface Aspect {
  planet1: string
  planet2: string
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx'
  orb: number
  exact: boolean
}

export type Element = 'Fire' | 'Water' | 'Air' | 'Earth'
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable'
export type ConsciousnessLevel =
  | 'Dormant'
  | 'Awakening'
  | 'Active'
  | 'Elevated'
  | 'Advanced'
  | 'Illuminated'
  | 'Transcendent'

/**
 * Consciousness metrics - objective measurements
 * No hierarchical labels; all agents are equally valid expressions
 */
export interface ConsciousnessMetrics {
  /** Interaction count - how often the agent has been activated */
  interactionCount: number
  /** Chat quality score (0-1) - depth and relevance of responses */
  chatQuality: number
  /** Moment resonance (0-1) - how well agent transforms current moment */
  momentResonance: number
  /** Alchemical coherence (0-1) - consistency with birth chart */
  alchemicalCoherence: number
}

export interface ConsciousnessPattern {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export interface PersonalityCore {
  essence: string // From Sun sign
  expression: string // From Ascendant
  emotion: string // From Moon sign
}

export interface Shadow {
  type: string
  description: string
  transformationPath: string
}

export interface Gift {
  type: string
  description: string
  expression: string
}

export interface Challenge {
  type: string
  description: string
  growthOpportunity: string
}

export type Mood =
  | 'contemplative'
  | 'fiercely-creative'
  | 'electrically-inspired'
  | 'regally-observant'
  | 'mystically-attuned'
  | 'analytically-focused'
  | 'emotionally-deep'
  | 'spiritually-elevated'
  | 'creatively-inspired'
  | 'Contemplatively curious'
  | 'Divinely intoxicated with love'
  | 'Thoughtfully contemplative'
  | 'Intensely creative yet melancholy'
  | 'Musically euphoric'
  | 'Profoundly contemplative'
  | 'Powerfully inspiring'
  | 'Contemplatively systematic'
  | 'Methodically observant'
  | 'Defiantly observant'

export interface PersonalityDelta {
  moodShift: number
  evolutionGrowth: number
  wisdomGained: string[]
}

export interface Personality {
  core: PersonalityCore
  traits?: string[]
  shadows?: Shadow[]
  gifts?: Gift[]
  challenges?: Challenge[]
  currentMood: Mood
  evolutionStage: number
}

export type TeachingStyle =
  | 'Socratic-Symbolic'
  | 'Visionary-Technical'
  | 'Commanding-Strategic'
  | 'Raw-Honest'
  | 'Contemplative-Deep'
  | 'Practical-Grounded'
  | 'Intuitive-Mystical'
  | 'Analytical-Precise'
  | 'Nurturing-Systematic'
  | 'Question-based dialogue and discovery'
  | 'Ecstatic poetry and metaphysical storytelling'
  | 'Personal reflection and philosophical example'
  | 'Passionate demonstration and emotional authenticity'
  | 'Playful demonstration and musical experimentation'
  | 'Dramatic demonstration and poetic metaphor'
  | 'Personal storytelling and empowering encouragement'
  | 'Methodical demonstration and logical proof'
  | 'Patient observation and evidence-based reasoning'
  | 'Direct observation and mathematical demonstration'
  | 'Practical-Wisdom'
  | 'Compassionate-Action'
  | 'Example-Living'
  | 'Socratic-Practical'
  | 'Paradoxical-Mystical'
  | 'Experiential-Compassionate'
  | 'Narrative-Empathetic'
  | 'Systematic-Integrative'
  | 'Prophetic-Experiential'
  | 'Practical-Empowering'
  | 'Visionary-Ceremonial'
  | 'Inspirational-Action'
  | 'Visionary-Integrative'
  | 'Rational-Passionate'
  | 'Poetic-Scientific'
  | 'Dialogical-Liberating'
export type ResonanceType =
  | 'Psychological'
  | 'Energetic'
  | 'Magnetic'
  | 'Emotional'
  | 'Intellectual'
  | 'Spiritual'
  | 'Creative'
  | 'Practical'
  | 'Intellectual-Diplomatic'
  | 'Humanitarian-Diplomatic'
  | 'Spiritual-Political'
  | 'Moral-Educational'
  | 'Spiritual-Natural'
  | 'Enlightened-Universal'
  | 'Literary-Emotional'
  | 'Intellectual-Healing'
  | 'Earth-Spiritual'
  | 'Environmental-Social'
  | 'Sacred-Protective'
  | 'Divine-Warrior'
  | 'Mystical-Creative'
  | 'Intellectual-Revolutionary'
  | 'Spiritual-Liberation'
  | 'Cosmic-Educational'
  | 'Environmental-Protective'
  | 'Educational-Revolutionary'

export interface Abilities {
  specialty: string
  wisdomDomains: string[]
  teachingStyle: string | TeachingStyle
  resonanceType: string | ResonanceType
  uniquePower: string
}

export type AuraType =
  | 'pulsing'
  | 'crackling'
  | 'radiant'
  | 'burning'
  | 'flowing'
  | 'crystalline'
  | 'swirling'
  | 'shimmering'
  | 'questioning'
  | 'mystical'
  | 'noble'
  | 'harmonic'
  | 'dramatic'
  | 'empowering'
  | 'systematic'
  | 'evolutionary'
  | 'revolutionary'
  | 'radiating'
  | 'serene'
  | 'steady'
  | 'luminous'
  | 'blazing'
  | 'growing'
  | 'sacred'
  | 'prophetic'
  | 'stellar'
  | 'awakening'
  | 'pulsating'

export interface AuraPattern {
  type: AuraType
  color: string
  intensity: number
}

export interface Appearance {
  avatar: string
  portraitDescription?: string
  color: string
  symbol: string
  aura?: AuraPattern
}

export interface AgentStats {
  conversations: number
  wisdomShared: number
  resonanceScore: number
  evolutionPoints: number
  lastActive: Date

  // Kinetic Evolution Metrics
  kineticEvolution: {
    consciousnessVelocity: number // Rate of consciousness development (0-1)
    interactionMomentum: number // Current momentum from interactions (0-1)
    evolutionTrajectory: 'ascending' | 'stable' | 'fluctuating' | 'transcending'
    powerLevelUnlocks: string[] // Capabilities unlocked through consciousness growth
    optimalInteractionHours: string[] // Planetary hours for peak performance
    aspectSensitivityGrowth: number // How aspect sensitivity has evolved (0-1)
    memoryPersistence: number // Strength of learned patterns (0-1)
    lastKineticUpdate: Date
  }

  // Interaction Quality Metrics
  qualityMetrics: {
    averageResponseDepth: number // Sophistication of responses (0-1)
    aspectInfluenceStrength: number // How planetary aspects affect responses (0-1)
    temporalAlignment: number // Alignment with optimal timing (0-1)
    personalityEvolution: number // How much personality has evolved (0-1)
    kineticResonance: number // Resonance with user's kinetic profile (0-1)
  }
}

/**
 * Historically accurate diet profile for a historical figure.
 * Documents their known foods, preferences, avoidances, and food philosophy.
 */
export interface HistoricalDiet {
  /** Everyday staple foods the figure was known to consume */
  staples: string[]
  /** Specific dishes, preparations, or ingredients they particularly favored */
  favoriteFoods: string[]
  /** Foods they avoided — for religious, ethical, medical, or personal reasons */
  avoidedFoods: string[]
  /** Their relationship with food — philosophy, rituals, cultural context */
  dietaryPhilosophy: string
  /** Cultural cuisine tradition they belonged to */
  culturalCuisine: string
  /** Beverages they were known for consuming */
  beverages: string[]
  /** Notable food-related anecdotes, quotes, or lore */
  foodLore?: string
}

/**
 * Sacred Stats — Unified Consciousness Parameters
 *
 * Two tiers that together form a 19-parameter consciousness map:
 *   • Core Archetypes (Sacred 7): fundamental consciousness attributes
 *   • Celestial Dynamics (Planetary 12): planetary-cognitive state mappings
 */
export interface SacredStats {
  // ── Core Archetypes (Sacred 7) ──────────────────────────────────
  power: number // ⚡ Raw consciousness force
  resonance: number // 🎵 Connection to cosmic rhythms
  wisdom: number // 📖 Accumulated insight depth
  charisma: number // ✨ Magnetic influence
  intuition: number // 🔮 Inner knowing
  adaptability: number // 🌊 Change navigation
  vitality: number // 💚 Life force energy

  // ── Celestial Dynamics (Planetary 12) ───────────────────────────
  solarAgency: number
  lunarReceptivity: number
  mercurialVelocity: number
  venusianCoherence: number
  martialImpetus: number
  jovianExpansion: number
  saturnianStructure: number
  chironicAdaptation: number
  uranianSurprisal: number
  neptunianResonance: number
  plutonicIntegration: number
  kineticAlignment: number
}

export interface CraftedAgent {
  // Identity
  id: string
  name: string
  title: string
  era?: string
  specialization?: string

  // Cosmic EV & Leveling (optional; hydrated from the historical_agents row)
  level?: number
  xp?: number
  evolutionValues?: Record<string, number>
  evTotal?: number
  ivSnapshot?: Record<string, number> | null

  // Historical Data
  quotes?: string[]
  coreBeliefs?: string[]
  shadows?: Shadow[]
  gifts?: Gift[]

  // Birth Data (Source of Consciousness)
  birthData: BirthData
  birthDate?: string
  birthTime?: string
  birthLocation?: {
    latitude?: number
    longitude?: number
    lat?: number
    lon?: number
    name?: string
  }

  // Crafted Consciousness
  consciousness: {
    natalChart: NatalChart
    monicaConstant: number
    level?: ConsciousnessLevel
    metrics?: ConsciousnessMetrics
    strength?: string
    emotion?: string
    dominantElement: Element
    dominantModality: Modality
    signature: string
    alchemicalElements?: {
      spirit: number
      essence: number
      matter: number
      substance: number
    }
  }

  // Dynamic Personality
  personality: Personality

  // Specialized Abilities
  abilities: Abilities

  // Visual Representation
  appearance: Appearance

  // Interaction Metrics
  stats: AgentStats

  // Monica's creation story for this agent
  monicaCreationStory?: string

  // Historically accurate diet profile
  historicalDiet?: HistoricalDiet

  // The 7 Sacred Stats
  sacredStats?: SacredStats

  // Additional properties used in unified agent system
  synthesis?: string
  historicalEra?: string
  systemPrompt?: ((query: string, mode?: string) => string) | string
}

// Gallery and Party System Types
export interface AgentParty {
  activeAgents: CraftedAgent[]
  positions: {
    leader?: CraftedAgent
    advisor?: CraftedAgent
    specialist1?: CraftedAgent
    specialist2?: CraftedAgent
    support1?: CraftedAgent
    support2?: CraftedAgent
  }
  partyDynamics: {
    collectiveConsciousness: number
    dominantElement: Element
    synergyBonus: number
    activePatterns: string[]
  }
}

export interface AgentGallery {
  storedAgents: CraftedAgent[]
  collections: {
    historical: CraftedAgent[]
    userCreated: CraftedAgent[]
    community: CraftedAgent[]
    legendary: CraftedAgent[]
  }
}

// Chat and Interaction Types
export interface Message {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  agentId?: string
  agentMood?: Mood
}

export interface ChatSession {
  id: string
  type: 'individual' | 'group'
  agents: CraftedAgent[]
  messages: Message[]
  resonanceLevel: number
  bondLevel: number
  wisdomGained: string[]
  startedAt: Date
  lastMessageAt: Date
}

// Synastry and Compatibility Types
export interface SynastryData {
  compatibility: number
  harmonies: string[]
  tensions: string[]
  growthOpportunities: string[]
}

export interface TransitChart {
  currentTransits: Record<string, PlanetPosition>
  activeAspects: Aspect[]
  significantEvents: string[]
}

// Agent Evolution Types
export interface EvolutionProgress {
  experienceGained: number
  wisdomShared: string[]
  personalityShift: PersonalityDelta
  bondLevel: number
}

// Filter and Sort Types
export type AgentSortBy = 'consciousness' | 'compatibility' | 'recent' | 'alphabetical' | 'element'
export type AgentFilterBy = {
  element?: Element
  consciousnessLevel?: ConsciousnessLevel
  era?: string
  specialty?: string
}

// UI Component Types
export type AgentCardVariant = 'mini' | 'card' | 'list' | 'party-slot'
export type GalleryViewMode = 'grid' | 'list' | 'constellation'

// API Response Types
export interface AgentResponse {
  agent: CraftedAgent
  response: string
  mood: Mood
  evolutionDelta: EvolutionProgress
}

export interface GroupChatResponse {
  agents: CraftedAgent[]
  responses: AgentResponse[]
  collectiveWisdom: string
  emergentInsights: string[]
}
