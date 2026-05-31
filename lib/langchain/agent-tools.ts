/**
 * LangChain Agent Tools for Planetary Agents
 * Tools for semantic search, knowledge retrieval, and multi-agent coordination
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
  semanticSearch,
  searchAgentKnowledge,
  findSimilarAgents,
} from '../llamaindex/semantic-search'
import { DEMO_AGENTS } from '../demo-agents-data'
import { logger } from '@/lib/structured-logger'
import { withErrorHandling } from '@/lib/error-handling'
import { TemporalAnalysisEngine } from '../temporal-analysis-engine'

/**
 * Tool 1: Semantic Agent Search
 * Find agents by concept or topic
 */
export const semanticAgentSearchTool = new DynamicStructuredTool({
  name: 'semantic_agent_search',
  description:
    'Search for agents by concept, topic, or wisdom domain. Returns the most relevant agents based on semantic similarity.',
  schema: z.object({
    concept: z.string().describe('The concept, topic, or wisdom domain to search for'),
    topK: z.number().optional().describe('Number of agents to return (default: 3)'),
  }),
  func: async ({ concept, topK = 3 }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: semantic_agent_search', {
          system: 'langchain-tools',
          operation: 'semantic_agent_search',
          metadata: { concept, topK },
        })

        const results = await findSimilarAgents(concept, topK)

        if (results.length === 0) {
          return JSON.stringify({
            success: false,
            message: `No agents found for concept: ${concept}`,
          })
        }

        const agentSummaries = results.map(result => {
          const agent = DEMO_AGENTS.find(a => a.id === result.agentId)
          return {
            name: result.agentName,
            title: agent?.title || '',
            relevanceScore: result.relevance.toFixed(3),
            wisdomDomains: agent?.abilities?.wisdomDomains || [],
            specialty: agent?.abilities?.specialty || '',
            wisdomAlignment: 'Aligned with ' + result.agentName,
          }
        })

        return JSON.stringify({
          success: true,
          concept,
          agentsFound: agentSummaries.length,
          agents: agentSummaries,
        })
      },
      {
        system: 'langchain-tools',
        operation: 'semantic_agent_search',
        severity: 'medium',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Tool 2: Knowledge Retrieval
 * Retrieve relevant knowledge for RAG context
 */
export const knowledgeRetrievalTool = new DynamicStructuredTool({
  name: 'knowledge_retrieval',
  description:
    'Retrieve relevant knowledge chunks from the agent knowledge base for a given query. Returns contextual information to enhance responses.',
  schema: z.object({
    query: z.string().describe('The query or question to retrieve knowledge for'),
    agentId: z.string().optional().describe('Specific agent ID to retrieve knowledge from'),
    maxChunks: z.number().optional().describe('Maximum number of knowledge chunks (default: 3)'),
  }),
  func: async ({ query, agentId, maxChunks = 3 }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: knowledge_retrieval', {
          system: 'langchain-tools',
          operation: 'knowledge_retrieval',
          metadata: { query, agentId, maxChunks },
        })

        const knowledge = agentId
          ? await searchAgentKnowledge(agentId, query, maxChunks).then(results =>
              results.map(r => r.content)
            )
          : await semanticSearch(query, { topK: maxChunks }).then(results =>
              results.map(r => r.content)
            )

        if (knowledge.length === 0) {
          return JSON.stringify({
            success: false,
            message: `No relevant knowledge found for: ${query}`,
          })
        }

        return JSON.stringify({
          success: true,
          query,
          chunksRetrieved: knowledge.length,
          knowledge,
        })
      },
      {
        system: 'langchain-tools',
        operation: 'knowledge_retrieval',
        severity: 'medium',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Tool 3: Consciousness Analysis
 * Calculate synergy scores and cosmic compatibility
 */
export const consciousnessAnalysisTool = new DynamicStructuredTool({
  name: 'consciousness_analysis',
  description:
    'Analyze consciousness patterns and calculate synergy scores for agents. Returns compatibility metrics based on astrological and alchemical factors.',
  schema: z.object({
    agentId: z.string().describe('The agent ID to analyze'),
    analysisType: z
      .enum(['synergy', 'compatibility', 'consciousness_metrics'])
      .optional()
      .describe('Type of analysis to perform (default: synergy)'),
  }),
  func: async ({ agentId, analysisType = 'synergy' }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: consciousness_analysis', {
          system: 'langchain-tools',
          operation: 'consciousness_analysis',
          metadata: { agentId, analysisType },
        })

        const agent = DEMO_AGENTS.find(a => a.id === agentId)

        if (!agent) {
          return JSON.stringify({
            success: false,
            error: `Agent not found: ${agentId}`,
          })
        }

        const analysis: any = {
          success: true,
          agentId,
          agentName: agent.name,
          analysisType,
        }

        switch (analysisType) {
          case 'consciousness_metrics':
            analysis.metrics = {
              monicaConstant: agent.consciousness.monicaConstant,
              dominantElement: agent.consciousness.dominantElement,
              dominantModality: agent.consciousness.dominantModality,
              consciousnessVelocity: agent.stats.kineticEvolution.consciousnessVelocity,
              evolutionTrajectory: agent.stats.kineticEvolution.evolutionTrajectory,
              responseDepth: agent.stats.qualityMetrics.averageResponseDepth,
            }
            break

          case 'compatibility': {
            const similar = await findSimilarAgents(agentId, 3)
            analysis.compatibleAgents = similar.map(s => {
              const similarAgent = DEMO_AGENTS.find(a => a.id === s.agentId)
              return {
                name: s.agentName,
                relevance: s.relevance,
                element: similarAgent?.consciousness?.dominantElement || '',
              }
            })
            break
          }

          case 'synergy':
          default:
            analysis.synergy = {
              element: agent.consciousness.dominantElement,
              modality: agent.consciousness.dominantModality,
              wisdomDomains: agent.abilities.wisdomDomains,
              resonanceType: agent.abilities.resonanceType,
              monicaConstant: agent.consciousness.monicaConstant,
            }
            break
        }

        return JSON.stringify(analysis)
      },
      {
        system: 'langchain-tools',
        operation: 'consciousness_analysis',
        severity: 'low',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Tool 4: Multi-Agent Coordinator
 * Coordinate multiple agents for complex queries
 */
export const multiAgentCoordinatorTool = new DynamicStructuredTool({
  name: 'multi_agent_coordinator',
  description:
    'Coordinate multiple agents to answer complex questions requiring diverse perspectives. Assembles a council of relevant agents.',
  schema: z.object({
    query: z.string().describe('The complex question requiring multiple perspectives'),
    numAgents: z.number().optional().describe('Number of agents in the council (default: 3)'),
    wisdomDomain: z.string().optional().describe('Focus on specific wisdom domain'),
  }),
  func: async ({ query, numAgents = 3, wisdomDomain }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: multi_agent_coordinator', {
          system: 'langchain-tools',
          operation: 'multi_agent_coordinator',
          metadata: { query, numAgents, wisdomDomain },
        })

        const searchQuery = wisdomDomain ? `${query} ${wisdomDomain}` : query
        const results = await findSimilarAgents(searchQuery, numAgents)

        if (results.length === 0) {
          return JSON.stringify({
            success: false,
            message: 'No suitable agents found for this query',
          })
        }

        const council = results.map(result => {
          const agent = DEMO_AGENTS.find(a => a.id === result.agentId)
          return {
            name: result.agentName,
            title: agent?.title || '',
            relevance: result.relevance.toFixed(3),
            wisdomDomains: agent?.abilities?.wisdomDomains || [],
            specialty: agent?.abilities?.specialty || '',
            perspective: 'Expert in ' + (agent?.abilities?.specialty || result.agentName),
          }
        })

        return JSON.stringify({
          success: true,
          query,
          councilSize: council.length,
          council,
          recommendation: `These ${council.length} agents form an ideal council for this query, bringing diverse wisdom from: ${Array.from(new Set(council.flatMap(c => c.wisdomDomains))).join(', ')}`,
        })
      },
      {
        system: 'langchain-tools',
        operation: 'multi_agent_coordinator',
        severity: 'medium',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Tool 5: Memory Retrieval
 * Retrieve conversation history and context
 */
export const memoryRetrievalTool = new DynamicStructuredTool({
  name: 'memory_retrieval',
  description:
    'Retrieve relevant conversation history and past interactions for context-aware responses.',
  schema: z.object({
    agentId: z.string().describe('The agent ID to retrieve memory for'),
    query: z.string().optional().describe('Optional query to find relevant memories'),
    limit: z.number().optional().describe('Number of memory entries to retrieve (default: 5)'),
  }),
  func: async ({ agentId, query, limit = 5 }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: memory_retrieval', {
          system: 'langchain-tools',
          operation: 'memory_retrieval',
          metadata: { agentId, query, limit },
        })

        const agent = DEMO_AGENTS.find(a => a.id === agentId)

        if (!agent) {
          return JSON.stringify({
            success: false,
            error: `Agent not found: ${agentId}`,
          })
        }

        // For now, return agent stats as "memory"
        // In production, this would query conversation history from database
        const memory = {
          success: true,
          agentId,
          agentName: agent.name,
          stats: {
            conversations: agent.stats.conversations,
            wisdomShared: agent.stats.wisdomShared,
            lastActive: agent.stats.lastActive,
            evolutionTrajectory: agent.stats.kineticEvolution.evolutionTrajectory,
          },
          recentActivity: 'Memory retrieval from database would be implemented here',
        }

        return JSON.stringify(memory)
      },
      {
        system: 'langchain-tools',
        operation: 'memory_retrieval',
        severity: 'low',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Tool 6: Temporal Analysis
 * Query the Time Laboratory for astrological transits and precise degree patterns
 */
export const temporalAnalysisTool = new DynamicStructuredTool({
  name: 'temporal_analysis_tool',
  description:
    'Query the Time Laboratory for exact celestial patterns, agent transit history, and precise degree alignments over time.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'Natural language query, e.g., "When were Carl Jung and Albert Einstein most aligned in Fire energy during the 1920s?"'
      ),
    agents: z
      .array(z.string())
      .nullable()
      .describe('Array of specific agent IDs to analyze. Use null if not specifying agents.'),
    elements: z
      .array(z.enum(['Fire', 'Water', 'Air', 'Earth']))
      .nullable()
      .describe('Array of elemental forces to filter by. Use null if not specifying.'),
  }),
  func: async ({ query, agents, elements }) => {
    return withErrorHandling(
      async () => {
        logger.info('Tool call: temporal_analysis_tool', {
          system: 'langchain-tools',
          operation: 'temporal_analysis_tool',
          metadata: { query, agents, elements },
        })

        const temporalQuery: any = {
          type: 'natural_language',
          query: query,
        }

        if (agents && agents.length > 0) {
          temporalQuery.agents = agents
        }

        if (elements && elements.length > 0) {
          temporalQuery.elements = elements
        }

        const result = await TemporalAnalysisEngine.performTemporalAnalysis(temporalQuery)

        return JSON.stringify({
          success: true,
          insights: result.insights,
          patterns: result.patterns.slice(0, 3).map(p => ({
            degree: p.degree,
            description: p.description,
            significance: p.significance,
          })),
          recommendations: result.recommendations,
        })
      },
      {
        system: 'langchain-tools',
        operation: 'temporal_analysis_tool',
        severity: 'medium',
      }
    ).then(res => (typeof res === 'string' ? res : JSON.stringify(res)))
  },
})

/**
 * Export all tools as an array
 */
export const planetaryAgentTools = [
  semanticAgentSearchTool,
  knowledgeRetrievalTool,
  consciousnessAnalysisTool,
  multiAgentCoordinatorTool,
  memoryRetrievalTool,
  temporalAnalysisTool,
]

/**
 * Get tool by name
 */
export function getToolByName(name: string) {
  return planetaryAgentTools.find(tool => tool.name === name)
}

/**
 * Get all tool descriptions
 */
export function getToolDescriptions() {
  return planetaryAgentTools.map(tool => ({
    name: tool.name,
    description: tool.description,
  }))
}
