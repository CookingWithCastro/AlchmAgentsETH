'use client'

/**
 * Client-side SVG natal wheel.
 *
 * Renders a zodiac wheel + planet placements + major aspects directly from
 * `planetary_positions` (the shape `/api/astrologize` already returns), so no
 * backend chart renderer is needed. Longitudes are absolute ecliptic degrees;
 * 0° Aries sits at 9 o'clock and the zodiac increases counter-clockwise, per
 * chart convention. Houses are intentionally NOT drawn — the positions payload
 * carries no house data and we never fabricate what we don't have.
 */

import React, { useMemo } from 'react'

export interface WheelBody {
  sign?: string
  degree?: number
  exactLongitude: number
  isRetrograde?: boolean
}

interface NatalWheelSvgProps {
  positions: Record<string, WheelBody>
  size?: number
  showPlanets?: boolean
  selectedPlanet?: string | null
  onSelectPlanet?: (planet: string | null) => void
  className?: string
}

const ZODIAC = [
  { name: 'Aries', glyph: '♈', element: 'fire' },
  { name: 'Taurus', glyph: '♉', element: 'earth' },
  { name: 'Gemini', glyph: '♊', element: 'air' },
  { name: 'Cancer', glyph: '♋', element: 'water' },
  { name: 'Leo', glyph: '♌', element: 'fire' },
  { name: 'Virgo', glyph: '♍', element: 'earth' },
  { name: 'Libra', glyph: '♎', element: 'air' },
  { name: 'Scorpio', glyph: '♏', element: 'water' },
  { name: 'Sagittarius', glyph: '♐', element: 'fire' },
  { name: 'Capricorn', glyph: '♑', element: 'earth' },
  { name: 'Aquarius', glyph: '♒', element: 'air' },
  { name: 'Pisces', glyph: '♓', element: 'water' },
] as const

const ELEMENT_TINT: Record<string, string> = {
  fire: 'rgba(248, 113, 113, 0.10)',
  earth: 'rgba(74, 222, 128, 0.10)',
  air: 'rgba(250, 204, 21, 0.10)',
  water: 'rgba(96, 165, 250, 0.10)',
}

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  NorthNode: '☊',
  SouthNode: '☋',
  Chiron: '⚷',
  Ascendant: 'Asc',
}

const PLANET_COLORS: Record<string, string> = {
  Sun: '#fbbf24',
  Moon: '#e2e8f0',
  Mercury: '#a78bfa',
  Venus: '#f9a8d4',
  Mars: '#f87171',
  Jupiter: '#fb923c',
  Saturn: '#94a3b8',
  Uranus: '#67e8f9',
  Neptune: '#818cf8',
  Pluto: '#c084fc',
}

interface AspectDef {
  angle: number
  orb: number
  name: string
  color: string
  dash?: string
}

const ASPECTS: AspectDef[] = [
  { angle: 0, orb: 8, name: 'conjunction', color: 'rgba(251, 191, 36, 0.7)' },
  { angle: 60, orb: 4, name: 'sextile', color: 'rgba(74, 222, 128, 0.55)', dash: '3 3' },
  { angle: 90, orb: 6, name: 'square', color: 'rgba(248, 113, 113, 0.6)' },
  { angle: 120, orb: 6, name: 'trine', color: 'rgba(96, 165, 250, 0.6)' },
  { angle: 180, orb: 8, name: 'opposition', color: 'rgba(248, 113, 113, 0.45)', dash: '6 3' },
]

