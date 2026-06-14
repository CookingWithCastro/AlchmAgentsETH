'use client'

import { useMemo } from 'react'
import { starAltitude } from '@/lib/staking/visibility'
import { eclipticToHorizontal } from '@/lib/staking/astro'
import {
  ALL_ZONE_IDS,
  SPIRE_LABELS,
  SPIRE_TIPS,
  diskToScreen,
  zoneKind,
  zoneScreenPath,
} from '@/lib/staking/pentacle-geometry'
import { ELEMENT_COLOR, PLANET_ELEMENT, PLANET_GLYPH } from '@/lib/staking/ui'
import type { ObserverLocation, StakeableStar, YieldRateBreakdown } from '@/lib/staking/types'
import type { PlanetSky, StarActivation } from '@/lib/staking/zone-pools'
import type { LiveZone } from '@/lib/spacetime/hooks/useLiveZones'

const CX = 300
const CY = 300
const R = 268

interface PentacleSkyMapProps {
  stars: StakeableStar[]
  zones: LiveZone[]
  yields: Map<number, YieldRateBreakdown>
  observer: ObserverLocation | null
  now: Date
  planetsSky: PlanetSky[]
  zoneBoost: Map<number, number>
  ascDeg: number
  activations: StarActivation[]
  selectedHipId: number | null
  selectedZoneId: number | null
  onSelectStar: (hipId: number) => void
  onSelectZone: (zoneId: number) => void
}

function altAzToScreen(altDeg: number, azDeg: number): [number, number] {
  const r = ((90 - altDeg) / 90) * R
  const t = (azDeg * Math.PI) / 180
  return [CX + r * Math.sin(t), CY - r * Math.cos(t)]
}

function magToRadius(mag: number): number {
  return Math.max(1.6, Math.min(7.5, 5.2 - mag))
}

