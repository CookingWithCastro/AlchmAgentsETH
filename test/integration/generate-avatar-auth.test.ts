import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock every heavy dep the route imports so the test exercises only the auth gate
// + orchestration (no DB / network / server-only modules).
vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: vi.fn(),
  adminErrorResponse: (r: { status: number; error: string }) =>
    new Response(JSON.stringify({ error: r.error }), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    }),
}))
vi.mock('@/lib/agents/avatar-generator', () => ({ generateAgentAvatar: vi.fn() }))
vi.mock('@/lib/backend', () => ({ backend: { agents: { get: vi.fn(), update: vi.fn() } } }))
vi.mock('@/lib/agents/resolve-any-agent', () => ({ resolveAnyAgent: vi.fn() }))
vi.mock('@/lib/wtenClient', () => ({ syncAgentToWten: vi.fn() }))
vi.mock('@/lib/agents/portrait-hints', () => ({
  getHistoricalPortraitHint: vi.fn(() => undefined),
}))

import { POST } from '@/app/api/agents/generate-avatar/route'
import { requireAdmin } from '@/lib/admin-auth'
import { generateAgentAvatar } from '@/lib/agents/avatar-generator'
import { backend } from '@/lib/backend'
import { syncAgentToWten } from '@/lib/wtenClient'
import { __resetRateLimitStore } from '@/lib/security/rate-limit'

const makeReq = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/agents/generate-avatar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', ...headers },
    body: JSON.stringify(body),
  })

const ORIG_INTERNAL = process.env.INTERNAL_API_SECRET
const ORIG_SYNC = process.env.ALCHM_KITCHEN_SYNC_SECRET

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitStore()
  delete process.env.INTERNAL_API_SECRET
  delete process.env.ALCHM_KITCHEN_SYNC_SECRET
  ;(requireAdmin as any).mockResolvedValue({
    ok: true,
    user: { id: 'u1', email: 'admin@planetaryagents.com', role: 'admin' },
    source: 'session-role',
  })
  ;(backend.agents.get as any).mockResolvedValue({ agentId: 'ares', name: 'Ares' })
  ;(generateAgentAvatar as any).mockResolvedValue({
    success: true,
    imageUrl: 'https://cdn.alchm.kitchen/avatars/ares.png',
    prompt: 'p',
    mode: 'alchmize',
  })
  ;(backend.agents.update as any).mockResolvedValue({})
  ;(syncAgentToWten as any).mockResolvedValue({ wtenUserId: 'w1', created: true })
})

afterAll(() => {
  if (ORIG_INTERNAL === undefined) delete process.env.INTERNAL_API_SECRET
  else process.env.INTERNAL_API_SECRET = ORIG_INTERNAL
  if (ORIG_SYNC === undefined) delete process.env.ALCHM_KITCHEN_SYNC_SECRET
  else process.env.ALCHM_KITCHEN_SYNC_SECRET = ORIG_SYNC
})

describe('POST /api/agents/generate-avatar — auth gate', () => {
  it('rejects an unauthenticated caller and never triggers generation', async () => {
    ;(requireAdmin as any).mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Authentication required',
    })
    const res = await POST(makeReq({ agentId: 'ares' }))
    expect(res.status).toBe(401)
    expect(generateAgentAvatar).not.toHaveBeenCalled()
    expect(syncAgentToWten).not.toHaveBeenCalled()
  })

  it('rejects an authenticated non-admin (403) without generating', async () => {
    ;(requireAdmin as any).mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Admin privileges required',
    })
    const res = await POST(makeReq({ agentId: 'ares' }))
    expect(res.status).toBe(403)
    expect(generateAgentAvatar).not.toHaveBeenCalled()
  })

  it('allows an authenticated admin', async () => {
    const res = await POST(makeReq({ agentId: 'ares' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true,
      avatarUrl: 'https://cdn.alchm.kitchen/avatars/ares.png',
    })
    expect(generateAgentAvatar).toHaveBeenCalledTimes(1)
  })

  it('allows a server-to-server call with the internal secret (no admin session)', async () => {
    process.env.INTERNAL_API_SECRET = 'sek'
    ;(requireAdmin as any).mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Authentication required',
    })
    const res = await POST(makeReq({ agentId: 'ares' }, { 'x-sync-secret': 'sek' }))
    expect(res.status).toBe(200)
    expect(requireAdmin).not.toHaveBeenCalled()
  })

  it('rate-limits the interactive (non-secret) path', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(makeReq({ agentId: 'ares' }))).status).toBe(200)
    }
    expect((await POST(makeReq({ agentId: 'ares' }))).status).toBe(429)
  })

  it('still validates input after the gate (400 when no agentId)', async () => {
    expect((await POST(makeReq({}))).status).toBe(400)
  })
})
