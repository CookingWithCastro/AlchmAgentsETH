import type { Metadata } from 'next'
import OnboardingPanel from '@/components/staking/OnboardingPanel'
import ConnectNav from './ConnectNav'

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
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: 24,
        }}
      >
        <ConnectNav />
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <OnboardingPanel />
      </div>
    </main>
  )
}
