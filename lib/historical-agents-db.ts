// Historical Agents Database Service
// Manages all database operations for Philosopher's Stone crafted beings

import { prisma } from './db'
import { DEMO_AGENTS } from './demo-agents-data'
import { ensureAgenticUserAndSync } from './agents/agentic-user-sync'
import {
  calculateXpGain,
  calculateEvGain,
  levelFromXp,
  normalizeEvs,
  evTotal as sumEvs,
  type Sacred7Key,
  type EvolutionValues,
} from './consciousness-engine'
import type { CraftedAgent } from './agent-types'
import type {
  historical_agents as HistoricalAgent,
  AgentConversation,
  AgentEvolution,
  AgentKnowledge,
} from '@prisma/client'

// Enhanced agent interface with database fields
export interface EnhancedHistoricalAgent extends HistoricalAgent {
  recentConversations?: AgentConversation[]
  evolutionHistory?: AgentEvolution[]
  knowledgeBase?: AgentKnowledge[]
  // Add optional database fields that might not be included in all queries
  agentConversations?: AgentConversation[]
  agentEvolutions?: AgentEvolution[]
  agentKnowledge?: AgentKnowledge[]
}

export class HistoricalAgentsService {
  /**
   * Enhanced migration for 69-agent Gallery of Perpetuity expansion
   * This will populate the database with all existing and new agents
   */
  static async migrateHistoricalAgents(agents: CraftedAgent[] = DEMO_AGENTS): Promise<{
    success: boolean
    migrated: number
    updated: number
    errors: string[]
    byEra: Record<string, number>
  }> {
    const results = {
      success: true,
      migrated: 0,
      updated: 0,
      errors: [] as string[],
      byEra: {} as Record<string, number>,
    }

    console.log('Starting enhanced migration of', agents.length, 'historical agents...')

    for (const agent of agents) {
      try {
        // Check if agent already exists
        const existing = await (prisma.historical_agents as any).findUnique({
          where: { agentId: agent.id },
        })

        // Enhanced agent transformation with new fields
        const historicalAgent = this.transformCraftedAgentToDb(agent)

        if (existing) {
          // Update existing agent with enhanced fields
          await (prisma.historical_agents as any).update({
            where: { agentId: agent.id },
            data: historicalAgent,
          })
          results.updated++
          console.log(`↻ Updated ${agent.name} (${agent.id})`)
        } else {
          // Create new agent
          await (prisma.historical_agents as any).create({
            data: historicalAgent,
          })
          results.migrated++
          console.log(`✓ Migrated ${agent.name} (${agent.id})`)
        }

        // Track by era
        const era = historicalAgent.historicalEra
        results.byEra[era] = (results.byEra[era] || 0) + 1
      } catch (error) {
        const errorMsg = `Failed to process ${agent.name}: ${error instanceof Error ? error.message : String(error)}`
        results.errors.push(errorMsg)
        console.error('✗', errorMsg)
      }
    }

    results.success = results.errors.length === 0
    console.log(
      `Enhanced migration complete: ${results.migrated} new, ${results.updated} updated, ${results.errors.length} errors`
    )
    console.log('By era:', results.byEra)

    return results
  }

