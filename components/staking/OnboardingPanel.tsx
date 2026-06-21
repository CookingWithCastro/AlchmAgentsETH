'use client'

import { DynamicWidget } from '@dynamic-labs/sdk-react-core'
import { useArcWallet } from '@/lib/staking/useArcWallet'
import { GOLD } from '@/lib/staking/ui'
import PentaclesNetworkStatus from './PentaclesNetworkStatus'

const card: React.CSSProperties = {
  background: 'rgba(22,19,12,0.6)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderTop: `1px solid ${GOLD}22`,
  borderRadius: 16,
  padding: 18,
  color: '#e7e9ff',
  backdropFilter: 'blur(16px)',
}

function Step({
  n,
  done,
  title,
  subtitle,
  action,
}: {
  n: number
  done: boolean
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: 8,
        borderRadius: 10,
        background: done ? 'rgba(255,215,106,0.06)' : 'transparent',
        border: done ? `1px solid ${GOLD}22` : '1px solid transparent',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: '50%',
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: done ? `${GOLD}22` : 'transparent',
          border: done ? 'none' : '1px solid rgba(208,197,177,0.3)',
          color: done ? GOLD : '#9aa0d8',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {done ? '✓' : n}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: done ? GOLD : '#e7e9ff' }}>
            {title}
          </span>
          {action}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(154,160,216,0.8)' }}>{subtitle}</div>
      </div>
    </li>
  )
}

/** Connect + onboarding (Dynamic → Arc → faucet → World ID). Wired to useArcWallet. */
export default function OnboardingPanel() {
  const wallet = useArcWallet()

  return (
    <div
      style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 32,
            fontWeight: 700,
            color: GOLD,
            margin: 0,
          }}
        >
          Pentacle Star Vaults
        </h1>
        <p style={{ color: '#9aa0d8', marginTop: 6 }}>
          Stake USDC on the stars. Earn alchemical essence.
        </p>
        <PentaclesNetworkStatus />
      </div>

      <DynamicWidget />

      <div style={card}>
        <h2
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 18,
            color: GOLD,
            margin: 0,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          Initiation Sequence
        </h2>
        <ul
          style={{
            listStyle: 'none',
            margin: '14px 0 0',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Step
            n={1}
            done={wallet.connected}
            title="Connect wallet"
            subtitle="Secure link established."
          />
          <Step
            n={2}
            done={wallet.onArc === true}
            title="Switch to Arc network"
            subtitle="Align with the proper dimensional frequency."
            action={
              wallet.connected && wallet.onArc !== true ? (
                <button
                  onClick={() => void wallet.ensureArc()}
                  style={{
                    background: `${GOLD}22`,
                    color: GOLD,
                    border: `1px solid ${GOLD}44`,
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Switch
                </button>
              ) : undefined
            }
          />
          <Step
            n={3}
            done={false}
            title="Get testnet USDC"
            subtitle="Summon raw materials for staking."
            action={
              <a
                href={wallet.faucetUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#7febff', textDecoration: 'underline' }}
              >
                Faucet ↗
              </a>
            }
          />
          <Step
            n={4}
            done={false}
            title="Verify you're human"
            subtitle="Prove mortal origin to access the vaults."
            action={
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  background: 'rgba(89,55,138,0.3)',
                  color: '#d7baff',
                  border: '1px solid rgba(215,186,255,0.2)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                World ID
              </span>
            }
          />
        </ul>
      </div>
    </div>
  )
}