export default function PentacleSkyMap({
  stars,
  zones,
  yields,
  observer,
  now,
  planetsSky = [],
  zoneBoost = new Map(),
  ascDeg,
  activations = [],
  selectedHipId,
  selectedZoneId,
  onSelectStar,
  onSelectZone,
}: PentacleSkyMapProps) {
  const zoneById = useMemo(() => new Map((zones ?? []).map(z => [z.zoneId, z])), [zones])
  const maxControl = useMemo(
    () => Math.max(1, ...(zones ?? []).map(z => Math.abs(z.control))),
    [zones]
  )
  const activatedIds = useMemo(() => new Set((activations ?? []).map(a => a.hipId)), [activations])

  const placedStars = useMemo(() => {
    return stars.map(star => {
      let alt = 90
      let az = 0
      let visible = true
      if (observer) {
        const r = starAltitude(star.ra, star.dec, observer.lat, observer.lon, now)
        alt = r.altitudeDeg
        az = r.azimuthDeg
        visible = r.visible
      }
      const [x, y] = visible ? altAzToScreen(alt, az) : altAzToScreen(0, az)
      return { star, x: visible ? x : x, y, alt, visible }
    })
  }, [stars, observer, now])

  const ascScreen = useMemo(() => {
    if (!observer || !Number.isFinite(ascDeg)) return null
    const h = eclipticToHorizontal(ascDeg, observer, now)
    const [x, y] = altAzToScreen(Math.max(0, h.altDeg), h.azDeg)
    return { x, y, az: h.azDeg }
  }, [observer, ascDeg, now])

  return (
    <svg
      viewBox="0 0 600 600"
      width="100%"
      style={{ maxWidth: 600, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <radialGradient id="sky" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#161a3a" />
          <stop offset="60%" stopColor="#0b0d20" />
          <stop offset="100%" stopColor="#05060f" />
        </radialGradient>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={R} fill="url(#sky)" stroke="#2b2f55" strokeWidth={1.5} />
      <circle cx={CX} cy={CY} r={R * 0.66} fill="none" stroke="#1c2046" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={R * 0.33} fill="none" stroke="#1c2046" strokeWidth={1} />

      {/* 11 canonical zones — tinted by owning planet's element + control, brightened by live boost. */}
      {ALL_ZONE_IDS.map(zoneId => {
        const z = zoneById.get(zoneId)
        const element = z?.owner ? PLANET_ELEMENT[z.owner] : null
        const fill = element ? ELEMENT_COLOR[element] : '#3a3f6b'
        const boost = zoneBoost.get(zoneId) ?? 1
        const ctrlOpacity = z ? 0.1 + 0.3 * (Math.abs(z.control) / maxControl) : 0.05
        const opacity = Math.min(0.6, ctrlOpacity + (boost - 1) * 0.18)
        const selected = zoneId === selectedZoneId
        return (
          <path
            key={zoneId}
            d={zoneScreenPath(zoneId, CX, CY, R)}
            fill={fill}
            fillOpacity={opacity}
            stroke={boost > 1.05 ? '#ffe9a8' : selected ? '#ffffff' : '#7a80c8'}
            strokeOpacity={boost > 1.05 ? 0.85 : selected ? 0.9 : 0.4}
            strokeWidth={boost > 1.05 || selected ? 1.6 : zoneKind(zoneId) === 'Crown' ? 1.2 : 0.7}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectZone(zoneId)}
          >
            <title>
              {`Zone ${zoneId} · ${zoneKind(zoneId)}${z?.owner ? ` · ${z.owner} (control ${z.control})` : ''}${boost > 1.05 ? ` · boost ×${boost.toFixed(2)}` : ''}`}
            </title>
          </path>
        )
      })}

      {/* Spire azimuth labels. */}
      {SPIRE_TIPS.map((tip, i) => {
        const [x, y] = diskToScreen(tip[0] * 1.06, tip[1] * 1.06, CX, CY, R)
        return (
          <text key={i} x={x} y={y + 3} textAnchor="middle" fontSize={10} fill="#6b72a8">
            {SPIRE_LABELS[i]}
          </text>
        )
      })}

      {/* Ascendant marker + rising line. */}
      {ascScreen && (
        <g>
          <line
            x1={CX}
            y1={CY}
            x2={ascScreen.x}
            y2={ascScreen.y}
            stroke="#ffd76a"
            strokeOpacity={0.5}
            strokeDasharray="3 4"
            strokeWidth={1.2}
          />
          <circle cx={ascScreen.x} cy={ascScreen.y} r={4} fill="#ffd76a" />
          <text
            x={ascScreen.x}
            y={ascScreen.y - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#ffd76a"
          >
            ASC
          </text>
        </g>
      )}

      {/* Planets in their zones. */}
      {planetsSky.map(p => {
        if (p.zoneId < 0) return null
        const [x, y] = altAzToScreen(p.altDeg, p.azDeg)
        const color = ELEMENT_COLOR[p.element]
        return (
          <g key={p.planet}>
            <circle
              cx={x}
              cy={y}
              r={9}
              fill="#0b0d20"
              stroke={color}
              strokeWidth={1.4}
              opacity={0.92}
            />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill={color}>
              {PLANET_GLYPH[p.planet]}
            </text>
          </g>
        )
      })}

      {/* Stars. */}
      {placedStars.map(({ star, x, y, alt, visible }) => {
        const selected = star.hipId === selectedHipId
        const activated = activatedIds.has(star.hipId)
        const color = ELEMENT_COLOR[star.element]
        const rad = magToRadius(star.magnitude)
        const apy = yields.get(star.hipId)?.apyPct ?? 0
        return (
          <g
            key={star.hipId}
            style={{ cursor: 'pointer' }}
            opacity={visible ? 1 : 0.26}
            onClick={() => onSelectStar(star.hipId)}
          >
            {activated && (
              <circle cx={x} cy={y} r={rad + 9} fill="none" stroke="#fff3b0" strokeWidth={1.6}>
                <animate
                  attributeName="r"
                  values={`${rad + 5};${rad + 12};${rad + 5}`}
                  dur="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.9;0.2;0.9"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {selected && (
              <circle cx={x} cy={y} r={rad + 6} fill="none" stroke="#ffffff" strokeWidth={1.4} />
            )}
            <circle cx={x} cy={y} r={rad} fill={color} filter={visible ? 'url(#glow)' : undefined}>
              <title>
                {`${star.name} · ${star.element} → ${['Spirit', 'Essence', 'Matter', 'Substance'][star.esmsId]} · ${visible ? `${alt.toFixed(0)}° up` : 'set'}${activated ? ' · ON ASCENDANT' : ''} · ~${apy.toFixed(0)}% APY`}
              </title>
            </circle>
            {(selected || activated || star.magnitude < 0.6) && visible && (
              <text
                x={x + rad + 4}
                y={y + 4}
                fontSize={10}
                fill={activated ? '#fff3b0' : '#aeb4e8'}
              >
                {star.name}
              </text>
            )}
          </g>
        )
      })}

      <circle cx={CX} cy={CY} r={2} fill="#8b91d8" />
    </svg>
  )
}
