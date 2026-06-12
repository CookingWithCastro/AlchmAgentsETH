import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as batchMetricsGET } from '@/app/api/admin/batch-metrics/route'
import { GET as conversationMetricsGET } from '@/app/api/admin/conversation-metrics/route'
import { GET as dashboardGET } from '@/app/api/admin/dashboard/route'
import { GET as performanceMetricsGET } from '@/app/api/admin/performance-metrics/route'
import { GET as sharedUsersGET } from '@/app/api/admin/shared-users/route'
import { GET as systemStatsGET } from '@/app/api/admin/system-stats/route'
import { prisma } from '@/lib/db'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// auth() falls back to the alchm.kitchen cookie bridge when there is no native
// session; outside a real request scope cookies() throws, which unstable_rethrow
// propagates and every route 500s. Give the bridge an empty cookie jar instead.
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    users: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    historical_agents: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    created_agents: {
      count: vi.fn(),
    },
    consciousness_interactions: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    agent_evolution_states: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    monica_interactions: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    userSubscription: {
      groupBy: vi.fn(),
    },
    userSession: {
      count: vi.fn(),
    },
    agentConversation: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    transit_monitoring_jobs: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    rAGQuery: {
      count: vi.fn(),
    },
  },
}))

const getServerSessionMock = vi.mocked(getServerSession)
const prismaMock = vi.mocked(prisma, { deep: true })

function adminRequest(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

const adminRoutes = [
  ['/api/admin/dashboard', dashboardGET],
  ['/api/admin/performance-metrics?timeRange=24h', performanceMetricsGET],
  ['/api/admin/conversation-metrics', conversationMetricsGET],
  ['/api/admin/batch-metrics', batchMetricsGET],
  ['/api/admin/system-stats', systemStatsGET],
  ['/api/admin/shared-users', sharedUsersGET],
] as const

describe('admin API authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(adminRoutes)('rejects unauthenticated access to %s', async (path, handler) => {
    getServerSessionMock.mockResolvedValue(null)

    const response = await handler(adminRequest(path))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Authentication required' })
  })

  it.each(adminRoutes)('rejects non-admin access to %s', async (path, handler) => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    })
    prismaMock.users.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
    } as never)

    const response = await handler(adminRequest(path))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Admin privileges required' })
  })

  it('allows admin access to performance metrics without fabricated satisfaction data', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'ops@example.com',
        name: 'Ops',
        role: 'admin',
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    })

    prismaMock.users.count.mockResolvedValue(3)
    prismaMock.userSession.count.mockResolvedValue(2)
    prismaMock.agentConversation.count.mockResolvedValue(5)
    prismaMock.agentConversation.findMany.mockResolvedValue([{ userId: 'user-1' }] as never)
    prismaMock.agentConversation.groupBy.mockResolvedValue([
      {
        agentId: 'hermes',
        _count: { agentId: 5 },
        _avg: { responseTime: 1200 },
      },
    ] as never)
    prismaMock.monica_interactions.count.mockResolvedValue(1)
    prismaMock.monica_interactions.groupBy
      .mockResolvedValueOnce([{ deviceType: 'desktop', _count: { deviceType: 1 } }] as never)
      .mockResolvedValueOnce([{ browserInfo: 'Chrome', _count: { browserInfo: 1 } }] as never)
    prismaMock.rAGQuery.count.mockResolvedValue(2)
    prismaMock.consciousness_interactions.aggregate.mockResolvedValue({
      _sum: { powerGained: 7 },
    } as never)
    prismaMock.consciousness_interactions.count.mockResolvedValue(1)
    prismaMock.historical_agents.aggregate.mockResolvedValue({
      _avg: { evolutionPoints: 4.2 },
    } as never)

    const response = await performanceMetricsGET(
      adminRequest('/api/admin/performance-metrics?timeRange=24h')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.metrics.systemMetrics.cpuUsage).toBeNull()
    expect(body.metrics.agentAnalytics.popularAgents[0].satisfaction).toBeNull()
  })
})
