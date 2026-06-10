import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: { $transaction: vi.fn(async (cb: any) => cb({})) },
}))
vi.mock('@/lib/user-provisioning', () => ({
  provisionPaUser: vi.fn(async () => ({ id: 'pa-user-123', created: true })),
}))

import { resolveBridgeUser } from '@/lib/auth-bridge'
import { provisionPaUser } from '@/lib/user-provisioning'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = fetchMock as any
})

describe('resolveBridgeUser', () => {
  it('provisions and returns a PA user when alchm.kitchen has a session', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 'wten-1', email: 'A@Example.com', name: 'A', image: null },
      }),
    })
    // Unique cookie per test to avoid React cache() cross-test memoization.
    const user = await resolveBridgeUser('authjs.session-token=case-1')
    expect(user).toEqual({
      id: 'pa-user-123',
      email: 'a@example.com',
      name: 'A',
      image: null,
      role: null,
      tier: null,
      kitchenPremium: false,
    })
    expect(provisionPaUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: 'a@example.com', alchmKitchenUserId: 'wten-1' })
    )
  })

  it('flags kitchenPremium when the kitchen session reports premium tier', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 'wten-2', email: 'p@example.com', name: 'P', image: null, tier: 'premium' },
      }),
    })
    const user = await resolveBridgeUser('authjs.session-token=case-premium')
    expect(user?.kitchenPremium).toBe(true)
  })

  it('returns null when the kitchen has no active session', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    expect(await resolveBridgeUser('cookie=case-2')).toBeNull()
    expect(provisionPaUser).not.toHaveBeenCalled()
  })

  it('returns null (never throws) when the kitchen is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    expect(await resolveBridgeUser('cookie=case-3')).toBeNull()
  })

  it('does not call the kitchen when there is no cookie', async () => {
    expect(await resolveBridgeUser('')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
