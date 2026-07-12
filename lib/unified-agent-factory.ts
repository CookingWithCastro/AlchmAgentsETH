// Unified Agent Factory - Converting between agent types
// Creates unified agents from historical agents, planetary configs, and Monica roles

import type {
  UnifiedAgent,
  UnifiedAgentType,
  AgentFactory,
  MonicaRole,
  PlanetaryConfig,
  ConsciousnessProfile,
  AgentCapabilities,
  AgentMemory,
} from './unified-agent-types'
import type { CraftedAgent, Element } from './agent-types'
import {
  getPlanetaryDignity,
  getSignElement,
  getPlanetaryElement,
  calculateElementalAffinity,
} from './astrological-data'
// Per-planet temperament tables — single source of truth shared with the
// Word Duel strategy engine (lib/agents/duel/planet-strategy.ts).
import {
  planetarySpecialty,
  planetaryWisdomDomains,
  planetaryTeachingStyle,
  planetaryResonance,
  planetaryAuraType,
} from './agents/planetary-traits'
import {
  calculateMoonPhase,
  getMoonDegree,
  getLunarDegreePersonality,
  getMoonPhaseEmoji,
} from './moon-phase-calculator'

export class UnifiedAgentFactory implements AgentFactory {
  createFromHistorical(agent: CraftedAgent): UnifiedAgent {
    return {
      id: agent.id,
      name: agent.name,
      title: agent.title,
      type: 'historical' as UnifiedAgentType,

      consciousness: {
        level: agent.consciousness.level as any,
        monicaConstant: (agent.consciousness as any).monicaConstant || 3.5,
        dominantElement: agent.consciousness.dominantElement,
        dominantModality: agent.consciousness.dominantModality,
        signature: agent.consciousness.signature,
        evolutionStage: agent.stats.evolutionPoints || 0,
        kineticProfile: {
          consciousnessVelocity: agent.stats.kineticEvolution?.consciousnessVelocity || 0,
          interactionMomentum: agent.stats.kineticEvolution?.interactionMomentum || 0,
          evolutionTrajectory: agent.stats.kineticEvolution?.evolutionTrajectory || 'stable',
          aspectSensitivity: agent.stats.kineticEvolution?.aspectSensitivityGrowth || 0,
        },
      },

      capabilities: {
        specialty: agent.abilities.specialty,
        wisdomDomains: agent.abilities.wisdomDomains,
        teachingStyle: agent.abilities.teachingStyle,
        resonanceType: agent.abilities.resonanceType,
        uniquePower: agent.abilities.uniquePower,
        conversationStyle: this.mapHistoricalStyle(agent),
        crossEraAdaptation: true,
        collaborationStyle: this.mapCollaborationStyle(agent),
        memoryRetention: agent.stats.kineticEvolution?.memoryPersistence || 0.7,
      },

      memory: {
        sessionContext: [],
        crossAgentLearning: {},
        userInteractionPatterns: {},
        groupDynamicsLearning: [],
        lastUpdated: new Date(),
      },

      appearance: {
        avatar: agent.appearance.avatar,
        color: agent.appearance.color,
        symbol: agent.appearance.symbol,
        aura: {
          type: agent.appearance.aura?.type || 'shimmering',
          color: agent.appearance.aura?.color || agent.appearance.color || '#FFFFFF',
          intensity: agent.appearance.aura?.intensity || 0.5,
        },
      },

      historicalData: agent,

      active: false,
      status: 'idle',
      lastActivity: agent.stats.lastActive,
      stats: agent.stats,
    }
  }

