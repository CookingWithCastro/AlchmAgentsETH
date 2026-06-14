import type { Metadata } from 'next'
import OnboardingPanel from '@/components/staking/OnboardingPanel'
import Link from 'next/link'

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
        <div
          style={{
            display: 'flex',
            gap: 16,
            borderBottom: '1px solid rgba(122, 128, 200, 0.2)',
            paddingBottom: 10,
            width: '100%',
          }}
        >
          <Link
            href="/pentacles"
            style={{
              color: '#9aa0d8',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
          >
            Sky Vaults
          </Link>
          <Link
            href="/pentacles/portfolio"
            style={{
              color: '#9aa0d8',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
          >
            Your Portfolio
          </Link>
          <span style={{ color: '#ffd76a', fontWeight: 600, fontSize: 14 }}>Arc Onboarding</span>
        </div>
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