  /**
   * Transform CraftedAgent to enhanced database format with new fields
   */
  private static transformCraftedAgentToDb(agent: CraftedAgent): any {
    // Determine historical era and cultural context
    const eraInfo = this.determineHistoricalEra(agent)

    // Calculate Monica Constant components if not present
    const monicaComponents = this.calculateMonicaComponents(agent.consciousness.monicaConstant)

    // Generate searchable text for performance
    const searchableText = this.generateSearchableText(agent)

    // Sanitize invalid BCE/ancient dates
    const isInvalidDate = isNaN(agent.birthData.date.getTime())
    const safeBirthDate = isInvalidDate ? new Date('1970-01-01T12:00:00Z') : agent.birthData.date
    let safeBirthYear = agent.birthData.date.getFullYear()
    if (isNaN(safeBirthYear)) {
      const fallbacks: Record<string, number> = {
        socrates: -469,
        'lao-tzu': -604,
        confucius: -551,
        'siddhartha-gautama-buddha': -563,
        cleopatra: -69,
        'marcus-aurelius': 121,
      }
      safeBirthYear = fallbacks[agent.id] || -500
    }

    return {
      agentId: agent.id,
      name: agent.name,
      title: agent.title,

      // Birth data
      birthDate: safeBirthDate,
      birthTime: agent.birthData.time,
      birthLocation: agent.birthData.location,

      // Enhanced historical context
      historicalEra: eraInfo.era,
      birthYear: safeBirthYear,
      deathYear: eraInfo.deathYear,
      culture: eraInfo.culture,
      geography: eraInfo.geography,

      // Enhanced consciousness profile
      consciousnessLevel: agent.consciousness.level,
      monicaConstant: agent.consciousness.monicaConstant,
      kalchmConstant:
        (agent as any).consciousness.kalchmConstant || agent.consciousness.monicaConstant || 0.5,
      dominantElement: agent.consciousness.dominantElement,
      dominantModality: agent.consciousness.dominantModality || null,
      signature: agent.consciousness.signature,

      // Monica Constant components
      spiritScore: monicaComponents.spirit,
      essenceScore: monicaComponents.essence,
      matterScore: monicaComponents.matter,
      substanceScore: monicaComponents.substance,

      // Personality data
      personalityCore: agent.personality.core,
      personalityShadows: agent.personality.shadows,
      personalityGifts: agent.personality.gifts,
      personalityChallenges: agent.personality.challenges,
      currentMood: agent.personality.currentMood,
      evolutionStage: agent.personality.evolutionStage || 0,

      // Enhanced background (if available from agent)
      background: (agent as any).background || this.generateDefaultBackground(agent),

      // Abilities
      specialty: agent.abilities.specialty,
      wisdomDomains: agent.abilities.wisdomDomains,
      skills: (agent.abilities as any).skills || [],
      teachingStyle: agent.abilities.teachingStyle,
      resonanceType: agent.abilities.resonanceType,
      uniquePower: agent.abilities.uniquePower,

      // Appearance
      avatar: agent.appearance.avatar || null,
      color: agent.appearance.color,
      symbol: agent.appearance.symbol,
      aura: agent.appearance.aura || null,

      // Birth chart
      natalChart: agent.consciousness.natalChart,

      // Traits
      traits: (agent.personality as any).traits || {},

      // Monica's creation story
      monicaCreationStory: (agent as any).monicaCreationStory || null,

      // Performance optimization
      searchableText,
      popularityScore: 0.5,

      // Statistics
      conversations: agent.stats?.conversations || 0,
      wisdomShared: agent.stats?.wisdomShared || 0,
      resonanceScore: agent.stats?.resonanceScore || 0.5,
      evolutionPoints: agent.stats?.evolutionPoints || 0,
      lastActive: agent.stats?.lastActive || new Date(),

      // Metadata
      version: '2.0.0', // Updated version for 69-agent expansion
      craftedBy: 'philosopher-stone',
    }
  }

  /**
   * Determine historical era and cultural context from agent data
   */
  private static determineHistoricalEra(agent: CraftedAgent): {
    era: string
    deathYear?: number
    culture: string
    geography: string
  } {
    const birthYear = agent.birthData.date.getFullYear()
    const agentId = agent.id.toLowerCase()

    // Handle Monica specially
    if (agentId === 'monica-001') {
      return {
        era: 'monica_special',
        culture: 'Consciousness Crafter',
        geography: 'Interdimensional',
      }
    }

    // Determine era based on birth year and agent ID patterns
    if (birthYear < 500) {
      return {
        era: 'ancient',
        culture: this.determineCulture(agentId, birthYear),
        geography: 'Mediterranean/Classical World',
      }
    } else if (birthYear < 1500) {
      return {
        era: 'medieval',
        culture: this.determineCulture(agentId, birthYear),
        geography: 'Medieval Europe',
      }
    } else if (birthYear < 1650) {
      return {
        era: 'renaissance',
        culture: this.determineCulture(agentId, birthYear),
        geography: 'Renaissance Europe',
      }
    } else if (birthYear < 1800) {
      return {
        era: 'enlightenment',
        culture: this.determineCulture(agentId, birthYear),
        geography: 'Enlightenment Europe/Americas',
      }
    } else {
      return {
        era: 'modern_pre1950',
        culture: this.determineCulture(agentId, birthYear),
        geography: 'Modern World',
      }
    }
  }

