'use client'

import { useMemo } from 'react'
import { DynamicWidget } from '@dynamic-labs/sdk-react-core'
import { ELEMENT_COLOR, ELEMENT_GLYPH, ESMS_LABEL } from '@/lib/staking/ui'

interface CosmicWalletProps {
  onOpenSwap: () => void
  onScrollToLP: () => void
  balances: {
    spirit: number
    essence: number
    matter: number
    substance: number
    usdc: number
    total: number
  } | null
  loading: boolean
  connected: boolean
  address: string | null
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(14, 16, 38, 0.65)',
  border: '1px solid rgba(122, 128, 200, 0.25)',
  borderRadius: 16,
  padding: 18,
  color: '#dfe2ff',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
}

const tileStyle = (color: string): React.CSSProperties => ({
  background: 'rgba(14, 16, 38, 0.4)',
  border: '1px solid rgba(122, 128, 200, 0.15)',
  borderRadius: 12,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `inset 0 0 10px rgba(122, 128, 200, 0.05)`,
})

function WalletSigil({ address }: { address: string }) {
  const hash = useMemo(() => {
    if (!address || address.length < 10) return { p1: 0, p2: 0, p3: 0, p4: 0 }
    const hex = address.slice(2, 10)
    return {
      p1: parseInt(hex.slice(0, 2), 16),
      p2: parseInt(hex.slice(2, 4), 16),
      p3: parseInt(hex.slice(4, 6), 16),
      p4: parseInt(hex.slice(6, 8), 16),
    }
  }, [address])

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 100 100"
      style={{
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(122, 128, 200, 0.3)',
        flexShrink: 0,
      }}
    >
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="#9aa0d8"
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#ffd76a" strokeWidth="0.8" opacity="0.6" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="#6b72a8" strokeWidth="0.8" opacity="0.5" />
      <line x1="10" y1="50" x2="90" y2="50" stroke="#6b72a8" strokeWidth="0.8" opacity="0.5" />

      {/* Symmetrical alchemical polygon */}
      <polygon
        points={`50,${20 + (hash.p1 % 15)} ${25 + (hash.p2 % 15)},${70 - (hash.p3 % 15)} ${75 - (hash.p4 % 15)},${70 - (hash.p3 % 15)}`}
        fill="none"
        stroke="#ffd76a"
        strokeWidth="1.5"
      />
      {/* Outer orbits */}
      <circle cx="50" cy="50" r="6" fill="#ffd76a" opacity="0.8" />
    </svg>
  )
}

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="45" height="15" viewBox="0 0 50 20" style={{ opacity: 0.5 }}>
      <path
        d="M 0 14 Q 10 4, 20 12 T 40 8 T 50 3"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ConstellationIllustration() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}
    >
      <svg width="120" height="80" viewBox="0 0 120 80" style={{ opacity: 0.35, marginBottom: 12 }}>
        <line
          x1="20"
          y1="40"
          x2="50"
          y2="20"
          stroke="#9aa0d8"
          strokeWidth="0.75"
          strokeDasharray="2,2"
        />
        <line
          x1="50"
          y1="20"
          x2="80"
          y2="35"
          stroke="#9aa0d8"
          strokeWidth="0.75"
          strokeDasharray="2,2"
        />
        <line
          x1="80"
          y1="35"
          x2="100"
          y2="60"
          stroke="#9aa0d8"
          strokeWidth="0.75"
          strokeDasharray="2,2"
        />
        <line
          x1="50"
          y1="20"
          x2="65"
          y2="55"
          stroke="#9aa0d8"
          strokeWidth="0.75"
          strokeDasharray="2,2"
        />
        <line
          x1="65"
          y1="55"
          x2="20"
          y2="40"
          stroke="#9aa0d8"
          strokeWidth="0.75"
          strokeDasharray="2,2"
        />

        <circle
          cx="20"
          cy="40"
          r="3.5"
          fill="#ff6b4a"
          style={{ filter: 'drop-shadow(0 0 4px #ff6b4a)' }}
        />
        <circle
          cx="50"
          cy="20"
          r="3"
          fill="#4aa8ff"
          style={{ filter: 'drop-shadow(0 0 4px #4aa8ff)' }}
        />
        <circle
          cx="80"
          cy="35"
          r="4"
          fill="#ffd76a"
          style={{ filter: 'drop-shadow(0 0 4px #ffd76a)' }}
        />
        <circle
          cx="100"
          cy="60"
          r="2.5"
          fill="#c9a3ff"
          style={{ filter: 'drop-shadow(0 0 4px #c9a3ff)' }}
        />
        <circle
          cx="65"
          cy="55"
          r="3.5"
          fill="#5fd08a"
          style={{ filter: 'drop-shadow(0 0 4px #5fd08a)' }}
        />
      </svg>
      <div style={{ color: '#6b72a8', fontSize: 13, textAlign: 'center' }}>
        Stake a star to begin earning essence.
      </div>
    </div>
  )
}

