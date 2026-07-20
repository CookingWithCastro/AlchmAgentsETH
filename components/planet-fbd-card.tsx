'use client'

import '@/lib/alchm-fbd/fbd-tokens.css'

/**
 * Planet free-body-diagram card.
 *
 * Renders one planet's PlanetFBD (from src/calculations/planetaryFBD) as a
 * physics-style vector diagram:
 *   - backdrop: a zoomed slice of the zodiac — a gently curved arc-minute
 *     ruler centered on the planet's exact degree°minute′
 *   - one vector per force (aspects at true ecliptic bearings; sign/sect/
 *     dignity on the fixed element compass; momentum along the motion axis)
 *   - applying aspects: solid arrowhead pointing IN at the planet, with a
 *     days-to-exact countdown; separating: open arrowhead angled away
 *   - the ESMS resultant (alchemical tendency) drawn prominently
 *   - hover/tap a vector to see its raw values in the readout strip
 *
 * Requires an `.alchm-root` (or `.lab`) ancestor for the design-token CSS
 * variables. Data is fully serializable — compute server-side, render here.
 */

import { useState } from 'react'
import type { FBDVector, PlanetFBD } from '@/lib/alchm-fbd/planetaryFBD'
import { getZodiacGlyph } from '@/lib/alchm-fbd/chartGlyphs'
import type { ZodiacSignType } from '@/lib/alchm-fbd/types'
import { planetColor, planetGlyph } from '@/lib/alchm-fbd/planetColors'

const ESMS_GLYPHS: Record<string, string> = {
  Spirit: '🜀',
  Essence: '🜁',
  Matter: '🜃',
  Substance: '🜄',
}

const ELEMENT_VAR: Record<string, string> = {
  Fire: 'var(--el-fire)',
  Water: 'var(--el-water)',
  Earth: 'var(--el-earth)',
  Air: 'var(--el-air)',
}

const POLARITY_COLORS: Record<FBDVector['polarity'], string> = {
  harmonious: '#4ecdc4',
  challenging: '#ef6a5a',
  neutral: 'var(--fg-dim)',
}

function vectorColor(vector: FBDVector, signElement: string): string {
  if (vector.kind === 'sign') return ELEMENT_VAR[signElement] ?? 'var(--fg-dim)'
  if (vector.kind === 'sect') return ELEMENT_VAR[vector.source] ?? 'var(--fg-dim)'
  if (vector.kind === 'dignity') {
    return vector.polarity === 'harmonious' ? 'var(--accent-2)' : '#ef6a5a'
  }
  if (vector.kind === 'momentum') return 'var(--accent)'
  return POLARITY_COLORS[vector.polarity]
}

// Diagram geometry ----------------------------------------------------------
const W = 320
const H = 300
const CX = W / 2
const CY = 152
const R_MAX = 108 // max vector length from center
const R_MIN = 26 // vector length at the visibility floor
const NODE_R = 11

// Arc-minute ruler: a circle of huge radius through the planet node, so the
// zodiac slice reads as a gently bowed ruler. 4px per arc-minute.
const RULER_R = 1200
const PX_PER_ARCMIN = 4
const RULER_HALF_WINDOW = 40 // ± arc-minutes shown

function rulerY(x: number): number {
  const dx = x - CX
  return CY + RULER_R - Math.sqrt(RULER_R * RULER_R - dx * dx)
}

/** Card-space polar angle → SVG point at radius r from the planet node. */
function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

function vectorLength(normalized: number): number {
  return R_MIN + normalized * (R_MAX - R_MIN)
}

interface ArrowheadProps {
  tip: { x: number; y: number }
  angleDeg: number // direction the head points (card space)
  color: string
  open?: boolean
  size?: number
}

function Arrowhead({ tip, angleDeg, color, open = false, size = 7 }: ArrowheadProps) {
  const rad = (angleDeg * Math.PI) / 180
  const back = { x: Math.cos(rad), y: -Math.sin(rad) }
  const side = { x: -back.y, y: back.x }
  const b1 = {
    x: tip.x - back.x * size + side.x * (size * 0.55),
    y: tip.y - back.y * size + side.y * (size * 0.55),
  }
  const b2 = {
    x: tip.x - back.x * size - side.x * (size * 0.55),
    y: tip.y - back.y * size - side.y * (size * 0.55),
  }
  return (
    <polygon
      points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
      fill={open ? 'none' : color}
      stroke={color}
      strokeWidth={open ? 1.1 : 0}
    />
  )
}

export interface PlanetFBDCardProps {
  fbd: PlanetFBD
}

