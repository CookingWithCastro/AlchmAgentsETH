import type { Metadata } from 'next'
import StarAgentChatPanel from '@/components/staking/StarAgentChatPanel'
import ConnectNav from '../connect/ConnectNav'
import ShootingStarToasts from '@/components/staking/ShootingStarToasts'

export const metadata: Metadata = {
  title: 'Star Agents · Pentacle Star Vaults',
  description:
    'Converse directly with living Star Personas (Sirius, Arcturus, Vega, Polaris) and discover why you should stake USDC in their celestial vaults to earn ESMS elemental yield on Circle Arc.',
}

export default function StarAgentsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #120b24, #05060f)',
        padding: '24px 18px 80px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto 24px',
        }}
      >
        <ConnectNav />
      </div>
      <StarAgentChatPanel />
      <ShootingStarToasts />
    </main>
  )
}
