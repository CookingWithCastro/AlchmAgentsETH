import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    userSubscription: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/byok/store', () => ({
  listByokProviders: vi.fn(async () => []),
}))

import { getPaTier } from '@/lib/premium/entitlements'
import { prisma } from '@/lib/db'

const mockUser = (u: any) => (prisma.users.findUnique as any).mockResolvedValue(u)
const mockSub = (s: any) => (prisma.userSubscription.findUnique as any).mockResolvedValue(s)

describe('getPaTier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PREMIUM_ENFORCEMENT_ENABLED
    delete process.env.PREMIUM_GRANDFATHER_UNTIL
  })

  it('returns master for every authenticated user while enforcement is off', async () => {
    mockUser({ role: 'user', createdAt: new Date('2026-01-01') })
    mockSub(null)
    expect(await getPaTier('u1')).toBe('master')
  })

  it('returns free for a non-subscriber once enforcement is on', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'user', createdAt: new Date() })
    mockSub(null)
    expect(await getPaTier('u1')).toBe('free')
  })

  it('returns alchemist for an active subscriber when enforcement is on', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'user', createdAt: new Date() })
    mockSub({ tier: 'alchemist', status: 'active' })
    expect(await getPaTier('u1')).toBe('alchemist')
  })

  it('ignores an expired/canceled subscription when enforcement is on', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'user', createdAt: new Date() })
    mockSub({ tier: 'alchemist', status: 'canceled' })
    expect(await getPaTier('u1')).toBe('free')
  })

  it('keeps admins at master even with enforcement on', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'admin', createdAt: new Date() })
    mockSub(null)
    expect(await getPaTier('u1')).toBe('master')
  })

  it('grandfathers pre-cutoff users to master', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    process.env.PREMIUM_GRANDFATHER_UNTIL = '2099-01-01'
    mockUser({ role: 'user', createdAt: new Date('2020-01-01') })
    mockSub(null)
    expect(await getPaTier('u1')).toBe('master')
  })

  it('does not grandfather users created after the cutoff', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    process.env.PREMIUM_GRANDFATHER_UNTIL = '2020-01-01'
    mockUser({ role: 'user', createdAt: new Date('2026-01-01') })
    mockSub(null)
    expect(await getPaTier('u1')).toBe('free')
  })

  it('returns free on a DB error', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    ;(prisma.users.findUnique as any).mockRejectedValue(new Error('db down'))
    mockSub(null)
    expect(await getPaTier('u1')).toBe('free')
  })

  it('grants alchemist via an alchm.kitchen premium subscription (unified role)', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'user', createdAt: new Date() })
    mockSub(null) // no PA-side subscription
    expect(await getPaTier('u1', { kitchenPremium: true })).toBe('alchemist')
  })

  it('stays free when neither a PA sub nor kitchen premium is present', async () => {
    process.env.PREMIUM_ENFORCEMENT_ENABLED = 'true'
    mockUser({ role: 'user', createdAt: new Date() })
    mockSub(null)
    expect(await getPaTier('u1', { kitchenPremium: false })).toBe('free')
  })
})
