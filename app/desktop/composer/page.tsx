import { auth } from '@/lib/auth'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { getPrimaryNatalChart } from '@/lib/services/natal-chart-storage'
import {
  craftedToCouncilAgent,
  userChartToCouncilAgent,
  type UserChartLite,
} from '@/components/cosmic-agents/agent-adapter'
import { LUNAR_AGENT, PLANETARY_AGENT } from '@/components/cosmic-agents/seed-data'
import type { CouncilAgent } from '@/components/cosmic-agents/types'
import './composer.css'
import { LiveComposerClient } from './live-composer-client'

export const dynamic = 'force-dynamic'

export default async function DesktopComposerPage() {
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
      console.error('[desktop/composer] failed to load user natal chart:', err)
    }
  }

  const historical = HISTORICAL_AGENTS.map(agent => craftedToCouncilAgent(agent))
  const agents: CouncilAgent[] = [
    ...(userAgent ? [userAgent] : []),
    PLANETARY_AGENT,
    LUNAR_AGENT,
    ...historical,
  ]

  return <LiveComposerClient agents={agents} />
}
