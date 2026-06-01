import type { Metadata } from 'next'
import { ContextCardStudio } from '@/components/context-card/context-card-studio'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import { computeTransits, DEMO_SKY } from '@/lib/context-card/transit-engine'
import type { ContextCardData } from '@/lib/context-card/types'
import './context-card.css'

export const metadata: Metadata = {
  title: 'Alchm Context Card · Cosmic Agents',
  description:
    'Export your complete natal chart and alchm energetic profile as a single file any LLM can read for personalized, chart-grounded guidance.',
}

export default function ContextCardPage() {
  // The current sky overlaid on the natal chart. DEMO_SKY is the static fallback
  // that mirrors the Council Feed's chart-of-the-moment; swap in live planetary
  // positions here to make the transit synergy genuinely current.
  const sky = DEMO_SKY

  // Reference native ("Self · Council Native") — the design's demo chart, with the
  // transit→natal synergy grid computed against the current sky. Wiring this to a
  // signed-in user's stored natal chart (getPrimaryNatalChart) is the production step.
  const data: ContextCardData = {
    ...DEMO_CARD_DATA,
    transits: computeTransits(DEMO_CARD_DATA.points, sky),
  }

  return <ContextCardStudio data={data} sky={sky} />
}
