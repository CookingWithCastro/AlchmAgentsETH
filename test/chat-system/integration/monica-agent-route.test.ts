import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { backend, BackendError } from '@/lib/backend'
import { generateText } from 'ai'

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => null),
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => null),
  requireAuthOrRedirect: vi.fn(async () => null),
}))

vi.mock('@/lib/backend', () => ({
  BackendError: class BackendError extends Error {
    status: number
    path: string

    constructor(status: number, path: string, message: string) {
      super(message)
      this.status = status
      this.path = path
    }
  },
  backend: {
    agents: {
      chat: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    monica_user_settings: {
      upsert: vi.fn(),
    },
    monica_user_progress: {
      upsert: vi.fn(),
    },
    monica_interactions: {
      create: vi.fn(),
    },
  },
}))

describe('Monica Agent Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
  })

  it('returns a direct Monica response payload', async () => {
    const { POST } = await import('@/app/api/monica-agent/route')

    vi.mocked(generateText).mockResolvedValue({
      text: 'Monica is present and responding clearly.',
      usage: { totalTokens: 24 },
    } as any)

    const request = new NextRequest('http://localhost/api/monica-agent', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Monica, are you available?',
        sessionId: 'client-session-1',
        context: {
          page: '/monica',
        },
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.text).toBeTruthy()
    expect(data.text).toContain('Monica')
  })

  it('surfaces Monica backend failures instead of returning a synthetic reply', async () => {
    const { POST } = await import('@/app/api/monica-agent/route')

    vi.mocked(generateText).mockRejectedValueOnce(
      new BackendError(400, '/api/chat', 'Backend unavailable')
    )

    const request = new NextRequest('http://localhost/api/monica-agent', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Monica, can you still answer?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('MONICA_BACKEND_ERROR')
    expect(data.details).toContain('Backend unavailable')
  })
})