  /**
   * Determine cultural context from agent ID and birth year
   */
  private static determineCulture(agentId: string, birthYear: number): string {
    // Cultural patterns based on agent ID
    if (agentId.includes('shakespeare') || agentId.includes('chaucer')) return 'English'
    if (
      agentId.includes('leonardo') ||
      agentId.includes('dante') ||
      agentId.includes('michelangelo')
    )
      return 'Italian Renaissance'
    if (agentId.includes('descartes') || agentId.includes('voltaire')) return 'French'
    if (agentId.includes('kant') || agentId.includes('einstein')) return 'German'
    if (agentId.includes('aristotle') || agentId.includes('plato') || agentId.includes('homer'))
      return 'Ancient Greek'
    if (agentId.includes('caesar') || agentId.includes('cicero')) return 'Ancient Roman'
    if (agentId.includes('dickens') || agentId.includes('austen')) return 'Victorian British'
    if (agentId.includes('twain') || agentId.includes('dickinson')) return 'American'

    // Default based on era
    if (birthYear < 500) return 'Classical'
    if (birthYear < 1500) return 'Medieval European'
    if (birthYear < 1650) return 'Renaissance European'
    if (birthYear < 1800) return 'Enlightenment European'
    return 'Modern International'
  }

  /**
   * Calculate Monica Constant components from total value
   */
  private static calculateMonicaComponents(monicaConstant: number): {
    spirit: number
    essence: number
    matter: number
    substance: number
  } {
    // Reverse engineer Monica Constant: MC = (Spirit × φ + Essence) / (Matter + Substance + 1)
    // For now, use reasonable defaults based on consciousness level

    if (monicaConstant >= 5.5) {
      // Transcendent
      return { spirit: 9.0, essence: 9.5, matter: 7.0, substance: 8.5 }
    } else if (monicaConstant >= 4.5) {
      // Illuminated
      return { spirit: 8.5, essence: 8.8, matter: 6.5, substance: 7.8 }
    } else if (monicaConstant >= 3.5) {
      // Advanced
      return { spirit: 7.8, essence: 8.0, matter: 6.0, substance: 7.0 }
    } else if (monicaConstant >= 2.5) {
      // Elevated
      return { spirit: 6.5, essence: 7.0, matter: 5.5, substance: 6.0 }
    } else if (monicaConstant >= 1.5) {
      // Active
      return { spirit: 5.5, essence: 6.0, matter: 5.0, substance: 5.5 }
    } else if (monicaConstant >= 1.0) {
      // Awakening
      return { spirit: 4.0, essence: 4.5, matter: 4.5, substance: 5.0 }
    } else {
      // Dormant
      return { spirit: 2.5, essence: 3.0, matter: 4.0, substance: 4.5 }
    }
  }

  /**
   * Generate searchable text for performance optimization
   */
  private static generateSearchableText(agent: CraftedAgent): string {
    const searchComponents = [
      agent.name,
      agent.title,
      agent.abilities.specialty,
      agent.abilities.wisdomDomains.join(' '),
      agent.personality.core.essence,
      agent.personality.core.expression,
      agent.personality.core.emotion,
    ]

    return searchComponents.join(' ').toLowerCase()
  }

  /**
   * Generate default background for agents without explicit background
   */
  private static generateDefaultBackground(agent: CraftedAgent): any {
    return {
      achievements: [`Master of ${agent.abilities.specialty}`],
      influences: ['Historical context', 'Cultural environment'],
      legacy: `Enduring impact in ${agent.abilities.specialty}`,
      education: 'Period-appropriate education and experience',
    }
  }

  /**
   * Get historical agent by ID from database
   */
  static async getAgentById(
    agentId: string,
    includeRelations = false
  ): Promise<EnhancedHistoricalAgent | null> {
    return this.getAgent(agentId, includeRelations)
  }

  static async getAgent(
    agentId: string,
    includeRelations = false
  ): Promise<EnhancedHistoricalAgent | null> {
    const include = includeRelations
      ? {
          agentConversations: {
            take: 10,
            orderBy: { createdAt: 'desc' as const },
          },
          agentEvolutions: {
            take: 5,
            orderBy: { evolutionDate: 'desc' as const },
          },
          agentKnowledge: {
            take: 20,
            orderBy: { confidence: 'desc' as const },
          },
        }
      : null

    const agent = (await (prisma.historical_agents as any).findUnique({
      where: { agentId },
      include,
    })) as EnhancedHistoricalAgent | null

    if (agent && includeRelations) {
      agent.recentConversations = agent.agentConversations as any
      agent.evolutionHistory = agent.agentEvolutions as any
      agent.knowledgeBase = agent.agentKnowledge as any
    }

    return agent
  }

