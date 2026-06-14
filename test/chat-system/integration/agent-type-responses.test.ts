import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { generateText } from 'ai'
import { POST } from '@/app/api/unified-multi-agent-chat/route'
import { mockMonicaAgent, mockUnifiedAgents } from '../fixtures/mock-data'
import { parseStreamResponse } from '../stream-helper'

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => `mocked-${model}`),
  createOpenAI: vi.fn(() => vi.fn((model: string) => `mocked-${model}`)),
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

vi.mock('@/lib/agents/sacred-stats-prompt-generator', () => ({
  generateConsciousnessInformedPrompt: vi.fn(() => 'Mocked historical prompt'),
}))

vi.mock('@/lib/observability/tracker', () => ({
  observabilityTracker: {
    startTrace: vi.fn(() => 'trace-type-test'),
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
          text: 'Validated response from the requested agent type.',
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

describe('Agent Type Response Validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    vi.mocked(generateText).mockResolvedValue({
      text: 'Validated response from the requested agent type.',
      usage: { totalTokens: 42 },
    } as any)

    const { agentCache } = await import('@/lib/agent-cache-system')
    vi.mocked(agentCache.getCachedResponse).mockResolvedValue(null)
    vi.mocked(agentCache.cacheResponse).mockResolvedValue(undefined)
  })

  it('returns a response for a historical agent', async () => {
    const historicalAgent = mockUnifiedAgents.find(agent => agent.type === 'historical')

    const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Share one insight about consciousness.',
        agents: [historicalAgent],
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
    expect(data.responses[0].agentId).toBe(historicalAgent?.id)
    expect(data.responses[0].content).toBeTruthy()
    expect(data.responses[0].content.length).toBeGreaterThan(0)
  })

  it('returns a response for a planetary agent', async () => {
    const planetaryAgent = mockUnifiedAgents.find(agent => agent.type === 'planetary')

    const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is the dominant energy of this moment?',
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
    expect(data.responses[0].agentId).toBe(planetaryAgent?.id)
    expect(data.responses[0].content).toBeTruthy()
    expect(data.responses[0].content.length).toBeGreaterThan(0)
  })

  it('returns a response for Monica as a standalone coordinator', async () => {
    const request = new NextRequest('http://localhost/api/unified-multi-agent-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Synthesize the current state of the conversation.',
        agents: [mockMonicaAgent],
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
    expect(data.responses).toHaveLength(1)
    expect(data.responses[0].agentId).toBe(mockMonicaAgent.id)
    expect(data.responses[0].content).toBeTruthy()
    expect(data.responses[0].content.length).toBeGreaterThan(0)
  })
})