export function PlanetFBDCard({ fbd }: PlanetFBDCardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const color = planetColor(fbd.planet)
  const signGlyph = getZodiacGlyph(fbd.sign as ZodiacSignType)
  const active = fbd.vectors.find(v => v.id === activeId) ?? null
  const dignityColor =
    fbd.dignity.esmsScale > 0
      ? 'var(--accent-2)'
      : fbd.dignity.esmsScale < 0
        ? '#ef6a5a'
        : 'var(--fg-mute)'

  // Ruler ticks over the ± window around the planet's exact position.
  //
  // The planet sits at its true sub-arc-minute longitude BETWEEN ticks, rather
  // than snapping to the nearest whole arc minute: snapping would let the ruler
  // disagree with the header's degree°minute′ at a degree boundary (26°59.99′
  // rounds to a 27°00′ tick drawn dead-center under a card reading 26°59′).
  const exactArcmin = fbd.exactLongitude * 60
  const firstTick = Math.ceil(exactArcmin - RULER_HALF_WINDOW)
  const lastTick = Math.floor(exactArcmin + RULER_HALF_WINDOW)
  const ticks: Array<{
    x: number
    h: number
    opacity: number
    label?: string
    signBoundary?: boolean
  }> = []
  for (let T = firstTick; T <= lastTick; T++) {
    const x = CX + (T - exactArcmin) * PX_PER_ARCMIN
    if (x < 8 || x > W - 8) continue
    const isSignBoundary = ((T % 1800) + 1800) % 1800 === 0
    const isDegree = ((T % 60) + 60) % 60 === 0
    const isQuarter = ((T % 15) + 15) % 15 === 0
    const isFive = ((T % 5) + 5) % 5 === 0
    if (isSignBoundary) {
      ticks.push({ x, h: 30, opacity: 0.55, signBoundary: true })
    } else if (isDegree) {
      const deg = ((Math.round(T / 60) % 30) + 30) % 30
      ticks.push({ x, h: 14, opacity: 0.5, label: `${deg}°` })
    } else if (isQuarter) {
      ticks.push({ x, h: 9, opacity: 0.4 })
    } else if (isFive) {
      ticks.push({ x, h: 6, opacity: 0.3 })
    } else {
      ticks.push({ x, h: 3, opacity: 0.16 })
    }
  }

  const resultantLen = R_MIN + fbd.resultant.normalized * (R_MAX - R_MIN)
  const resultantTip = polar(fbd.resultant.angleDeg, resultantLen)

  const fmt = (n: number) => (Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1))

  return (
    <div
      className="alchm-panel"
      style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {/* Header ------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            flexShrink: 0,
            background: `color-mix(in oklch, ${color}, transparent 80%)`,
            border: `1px solid color-mix(in oklch, ${color}, transparent 50%)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            color,
          }}
        >
          {planetGlyph(fbd.planet)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="t-mono"
            style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--fg)' }}
          >
            {fbd.planet.toUpperCase()}
            {fbd.isRetrograde && <span style={{ color: '#ef6a5a', marginLeft: 6 }}>℞</span>}
          </div>
          <div
            className="t-mono"
            style={{ fontSize: 10, color: 'var(--fg-mute)', letterSpacing: '0.1em' }}
          >
            {signGlyph} {fbd.sign.toUpperCase()} · {fbd.degree}°
            {String(fbd.minute).padStart(2, '0')}′
          </div>
        </div>
        <span
          className="t-mono"
          title={`ESMS dignity multiplier ×${fbd.dignity.multiplier.toFixed(2)}`}
          style={{
            fontSize: 8.5,
            letterSpacing: '0.14em',
            padding: '3px 7px',
            borderRadius: 999,
            border: `1px solid color-mix(in oklch, ${dignityColor}, transparent 60%)`,
            background: `color-mix(in oklch, ${dignityColor}, transparent 88%)`,
            color: dignityColor,
            whiteSpace: 'nowrap',
          }}
        >
          {fbd.dignity.type.toUpperCase()}
        </span>
      </div>

      {/* Diagram ------------------------------------------------------------ */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        role="img"
        aria-label={`Free-body diagram for ${fbd.planet}: ${fbd.vectors.length} force vectors, resultant toward ${fbd.resultant.dominant}`}
      >
        {/* Sign watermark */}
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fontSize={110}
          fill={ELEMENT_VAR[fbd.signElement] ?? 'var(--fg-faint)'}
          opacity={0.07}
          style={{ userSelect: 'none' }}
        >
          {signGlyph}
        </text>

        {/* Arc-minute ruler backdrop */}
        <path
          d={`M 8 ${rulerY(8)} A ${RULER_R} ${RULER_R} 0 0 1 ${W - 8} ${rulerY(W - 8)}`}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
        />
        {ticks.map((tick, i) => {
          const y = rulerY(tick.x)
          return (
            <g key={i}>
              <line
                x1={tick.x}
                y1={y - tick.h / 2}
                x2={tick.x}
                y2={y + tick.h / 2}
                stroke={tick.signBoundary ? 'var(--accent-2)' : 'var(--fg-mute)'}
                strokeWidth={tick.signBoundary ? 1.2 : 0.8}
                opacity={tick.opacity}
              />
              {tick.label && (
                <text
                  x={tick.x}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--fg-mute)"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {tick.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Force vectors */}
        {fbd.vectors.map(vector => {
          const len = vectorLength(vector.normalized)
          const tip = polar(vector.angleDeg, len)
          const base = polar(vector.angleDeg, NODE_R + 3)
          const vColor = vectorColor(vector, fbd.signElement)
          const applying = vector.aspect?.kinematics?.applying === true
          const separating = vector.aspect?.kinematics?.state === 'separating'
          const isActive = activeId === vector.id
          // Applying: head sits AT the planet, pointing inward (force arriving).
          // Separating (and every non-aspect force): head at the outer end.
          const headAtCenter = applying
          const headTip = headAtCenter ? base : tip
          const headAngle = headAtCenter ? vector.angleDeg + 180 : vector.angleDeg
          const labelPos = polar(vector.angleDeg, len + 12)
          const labelAnchor =
            Math.cos((vector.angleDeg * Math.PI) / 180) > 0.35
              ? 'start'
              : Math.cos((vector.angleDeg * Math.PI) / 180) < -0.35
                ? 'end'
                : 'middle'
          const kinematics = vector.kind === 'aspect' ? (vector.aspect?.kinematics ?? null) : null
          const countdown =
            kinematics && kinematics.state !== 'stationary'
              ? `${kinematics.state} · ${kinematics.daysToExact.toFixed(1)}d`
              : null
          return (
            <g
              key={vector.id}
              tabIndex={0}
              role="button"
              aria-label={`${vector.label}: ${vector.detail}`}
              style={{ cursor: 'pointer', outline: 'none' }}
              opacity={activeId && !isActive ? 0.35 : 1}
              onMouseEnter={() => setActiveId(vector.id)}
              onMouseLeave={() => setActiveId(id => (id === vector.id ? null : id))}
              onFocus={() => setActiveId(vector.id)}
              onBlur={() => setActiveId(id => (id === vector.id ? null : id))}
              onClick={() => setActiveId(id => (id === vector.id ? null : vector.id))}
            >
              <line
                x1={base.x}
                y1={base.y}
                x2={tip.x}
                y2={tip.y}
                stroke={vColor}
                strokeWidth={isActive ? 2.2 : 1.4}
                strokeDasharray={vector.kind === 'momentum' ? '4,3' : undefined}
                opacity={0.9}
              />
              <Arrowhead tip={headTip} angleDeg={headAngle} color={vColor} open={separating} />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor={labelAnchor}
                dominantBaseline="central"
                fontSize={7.5}
                fill={vColor}
                opacity={isActive ? 1 : 0.75}
                style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em', userSelect: 'none' }}
              >
                {vector.label}
              </text>
              {countdown && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 8}
                  textAnchor={labelAnchor}
                  dominantBaseline="central"
                  fontSize={4.5}
                  fill="var(--fg-mute)"
                  opacity={isActive ? 0.9 : 0.45}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.04em',
                    userSelect: 'none',
                  }}
                >
                  {countdown}
                </text>
              )}
            </g>
          )
        })}

        {/* ESMS resultant */}
        <g>
          <line
            x1={CX}
            y1={CY}
            x2={resultantTip.x}
            y2={resultantTip.y}
            stroke="var(--accent)"
            strokeWidth={3}
            opacity={0.95}
            style={{
              filter: 'drop-shadow(0 0 5px color-mix(in oklch, var(--accent), transparent 40%))',
            }}
          />
          <Arrowhead
            tip={resultantTip}
            angleDeg={fbd.resultant.angleDeg}
            color="var(--accent)"
            size={9}
          />
          <text
            x={polar(fbd.resultant.angleDeg, resultantLen + 16).x}
            y={polar(fbd.resultant.angleDeg, resultantLen + 16).y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8}
            fill="var(--accent)"
            style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.1em', fontWeight: 700 }}
          >
            {ESMS_GLYPHS[fbd.resultant.dominant]} {fbd.resultant.dominant.toUpperCase()}
          </text>
        </g>

        {/* Planet node (on its exact arc-minute) */}
        <circle
          cx={CX}
          cy={CY}
          r={NODE_R + 3}
          fill="none"
          stroke={color}
          strokeWidth={0.7}
          opacity={0.4}
        />
        <circle
          cx={CX}
          cy={CY}
          r={NODE_R}
          fill={`color-mix(in oklch, ${color}, black 55%)`}
          stroke={color}
          strokeWidth={1.2}
        />
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill={color}
          style={{ userSelect: 'none' }}
        >
          {planetGlyph(fbd.planet)}
        </text>

        {/* Compass roses */}
        <g opacity={0.75}>
          {(
            [
              ['F', 90, 'var(--el-fire)'],
              ['A', 0, 'var(--el-air)'],
              ['W', 270, 'var(--el-water)'],
              ['E', 180, 'var(--el-earth)'],
            ] as const
          ).map(([letter, angle, c]) => {
            const rad = (angle * Math.PI) / 180
            return (
              <text
                key={letter}
                x={30 + 13 * Math.cos(rad)}
                y={H - 26 - 13 * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={7}
                fill={c}
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {letter}
              </text>
            )
          })}
          <circle cx={30} cy={H - 26} r={6} fill="none" stroke="var(--line)" strokeWidth={0.6} />
          <text
            x={30}
            y={H - 8}
            textAnchor="middle"
            fontSize={6}
            fill="var(--fg-faint)"
            style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em' }}
          >
            ELEMENT
          </text>
        </g>
        <g opacity={0.75}>
          {(
            [
              ['S', 90],
              ['E', 0],
              ['M', 270],
              ['Sb', 180],
            ] as const
          ).map(([letter, angle]) => {
            const rad = (angle * Math.PI) / 180
            return (
              <text
                key={letter}
                x={W - 30 + 13 * Math.cos(rad)}
                y={H - 26 - 13 * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={7}
                fill="var(--accent)"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {letter}
              </text>
            )
          })}
          <circle
            cx={W - 30}
            cy={H - 26}
            r={6}
            fill="none"
            stroke="var(--line)"
            strokeWidth={0.6}
          />
          <text
            x={W - 30}
            y={H - 8}
            textAnchor="middle"
            fontSize={6}
            fill="var(--fg-faint)"
            style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em' }}
          >
            ESMS
          </text>
        </g>
      </svg>

      {/* Readout strip ------------------------------------------------------ */}
      <div
        className="t-mono"
        style={{
          minHeight: 30,
          fontSize: 9,
          lineHeight: 1.45,
          letterSpacing: '0.06em',
          color: active ? 'var(--fg-dim)' : 'var(--fg-mute)',
          borderTop: '1px solid var(--line)',
          paddingTop: 8,
        }}
      >
        {active ? (
          <>
            <span style={{ color: vectorColor(active, fbd.signElement) }}>{active.label}</span> ·{' '}
            {active.detail}
            {active.aspect && (
              <div style={{ color: 'var(--fg-mute)', marginTop: 2 }}>
                {active.aspect.description}
              </div>
            )}
          </>
        ) : (
          <>
            RESULTANT → {fbd.resultant.dominant.toUpperCase()} · |R|{' '}
            {fbd.resultant.magnitude.toFixed(2)} · net harmony{' '}
            {fbd.resultant.netHarmony >= 0 ? '+' : ''}
            {fbd.resultant.netHarmony.toFixed(2)} · push {fbd.resultant.elementalPush.dominant}
          </>
        )}
      </div>

      {/* Telemetry footer ----------------------------------------------------- */}
      <div
        className="t-mono"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 12px',
          fontSize: 8.5,
          letterSpacing: '0.08em',
          color: 'var(--fg-mute)',
        }}
      >
        {Object.entries(fbd.esms).map(([key, value]) => (
          <span key={key} title={`${key} (planet contribution incl. aspect share)`}>
            <span style={{ color: 'var(--accent)' }}>{ESMS_GLYPHS[key]}</span> {fmt(value)}
          </span>
        ))}
        <span title="charge Q = Matter + Substance">Q {fmt(fbd.physics.charge)}</span>
        <span title="momentum = daily motion × alchemical weight">
          p {fbd.physics.momentum === null ? '—' : fmt(fbd.physics.momentum)}
        </span>
        <span title="daily motion in arc-minutes/day">
          ω{' '}
          {fbd.physics.arcminutesPerDay === null
            ? '—'
            : `${fbd.physics.arcminutesPerDay.toFixed(1)}′/d`}
        </span>
        <span title="alchemical weight (orbital-period, log scale)">
          m {fbd.physics.alchmWeight.toFixed(2)}
        </span>
        {!fbd.kinematicsAvailable && (
          <span style={{ color: 'var(--accent-2)' }} title="stored chart carries no daily motions">
            STATIC CHART · MOTION N/A
          </span>
        )}
      </div>
    </div>
  )
}

export default PlanetFBDCard
