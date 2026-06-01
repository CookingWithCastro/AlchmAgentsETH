import type { Metadata } from 'next'
import WeeklyAttunementCircle from '@/components/agents/weekly-attunement-circle'

export const metadata: Metadata = {
  title: 'Attunement Circle · Best Dignity of the Week',
  description:
    'Each week, the best-dignity planetary agents are featured free. Let your guide lead you through the active-aspect degree council to earn ESMS.',
}

export default function AttunementCirclePage() {
  return <WeeklyAttunementCircle />
}
