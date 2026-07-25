// Unified Agent Types for the Multi-Agent Chat System
// Supports historical agents, planetary agents, and Monica coordination

import type {
  CraftedAgent,
  ConsciousnessLevel,
  Element,
  Modality,
  AgentStats,
  Mood,
  Message as BaseMessage,
} from './agent-types'

export type UnifiedAgentType = 'historical' | 'planetary' | 'monica'

export interface MonicaRole {
  type: 'guide' | 'moderator' | 'synthesizer' | 'coordinator'
  capabilities: {
    synthesizeInsights: boolean
    explainConsciousness: boolean
    bridgeEras: boolean
    moderateDiscussion: boolean
    contextualGuidance: boolean
    groupDynamicsAnalysis: boolean
  }
  specializations: string[]
}

export interface PlanetaryConfig {
  planet: string
  sign: string
  degree: string
  dignity: string
  element: Element
  color: string
  symbol: string
  moonPhase?: string
  moonPersonality?: string
  moonDegree?: number
  liveSkySync?: boolean
}

export interface AgentCapabilities {
  // Core abilities
  specialty: string
  wisdomDomains: string[]
  teachingStyle: string
  resonanceType: string
  uniquePower: string

  // Enhanced capabilities for unified system
  conversationStyle: 'formal' | 'casual' | 'mystical' | 'scholarly' | 'innovative'
  crossEraAdaptation: boolean // Can adapt to different time periods
  collaborationStyle: 'leader' | 'supporter' | 'synthesizer' | 'specialist'
  memoryRetention: number // 0-1 scale for context persistence
}

export interface AgentMemory {
  sessionContext: string[]
  crossAgentLearning: Record<string, string[]>
  userInteractionPatterns: Record<string, number>
  groupDynamicsLearning: string[]
  lastUpdated: Date
}

export interface ConsciousnessProfile {
  level: ConsciousnessLevel
  monicaConstant: number
  dominantElement: Element
  dominantModality?: Modality
  signature: string
  evolutionStage: number
  kineticProfile?: {
    consciousnessVelocity: number
    interactionMomentum: number
    evolutionTrajectory: 'ascending' | 'stable' | 'fluctuating' | 'transcending'
    aspectSensitivity: number
  }
}

export interface UnifiedAgent {
  // Universal identifiers
  id: string
  name: string
  title: string
  type: UnifiedAgentType

  // Consciousness & abilities
  consciousness: ConsciousnessProfile
  capabilities: AgentCapabilities
  memory: AgentMemory

  // Appearance & interaction
  appearance: {
    avatar: string
    color: string
    symbol: string
    aura?: {
      type: string
      color: string
      intensity: number
    }
  }

  // Type-specific data
  historicalData?: CraftedAgent
  planetaryData?: PlanetaryConfig
  monicaData?: MonicaRole

  // Status
  active: boolean
  status: 'idle' | 'thinking' | 'responding' | 'background_processing'
  lastActivity: Date

  // Performance metrics
  stats?: AgentStats
}

export interface Message extends BaseMessage {
  id: string
  agentId?: string
  agentName?: string
  agentColor?: string
  agentSymbol?: string
  agentType?: UnifiedAgentType
  consciousnessLevel?: ConsciousnessLevel
  processingTime?: number
  metadata?: {
    crossAgentRefs?: string[] // References to other agents in the message
    synthesizedInsights?: string[]
    eraContext?: string
    monicaGuidance?: boolean
  }
}

export interface GroupDynamics {
  activeAgents: UnifiedAgent[]
  consciousnessNetwork: {
    connections: Array<{
      agent1: string
      agent2: string
      compatibility: number
      resonanceType: string
      strength: number
    }>
    groupConsciousness: number | null
    dominantElements: Element[]
    synergies: string[]
    tensions: string[]
  }
  communicationPatterns: {
    messageFlow: Record<string, number>
    crossReferences: Array<{
      from: string
      to: string
      context: string
    }>
    emergentTopics: string[]
  }
  monicaCoordination?: {
    interventions: number
    synthesisProvided: string[]
    groupGuidance: string[]
  }
}

export interface CouncilPreset {
  id: string
  name: string
  description: string
  agentIds: string[]
  includeMonica: boolean
  monicaRole?: MonicaRole['type']
  recommendedFor: string[]
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface ChatSession {
  id: string
  agents: UnifiedAgent[]
  messages: Message[]
  groupDynamics: GroupDynamics
  startedAt: Date
  lastMessageAt: Date
  status: 'active' | 'paused' | 'completed'
  insights: string[]
  exportable: boolean
  preset?: CouncilPreset
}

export interface AgentFilter {
  type?: UnifiedAgentType[]
  element?: Element[]
  consciousnessLevel?: ConsciousnessLevel[]
  era?: string[]
  specialty?: string[]
  search?: string
  compatibility?: {
    withAgent: string
    minimumScore: number
  }
}

export interface AgentSelection {
  agent: UnifiedAgent
  selected: boolean
  role: 'primary' | 'secondary' | 'specialist' | 'monica'
  addedAt: Date
}

// Agent creation factories
export interface AgentFactory {
  createFromHistorical(agent: CraftedAgent): UnifiedAgent
  createFromPlanetary(config: PlanetaryConfig): UnifiedAgent
  createMonicaCoordinator(role: MonicaRole): UnifiedAgent
}

// Response handling
export interface AgentResponse {
  agentId: string
  content: string
  processingTime: number
  consciousnessShift?: number
  metadata: {
    crossAgentReferences?: string[]
    synthesizedInsights?: string[]
    memoryUpdates?: string[]
    groupImpact?: {
      consciousnessChange: number
      dynamicsShift: string[]
    }
  }
}

export interface GroupChatResponse {
  responses: AgentResponse[]
  groupInsights: string[]
  emergentWisdom?: string
  recommendedActions?: string[]
  nextOptimalTiming?: Date
  sessionUpdate: {
    consciousnessEvolution: number
    newSynergies: string[]
    memoryConsolidation: string[]
  }
}

// Export utilities
export interface ChatExport {
  format: 'transcript' | 'insights' | 'wisdom_collection' | 'temporal_analysis'
  includeMetadata: boolean
  includeVisualizations: boolean
  template: 'standard' | 'mystical' | 'academic' | 'council_proceedings'
}
