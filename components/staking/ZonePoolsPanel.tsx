'use client'

import { ELEMENT_COLOR, ESMS_LABEL, PLANET_GLYPH } from '@/lib/staking/ui'
import { zoneKind } from '@/lib/staking/pentacle-geometry'
import type { ElementPool } from '@/lib/staking/aspects'
import type { StarActivation, ZonePoolInfo } from '@/lib/staking/zone-pools'
import type { StakeableStar } from '@/lib/staking/types'

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  trine: '△',
  square: '□',
  opposition: '☍',
}

interface ZonePoolsPanelProps {
  pools: ElementPool[]
  zones: Map<number, ZonePoolInfo>
  activations: StarActivation[]
  selectedZoneId: number | null
  stars: StakeableStar[]
}

const card: React.CSSProperties = {
  background: 'rgba(14,16,38,0.6)',
  border: '1px solid rgba(122,128,200,0.22)',
  borderRadius: 16,
  padding: 14,
  color: '#dfe2ff',
}

function Pair({ pool }: { pool: ElementPool }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
      <span style={{ color: ELEMENT_COLOR[pool.elements[0]] }}>{ESMS_LABEL[pool.ids[0]]}</span>
      <span style={{ color: '#9aa0d8' }}>↔</span>
      <span style={{ color: ELEMENT_COLOR[pool.elements[1]] }}>{ESMS_LABEL[pool.ids[1]]}</span>
    </span>
  )
}

export default function ZonePoolsPanel({
  pools,
  zones,
  activations,
  selectedZoneId,
  stars,
}: ZonePoolsPanelProps) {
  const selected = selectedZoneId != null ? zones.get(selectedZoneId) : null
  const starName = (hipId: number) => stars.find(s => s.hipId === hipId)?.name ?? `HIP ${hipId}`

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
        Element-pair pools · live planetary aspects
      </div>

      {pools.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b72a8' }}>
          No favorable cross-element aspects right now.
        </div>
      )}
      {pools.slice(0, 6).map((pool, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            fontSize: 13,
          }}
        >
          <Pair pool={pool} />
          <span style={{ color: '#9aa0d8', fontSize: 12 }}>
            {PLANET_GLYPH[pool.planets[0]]} {ASPECT_GLYPH[pool.aspect] ?? ''}{' '}
            {PLANET_GLYPH[pool.planets[1]]} · ×{(1 + pool.strength * 0.25).toFixed(2)}
          </span>
        </div>
      ))}

      {activations.length > 0 && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(122,128,200,0.18)',
            fontSize: 12.5,
            color: '#fff3b0',
          }}
        >
          ✦ On the ascendant: {activations.map(a => starName(a.hipId)).join(', ')} — boosting zone
          {activations.length > 1 ? 's' : ''}{' '}
          {Array.from(new Set(activations.map(a => a.zoneId).filter(z => z >= 0))).join(', ') ||
            '—'}
        </div>
      )}

      {selected && (
        <div
          style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(122,128,200,0.18)' }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Zone {selected.zoneId} · {zoneKind(selected.zoneId)} · boost ×
            {selected.boost.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#9aa0d8' }}>
            {selected.planets.length
              ? `Planets here: ${selected.planets.map(p => PLANET_GLYPH[p]).join(' ')}`
              : 'No planets transiting.'}
          </div>
          {selected.pools.length > 0 && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selected.pools.map((pool, i) => (
                <Pair key={i} pool={pool} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