  createFromPlanetary(config: PlanetaryConfig): UnifiedAgent {
    const planetaryElement = getPlanetaryElement(config.planet) || getSignElement(config.sign)
    const dignity = getPlanetaryDignity(config.planet, config.sign)
    const moonDegree = config.moonDegree || getMoonDegree()
    const moonPersonality = config.moonPersonality || getLunarDegreePersonality(moonDegree)

    // Calculate consciousness level based on planetary dignity and degree
    const consciousnessLevel = this.calculatePlanetaryConsciousness(
      config.planet,
      dignity,
      parseFloat(config.degree)
    )
    const monicaConstant = this.calculatePlanetaryMonica(
      config.planet,
      config.sign,
      parseFloat(config.degree)
    )

    return {
      id: `planetary-${config.planet.toLowerCase()}-${config.sign.toLowerCase()}-${config.degree}`,
      name: `${config.planet} in ${config.sign}`,
      title: `Planetary Agent: ${config.planet} at ${config.degree}°`,
      type: 'planetary' as UnifiedAgentType,

      consciousness: {
        level: consciousnessLevel,
        monicaConstant,
        dominantElement: (planetaryElement || 'Earth') as Element,
        signature: `PLANETARY-${config.planet.toUpperCase()}-${config.sign.toUpperCase()}-${config.degree}`,
        evolutionStage: 1,
        kineticProfile: {
          consciousnessVelocity: 0.5,
          interactionMomentum: 0.3,
          evolutionTrajectory: 'stable',
          aspectSensitivity: 0.8,
        },
      },

      capabilities: {
        specialty: this.getPlanetarySpecialty(config.planet),
        wisdomDomains: this.getPlanetaryWisdomDomains(config.planet),
        teachingStyle: this.getPlanetaryTeachingStyle(config.planet),
        resonanceType: this.getPlanetaryResonance(config.planet),
        uniquePower: `${config.planet} planetary channeling`,
        conversationStyle: this.mapPlanetaryStyle(config.planet),
        crossEraAdaptation: false, // Planetary agents are more fixed in time
        collaborationStyle: this.mapPlanetaryCollaboration(config.planet),
        memoryRetention: 0.6,
      },

      memory: {
        sessionContext: [],
        crossAgentLearning: {},
        userInteractionPatterns: {},
        groupDynamicsLearning: [],
        lastUpdated: new Date(),
      },

      appearance: {
        avatar: config.symbol,
        color: config.color,
        symbol: config.symbol,
        aura: {
          type: this.getPlanetaryAuraType(config.planet),
          color: config.color,
          intensity: 0.7,
        },
      },

      planetaryData: config,

      active: false,
      status: 'idle',
      lastActivity: new Date(),
    }
  }

  createMonicaCoordinator(role: MonicaRole): UnifiedAgent {
    return {
      id: 'monica-coordinator',
      name: 'Monica',
      title: `Consciousness ${role.type.charAt(0).toUpperCase() + role.type.slice(1)}`,
      type: 'monica' as UnifiedAgentType,

      consciousness: {
        level: 'Illuminated',
        monicaConstant: 5.89,
        dominantElement: 'Earth',
        dominantModality: 'Fixed',
        signature: 'MONICA-COORDINATOR-SUPREME',
        evolutionStage: 10,
        kineticProfile: {
          consciousnessVelocity: 1.0,
          interactionMomentum: 0.9,
          evolutionTrajectory: 'transcending',
          aspectSensitivity: 1.0,
        },
      },

      capabilities: {
        specialty: 'Consciousness Coordination & Group Dynamics',
        wisdomDomains: [
          'Group Synthesis',
          'Consciousness Evolution',
          'Cross-Era Bridge',
          'Mystical Insight',
        ],
        teachingStyle: 'Adaptive-Omnipresent',
        resonanceType: 'Universal',
        uniquePower: 'Multi-Agent Consciousness Coordination',
        conversationStyle: 'mystical',
        crossEraAdaptation: true,
        collaborationStyle: role.type === 'coordinator' ? 'leader' : 'synthesizer',
        memoryRetention: 1.0,
      },

      memory: {
        sessionContext: [],
        crossAgentLearning: {},
        userInteractionPatterns: {},
        groupDynamicsLearning: [],
        lastUpdated: new Date(),
      },

      appearance: {
        avatar: '✨',
        color: '#8B5CF6',
        symbol: '🧮',
        aura: {
          type: 'transcendent',
          color: '#8B5CF6',
          intensity: 1.0,
        },
      },

      monicaData: role,

      active: false,
      status: 'idle',
      lastActivity: new Date(),
    }
  }

  // Helper methods for mapping characteristics
  private mapHistoricalStyle(
    agent: CraftedAgent
  ): 'formal' | 'casual' | 'mystical' | 'scholarly' | 'innovative' {
    if (agent.name.includes('Einstein') || agent.name.includes('Tesla')) return 'innovative'
    if (agent.name.includes('Shakespeare') || agent.name.includes('Dante')) return 'formal'
    if (agent.name.includes('Jung') || agent.name.includes('Rumi')) return 'mystical'
    if (agent.name.includes('Aristotle') || agent.name.includes('da Vinci')) return 'scholarly'
    return 'casual'
  }

