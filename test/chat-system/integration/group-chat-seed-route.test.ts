// The client-facing seed gate POST /api/group-chat/seed. It delegates the atomic claim
// to claimGroupChatSeed (mocked here) and just relays { claimed } / validates input.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const lib = vi.hoisted(() => ({ claimGroupChatSeed: vi.fn() }))

vi.mock('@/lib/agents/transit-group-session', () => ({
  claimGroupChatSeed: lib.claimGroupChatSeed,
}))

import { POST } from '@/app/api/group-chat/seed/route'

function req(body: unknown, raw?: string): NextRequest {
  return new NextRequest('http://localhost/api/group-chat/seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw !== undefined ? raw : JSON.stringify(body),
  })
}

describe('POST /api/group-chat/seed', () => {
  beforeEach(() => {
    lib.claimGroupChatSeed.mockReset()
  })

  it('relays claimed:true on the first claim, false on a repeat', async () => {
    lib.claimGroupChatSeed.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const first = await POST(req({ sessionId: 'sess-1' }))
    const second = await POST(req({ sessionId: 'sess-1' }))

    expect(first.status).toBe(200)
    expect((await first.json()).claimed).toBe(true)
    expect((await second.json()).claimed).toBe(false)
    expect(lib.claimGroupChatSeed).toHaveBeenCalledWith('sess-1')
  })

  it('returns 400 when sessionId is missing (no claim attempted)', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    expect(lib.claimGroupChatSeed).not.toHaveBeenCalled()
  })

  it('returns 400 on a non-string sessionId', async () => {
    const res = await POST(req({ sessionId: 123 }))
    expect(res.status).toBe(400)
    expect(lib.claimGroupChatSeed).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid JSON', async () => {
    const res = await POST(req(undefined, 'not-json'))
    expect(res.status).toBe(400)
    expect(lib.claimGroupChatSeed).not.toHaveBeenCalled()
  })
})
