'use client'

import { useState } from 'react'
import { DynamicWidget } from '@dynamic-labs/sdk-react-core'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import { useStarStaking, type StakingContext } from '@/lib/staking/useStarStaking'
import { ELEMENT_COLOR, ESMS_LABEL, PLANET_GLYPH } from '@/lib/staking/ui'
import type { StakeableStar, YieldRateBreakdown } from '@/lib/staking/types'

interface StarStakePanelProps {
  star: StakeableStar | null
  breakdown: YieldRateBreakdown | null
  ctx: StakingContext
}

const card: React.CSSProperties = {
  background: 'rgba(14,16,38,0.72)',
  border: '1px solid rgba(122,128,200,0.28)',
  borderRadius: 16,
  padding: 18,
  color: '#dfe2ff',
  backdropFilter: 'blur(8px)',
}

function Mult({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}
    >
      <span style={{ color: '#9aa0d8' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>×{value.toFixed(2)}</span>
    </div>
  )
}

export default function StarStakePanel({ star, breakdown, ctx }: StarStakePanelProps) {
  const [amount, setAmount] = useState('5')
  const staking = useStarStaking(star, ctx)

  if (!star) {
    return (
      <div style={card}>
        <p style={{ color: '#9aa0d8', margin: 0 }}>Select a star on the pentacle to stake.</p>
      </div>
    )
  }

  const color = ELEMENT_COLOR[star.element]
  const esms = ESMS_LABEL[star.esmsId]
  const explorer = staking.lastTx ? `${ARC_TESTNET.explorer}/tx/${staking.lastTx}` : null

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{star.name}</div>
          <div style={{ fontSize: 12, color: '#9aa0d8' }}>
            HIP {star.hipId} · {star.element} → pays <strong style={{ color }}>{esms}</strong>
            {star.heldBy ? ` · held by ${PLANET_GLYPH[star.heldBy]} ${star.heldBy}` : ''}
          </div>
        </div>
      </div>

      {/* Visibility + headline APY */}
      {breakdown && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12,
            padding: '10px 14px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#9aa0d8',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {esms} APY
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>
              {breakdown.visible ? `${breakdown.apyPct.toFixed(1)}%` : 'paused'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ color: breakdown.visible ? '#5fd08a' : '#ff7a7a' }}>
              {breakdown.visible
                ? `● risen (${breakdown.altitudeDeg.toFixed(0)}° up)`
                : '○ below horizon'}
            </div>
            <div style={{ color: '#9aa0d8' }}>yield flows only while risen</div>
          </div>
        </div>
      )}

      {/* Multiplicative breakdown */}
      {breakdown && (
        <div style={{ borderTop: '1px solid rgba(122,128,200,0.18)', paddingTop: 8 }}>
          <Mult label="Sky elemental dominance" value={breakdown.zoneDominance} />
          <Mult label="Your chart affinity" value={breakdown.chartAffinity} />
          <Mult label="Transiting planet dignity" value={breakdown.planetDignity} />
          {(breakdown.zoneBoost ?? 1) > 1.05 && (
            <Mult label="Zone pool + ascendant boost" value={breakdown.zoneBoost ?? 1} />
          )}
        </div>
      )}

      {/* Position */}
      {staking.configured && staking.connected && (
        <div style={{ fontSize: 13, color: '#c4c8f4' }}>
          Your stake: <strong>{(staking.position?.principalUsdc ?? 0).toFixed(2)} USDC</strong>
        </div>
      )}

      {/* Actions */}
      {!staking.connected ? (
        <div>
          <p style={{ fontSize: 13, color: '#9aa0d8', marginTop: 0 }}>
            Connect a wallet to stake on Arc.
          </p>
          <DynamicWidget />
        </div>
      ) : !staking.configured ? (
        <p style={{ fontSize: 13, color: '#ffce85' }}>
          Vault not deployed yet — set <code>NEXT_PUBLIC_STAR_VAULT_ADDRESS</code> after running{' '}
          <code>DeployStarVault.s.sol</code>.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              inputMode="decimal"
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(122,128,200,0.3)',
                borderRadius: 10,
                padding: '9px 12px',
                color: '#fff',
                fontSize: 14,
              }}
              placeholder="USDC"
            />
            <button
              disabled={staking.busy}
              onClick={() => staking.stake(amount)}
              style={btn(color, staking.busy)}
            >
              Stake
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={staking.busy || !(staking.position && staking.position.shares > 0n)}
              onClick={() => staking.position && staking.unstake(staking.position.shares)}
              style={btnGhost(staking.busy)}
            >
              Unstake all
            </button>
            <button
              disabled={staking.busy}
              onClick={() => staking.claim()}
              style={btnGhost(staking.busy)}
            >
              Claim {esms}
            </button>
          </div>
        </>
      )}

      {staking.message && (
        <div style={{ fontSize: 12.5, color: '#bcc1f0' }}>
          {staking.message}
          {explorer && (
            <>
              {' '}
              <a href={explorer} target="_blank" rel="noreferrer" style={{ color: '#7fb0ff' }}>
                view tx ↗
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function btn(color: string, busy: boolean): React.CSSProperties {
  return {
    background: color,
    color: '#0b0d20',
    border: 'none',
    borderRadius: 10,
    padding: '9px 18px',
    fontWeight: 700,
    fontSize: 14,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1,
  }
}

function btnGhost(busy: boolean): React.CSSProperties {
  return {
    flex: 1,
    background: 'rgba(122,128,200,0.14)',
    color: '#dfe2ff',
    border: '1px solid rgba(122,128,200,0.32)',
    borderRadius: 10,
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: 13,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1,
  }
}
