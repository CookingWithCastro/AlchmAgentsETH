import type { Metadata } from 'next'
import PortfolioClient from './portfolio-client'
import ShootingStarToasts from '@/components/staking/ShootingStarToasts'

export const metadata: Metadata = {
  title: 'Your Constellations · Pentacle Star Vaults',
  description:
    'Your star stakes, live APYs, accrued elemental essence, and zone liquidity positions on Circle Arc.',
}

export default function PortfolioPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #0b0d20, #05060f)',
      }}
    >
      <PortfolioClient />
      <ShootingStarToasts />
    </main>
  )
}