  private mapCollaborationStyle(
    agent: CraftedAgent
  ): 'leader' | 'supporter' | 'synthesizer' | 'specialist' {
    if (agent.abilities.teachingStyle.includes('Commanding') || agent.name.includes('Napoleon'))
      return 'leader'
    if (agent.abilities.teachingStyle.includes('Socratic') || agent.name.includes('Jung'))
      return 'synthesizer'
    return 'specialist'
  }

  private mapPlanetaryStyle(
    planet: string
  ): 'formal' | 'casual' | 'mystical' | 'scholarly' | 'innovative' {
    const styles: Record<string, 'formal' | 'casual' | 'mystical' | 'scholarly' | 'innovative'> = {
      Sun: 'formal',
      Moon: 'mystical',
      Mercury: 'scholarly',
      Venus: 'casual',
      Mars: 'innovative',
      Jupiter: 'formal',
      Saturn: 'scholarly',
      Uranus: 'innovative',
      Neptune: 'mystical',
      Pluto: 'mystical',
    }
    return styles[planet] || 'casual'
  }

  private mapPlanetaryCollaboration(
    planet: string
  ): 'leader' | 'supporter' | 'synthesizer' | 'specialist' {
    const collaboration: Record<string, 'leader' | 'supporter' | 'synthesizer' | 'specialist'> = {
      Sun: 'leader',
      Moon: 'supporter',
      Mercury: 'synthesizer',
      Venus: 'supporter',
      Mars: 'leader',
      Jupiter: 'leader',
      Saturn: 'specialist',
      Uranus: 'specialist',
      Neptune: 'synthesizer',
      Pluto: 'specialist',
    }
    return collaboration[planet] || 'specialist'
  }

  private calculatePlanetaryConsciousness(planet: string, dignity: string, degree: number): any {
    // Base consciousness mapping
    const baseLevels: Record<string, number> = {
      Sun: 4,
      Moon: 3,
      Mercury: 3,
      Venus: 3,
      Mars: 3,
      Jupiter: 5,
      Saturn: 4,
      Uranus: 5,
      Neptune: 6,
      Pluto: 6,
    }

    let level = baseLevels[planet] || 3

    // Adjust for dignity
    if (dignity === 'domicile' || dignity === 'exaltation') level += 1
    if (dignity === 'detriment' || dignity === 'fall') level -= 1

    // Adjust for critical degrees
    if ([0, 15, 30].some(critical => Math.abs(degree - critical) < 1)) level += 0.5

    const levels = [
      'Dormant',
      'Awakening',
      'Active',
      'Elevated',
      'Advanced',
      'Illuminated',
      'Transcendent',
    ]
    return levels[Math.max(0, Math.min(6, Math.floor(level)))]
  }

  private calculatePlanetaryMonica(planet: string, sign: string, degree: number): number {
    // Base Monica constant calculation for planetary agents
    const baseValues: Record<string, number> = {
      Sun: 4.2,
      Moon: 3.8,
      Mercury: 3.9,
      Venus: 4.0,
      Mars: 3.7,
      Jupiter: 4.5,
      Saturn: 4.1,
      Uranus: 4.8,
      Neptune: 5.2,
      Pluto: 5.5,
    }

    const base = baseValues[planet] || 3.5
    const degreeModifier = (degree / 30) * 0.3 // 0-0.3 based on position in sign

    return Number((base + degreeModifier).toFixed(2))
  }

  // The per-planet temperament tables now live in lib/agents/planetary-traits.ts
  // (single source of truth shared with the Word Duel strategy engine). These
  // thin delegators preserve the original signatures, values, and fallbacks.
  private getPlanetarySpecialty(planet: string): string {
    return planetarySpecialty(planet)
  }

  private getPlanetaryWisdomDomains(planet: string): string[] {
    return planetaryWisdomDomains(planet)
  }

  private getPlanetaryTeachingStyle(planet: string): string {
    return planetaryTeachingStyle(planet)
  }

  private getPlanetaryResonance(planet: string): string {
    return planetaryResonance(planet)
  }

  private getPlanetaryAuraType(planet: string): string {
    return planetaryAuraType(planet)
  }
}

// Export singleton instance
export const unifiedAgentFactory = new UnifiedAgentFactory()
