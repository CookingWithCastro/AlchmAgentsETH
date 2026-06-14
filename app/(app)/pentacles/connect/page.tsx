import type { Metadata } from 'next'
import OnboardingPanel from '@/components/staking/OnboardingPanel'

export const metadata: Metadata = {
  title: 'Connect · Pentacle Star Vaults',
  description:
    'Connect a wallet, switch to Circle Arc, and get testnet USDC to begin staking on the stars.',
}

export default function ConnectPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 35%, #1a1712, #05060f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <OnboardingPanel />
    </main>
  )
}