/** Screen point for an ecliptic longitude: 0° Aries at 9 o'clock, CCW. */
function point(cx: number, cy: number, r: number, longitude: number): [number, number] {
  const rad = (longitude * Math.PI) / 180
  return [cx - r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

export default function NatalWheelSvg({
  positions,
  size = 400,
  showPlanets = true,
  selectedPlanet = null,
  onSelectPlanet,
  className,
}: NatalWheelSvgProps) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.485
  const rZodiacInner = size * 0.4
  const rGlyph = (rOuter + rZodiacInner) / 2
  const rPlanetBase = size * 0.335
  const rAspect = size * 0.26

  const bodies = useMemo(() => {
    const entries = Object.entries(positions)
      .filter(([, b]) => Number.isFinite(b?.exactLongitude))
      .map(([name, b]) => ({
        name,
        longitude: ((b.exactLongitude % 360) + 360) % 360,
        retrograde: Boolean(b.isRetrograde),
        sign: b.sign,
        degree: b.degree,
      }))
      .sort((a, b) => a.longitude - b.longitude)

    // Nudge planets apart radially when they crowd within 8° of each other so
    // glyphs never overlap (stacking depth cycles over dense stellia).
    let cluster: number[] = []
    const withOffsets = entries.map((e, i) => ({ ...e, radialStep: 0 }))
    for (let i = 0; i < withOffsets.length; i++) {
      const prev = withOffsets[i - 1]
      if (prev && angularSeparation(prev.longitude, withOffsets[i].longitude) < 8) {
        cluster.push(i)
        withOffsets[i].radialStep = cluster.length % 3
      } else {
        cluster = []
      }
    }
    return withOffsets
  }, [positions])

  const aspects = useMemo(() => {
    const found: Array<{ a: string; b: string; def: AspectDef; from: number; to: number }> = []
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const sep = angularSeparation(bodies[i].longitude, bodies[j].longitude)
        const def = ASPECTS.find(d => Math.abs(sep - d.angle) <= d.orb)
        if (def && def.name !== 'conjunction') {
          found.push({
            a: bodies[i].name,
            b: bodies[j].name,
            def,
            from: bodies[i].longitude,
            to: bodies[j].longitude,
          })
        }
      }
    }
    return found
  }, [bodies])

  const selected = selectedPlanet ? bodies.find(b => b.name === selectedPlanet) : null

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Natal chart wheel"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Zodiac ring: 12 element-tinted sectors + boundaries */}
        {ZODIAC.map((sign, i) => {
          const start = i * 30
          const [x1, y1] = point(cx, cy, rOuter, start)
          const [x2, y2] = point(cx, cy, rOuter, start + 30)
          const [x3, y3] = point(cx, cy, rZodiacInner, start + 30)
          const [x4, y4] = point(cx, cy, rZodiacInner, start)
          const [gx, gy] = point(cx, cy, rGlyph, start + 15)
          return (
            <g key={sign.name}>
              <path
                d={`M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rZodiacInner} ${rZodiacInner} 0 0 0 ${x4} ${y4} Z`}
                fill={ELEMENT_TINT[sign.element]}
                stroke="rgba(148, 163, 184, 0.35)"
                strokeWidth={0.75}
              />
              <text
                x={gx}
                y={gy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.042}
                fill="rgba(226, 232, 240, 0.85)"
              >
                {/* U+FE0E forces monochrome text glyphs over emoji rendering */}
                {sign.glyph + '\uFE0E'}
              </text>
            </g>
          )
        })}

        {/* Degree ticks: minor every 5°, major every 10° */}
        {Array.from({ length: 72 }).map((_, i) => {
          const lon = i * 5
          const major = lon % 10 === 0
          const [x1, y1] = point(cx, cy, rZodiacInner, lon)
          const [x2, y2] = point(cx, cy, rZodiacInner - (major ? size * 0.018 : size * 0.01), lon)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(148, 163, 184, 0.4)"
              strokeWidth={major ? 1 : 0.5}
            />
          )
        })}

        {/* Inner circles */}
        <circle
          cx={cx}
          cy={cy}
          r={rZodiacInner}
          fill="none"
          stroke="rgba(148, 163, 184, 0.45)"
          strokeWidth={1}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rAspect}
          fill="rgba(15, 23, 42, 0.25)"
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth={0.75}
        />

        {/* Aspect lines (drawn beneath planets) */}
        {aspects.map((asp, i) => {
          const dimmed = selectedPlanet && asp.a !== selectedPlanet && asp.b !== selectedPlanet
          const [x1, y1] = point(cx, cy, rAspect, asp.from)
          const [x2, y2] = point(cx, cy, rAspect, asp.to)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={asp.def.color}
              strokeWidth={dimmed ? 0.5 : 1.25}
              strokeDasharray={asp.def.dash}
              opacity={dimmed ? 0.25 : 1}
            >
              <title>{`${asp.a} ${asp.def.name} ${asp.b}`}</title>
            </line>
          )
        })}

        {/* Planets */}
        {showPlanets &&
          bodies.map(body => {
            const r = rPlanetBase - body.radialStep * size * 0.045
            const [px, py] = point(cx, cy, r, body.longitude)
            const [tx1, ty1] = point(cx, cy, rZodiacInner, body.longitude)
            const [tx2, ty2] = point(cx, cy, rZodiacInner - size * 0.025, body.longitude)
            const isSelected = selectedPlanet === body.name
            const color = PLANET_COLORS[body.name] ?? 'rgba(226, 232, 240, 0.9)'
            return (
              <g
                key={body.name}
                onClick={() => onSelectPlanet?.(isSelected ? null : body.name)}
                style={{ cursor: onSelectPlanet ? 'pointer' : 'default' }}
              >
                {/* pointer tick from the zodiac ring to the exact degree */}
                <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke={color} strokeWidth={1.5} />
                {isSelected && (
                  <circle
                    cx={px}
                    cy={py}
                    r={size * 0.034}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                )}
                <circle cx={px} cy={py} r={size * 0.026} fill="rgba(2, 6, 23, 0.75)" />
                <text
                  x={px}
                  y={py}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.038}
                  fill={color}
                >
                  {PLANET_GLYPHS[body.name] ?? body.name.slice(0, 2)}
                  <title>{`${body.name} — ${body.sign ?? ''} ${
                    Number.isFinite(body.degree) ? `${Math.floor(body.degree as number)}°` : ''
                  }${body.retrograde ? ' ℞' : ''}`}</title>
                </text>
                {body.retrograde && (
                  <text
                    x={px + size * 0.028}
                    y={py + size * 0.02}
                    fontSize={size * 0.022}
                    fill="rgba(248, 113, 113, 0.9)"
                  >
                    ℞
                  </text>
                )}
              </g>
            )
          })}
      </svg>

      {/* Selected-planet readout (real data only) */}
      {selected && (
        <div
          className="mt-2 text-center text-sm"
          style={{ color: PLANET_COLORS[selected.name] ?? 'rgb(226, 232, 240)' }}
        >
          {PLANET_GLYPHS[selected.name] ?? ''} {selected.name}
          {selected.sign ? ` in ${selected.sign}` : ''}
          {Number.isFinite(selected.degree) ? ` · ${Math.floor(selected.degree as number)}°` : ''}
          {selected.retrograde ? ' · retrograde ℞' : ''}
          {` · ${selected.longitude.toFixed(1)}° ecliptic`}
        </div>
      )}
    </div>
  )
}
