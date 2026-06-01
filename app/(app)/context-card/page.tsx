import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { getPrimaryNatalChart } from '@/lib/services/natal-chart-storage'
import { ContextCardStudio } from '@/components/context-card/context-card-studio'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import { buildContextCardDataFromChart } from '@/lib/context-card/from-natal-chart'
import { getLiveSky } from '@/lib/context-card/live-sky'
import { computeTransits, DEMO_SKY, type SkySource } from '@/lib/context-card/transit-engine'
import type { ContextCardData } from '@/lib/context-card/types'
import './context-card.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Alchm Context Card · Cosmic Agents',
  description:
    'Export your complete natal chart and alchm energetic profile as a single file any LLM can read for personalized, chart-grounded guidance.',
}

export default async function ContextCardPage() {
  // Live "current sky" for the transit overlay (getLiveSky falls back to DEMO_SKY internally).
  let sky: SkySource = DEMO_SKY
  try {
    sky = await getLiveSky()
  } catch {
    sky = DEMO_SKY
  }

  // The signed-in user's primary natal chart, mapped to the rich card shape.
  // Falls back to the demo reference chart when signed out or no chart exists.
  let data: ContextCardData = DEMO_CARD_DATA
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (userId) {
      const chart = await getPrimaryNatalChart(userId)
      if (chart) {
        data = await buildContextCardDataFromChart(
          chart as Parameters<typeof buildContextCardDataFromChart>[0]
        )
      }
    }
  } catch (err) {
    console.error('[context-card] failed to load user natal chart:', err)
  }

  // Overlay the current sky on whichever chart we resolved.
  data = { ...data, transits: computeTransits(data.points, sky) }

  return <ContextCardStudio data={data} sky={sky} />
}
