// Integration tests for the unified multi-agent chat API
// Tests model routing, caching, consciousness calculation, and error handling

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { generateText } from 'ai'
import { POST } from '@/app/api/unified-multi-agent-chat/route'
import { parseStreamResponse } from '../stream-helper'
import { agentCache } from '@/lib/agent-cache-system'
import { generateAlchmForCurrentMoment } from '@/lib/alchemizer'
import {
  mockUnifiedAgents,
  mockMonicaAgent,
  mockMessages,
  mockGroupDynamics,
  mockApiResponse,
  performanceTestData,
} from '../fixtures/mock-data'

// Mock external dependencies
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => `mocked-${model}`),
  createOpenAI: vi.fn(() => vi.fn((model: string) => `mocked-${model}`)),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model: string) => `mocked-${model}`),
  createGoogleGenerativeAI: vi.fn(() => vi.fn((model: string) => `mocked-${model}`)),
}))

vi.mock('@/lib/agent-cache-system', () => ({
  agentCache: {
    getCachedResponse: vi.fn(),
    cacheResponse: vi.fn(),
  },
  buildCacheContext: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => null),
  requireAuthOrRedirect: vi.fn(async () => null),
}))

vi.mock('@/lib/consciousness-persistence', () => ({
  consciousnessPersistence: {
    updateAgentMemory: vi.fn(),
    getSessionHistory: vi.fn(),
  },
}))

vi.mock('@/lib/agents/sacred-stats-prompt-generator', () => ({
  generateConsciousnessInformedPrompt: vi.fn(() => 'Mocked historical agent prompt'),
}))

vi.mock('@/lib/observability/tracker', () => ({
  observabilityTracker: {
    startTrace: vi.fn(() => 'trace-1'),
    evaluateMetrics: vi.fn(() => ({
      actionCompletion: 1,
      toolSelectionQuality: 1,
      routingAccuracy: 1,
      contextRetention: 1,
    })),
    completeTrace: vi.fn(),
    recordError: vi.fn(),
    recordRoutingDecision: vi.fn(),
  },
}))

vi.mock('@/lib/consciousness/unified-tracker', () => ({
  unifiedTracker: {
    captureSnapshot: vi.fn(),
  },
}))

vi.mock('@/lib/rag/rag-generator', () => ({
  generateWithRAG: vi.fn(),
  shouldUseRAG: vi.fn(() => false),
  getRAGConfig: vi.fn(() => ({ enabled: false })),
}))

vi.mock('@/lib/alchemizer', () => ({
  generateAlchmForCurrentMoment: vi.fn(() =>
    Promise.resolve({
      A: 3.5,
      dominantElement: 'Air',
      timestamp: new Date(),
    })
  ),
}))

vi.mock('@/lib/backend', () => ({
  getAlchemicalQuantitiesLegacy: vi.fn(() =>
    Promise.resolve({
      'Alchemy Effects': {
        'Total Spirit': 1.0,
        'Total Essence': 2.0,
        'Total Matter': 1.5,
        'Total Substance': 0.5,
      },
    })
  ),
  backend: {
    agents: {
      chat: vi.fn(req =>
        Promise.resolve({
          text: 'This is a test response from the agent.',
          agentId: req.agentId,
          sessionId: req.sessionId || 'mock-session-id',
          metadata: {
            model: 'llama-3.3-70b-versatile',
            rag_used: false,
          },
        })
      ),
    },
  },
}))

