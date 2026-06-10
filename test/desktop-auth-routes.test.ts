import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    desktopApiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/services/economyService', () => ({
  EconomyService: { getBalances: vi.fn() },
}))
vi.mock('@/lib/profile-yield', () => ({
  buildProfileYieldStateFromBalances: vi.fn(balances => ({ balances, accounts: [] })),
}))

import { GET as getDesktopSession } from '@/app/api/desktop/session/route'
import { POST as linkDesktopSession } from '@/app/api/desktop/session/link/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'

const balances = {
  spirit: 10,
  essence: 20,
  matter: 30,
  substance: 40,
  lastDailyClaimAt: null,
  lastDailyClaimAgentsAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DEEP_LINK_SHARED_SECRET = 'test-deep-link-secret'
  ;(EconomyService.getBalances as any).mockResolvedValue(balances)
  ;(prisma.desktopApiKey.updateMany as any).mockResolvedValue({ count: 1 })
  ;(prisma.desktopApiKey.create as any).mockResolvedValue({})
  ;(prisma.$transaction as any).mockResolvedValue([])
})

describe('desktop unified auth routes', () => {
  it('uses the unified web identity without rotating desktop credentials', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'User' },
    })

    const response = await getDesktopSession(new Request('http://localhost/api/desktop/session'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ mode: 'authenticated', userId: 'user-1', apiKey: null })
    expect(prisma.desktopApiKey.updateMany).not.toHaveBeenCalled()
    expect(prisma.desktopApiKey.create).not.toHaveBeenCalled()
  })

  it('creates a signed desktop handoff for the unified identity', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'User' },
    })

    const response = await linkDesktopSession()
    const body = await response.json()
    const deepLink = new URL(body.deepLink)

    expect(response.status).toBe(200)
    expect(deepLink.protocol).toBe('alchm:')
    expect(deepLink.hostname).toBe('link-account')
    expect(deepLink.searchParams.get('userId')).toBe('user-1')
    expect(deepLink.searchParams.get('sig')).toMatch(/^[0-9a-f]{64}$/)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('rejects desktop linking when no unified identity is present', async () => {
    ;(auth as any).mockResolvedValue(null)

    const response = await linkDesktopSession()

    expect(response.status).toBe(401)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