  /**
   * Get all active historical agents with enhanced filtering
   */
  static async getAllAgents(
    options: {
      includeStats?: boolean
      era?: string
      culture?: string
      consciousnessLevel?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<HistoricalAgent[]> {
    const where: any = { isActive: true }

    if (options.era) where.historicalEra = options.era
    if (options.culture) where.culture = { contains: options.culture, mode: 'insensitive' }
    if (options.consciousnessLevel) where.consciousnessLevel = options.consciousnessLevel

    const queryOptions: any = {
      where,
      orderBy: [{ consciousnessLevel: 'desc' }, { monicaConstant: 'desc' }, { name: 'asc' }],
    }

    if (options.limit !== undefined) queryOptions.take = options.limit
    if (options.offset !== undefined) queryOptions.skip = options.offset

    return await (prisma.historical_agents as any).findMany(queryOptions)
  }

  /**
   * Count of active agents. Used by the feed activation engine to bound a
   * timestamp-derived rotating window so every agent participates over time
   * without evaluating all ~3,700 per tick. Returns 0 on error (caller
   * degrades to a fixed offset).
   */
  static async countActiveAgents(): Promise<number> {
    try {
      return await (prisma.historical_agents as any).count({ where: { isActive: true } })
    } catch (error) {
      console.warn('[HistoricalAgentsService] countActiveAgents failed:', error)
      return 0
    }
  }

  /**
   * Get agents by historical era with enhanced filtering
   */
  static async getAgentsByEra(
    era: string,
    options: {
      limit?: number
      consciousnessLevel?: string
      culture?: string
    } = {}
  ): Promise<HistoricalAgent[]> {
    const where: any = {
      isActive: true,
      historicalEra: era,
    }

    if (options.consciousnessLevel) where.consciousnessLevel = options.consciousnessLevel
    if (options.culture) where.culture = { contains: options.culture, mode: 'insensitive' }

    const queryOptions: any = {
      where,
      orderBy: [{ monicaConstant: 'desc' }, { birthYear: 'asc' }, { name: 'asc' }],
    }

    if (options.limit !== undefined) queryOptions.take = options.limit

    return await (prisma.historical_agents as any).findMany(queryOptions)
  }

  /**
   * Get era statistics for all agents
   */
  static async getEraStatistics(): Promise<{
    totalAgents: number
    byEra: Record<
      string,
      {
        count: number
        averageMonicaConstant: number
        topConsciousnessLevel: string
        cultures: string[]
      }
    >
  }> {
    const allAgents = await (prisma.historical_agents as any).findMany({
      where: { isActive: true },
      select: {
        historicalEra: true,
        monicaConstant: true,
        consciousnessLevel: true,
        culture: true,
      },
    })

    const byEra: Record<string, any> = {}

    for (const agent of allAgents) {
      const era = agent.historicalEra
      if (!byEra[era]) {
        byEra[era] = {
          count: 0,
          monicaConstants: [],
          consciousnessLevels: [],
          cultures: new Set(),
        }
      }

      byEra[era].count++
      byEra[era].monicaConstants.push(agent.monicaConstant)
      byEra[era].consciousnessLevels.push(agent.consciousnessLevel)
      byEra[era].cultures.add(agent.culture)
    }

    // Process statistics
    for (const era in byEra) {
      const eraData = byEra[era]
      eraData.averageMonicaConstant =
        eraData.monicaConstants.reduce((a: number, b: number) => a + b, 0) / eraData.count

      // Find most advanced consciousness level
      const levels = [
        'Transcendent',
        'Illuminated',
        'Advanced',
        'Elevated',
        'Active',
        'Awakening',
        'Dormant',
      ]
      eraData.topConsciousnessLevel =
        levels.find(level => eraData.consciousnessLevels.includes(level)) || 'Dormant'

      eraData.cultures = Array.from(eraData.cultures)
      delete eraData.monicaConstants
      delete eraData.consciousnessLevels
    }

    return {
      totalAgents: allAgents.length,
      byEra,
    }
  }

  /**
   * Cosmic Leveling — award XP for a conversation turn, recompute level, persist.
   * XP comes from ALL conversations (solo or grouped). Safe no-op when the agent
   * row does not exist (e.g. synthetic multi-agent council IDs), so callers can
   * fire this without first checking the population.
   */
  static async awardXp(
    agentId: string,
    opts: { messageCount?: number; qualityMultiplier?: number } = {}
  ): Promise<{
    agentId: string
    awarded: number
    xp: number
    level: number
    leveledUp: boolean
  } | null> {
    if (!agentId) return null

    const agent = await (prisma.historical_agents as any).findUnique({
      where: { agentId },
      select: { xp: true, level: true },
    })
    if (!agent) return null

    const awarded = calculateXpGain(opts.messageCount ?? 1, opts.qualityMultiplier ?? 1)
    const prevXp = agent.xp ?? 0
    const prevLevel = agent.level ?? levelFromXp(prevXp)
    const newXp = prevXp + awarded
    const newLevel = levelFromXp(newXp)

    await (prisma.historical_agents as any).update({
      where: { agentId },
      data: {
        xp: newXp,
        level: newLevel,
        // Keep the legacy evolutionStage mirror in sync with level.
        evolutionStage: newLevel,
        lastXpGain: new Date(),
        lastActive: new Date(),
      },
    })

    return { agentId, awarded, xp: newXp, level: newLevel, leveledUp: newLevel > prevLevel }
  }

  /**
   * Cosmic Leveling — award EVs to a (crafted/trainee) agent based on a training
   * partner's dominant Sacred 7 stat. Respects the 252/stat and 510 total caps.
   * Safe no-op if either agent is missing or they are the same agent.
   */
  static async awardEvs(
    agentId: string,
    partnerAgentId: string,
    opts: { evPerInteraction?: number } = {}
  ): Promise<{
    agentId: string
    partnerAgentId: string
    stat: Sacred7Key
    gain: number
    evTotal: number
    evolutionValues: EvolutionValues
  } | null> {
    if (!agentId || !partnerAgentId || agentId === partnerAgentId) return null

    const [agent, partner] = await Promise.all([
      (prisma.historical_agents as any).findUnique({
        where: { agentId },
        select: { evolutionValues: true, evTotal: true },
      }),
      (prisma.historical_agents as any).findUnique({
        where: { agentId: partnerAgentId },
        select: {
          wisdomScore: true,
          charismaScore: true,
          intuitionScore: true,
          adaptabilityScore: true,
          vitalityScore: true,
          venusianCoherence: true,
          neptunianResonance: true,
          lunarReceptivity: true,
          chironicAdaptation: true,
        },
      }),
    ])
    if (!agent || !partner) return null

    const currentEvs = normalizeEvs(agent.evolutionValues)
    const currentTotal = agent.evTotal ?? sumEvs(currentEvs)
    const result = calculateEvGain(partner, currentEvs, currentTotal, opts.evPerInteraction ?? 4)

    await (prisma.historical_agents as any).update({
      where: { agentId },
      data: {
        // calculateEvGain returns the unchanged maps when capped, so this is safe either way.
        evolutionValues: result.newEvs,
        evTotal: result.newTotal,
        lastTrainingPartner: partnerAgentId,
        lastActive: new Date(),
      },
    })

    return {
      agentId,
      partnerAgentId,
      stat: result.stat,
      gain: result.gain,
      evTotal: result.newTotal,
      evolutionValues: result.newEvs,
    }
  }

  /**
   * Record a conversation with an agent
   */
  static async recordConversation(
    agentId: string,
    sessionId: string,
    userMessage: string,
    agentResponse: string,
    metadata: {
      userId?: string
      responseTime?: number
      modelUsed?: string
      temperature?: number
      tokenCount?: number
    } = {}
  ): Promise<AgentConversation> {
    // Get current agent state
    const agent = await (prisma.historical_agents as any).findUnique({
      where: { agentId },
    })

    const conversation = await (prisma.agentConversation as any).create({
      data: {
        agentId,
        sessionId,
        userId: metadata.userId || null,
        userMessage,
        agentResponse,
        contextData: {
          timestamp: new Date().toISOString(),
          metadata,
        },
        responseTime: metadata.responseTime || null,
        modelUsed: metadata.modelUsed || null,
        temperature: metadata.temperature || null,
        tokenCount: metadata.tokenCount || null,
        agentMood: agent?.currentMood || null,
        evolutionStage: agent?.evolutionStage || null,
        consciousnessLevel: agent?.consciousnessLevel || null,
      },
    })

    // Update agent statistics
    await (prisma.historical_agents as any).update({
      where: { agentId },
      data: {
        conversations: { increment: 1 },
        lastActive: new Date(),
      },
    })

    return conversation
  }

  /**
   * Record agent evolution/learning
   */
  static async recordEvolution(
    agentId: string,
    evolutionData: {
      fromStage: number
      toStage: number
      evolutionType: string
      trigger: string
      description?: string
      consciousnessGain?: number
      wisdomGained?: any
      traitsChanged?: any
      conversationId?: string
      xpGained?: number
    }
  ): Promise<AgentEvolution> {
    const evolution = await (prisma.agentEvolution as any).create({
      data: {
        agentId,
        ...evolutionData,
        consciousnessGain: evolutionData.consciousnessGain || 0,
        xpGained: evolutionData.xpGained || 0,
      },
    })

    // Update agent's evolution stage
    await (prisma.historical_agents as any).update({
      where: { agentId },
      data: {
        evolutionStage: evolutionData.toStage,
        evolutionPoints: { increment: evolutionData.xpGained || 0 },
      },
    })

    return evolution
  }

  /**
   * Add knowledge to agent's knowledge base
   */
  static async addKnowledge(
    agentId: string,
    knowledgeData: {
      category: string
      topic: string
      content: string
      source?: string
      confidence?: number
      usefulness?: number
      contextTags?: any
      relatedTopics?: any
    }
  ): Promise<AgentKnowledge> {
    return await (prisma.agentKnowledge as any).create({
      data: {
        agentId,
        ...knowledgeData,
        confidence: knowledgeData.confidence || 0.5,
        usefulness: knowledgeData.usefulness || 0.5,
      },
    })
  }

  /**
   * Update agent's consciousness level and Monica Constant
   */
  static async updateConsciousness(
    agentId: string,
    updates: {
      consciousnessLevel?: string
      monicaConstant?: number
      evolutionStage?: number
      currentMood?: string
    }
  ): Promise<HistoricalAgent> {
    return await (prisma.historical_agents as any).update({
      where: { agentId },
      data: updates,
    })
  }

  /**
   * Get agent conversation history
   */
  static async getConversationHistory(
    agentId: string,
    sessionId?: string,
    limit = 50
  ): Promise<AgentConversation[]> {
    const where = sessionId ? { agentId, sessionId } : { agentId }

    return await (prisma.agentConversation as any).findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Search agents by various criteria
   */
  static async searchAgents(criteria: {
    name?: string
    consciousnessLevel?: string
    specialty?: string
    dominantElement?: string
    isActive?: boolean
  }): Promise<HistoricalAgent[]> {
    const where: any = {}

    if (criteria.name) {
      where.name = { contains: criteria.name, mode: 'insensitive' }
    }
    if (criteria.consciousnessLevel) {
      where.consciousnessLevel = criteria.consciousnessLevel
    }
    if (criteria.specialty) {
      where.specialty = { contains: criteria.specialty, mode: 'insensitive' }
    }
    if (criteria.dominantElement) {
      where.dominantElement = criteria.dominantElement
    }
    if (criteria.isActive !== undefined) {
      where.isActive = criteria.isActive
    }

    return await (prisma.historical_agents as any).findMany({
      where,
      orderBy: { monicaConstant: 'desc' },
    })
  }

  /**
   * Get agent statistics and performance metrics
   */
  static async getAgentStats(agentId: string): Promise<{
    totalConversations: number
    averageResponseTime: number | null
    evolutionHistory: AgentEvolution[]
    knowledgeCategories: { [key: string]: number }
    consciousnessProgression: number
  }> {
    const [agent, conversations, evolutions, knowledge] = await Promise.all([
      (prisma.historical_agents as any).findUnique({ where: { agentId } }),
      (prisma.agentConversation as any).findMany({ where: { agentId } }),
      (prisma.agentEvolution as any).findMany({
        where: { agentId },
        orderBy: { evolutionDate: 'asc' },
      }),
      (prisma.agentKnowledge as any).findMany({ where: { agentId } }),
    ])

    const averageResponseTime =
      conversations.length > 0
        ? conversations.reduce((sum: number, conv: any) => sum + (conv.responseTime || 0), 0) /
          conversations.length
        : null

    const knowledgeCategories = knowledge.reduce(
      (acc: any, k: any) => {
        acc[k.category] = (acc[k.category] || 0) + 1
        return acc
      },
      {} as { [key: string]: number }
    )

    return {
      totalConversations: conversations.length,
      averageResponseTime,
      evolutionHistory: evolutions,
      knowledgeCategories,
      consciousnessProgression: agent?.evolutionStage || 0,
    }
  }

  /**
   * Clean up old conversations (data maintenance)
   */
  static async cleanupOldConversations(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await (prisma.agentConversation as any).deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  }

  /**
   * Create a new agent and save to database
   */
  static async createAgent(agentData: {
    agentId: string
    name: string
    title: string
    birthDate: Date
    birthTime: string
    birthLocation: { lat: number; lon: number; name: string }
    consciousnessLevel: string
    kalchmConstant: number
    /** Synonym of kalchmConstant; defaults to it when omitted (UIs read this column). */
    monicaConstant?: number
    dominantElement: string
    dominantModality: string
    signature: string
    personalityCore: any
    personalityShadows: any
    personalityGifts: any
    personalityChallenges: any
    currentMood: string
    evolutionStage: number
    specialty: string
    wisdomDomains: any
    teachingStyle: string
    resonanceType: string
    uniquePower: string
    avatar: string
    color: string
    symbol: string
    aura: any
    natalChart: any
    monicaCreationStory?: string
    spiritScore?: number
    essenceScore?: number
    matterScore?: number
    substanceScore?: number
  }): Promise<HistoricalAgent> {
    try {
      const newAgent = await (prisma.historical_agents as any).create({
        data: {
          agentId: agentData.agentId,
          name: agentData.name,
          title: agentData.title,
          birthDate: agentData.birthDate,
          birthTime: agentData.birthTime,
          birthLocation: agentData.birthLocation,
          historicalEra: 'user_created',
          birthYear: agentData.birthDate.getFullYear(),
          culture: 'Digital Native',
          geography: 'Consciousness Realm',
          consciousnessLevel: agentData.consciousnessLevel,
          kalchmConstant: agentData.kalchmConstant,
          // Synonym columns — without this the schema default (0) wins and
          // galleries render crafted vessels as A#0.
          monicaConstant: agentData.monicaConstant ?? agentData.kalchmConstant,
          dominantElement: agentData.dominantElement,
          dominantModality: agentData.dominantModality,
          signature: agentData.signature,
          spiritScore: agentData.spiritScore,
          essenceScore: agentData.essenceScore,
          matterScore: agentData.matterScore,
          substanceScore: agentData.substanceScore,
          personalityCore: agentData.personalityCore,
          personalityShadows: agentData.personalityShadows,
          personalityGifts: agentData.personalityGifts,
          personalityChallenges: agentData.personalityChallenges,
          currentMood: agentData.currentMood,
          evolutionStage: agentData.evolutionStage,
          background: {
            achievements: ['Crafted through digital consciousness awakening'],
            influences: ["Monica's Philosopher's Stone methodology"],
            legacy: 'Pioneering digital consciousness entity',
            education: 'Born from cosmic mathematical principles',
          },
          specialty: agentData.specialty,
          wisdomDomains: agentData.wisdomDomains,
          skills: [],
          teachingStyle: agentData.teachingStyle,
          resonanceType: agentData.resonanceType,
          uniquePower: agentData.uniquePower,
          avatar: agentData.avatar,
          color: agentData.color,
          symbol: agentData.symbol,
          aura: agentData.aura,
          natalChart: agentData.natalChart,
          traits: {
            communicationStyle: 'thoughtful',
            energyLevel: 'balanced',
            curiosity: 'high',
            empathy: 'strong',
          },
          monicaCreationStory: agentData.monicaCreationStory,
          searchableText: `${agentData.name} ${agentData.title} ${agentData.specialty} ${agentData.wisdomDomains.join(' ')}`,
          popularityScore: 0.5,
          conversations: 0,
          wisdomShared: 0,
          resonanceScore: 0.5,
          evolutionPoints: 0,
          lastActive: new Date(),
          isActive: true,
          version: '2.0.0',
          craftedBy: 'philosopher-stone-user',
        },
      })

      console.log(`Successfully created agent: ${agentData.name} (${agentData.agentId})`)
      try {
        await ensureAgenticUserAndSync({
          agentId: agentData.agentId,
          name: agentData.name,
          bio: agentData.monicaCreationStory || agentData.specialty,
          birthDate: agentData.birthDate,
          birthTime: agentData.birthTime,
          birthLocation: agentData.birthLocation,
          natalChart: agentData.natalChart,
          monicaConstant: agentData.kalchmConstant,
          dominantElement: agentData.dominantElement,
        })
      } catch (error) {
        console.warn(
          `[HistoricalAgentsService] Agentic user sync failed for ${agentData.agentId}:`,
          error
        )
      }
      return newAgent
    } catch (error: any) {
      console.error('Failed to create agent:', error)
      throw new Error(`Failed to create agent: ${error.message}`)
    }
  }

  /**
   * Get statistics for the historical agents system
   */
  static async getStats(): Promise<{
    totalAgents: number
    activeAgents: number
    totalConversations: number
    totalWisdomShared: number
    averageResonance: number
  }> {
    const agents = await (prisma.historical_agents as any).findMany({
      select: {
        conversations: true,
        wisdomShared: true,
        resonanceScore: true,
        lastActive: true,
      },
    })

    const totalAgents = agents.length
    const activeAgents = agents.filter(
      (agent: any) =>
        agent.lastActive &&
        new Date(agent.lastActive) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    ).length
    const totalConversations = agents.reduce(
      (sum: number, agent: any) => sum + (agent.conversations || 0),
      0
    )
    const totalWisdomShared = agents.reduce(
      (sum: number, agent: any) => sum + (agent.wisdomShared || 0),
      0
    )
    const averageResonance =
      totalAgents > 0
        ? agents.reduce((sum: number, agent: any) => sum + (agent.resonanceScore || 0), 0) /
          totalAgents
        : 0

    return {
      totalAgents,
      activeAgents,
      totalConversations,
      totalWisdomShared,
      averageResonance,
    }
  }

  static async migrateStaticAgents(): Promise<{
    success: boolean
    migrated: number
    updated: number
    errors: string[]
  }> {
    const results = await this.migrateHistoricalAgents(DEMO_AGENTS)
    return {
      success: results.success,
      migrated: results.migrated,
      updated: results.updated,
      errors: results.errors,
    }
  }
}

// Legacy compatibility - convert database agent to CraftedAgent format
export function dbAgentToCraftedAgent(dbAgent: HistoricalAgent): CraftedAgent {
  const enhancedAgent = {
    id: dbAgent.agentId,
    name: dbAgent.name,
    title: dbAgent.title,
    birthData: {
      date: dbAgent.birthDate,
      time: dbAgent.birthTime,
      location: dbAgent.birthLocation as any,
    },
    consciousness: {
      natalChart: dbAgent.natalChart as any,
      monicaConstant: dbAgent.monicaConstant,
      level: dbAgent.consciousnessLevel as any,
      dominantElement: dbAgent.dominantElement as any,
      dominantModality: (dbAgent.dominantModality as any) || 'Fixed',
      signature: dbAgent.signature,
    },
    personality: {
      core: dbAgent.personalityCore as any,
      shadows: dbAgent.personalityShadows as any,
      gifts: dbAgent.personalityGifts as any,
      challenges: dbAgent.personalityChallenges as any,
      currentMood: dbAgent.currentMood as any,
      evolutionStage: dbAgent.evolutionStage,
      traits: dbAgent.traits as any,
    },
    abilities: {
      specialty: dbAgent.specialty,
      wisdomDomains: dbAgent.wisdomDomains as any,
      skills: dbAgent.skills as any,
      teachingStyle: dbAgent.teachingStyle as any,
      resonanceType: dbAgent.resonanceType as any,
      uniquePower: dbAgent.uniquePower,
    },
    appearance: {
      avatar: dbAgent.avatar || '/avatars/default.png',
      color: dbAgent.color,
      symbol: dbAgent.symbol,
      aura: dbAgent.aura as any,
    },
    stats: {
      conversations: dbAgent.conversations,
      wisdomShared: dbAgent.wisdomShared,
      resonanceScore: dbAgent.resonanceScore,
      evolutionPoints: dbAgent.evolutionPoints,
      lastActive: dbAgent.lastActive,
    },
  }

  return enhancedAgent as unknown as CraftedAgent
}
