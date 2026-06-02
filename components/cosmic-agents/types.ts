/* Council Feed — Type definitions
 * Mirrors the design's data shape; adapters bridge to production CraftedAgent.
 */

export type Element = 'Fire' | 'Water' | 'Earth' | 'Air'
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
export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

export interface Sign {
  name: string
  glyph: string
  element: Element
  modality: 'Cardinal' | 'Fixed' | 'Mutable'
  ruler: string
}

export interface PlanetInfo {
  glyph: string
  element: Element
  color: string
}

export interface NatalPosition {
  planet: PlanetName | string
  sign: string
  degree: number
}

export interface ChartPosition extends NatalPosition {
  retrograde: boolean
  dignity: 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine'
}

export interface Aspect {
  a: PlanetName | string
  b: PlanetName | string
  type: AspectType
  orb: number
  applying: boolean
  intensity: number
}

export interface Thermodynamics {
  heat: number
  entropy: number
  reactivity: number
  energy: number
  aNumber: number
}

export interface ChartOfMoment {
  timestamp: Date | string
  location: string
  planetaryHour: string
  planetaryDay: string
  moonPhase: string
  moonIllumination: number
  dominantPlanet: PlanetName | string
  dominantSign: string
  dominantElement: Element
  rulerReason: string
  positions: ChartPosition[]
  aspects: Aspect[]
  thermodynamics: Thermodynamics
  elemental: Record<Element, number>
}

export interface Sacred7Stats {
  power: number
  resonance: number
  wisdom: number
  charisma: number
  intuition: number
  adaptability: number
  vitality: number
}

export interface Planetary12 {
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

export interface ESMS {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export type AgentKind = 'user' | 'historical' | 'planetary' | 'lunar'

export interface CouncilAgent {
  id: string
  name: string
  kind: AgentKind
  sun?: string
  moon?: string
  rising?: string
  planet?: PlanetName | string
  natal: NatalPosition[]
  elemental: Record<Element, number>
  esms: ESMS
  monicaConstant: number
  kalchm: number
  stats: Sacred7Stats
  planetary12: Planetary12
  specialty: string
  evolutionLevel?: string
  consciousness?: string
  cooldown: number // minutes remaining
  birthDate?: string
  birthLocation?: string
  dignity?: string
  isRulerOfMoment?: boolean
}

export type JingMoveId = 'meltdown' | 'freeze' | 'tectonicRoot' | 'vacuum' | 'erode'

export interface JingMove {
  name: string
  element: string
  type: string
  threshold: number
  description: string
  cost: {
    stat: keyof Sacred7Stats | keyof Planetary12 | keyof ESMS | string
    amount: number
    secondary?: { stat: string; amount: number }
  }
  counters: JingMoveId[]
  counteredBy: JingMoveId[]
  glyph: string
}

/* ── Feed event union ─────────────────────────────────────────── */

interface BaseEvent {
  id: string
  timestamp: string | Date
  imageUrl?: string
  imagePrompt?: string
}

export interface StreamingEvent extends BaseEvent {
  type: 'streaming'
  initiator: string
  target: string
  move: JingMoveId
  cost: { stat: string; spent: number; before: number; after: number }
  streamingVoice: string
  streamingProgress: number
  confidence: number
}

export interface JingDuelEvent extends BaseEvent {
  type: 'jing-duel'
  status: 'active' | 'resolved'
  initiator: string
  target: string
  move: JingMoveId
  cost: { stat: string; spent: number; before: number; after: number }
  intensity: number
  voice: string
  aspectContext?: { type: AspectType; a: string; b: string; orb: number; applying: boolean }
  rulerBoost?: number
  confidence: number
  outcome?: 'won' | 'lost' | 'draw'
  thread?: JingCounter[]
}

export interface JingCounter {
  id: string
  type: 'jing-counter'
  timestamp: string | Date
  initiator: string
  target: string
  move: JingMoveId
  cost: { stat: string; spent: number; before?: number; after?: number }
  deflects?: JingMoveId
  breaks?: JingMoveId
  voice: string
  pending?: boolean
  confidence?: number
  amplified?: boolean
  outcome?: 'win' | 'loss'
}

export interface PlanetaryDegreeEvent extends BaseEvent {
  type: 'planetary-degree'
  agentId: string
  planet: PlanetName
  sign: string
  degree: number
  previousDegree: number
  dignity: string
  element: Element
  modality: string
  title: string
  body: string
  boostsAgents?: string[]
  rulerEvent?: boolean
}

export interface AspectActivationEvent extends BaseEvent {
  type: 'aspect-activation'
  aspect: { a: PlanetName; b: PlanetName; type: AspectType; orb: number }
  activates: string[]
  title: string
  body: string
  discount: number
}

export interface AllianceEvent extends BaseEvent {
  type: 'alliance'
  participants: string[]
  bond: number
  sharedElement: Element
  sharedAspect?: string
  voice: Record<string, string>
  move?: {
    name: string
    element: string
    threshold: number | null
    cost: { stat: string; spent: number }
  }
}

export interface InsightEvent extends BaseEvent {
  type: 'insight'
  agentId: string
  title: string
  body: string
  confidence: number
  trigger?: string
}

export interface LabEntryEvent extends BaseEvent {
  type: 'lab-entry'
  agentId: string
  title: string
  body: string
  elementalTags?: Partial<Record<Element, number>>
  aNumber: number
  rating?: number
}

export interface CouncilEvent extends BaseEvent {
  type: 'council'
  topic: string
  convener: string
  participants: string[]
  aspectContext?: { a: PlanetName; b: PlanetName; type: AspectType; orb: number }
  rounds: Array<{ agentId: string; stance: string; voice: string }>
  standings: Record<string, number>
  resolution: 'unresolved' | 'resolved'
}

export interface PactEvent extends BaseEvent {
  type: 'pact'
  title: string
  members: string[]
  sharedPool: { vitality: number; adaptability: number; charisma: number }
  bond: number
  duration: string
  triggers: string
  activations: number
}

export interface SigilEvent extends BaseEvent {
  type: 'sigil'
  name: string
  contributors: Array<{ agentId: string; element: Element; glyph: string }>
  progress: number
  effect: string
}

export interface EvolutionEvent extends BaseEvent {
  type: 'evolution'
  agentId: string
  from: string
  to: string
  abilityUnlocked: string
  triggerXP: number
  title: string
  body: string
}

export interface SystemEvent extends BaseEvent {
  type: 'system'
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  affectedAgent?: string
}

export type FeedEvent =
  | StreamingEvent
  | JingDuelEvent
  | PlanetaryDegreeEvent
  | AspectActivationEvent
  | AllianceEvent
  | InsightEvent
  | LabEntryEvent
  | CouncilEvent
  | PactEvent
  | SigilEvent
  | EvolutionEvent
  | SystemEvent
