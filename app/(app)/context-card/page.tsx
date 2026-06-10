import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getPrimaryNatalChart } from '@/lib/services/natal-chart-storage'
import { ContextCardStudio } from '@/components/context-card/context-card-studio'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import { buildContextCardDataFromChart } from '@/lib/context-card/from-natal-chart'
import { getLiveSky } from '@/lib/context-card/live-sky'
import { hasUnlockedCard } from '@/lib/context-card/entitlement'
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
  // The signed-in user's primary natal chart, mapped to the rich card shape.
  // Falls back to the demo reference chart when signed out or no chart exists.
  let data: ContextCardData = DEMO_CARD_DATA
  let initialUnlocked = false
  let loc: { lat?: number; lon?: number; name?: string } | null = null

  try {
    const session = await auth()
    const userId = session?.user.id
    if (userId) {
      const chart = await getPrimaryNatalChart(userId)
      if (chart) {
        data = await buildContextCardDataFromChart(
          chart as Parameters<typeof buildContextCardDataFromChart>[0]
        )
        const bl = (chart as { birthLocation?: { lat?: number; lon?: number; name?: string } })
          .birthLocation
        if (bl && typeof bl.lat === 'number') loc = bl
      }
      initialUnlocked = await hasUnlockedCard(userId)
    }
  } catch (err) {
    console.error('[context-card] failed to load user natal chart:', err)
  }

  // Live "current sky" for the transit overlay, anchored to the user's location
  // when known (getLiveSky falls back to DEMO_SKY / NYC defaults internally).
  let sky: SkySource = DEMO_SKY
  try {
    sky = await getLiveSky(new Date(), loc?.lat, loc?.lon, loc?.name)
  } catch {
    sky = DEMO_SKY
  }

  // Overlay the current sky on whichever chart we resolved.
  data = { ...data, transits: computeTransits(data.points, sky) }

  return <ContextCardStudio data={data} sky={sky} initialUnlocked={initialUnlocked} />
}
