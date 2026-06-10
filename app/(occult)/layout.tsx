import type { Metadata } from 'next'

import { OccultShell } from '@/components/layout/OccultShell'

export const metadata: Metadata = {
  title: 'Planetary Agents v2 — The Alchemical Engine',
  description:
    'Forge vessels, commune with entities, duel in the Jing Arena and read the record in the Alchemical Labs.',
}

export default function OccultLayout({ children }: { children: React.ReactNode }) {
  return <OccultShell>{children}</OccultShell>
}
