// Auth + create/reuse behavior for the server-to-server transit-council endpoint
// POST /api/internal/group-chat. alchm.kitchen calls this with an internal secret to
// open a council; it must fail closed in production when no secret is configured and
// reject wrong/absent secrets. The DB layer (transit-group-session) is mocked so we
// exercise only the route's auth + validation + create/reuse wiring. Agent-id
// normalization runs for real (it is the route's input gate).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const sessionLib = vi.hoisted(() => ({
  createTransitGroupSession: vi.fn(),
  findRecentTransitSession: vi.fn(),
}))

vi.mock('@/lib/agents/transit-group-session', () => ({
  createTransitGroupSession: sessionLib.createTransitGroupSession,
  findRecentTransitSession: sessionLib.findRecentTransitSession,
}))

import { POST, GET } from '@/app/api/internal/group-chat/route'

// Two canonical degree-agent ids so the real normalizer yields a valid 2-agent council.
const VALID_IDS = ['planetary-sun-aries-10', 'planetary-moon-leo-5']

function postWith(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/internal/group-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/internal/group-chat — auth + create/reuse', () => {
  const ORIGINAL = {
    NODE_ENV: process.env.NODE_ENV,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    PA_INTERNAL_API_SECRET: process.env.PA_INTERNAL_API_SECRET,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.INTERNAL_API_SECRET
    delete process.env.PA_INTERNAL_API_SECRET
    sessionLib.findRecentTransitSession.mockResolvedValue(null)
    sessionLib.createTransitGroupSession.mockResolvedValue({ id: 'sess-new' })
  })

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL.NODE_ENV
    for (const key of ['INTERNAL_API_SECRET', 'PA_INTERNAL_API_SECRET'] as const) {
      if (ORIGINAL[key] === undefined) delete process.env[key]
      else process.env[key] = ORIGINAL[key]
    }
  })

  it('rejects with 401 in production when no secret is configured (fail closed)', async () => {
    process.env.NODE_ENV = 'production'
    const res = await POST(postWith({ agentIds: VALID_IDS }))
    expect(res.status).toBe(401)
    expect(sessionLib.createTransitGroupSession).not.toHaveBeenCalled()
  })

  it('allows non-production with no secret (local dev convenience)', async () => {
    process.env.NODE_ENV = 'development'
    const res = await POST(postWith({ agentIds: VALID_IDS }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sessionId).toBe('sess-new')
    expect(data.url).toContain('/gallery/group/sess-new')
  })

  it('rejects a wrong secret with 401', async () => {
    process.env.NODE_ENV = 'production'
    process.env.INTERNAL_API_SECRET = 'right-secret'
    const res = await POST(postWith({ agentIds: VALID_IDS }, { 'x-internal-secret': 'wrong' }))
    expect(res.status).toBe(401)
    expect(sessionLib.createTransitGroupSession).not.toHaveBeenCalled()
  })

  it('accepts a valid secret via X-Internal-Secret and creates a session', async () => {
    process.env.NODE_ENV = 'production'
    process.env.INTERNAL_API_SECRET = 'right-secret'
    const res = await POST(
      postWith(
        { agentIds: VALID_IDS, transit: { key: 'sun-trine-moon', label: 'Sun trine Moon' } },
        { 'x-internal-secret': 'right-secret' }
      )
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sessionId).toBe('sess-new')
    expect(sessionLib.createTransitGroupSession).toHaveBeenCalledOnce()
  })

  it('accepts a valid secret via Authorization: Bearer', async () => {
    process.env.INTERNAL_API_SECRET = 'right-secret'
    const res = await POST(
      postWith({ agentIds: VALID_IDS }, { authorization: 'Bearer right-secret' })
    )
    expect(res.status).toBe(200)
  })

  it('accepts the X-Sync-Secret header alchm.kitchen sends', async () => {
    process.env.INTERNAL_API_SECRET = 'right-secret'
    const res = await POST(postWith({ agentIds: VALID_IDS }, { 'x-sync-secret': 'right-secret' }))
    expect(res.status).toBe(200)
  })

  it('rejects fewer than 2 resolvable agents with 400 (no create)', async () => {
    process.env.NODE_ENV = 'development'
    const res = await POST(postWith({ agentIds: ['planetary-sun-aries-10'] }))
    expect(res.status).toBe(400)
    expect(sessionLib.createTransitGroupSession).not.toHaveBeenCalled()
  })

  it('reuses a recent session for the same transit instead of creating a new one', async () => {
    process.env.NODE_ENV = 'development'
    sessionLib.findRecentTransitSession.mockResolvedValue({ id: 'existing-1' })
    const res = await POST(postWith({ agentIds: VALID_IDS, transit: { key: 'sun-trine-moon' } }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reused).toBe(true)
    expect(data.sessionId).toBe('existing-1')
    expect(sessionLib.createTransitGroupSession).not.toHaveBeenCalled()
  })

  it('GET returns a descriptor and never creates a session', async () => {
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.method).toBe('POST')
  })
})
