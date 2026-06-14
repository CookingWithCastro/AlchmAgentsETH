import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockUnifiedAgents } from '../fixtures/mock-data'
import { backend } from '@/lib/backend'
import { parseStreamResponse } from '../stream-helper'

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/models/registry', () => ({
  OPENAI: {
    GPT_5_5: 'gpt-4o',
    LEGACY_GPT_4O: 'gpt-4o',
    GPT_5_4_MINI: 'gpt-4o-mini',
    LEGACY_GPT_4O_MINI: 'gpt-4o-mini',
  },
  resolveDefaultModel: vi.fn((tier: string) => `mock-${tier}-model`),
  resolveOpenAIModel: vi.fn((tier: string) => `mock-openai-${tier}-model`),
}))

vi.mock('@/lib/backend', () => ({
  backend: {
    agents: {
      chat: vi.fn(req =>
        Promise.resolve({
          text: 'Valid planetary LLM response routed through the fast model tier.',
          agentId: req.agentId,
          sessionId: req.sessionId || 'mock-session-id',
          metadata: {
            model: 'fast-tier',
            rag_used: false,
          },
        })
      ),
    },
  },
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => `direct-openai-${model}`),
  createOpenAI: vi.fn(() => vi.fn((model: string) => `mocked-${model}`)),
}))

vi.mock('@/lib/agent-cache-system', () => ({
  agentCache: {
    getCachedResponse: vi.fn(),
    cacheResponse: vi.fn(),
  },
  buildCacheContext: vi.fn(() => ({ cacheKey: 'planetary-test-cache' })),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => null),
  requireAuthOrRedirect: vi.fn(async () => null),
}))

vi.mock('@/lib/agents/sacred-stats-prompt-generator', () => ({
  generateConsciousnessInformedPrompt: vi.fn(() => 'Mocked historical prompt'),
}))

vi.mock('@/lib/observability/tracker', () => ({
  observabilityTracker: {
    startTrace: vi.fn(() => 'trace-planetary-routing'),
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

vi.mock('@/lib/consciousness-persistence', () => ({
  consciousnessPersistence: {
    logInteraction: vi.fn(),
    updateAgentMemory: vi.fn(),
    getSessionHistory: vi.fn(),
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
      'Alchemy Effects': {
        'Total Spirit': 1,
        'Total Essence': 1,
        'Total Matter': 1,
        'Total Substance': 1,
      },
      dominantElement: 'Fire',
    })
  ),
}))

vi.mock('@/lib/galileo-agent-logger', () => ({
  createConversationContext: vi.fn((planet: string, sign: string, degree: string) => ({
    sessionId: 'test-planetary-session',
    sessionName: `planetary-agent-chat-${planet}-in-${sign}`,
    startTime: Date.now(),
    planet,
    sign,
    degree,
    conversationCount: 0,
  })),
  logAgentConversation: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(null)),
  getUserIdFromRequest: vi.fn(() => 'test-user'),
}))

describe('Planetary agent model routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

    const { agentCache } = await import('@/lib/agent-cache-system')
    vi.mocked(agentCache.getCachedResponse).mockResolvedValue(null)
    vi.mocked(agentCache.cacheResponse).mockResolvedValue(undefined)
  })

  it('routes unified planetary chat agents through the fast model tier', async () => {
    const { POST } = await import('@/app/api/unified-multi-agent-chat/route')
    const planetaryAgent = mockUnifiedAgents.find(agent => agent.type === 'planetary')

    const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What should humans do with this transit?',
        agents: [planetaryAgent],
        context: {
          sessionHistory: [],
          enableMemoryPersistence: false,
          realtimeUpdates: false,
          variant: 'planetary',
        },
      }),
    })

    const response = await POST(request)
    const data = await parseStreamResponse(response)

    expect(response.status).toBe(200)
    expect(data.responses).toHaveLength(1)
    expect(data.responses[0].content).toContain('Valid planetary LLM response')
    expect(backend.agents.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: planetaryAgent?.id,
        message: 'What should humans do with this transit?',
        modelTier: 'free',
      })
    )
  })

  it('routes direct planetary-agent API responses through the fast model tier', async () => {
    const { POST } = await import('@/app/api/planetary-agent/route')

    const request = new NextRequest('http://localhost/api/planetary-agent', {
      method: 'POST',
      body: JSON.stringify({
        planet: 'Sun',
        sign: 'Leo',
        degree: '15',
        question: 'Give guidance for this transit.',
        time: '12:00',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toContain('Valid planetary LLM response')
    expect(data.modelUsed).toBe('fast-tier')
    expect(backend.agents.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'sun-leo',
        message: 'Give guidance for this transit.',
        modelTier: 'free',
      })
    )
  })
})
