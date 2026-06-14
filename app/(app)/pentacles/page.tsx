import type { Metadata } from 'next'
import PentaclesClient from './pentacles-client'

export const metadata: Metadata = {
  title: 'Pentacle Star Vaults · AlchmAgents',
  description:
    'Stake USDC on individual stars and earn elemental essence (Spirit / Essence / Matter / Substance) while they are risen above your horizon. Settles on Circle Arc.',
}

export default function PentaclesPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #0b0d20, #05060f)',
      }}
    >
      <PentaclesClient />
    </main>
  )
}
