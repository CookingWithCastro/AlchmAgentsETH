'use client'

import React from 'react'
import { SIGNS, PLANETS } from '@/components/cosmic-agents/constants'
import type { PlanetName } from '@/components/cosmic-agents/types'
import { ELEMENT_COLORS } from '@/lib/context-card/types'
import type { ContextCardPlacement, ContextCardTransits } from '@/lib/context-card/types'
import type { SkySource } from '@/lib/context-card/transit-engine'

const ASPECT_LINE_COLOR: Record<string, string> = {
  conjunction: '#f5d195',
  sextile: '#7ad1c4',
  square: '#ef5d4e',
  trine: '#8aa56a',
  opposition: '#a78bfa',
  quincunx: '#f4a8c8',
}

interface Props {
  natalPlanets: ContextCardPlacement[]
  sky: SkySource
  transits: ContextCardTransits
  size?: number
}

/**
 * Bi-wheel: natal chart (inner ring) + current sky (outer ring) with
 * transit→natal synergy lines drawn across the disc. Ported from the design's
 * BiWheel in context-card/card.jsx.
 */
export function BiWheel({ natalPlanets, sky, transits, size = 320 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const rSignOut = size * 0.475
  const rSignIn = size * 0.41
  const rGlyph = size * 0.443
  const rTransit = size * 0.375
  const rNatal = size * 0.265
  const rCore = size * 0.085

  const degToXY = (deg: number, r: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const planetAbs = (sign: string, deg: number) => {
    const i = SIGNS.findIndex(s => s.name === sign)
    return (i < 0 ? 0 : i) * 30 + deg
  }

  const natalByName = Object.fromEntries(natalPlanets.map(p => [p.body, p]))
  const transitByName = Object.fromEntries(sky.positions.map(p => [p.planet, p]))

  // Only draw lines for planet-planet contacts (both ends have a glyph/color).
  const lines = transits.aspects.filter(
    a => natalByName[a.n] && PLANETS[a.t as PlanetName] && PLANETS[a.n as PlanetName]
  )

  return (
    <svg className="wheel-svg" viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="acc-biCore">
          <stop offset="0%" stopColor="rgba(245,181,66,0.34)" />
          <stop offset="70%" stopColor="rgba(245,181,66,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={rSignOut}
        fill="none"
        stroke="rgba(167,139,250,0.18)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r={rSignIn}
        fill="none"
        stroke="rgba(167,139,250,0.14)"
        strokeWidth="0.75"
      />
      <circle
        cx={cx}
        cy={cy}
        r={rTransit}
        fill="none"
        stroke="rgba(245,181,66,0.22)"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      />
      <circle
        cx={cx}
        cy={cy}
        r={rNatal}
        fill="none"
        stroke="rgba(167,139,250,0.2)"
        strokeWidth="0.6"
      />

      {SIGNS.map((sign, i) => {
        const [x1, y1] = degToXY(i * 30, rSignOut)
        const [x2, y2] = degToXY(i * 30, rSignIn)
        const [gx, gy] = degToXY(i * 30 + 15, rGlyph)
        return (
          <g key={sign.name}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(167,139,250,0.16)"
              strokeWidth="0.6"
            />
            <text
              x={gx}
              y={gy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.04}
              fill={ELEMENT_COLORS[sign.element]}
              opacity="0.6"
              fontFamily="Cormorant Garamond, serif"
            >
              {sign.glyph}
            </text>
          </g>
        )
      })}

      {/* synergy lines */}
      <g>
        {lines.map((a, i) => {
          const np = natalByName[a.n]
          const tp = transitByName[a.t]
          if (!np || !tp) return null
          const [ax, ay] = degToXY(planetAbs(np.sign, np.deg), rNatal)
          const [bx, by] = degToXY(planetAbs(tp.sign, tp.degree), rTransit)
          const col = ASPECT_LINE_COLOR[a.type] || '#a78bfa'
          return (
            <line
              key={i}
              x1={ax}
              y1={ay}
              x2={bx}
              y2={by}
              stroke={col}
              strokeWidth={a.type === 'conjunction' ? 1.2 : 0.9}
              opacity={Math.max(0.25, 0.85 - a.orb / 12)}
              strokeDasharray={a.type === 'square' || a.type === 'opposition' ? '3 3' : undefined}
            />
          )
        })}
      </g>

      <circle cx={cx} cy={cy} r={rCore} fill="url(#acc-biCore)" />

      {/* natal planets (inner) */}
      {natalPlanets.map(p => {
        const [px, py] = degToXY(planetAbs(p.sign, p.deg), rNatal)
        const pl = PLANETS[p.body as PlanetName]
        return (
          <g key={'n' + p.body}>
            <circle
              cx={px}
              cy={py}
              r={size * 0.02}
              fill="rgba(8,6,26,0.95)"
              stroke={pl ? pl.color : '#cfc8be'}
              strokeWidth="0.8"
            />
            <text
              x={px}
              y={py + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.03}
              fill={pl ? pl.color : '#cfc8be'}
              fontFamily="Cormorant Garamond, serif"
            >
              {pl ? pl.glyph : '*'}
            </text>
          </g>
        )
      })}

      {/* transit planets (outer ring) */}
      {sky.positions.map(p => {
        const [px, py] = degToXY(planetAbs(p.sign, p.degree), rTransit)
        const pl = PLANETS[p.planet as PlanetName]
        return (
          <g key={'t' + p.planet}>
            <circle
              cx={px}
              cy={py}
              r={size * 0.022}
              fill="rgba(20,16,8,0.95)"
              stroke="var(--gold)"
              strokeWidth="0.9"
            />
            <text
              x={px}
              y={py + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.032}
              fill="var(--gold-hi)"
              fontFamily="Cormorant Garamond, serif"
            >
              {pl ? pl.glyph : '*'}
            </text>
            {p.retrograde ? (
              <text
                x={px + size * 0.03}
                y={py - size * 0.02}
                fontSize={size * 0.022}
                fill="var(--rose)"
                fontFamily="IBM Plex Mono, monospace"
              >
                ℞
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
