import { auth } from '@/lib/auth'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { getPrimaryNatalChart } from '@/lib/services/natal-chart-storage'
import { prisma } from '@/lib/db'
import { normalizeDbActionToFeedEvent } from '@/lib/agents/feed-helpers'
import {
  craftedToCouncilAgent,
  userChartToCouncilAgent,
  type UserChartLite,
} from '@/components/cosmic-agents/agent-adapter'
import { LUNAR_AGENT, PLANETARY_AGENT, SEED_CHART } from '@/components/cosmic-agents/seed-data'
import { CouncilFeedClient } from '@/components/cosmic-agents/council-feed-client'
import type { CouncilAgent } from '@/components/cosmic-agents/types'
import type { FeedEvent } from '@/components/cosmic-agents/types'
import './council-feed.css'

export const dynamic = 'force-dynamic'

export default async function CouncilFeedPage() {
  const session = await auth()
  const userId = session?.user.id

  let userAgent: CouncilAgent | null = null
  if (userId) {
    try {
      const chart = await getPrimaryNatalChart(userId)
      if (chart) {
        const planetsRec = (chart.planets || {}) as Record<string, { sign: string; degree: number }>
        const positions = Object.entries(planetsRec).map(([planet, p]) => ({
          planet,
          sign: p.sign,
          degree: p.degree,
        }))
        const lite: UserChartLite = {
          id: chart.id,
          name: chart.chartName,
          birthDate: chart.birthDate?.toISOString?.()?.slice(0, 10),
          birthLocation:
            typeof chart.birthLocation === 'object' && chart.birthLocation
              ? (chart.birthLocation as { name?: string }).name
              : undefined,
          positions,
        }
        userAgent = userChartToCouncilAgent(lite)
      }
    } catch (err) {
      console.error('[council-feed] failed to load user natal chart:', err)
    }
  }

  // Project the full HISTORICAL_AGENTS roster + synthetic planetary/lunar agents
  const historical = HISTORICAL_AGENTS.map(a => craftedToCouncilAgent(a))
  const initialAgents: CouncilAgent[] = [PLANETARY_AGENT, LUNAR_AGENT, ...historical]

  // Bootstrap feed from database — real events instead of seed data
  let initialFeed: FeedEvent[] = []
  try {
    const dbRows = await prisma.agent_action_events.findMany({
      where: { status: { in: ['executed', 'posted'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    initialFeed = dbRows.map(normalizeDbActionToFeedEvent)
  } catch (err) {
    console.error('[council-feed] failed to bootstrap feed from DB:', err)
  }

  return (
    <CouncilFeedClient
      initialChart={SEED_CHART}
      initialAgents={initialAgents}
      initialUserAgent={userAgent}
      initialFeed={initialFeed}
    />
  )
}