export default function CosmicWallet({
  onOpenSwap,
  onScrollToLP,
  balances,
  loading,
  connected,
  address,
}: CosmicWalletProps) {
  const truncatedAddress = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }, [address])

  const hasBalances = useMemo(() => {
    if (!balances) return false
    return balances.total > 0
  }, [balances])

  // Split allocation percentages
  const { spiritPct, essencePct, matterPct, substancePct } = useMemo(() => {
    if (!balances || balances.total === 0) {
      return { spiritPct: 25, essencePct: 25, matterPct: 25, substancePct: 25 }
    }
    return {
      spiritPct: (balances.spirit / balances.total) * 100,
      essencePct: (balances.essence / balances.total) * 100,
      matterPct: (balances.matter / balances.total) * 100,
      substancePct: (balances.substance / balances.total) * 100,
    }
  }, [balances])

  if (!connected) {
    return (
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--ff-display)' }}>
            Your Essence
          </h2>
          <span
            style={{
              fontSize: 11,
              background: 'rgba(122, 128, 200, 0.15)',
              padding: '2px 8px',
              borderRadius: 12,
              border: '1px solid rgba(122, 128, 200, 0.25)',
              color: '#9aa0d8',
            }}
          >
            Arc Testnet
          </span>
        </div>
        <ConstellationIllustration />
        <div style={{ marginTop: 16 }}>
          <DynamicWidget />
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WalletSigil address={address || ''} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e7e9ff' }}>
              {truncatedAddress}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(122, 128, 200, 0.15)',
                  padding: '1px 6px',
                  borderRadius: 12,
                  border: '1px solid rgba(122, 128, 200, 0.25)',
                  color: '#9aa0d8',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Arc
              </span>
              <span style={{ fontSize: 10.5, color: '#ffd76a', fontWeight: 600 }}>
                Circle Testnet
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9aa0d8', textTransform: 'uppercase' }}>
            USDC Balance
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {balances ? balances.usdc.toFixed(2) : '0.00'}{' '}
            <span style={{ fontSize: 12, color: '#9aa0d8' }}>USDC</span>
          </div>
        </div>
      </div>

      {loading && !balances ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <span style={{ fontSize: 13, color: '#9aa0d8' }}>Summoning balances…</span>
        </div>
      ) : !hasBalances ? (
        <ConstellationIllustration />
      ) : (
        <>
          {/* 2x2 grid of balances */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Spirit (Fire) */}
            <div style={tileStyle(ELEMENT_COLOR.Fire)}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR.Fire,
                    fontSize: 18,
                    fontWeight: 700,
                    filter: `drop-shadow(0 0 6px ${ELEMENT_COLOR.Fire})`,
                  }}
                >
                  {ELEMENT_GLYPH.Fire}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    background: 'rgba(255, 107, 74, 0.15)',
                    color: ELEMENT_COLOR.Fire,
                    border: '1px solid rgba(255, 107, 74, 0.25)',
                    padding: '1px 4px',
                    borderRadius: 4,
                  }}
                >
                  locked
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9aa0d8' }}>{ESMS_LABEL[0]}</div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: 'var(--ff-display)',
                  fontWeight: 700,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {balances?.spirit.toFixed(2)}
              </div>
              <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                <Sparkline color={ELEMENT_COLOR.Fire} />
              </div>
            </div>

            {/* Essence (Water) */}
            <div style={tileStyle(ELEMENT_COLOR.Water)}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR.Water,
                    fontSize: 18,
                    fontWeight: 700,
                    filter: `drop-shadow(0 0 6px ${ELEMENT_COLOR.Water})`,
                  }}
                >
                  {ELEMENT_GLYPH.Water}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    background: 'rgba(74, 168, 255, 0.15)',
                    color: ELEMENT_COLOR.Water,
                    border: '1px solid rgba(74, 168, 255, 0.25)',
                    padding: '1px 4px',
                    borderRadius: 4,
                  }}
                >
                  locked
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9aa0d8' }}>{ESMS_LABEL[1]}</div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: 'var(--ff-display)',
                  fontWeight: 700,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {balances?.essence.toFixed(2)}
              </div>
              <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                <Sparkline color={ELEMENT_COLOR.Water} />
              </div>
            </div>

            {/* Matter (Earth) */}
            <div style={tileStyle(ELEMENT_COLOR.Earth)}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR.Earth,
                    fontSize: 18,
                    fontWeight: 700,
                    filter: `drop-shadow(0 0 6px ${ELEMENT_COLOR.Earth})`,
                  }}
                >
                  {ELEMENT_GLYPH.Earth}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    background: 'rgba(95, 208, 138, 0.15)',
                    color: ELEMENT_COLOR.Earth,
                    border: '1px solid rgba(95, 208, 138, 0.25)',
                    padding: '1px 4px',
                    borderRadius: 4,
                  }}
                >
                  locked
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9aa0d8' }}>{ESMS_LABEL[2]}</div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: 'var(--ff-display)',
                  fontWeight: 700,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {balances?.matter.toFixed(2)}
              </div>
              <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                <Sparkline color={ELEMENT_COLOR.Earth} />
              </div>
            </div>

            {/* Substance (Air) */}
            <div style={tileStyle(ELEMENT_COLOR.Air)}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    color: ELEMENT_COLOR.Air,
                    fontSize: 18,
                    fontWeight: 700,
                    filter: `drop-shadow(0 0 6px ${ELEMENT_COLOR.Air})`,
                  }}
                >
                  {ELEMENT_GLYPH.Air}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    background: 'rgba(201, 163, 255, 0.15)',
                    color: ELEMENT_COLOR.Air,
                    border: '1px solid rgba(201, 163, 255, 0.25)',
                    padding: '1px 4px',
                    borderRadius: 4,
                  }}
                >
                  locked
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9aa0d8' }}>{ESMS_LABEL[3]}</div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: 'var(--ff-display)',
                  fontWeight: 700,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {balances?.substance.toFixed(2)}
              </div>
              <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                <Sparkline color={ELEMENT_COLOR.Air} />
              </div>
            </div>
          </div>

          {/* Allocation Bar */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#9aa0d8',
                marginBottom: 6,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Total Alchemical Allocation</span>
              <span style={{ color: '#ffd76a' }}>{balances?.total.toFixed(2)} ESMS</span>
            </div>
            <div
              style={{
                position: 'relative',
                height: 16,
                display: 'flex',
                alignItems: 'center',
                margin: '4px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    width: `${spiritPct}%`,
                    background: ELEMENT_COLOR.Fire,
                    transition: 'width 0.3s',
                  }}
                />
                <div
                  style={{
                    width: `${essencePct}%`,
                    background: ELEMENT_COLOR.Water,
                    transition: 'width 0.3s',
                  }}
                />
                <div
                  style={{
                    width: `${matterPct}%`,
                    background: ELEMENT_COLOR.Earth,
                    transition: 'width 0.3s',
                  }}
                />
                <div
                  style={{
                    width: `${substancePct}%`,
                    background: ELEMENT_COLOR.Air,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  top: '50%',
                  background: '#0c0d24',
                  border: '1px solid rgba(122, 128, 200, 0.3)',
                  borderRadius: 8,
                  padding: '1px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#e7e9ff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {balances?.total.toFixed(2)} Total
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer / Action row */}
      <div
        style={{
          borderTop: '1px solid rgba(122, 128, 200, 0.15)',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onOpenSwap}
            disabled={!connected || !hasBalances}
            style={{
              flex: 1,
              background: 'rgba(122, 128, 200, 0.12)',
              color: '#dfe2ff',
              border: '1px solid rgba(122, 128, 200, 0.25)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: !connected || !hasBalances ? 'not-allowed' : 'pointer',
              opacity: !connected || !hasBalances ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            Swap essence
          </button>
          <button
            onClick={onScrollToLP}
            disabled={!connected}
            style={{
              flex: 1,
              background: 'rgba(122, 128, 200, 0.12)',
              color: '#dfe2ff',
              border: '1px solid rgba(122, 128, 200, 0.25)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: !connected ? 'not-allowed' : 'pointer',
              opacity: !connected ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            Provide to a zone pool
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: '#6b72a8', textAlign: 'center', fontStyle: 'italic' }}>
          Earned by staking stars while they&apos;re risen.
        </div>
      </div>
    </div>
  )
}
