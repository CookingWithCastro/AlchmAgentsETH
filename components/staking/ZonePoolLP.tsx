'use client'

import { useState } from 'react'
import { DynamicWidget } from '@dynamic-labs/sdk-react-core'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import { useZonePool, type ZonePoolContext } from '@/lib/staking/useZonePool'
import { constIdForPair } from '@/lib/staking/amm'
import { ELEMENT_COLOR, ESMS_LABEL } from '@/lib/staking/ui'
import { zoneKind } from '@/lib/staking/pentacle-geometry'
import type { ZonePoolInfo } from '@/lib/staking/zone-pools'

interface ZonePoolLPProps {
  zone: ZonePoolInfo | null
  ctx: ZonePoolContext
}

const card: React.CSSProperties = {
  background: 'rgba(14,16,38,0.6)',
  border: '1px solid rgba(122,128,200,0.22)',
  borderRadius: 16,
  padding: 14,
  color: '#dfe2ff',
}

export default function ZonePoolLP({ zone, ctx }: ZonePoolLPProps) {
  const [amount, setAmount] = useState('1')
  const pool = useZonePool(ctx)

  const explorer = pool.lastTx ? `${ARC_TESTNET.explorer}/tx/${pool.lastTx}` : null

  return (
    <div style={card}>
      <div
        style={{
          fontSize: 12,
          color: '#9aa0d8',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        Provide liquidity {zone ? `· Zone ${zone.zoneId} ${zoneKind(zone.zoneId)}` : ''}
      </div>

      {!zone && <div style={{ fontSize: 13, color: '#6b72a8' }}>Click a zone on the pentacle.</div>}
      {zone && zone.pools.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b72a8' }}>
          No open pool here — needs a planet in this zone with a favorable cross-element aspect.
        </div>
      )}

      {zone && zone.pools.length > 0 && (
        <>
          {!pool.connected ? (
            <div>
              <p style={{ fontSize: 13, color: '#9aa0d8', marginTop: 0 }}>
                Connect a wallet to provide essence.
              </p>
              <DynamicWidget />
            </div>
          ) : !pool.configured ? (
            <p style={{ fontSize: 12.5, color: '#ffce85' }}>
              AMM not deployed — set <code>NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS</code>.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#9aa0d8' }}>Essence each side:</span>
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                  style={{
                    width: 80,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(122,128,200,0.3)',
                    borderRadius: 8,
                    padding: '6px 9px',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              </div>
              {zone.pools.map((p, i) => {
                const constId = constIdForPair(p.ids[0], p.ids[1])
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      <span style={{ color: ELEMENT_COLOR[p.elements[0]] }}>
                        {ESMS_LABEL[p.ids[0]]}
                      </span>
                      <span style={{ color: '#9aa0d8' }}> ↔ </span>
                      <span style={{ color: ELEMENT_COLOR[p.elements[1]] }}>
                        {ESMS_LABEL[p.ids[1]]}
                      </span>
                    </span>
                    <button
                      disabled={pool.busy || constId < 0}
                      onClick={() => constId >= 0 && pool.seed(constId, amount, amount)}
                      style={{
                        background: 'rgba(122,128,200,0.16)',
                        color: '#dfe2ff',
                        border: '1px solid rgba(122,128,200,0.32)',
                        borderRadius: 9,
                        padding: '6px 12px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: pool.busy ? 'wait' : 'pointer',
                        opacity: pool.busy ? 0.6 : 1,
                      }}
                    >
                      Provide
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}

      {pool.message && (
        <div style={{ fontSize: 12.5, color: '#bcc1f0', marginTop: 8 }}>
          {pool.message}
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
