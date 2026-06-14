'use client'

import { constIdForPair } from '@/lib/staking/amm'
import { zoneKind } from '@/lib/staking/pentacle-geometry'
import { ELEMENT_COLOR, ESMS_LABEL, GOLD, PLANET_ELEMENT, PLANET_GLYPH } from '@/lib/staking/ui'
import type { ZonePoolInfo } from '@/lib/staking/zone-pools'
import type { LiveZone } from '@/lib/spacetime/hooks/useLiveZones'

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  trine: '△',
  square: '□',
  opposition: '☍',
}

const card: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'rgba(5,6,15,0.45)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 20,
  color: '#e7e9ff',
  backdropFilter: 'blur(16px)',
  boxShadow: `inset 1px 1px 0 ${GOLD}14`,
}

const panel: React.CSSProperties = {
  background: 'rgba(22,19,12,0.5)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 10,
  padding: 12,
}

interface ZoneDetailCardProps {
  zone: ZonePoolInfo | null
  liveZone?: LiveZone | null
  onProvide?: (constId: number) => void
}

export default function ZoneDetailCard({ zone, liveZone, onProvide }: ZoneDetailCardProps) {
  if (!zone) {
    return (
      <div style={card}>
        <p style={{ color: '#9aa0d8', margin: 0 }}>Click a zone on the pentacle to inspect it.</p>
      </div>
    )
  }

  const kind = zoneKind(zone.zoneId)
  const ruler = liveZone?.owner ?? null
  const control = liveZone?.control ?? 0

  return (
    <div style={card}>
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `${GOLD}1a`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: GOLD, margin: 0 }}
          >
            Zone {zone.zoneId} · {kind}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              fontSize: 13,
              color: '#9aa0d8',
            }}
          >
            Ruling planet:{' '}
            {ruler ? (
              <>
                <span style={{ color: GOLD, fontSize: 16 }}>{PLANET_GLYPH[ruler]}</span> {ruler}
              </>
            ) : (
              'uncontested'
            )}
          </div>
        </div>
        {zone.boost > 1.01 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: `${GOLD}22`,
              border: `1px solid ${GOLD}44`,
              color: GOLD,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⚡ ×{zone.boost.toFixed(2)}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ ...panel, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9aa0d8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Control
          </div>
          <div style={{ fontSize: 20, color: GOLD, fontVariantNumeric: 'tabular-nums' }}>
            {control}
          </div>
        </div>
        <div style={{ ...panel, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9aa0d8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Planets here
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 16, color: GOLD }}>
            {zone.planets.length ? (
              zone.planets.map(p => (
                <span key={p} title={p} style={{ color: ELEMENT_COLOR[PLANET_ELEMENT[p]] }}>
                  {PLANET_GLYPH[p]}
                </span>
              ))
            ) : (
              <span style={{ color: '#6b72a8', fontSize: 13 }}>none</span>
            )}
          </div>
        </div>
      </div>

      {/* Open pools */}
      <div
        style={{
          fontSize: 11,
          color: '#9aa0d8',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 6,
        }}
      >
        Open pools
      </div>
      {zone.pools.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b72a8' }}>
          No open pool — needs a planet here in a favorable cross-element aspect.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {zone.pools.map((pool, i) => {
          const constId = constIdForPair(pool.ids[0], pool.ids[1])
          return (
            <div key={i} style={panel}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: ELEMENT_COLOR[pool.elements[0]] }}>
                    {ESMS_LABEL[pool.ids[0]]}
                  </span>
                  <span style={{ color: '#9aa0d8' }}> ↔ </span>
                  <span style={{ color: ELEMENT_COLOR[pool.elements[1]] }}>
                    {ESMS_LABEL[pool.ids[1]]}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: '#d7baff' }}>
                  {PLANET_GLYPH[pool.planets[0]]} {ASPECT_GLYPH[pool.aspect] ?? ''}{' '}
                  {PLANET_GLYPH[pool.planets[1]]}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#9aa0d8',
                    marginBottom: 4,
                  }}
                >
                  <span>Alignment strength</span>
                  <span style={{ color: GOLD }}>{Math.round(pool.strength * 100)}%</span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(pool.strength * 100)}%`,
                      background: `linear-gradient(90deg, #59378a, ${GOLD})`,
                    }}
                  />
                </div>
              </div>
              {onProvide && constId >= 0 && (
                <button
                  onClick={() => onProvide(constId)}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    background: GOLD,
                    color: '#3d2e00',
                    border: 'none',
                    borderRadius: 9,
                    padding: '8px 12px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  + Provide
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