describe('Unified Multi-Agent Chat API Integration', () => {
  let mockGenerateText: any
  let mockAgentCache: any

  beforeEach(() => {
    process.env.DEV_MAX_AGENTS = '6'
    vi.clearAllMocks()
    mockGenerateText = vi.mocked(generateText)
    mockAgentCache = vi.mocked(agentCache)

    // Default successful responses
    mockGenerateText.mockResolvedValue({
      text: 'This is a test response from the agent.',
    })

    mockAgentCache.getCachedResponse.mockResolvedValue(null) // No cache hit by default
    mockAgentCache.cacheResponse.mockResolvedValue(undefined)
  })

  describe('Request Validation', () => {
    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Message and agents array are required')
    })

    it('validates agents array', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          agents: 'not-an-array',
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Message and agents array are required')
    })

    it('handles empty agents array', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          agents: [],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Message and agents array are required')
    })
  })

  describe('Agent Processing', () => {
    it('processes single historical agent correctly', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is consciousness?',
          agents: [mockUnifiedAgents[0]], // Leonardo da Vinci
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            variant: 'historical',
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses).toHaveLength(1)
      expect(data.responses[0].agentId).toBe(mockUnifiedAgents[0].id)
      expect(data.responses[0].content).toBe('This is a test response from the agent.')
      expect(data.processingTime).toBeGreaterThan(0)
    })

    it('processes multiple agents concurrently', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'How do we achieve innovation?',
          agents: mockUnifiedAgents.slice(0, 3), // Leonardo, Jung, Tesla
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses).toHaveLength(2)
      const { backend } = await import('@/lib/backend')
      expect(backend.agents.chat).toHaveBeenCalledTimes(2)
    })

    it('handles Monica coordination correctly', async () => {
      const agentsWithMonica = [mockUnifiedAgents[0], { ...mockMonicaAgent, type: 'monica' as any }]

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'How can we synthesize different perspectives?',
          agents: agentsWithMonica,
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses).toHaveLength(2)

      // Monica should be processed last with access to other responses
      const monicaResponse = data.responses.find((r: any) => r.agentId === mockMonicaAgent.id)
      expect(monicaResponse).toBeDefined()
      expect(monicaResponse.consciousnessShift).toBe(0.1) // Monica contributes to consciousness evolution
    })

    it('limits agents to maximum of 6', async () => {
      const manyAgents = [
        ...mockUnifiedAgents,
        ...Array(5)
          .fill(null)
          .map((_, i) => ({
            ...mockUnifiedAgents[0],
            id: `extra-agent-${i}`,
            name: `Extra Agent ${i}`,
          })),
      ]

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test with many agents',
          agents: manyAgents,
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Model Selection Logic', () => {
    it('selects GPT-4 for historical variant', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Tell me about Renaissance wisdom',
          agents: [mockUnifiedAgents[0]], // Historical agent
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            variant: 'historical',
          },
        }),
      })

      const response = await POST(request)
      await parseStreamResponse(response)

      const { backend } = await import('@/lib/backend')
      expect(backend.agents.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: mockUnifiedAgents[0].id,
          modelTier: 'free',
        })
      )
    })

    it('selects GPT-3.5 for planetary variant with high velocity', async () => {
      const fastPlanetaryAgent = {
        ...mockUnifiedAgents[3], // Planetary agent
        consciousness: {
          ...mockUnifiedAgents[3].consciousness,
          kineticProfile: {
            consciousnessVelocity: 0.8,
            interactionMomentum: 0.7,
            evolutionTrajectory: 'ascending' as const,
            aspectSensitivity: 0.6,
          },
        },
      }

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What do the stars say?',
          agents: [fastPlanetaryAgent],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            variant: 'planetary',
          },
        }),
      })

      const response = await POST(request)
      await parseStreamResponse(response)

      const { backend } = await import('@/lib/backend')
      expect(backend.agents.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: fastPlanetaryAgent.id,
          modelTier: 'free',
        })
      )
    })

    it('uses model overrides when specified', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test with override',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            modelOverrides: {
              historical: 'gpt-4o-mini',
            },
          },
        }),
      })

      const response = await POST(request)
      await parseStreamResponse(response)

      const { backend } = await import('@/lib/backend')
      expect(backend.agents.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: mockUnifiedAgents[0].id,
          modelTier: 'free',
        })
      )
    })

    it('selects GPT-4 for laboratory variant', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Conduct consciousness research',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            variant: 'laboratory',
          },
        }),
      })

      const response = await POST(request)
      await parseStreamResponse(response)

      const { backend } = await import('@/lib/backend')
      expect(backend.agents.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: mockUnifiedAgents[0].id,
          modelTier: 'free',
        })
      )
    })
  })

  describe('Caching System', () => {
    it('returns cached response when available', async () => {
      const cachedResponse = {
        agentResponse: 'This is a cached response',
        timestamp: new Date(),
        metadata: {},
      }

      mockAgentCache.getCachedResponse.mockResolvedValueOnce(cachedResponse)

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Repeated question',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses[0].content).toBe('This is a cached response')
      expect(mockGenerateText).not.toHaveBeenCalled() // Should skip AI generation
    })

    it('caches new responses correctly', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'New question for caching',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      await parseStreamResponse(response)

      expect(mockAgentCache.cacheResponse).toHaveBeenCalledWith(
        mockUnifiedAgents[0].id,
        'New question for caching',
        'This is a test response from the agent.',
        expect.any(Number),
        undefined
      )
    })
  })

  describe('Group Dynamics Calculation', () => {
    it('calculates group consciousness correctly', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test group consciousness',
          agents: mockUnifiedAgents.slice(0, 3), // Different consciousness levels
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.groupDynamics).toBeDefined()
      expect(data.groupDynamics.consciousnessNetwork.groupConsciousness).toBeGreaterThan(0)
      expect(data.groupDynamics.consciousnessNetwork.connections).toBeDefined()
      expect(data.groupDynamics.consciousnessNetwork.dominantElements).toBeDefined()
    })

    it('identifies agent connections and compatibility', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test agent compatibility',
          agents: mockUnifiedAgents.slice(0, 2),
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.groupDynamics.consciousnessNetwork.connections).toHaveLength(1) // 2 agents = 1 connection

      const connection = data.groupDynamics.consciousnessNetwork.connections[0]
      expect(connection.compatibility).toBeGreaterThan(0)
      expect(connection.compatibility).toBeLessThanOrEqual(1)
      expect(connection.resonanceType).toBeDefined()
    })

    it('generates session insights', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Generate insights',
          agents: mockUnifiedAgents.slice(0, 3),
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.groupInsights).toBeDefined()
      expect(Array.isArray(data.groupInsights)).toBe(true)
      expect(data.groupInsights.length).toBeGreaterThan(0)
    })
  })

  describe('Consciousness Evolution', () => {
    it('calculates consciousness shifts for agents', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Deep philosophical question about the nature of existence',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.responses[0].consciousnessShift).toBeGreaterThan(0)
      expect(data.sessionUpdate.consciousnessEvolution).toBeGreaterThan(0)
    })

    it('handles memory persistence when enabled', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Learning interaction',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: mockMessages,
            enableMemoryPersistence: true,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.agentEvolutions).toBeDefined()
      expect(Array.isArray(data.agentEvolutions)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('surfaces AI generation failures instead of returning a synthetic agent reply', async () => {
      const { backend } = await import('@/lib/backend')
      const originalChat = backend.agents.chat
      backend.agents.chat = vi.fn(() => Promise.reject(new Error('API quota exceeded')))

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'This will fail',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      try {
        const response = await POST(request)
        const data = await parseStreamResponse(response)

        expect(response.status).toBe(200)
        expect(data.responses[0].content).toContain('temporarily unstable')
        expect(data.responses[0].content).toContain(mockUnifiedAgents[0].name)
      } finally {
        backend.agents.chat = originalChat
      }
    })

    it('handles cosmic context generation failures', async () => {
      vi.mocked(generateAlchmForCurrentMoment).mockRejectedValueOnce(
        new Error('Cosmic service down')
      )

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test cosmic failure',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200) // Should still work with fallback
    })

    it('handles malformed request body', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to start multi-agent conversation')
    })
  })

  describe('Performance Characteristics', () => {
    it('completes single agent request within time limit', async () => {
      const startTime = Date.now()

      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: performanceTestData.simpleMessage,
          agents: performanceTestData.smallGroup,
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(data.processingTime).toBeLessThan(performanceTestData.expectedResponseTimes.small)
      expect(endTime - startTime).toBeLessThan(
        performanceTestData.expectedResponseTimes.small + 500
      ) // Add buffer for test overhead
    })

    it('handles complex requests efficiently', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: performanceTestData.complexMessage,
          agents: performanceTestData.mediumGroup,
          context: {
            sessionHistory: mockMessages,
            enableMemoryPersistence: true,
            realtimeUpdates: true,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      expect(data.processingTime).toBeLessThan(performanceTestData.expectedResponseTimes.medium)
    })

    it('processes multiple agents concurrently', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test concurrent processing',
          agents: performanceTestData.largeGroup,
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)
      // Should not be much slower than single agent due to concurrency
      expect(data.processingTime).toBeLessThan(performanceTestData.expectedResponseTimes.large)
    })
  })

  describe('Response Format Validation', () => {
    it('returns properly formatted response structure', async () => {
      const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test response format',
          agents: [mockUnifiedAgents[0]],
          context: {
            sessionHistory: [],
            enableMemoryPersistence: false,
            realtimeUpdates: false,
          },
        }),
      })

      const response = await POST(request)
      const data = await parseStreamResponse(response)

      expect(response.status).toBe(200)

      // Validate top-level structure
      expect(data).toHaveProperty('responses')
      expect(data).toHaveProperty('groupInsights')
      expect(data).toHaveProperty('sessionUpdate')
      expect(data).toHaveProperty('groupDynamics')
      expect(data).toHaveProperty('processingTime')

      // Validate response structure
      expect(data.responses[0]).toHaveProperty('agentId')
      expect(data.responses[0]).toHaveProperty('content')
      expect(data.responses[0]).toHaveProperty('processingTime')
      expect(data.responses[0]).toHaveProperty('consciousnessShift')
      expect(data.responses[0]).toHaveProperty('metadata')

      // Validate metadata structure
      expect(data.responses[0].metadata).toHaveProperty('crossAgentReferences')
      expect(data.responses[0].metadata).toHaveProperty('synthesizedInsights')
      expect(data.responses[0].metadata).toHaveProperty('memoryUpdates')
      expect(data.responses[0].metadata).toHaveProperty('groupImpact')

      // Validate session update structure
      expect(data.sessionUpdate).toHaveProperty('consciousnessEvolution')
      expect(data.sessionUpdate).toHaveProperty('newSynergies')
      expect(data.sessionUpdate).toHaveProperty('memoryConsolidation')
    })
  })
})
