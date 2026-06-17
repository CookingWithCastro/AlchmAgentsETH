'use client'

// Interactive SVG circuit schematic for the Tilt Skillet batch planner.
// Renders a batch plan AS a series circuit: an EMF source drives current through each cooking
// stage (a component sitting on the wire) and into the load. Current animates around the loop at
// a speed proportional to the series current. Pure/presentational — takes the deterministic
// readings from lib/recipe-circuit.

import { useState } from 'react'
import type { CircuitRole } from '@/lib/tilt-skillet-types'
import type { StageCircuit, SeriesCircuit } from '@/lib/recipe-circuit'

const ROLE_COLOR: Record<CircuitRole, string> = {
  source: '#f59e0b', // amber
  resistor: '#8b5cf6', // violet
  capacitor: '#06b6d4', // cyan
  load: '#f43f5e', // rose
}

const ROLE_LABEL: Record<CircuitRole, string> = {
  source: 'Source (EMF)',
  resistor: 'Resistor',
  capacitor: 'Capacitor',
  load: 'Load',
}

function fmt(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const a = Math.abs(x)
  if (a !== 0 && (a >= 100000 || a < 0.001)) return x.toExponential(2)
  if (a >= 100) return x.toFixed(1)
  return x.toFixed(3)
}

/** Small role glyph drawn inside each chip (resistor zigzag, capacitor plates, etc.). */
function RoleGlyph({ role, color }: { role: CircuitRole; color: string }) {
  if (role === 'capacitor') {
    return (
      <g stroke={color} strokeWidth={2} fill="none">
        <line x1={-9} y1={-7} x2={-9} y2={7} />
        <line x1={9} y1={-7} x2={9} y2={7} />
        <line x1={-18} y1={0} x2={-9} y2={0} />
        <line x1={9} y1={0} x2={18} y2={0} />
      </g>
    )
  }
  if (role === 'source') {
    return (
      <g stroke={color} strokeWidth={2} fill="none">
        <line x1={-6} y1={-9} x2={-6} y2={9} />
        <line x1={6} y1={-5} x2={6} y2={5} />
        <line x1={-18} y1={0} x2={-6} y2={0} />
        <line x1={6} y1={0} x2={18} y2={0} />
      </g>
    )
  }
  if (role === 'load') {
    return (
      <g stroke={color} strokeWidth={2} fill="none">
        <circle cx={0} cy={0} r={9} />
        <line x1={-6} y1={-6} x2={6} y2={6} />
        <line x1={-6} y1={6} x2={6} y2={-6} />
      </g>
    )
  }
  // resistor zigzag
  return (
    <polyline
      points="-18,0 -12,-7 -6,7 0,-7 6,7 12,-7 18,0"
      stroke={color}
      strokeWidth={2}
      fill="none"
    />
  )
}

export interface CircuitSchematicProps {
  perStage: StageCircuit[]
  series: SeriesCircuit
}

export function CircuitSchematic({ perStage, series }: CircuitSchematicProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const n = Math.max(perStage.length, 1)
  // Keep the viewBox tight for small plans so it scales to fit the panel (no clipping); only
  // grow past the panel width — triggering horizontal scroll via minWidth below — for many stages.
  const totalW = Math.max(560, 180 + n * 180)
  const H = 340
  const left = 70
  const right = totalW - 70
  const top = 80
  const bottom = 270
  const loopPath = `M${left},${top} H${right} V${bottom} H${left} Z`

  // Distribute chips evenly along the top rail, after the source on the far left.
  const padL = left + 60
  const span = right - padL - 40
  const centers = perStage.map((_, i) => padL + ((i + 0.5) * span) / n)

  // Current animation speed scales inversely with |series current| (more current → faster).
  const iMag = Math.abs(series.seriesCurrent)
  const dur = Math.min(9, Math.max(1.2, 5 / (iMag * 4 + 0.25)))
  const dots = [0, 0.25, 0.5, 0.75]

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/30">
      <svg
        viewBox={`0 0 ${totalW} ${H}`}
        className="w-full"
        style={n > 3 ? { minWidth: totalW } : undefined}
        role="img"
        aria-label="Recipe circuit schematic"
      >
        <defs>
          <path id="ts-loop" d={loopPath} />
        </defs>

        {/* Wire loop */}
        <use href="#ts-loop" fill="none" stroke="#94a3b8" strokeWidth={3} strokeLinejoin="round" />

        {/* Animated current dots */}
        {iMag > 1e-9 &&
          dots.map((offset, i) => (
            <circle key={i} r={5} fill="#facc15">
              <animateMotion
                dur={`${dur}s`}
                repeatCount="indefinite"
                keyPoints={`${offset};${(offset + 1) % 1.0001}`}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href="#ts-loop" />
              </animateMotion>
            </circle>
          ))}

        {/* Series readout in the center of the loop */}
        <g textAnchor="middle" fontFamily="ui-monospace, monospace">
          <text x={totalW / 2} y={top + 70} fontSize={13} fill="#64748b">
            SERIES CIRCUIT · {series.stageCount} stage{series.stageCount === 1 ? '' : 's'}
          </text>
          <text x={totalW / 2} y={top + 96} fontSize={16} fontWeight={700} fill="#475569">
            V {fmt(series.totalVoltage)} · I {fmt(series.seriesCurrent)} · R{' '}
            {fmt(series.totalResistance)} · P {fmt(series.totalPower)}
          </text>
          <text x={totalW / 2} y={top + 120} fontSize={13} fill="#64748b">
            Z {fmt(series.totalImpedance)} · φ {fmt(series.phaseDeg)}° · Kalchm{' '}
            {fmt(series.netKalchm)} · Monica {fmt(series.netMonica)}
          </text>
        </g>

        {/* Stage components on the wire */}
        {perStage.map((stage, i) => {
          const cx = centers[i]
          const color = ROLE_COLOR[stage.role]
          const isHover = hovered === i
          const chipW = 132
          const chipH = 64
          return (
            <g
              key={i}
              transform={`translate(${cx}, ${top})`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* connector tick */}
              <line x1={-22} y1={0} x2={22} y2={0} stroke={color} strokeWidth={3} />
              {/* chip */}
              <rect
                x={-chipW / 2}
                y={-chipH - 14}
                width={chipW}
                height={chipH}
                rx={10}
                fill="white"
                stroke={color}
                strokeWidth={isHover ? 3 : 2}
                opacity={0.97}
              />
              <g transform={`translate(0, ${-chipH - 14 + 18})`}>
                <RoleGlyph role={stage.role} color={color} />
              </g>
              <text
                x={0}
                y={-chipH - 14 + 38}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#0f172a"
              >
                {stage.name.length > 16 ? stage.name.slice(0, 15) + '…' : stage.name}
              </text>
              <text
                x={0}
                y={-chipH - 14 + 54}
                textAnchor="middle"
                fontSize={10}
                fill={color}
                fontWeight={600}
              >
                {ROLE_LABEL[stage.role]}
              </text>
              {/* node label below the wire */}
              <text
                x={0}
                y={20}
                textAnchor="middle"
                fontSize={11}
                fill="#475569"
                fontFamily="ui-monospace, monospace"
              >
                V {fmt(stage.voltage)} · I {fmt(stage.current)}
              </text>

              {/* hover detail */}
              {isHover && (
                <g transform={`translate(0, 30)`}>
                  <rect
                    x={-95}
                    y={0}
                    width={190}
                    height={92}
                    rx={8}
                    fill="#0f172a"
                    opacity={0.95}
                  />
                  <g fill="#e2e8f0" fontFamily="ui-monospace, monospace" fontSize={11}>
                    <text x={-85} y={18}>
                      Q {fmt(stage.charge)} · EMF {fmt(stage.emf)}
                    </text>
                    <text x={-85} y={34}>
                      R {fmt(stage.resistance)} · C {fmt(stage.capacitance)}
                    </text>
                    <text x={-85} y={50}>
                      X {fmt(stage.reactance)} · Z {fmt(stage.impedance)}
                    </text>
                    <text x={-85} y={66}>
                      P {fmt(stage.power)} · L {fmt(stage.inductance)}
                    </text>
                    <text x={-85} y={82} fill="#fbbf24">
                      Kalchm {fmt(stage.kalchm)} · Monica {fmt(stage.monica)}
                    </text>
                  </g>
                </g>
              )}
            </g>
          )
        })}

        {/* Source marker on the left vertical wire */}
        <g transform={`translate(${left}, ${(top + bottom) / 2})`}>
          <line x1={-14} y1={-12} x2={14} y2={-12} stroke="#f59e0b" strokeWidth={3} />
          <line x1={-8} y1={2} x2={8} y2={2} stroke="#f59e0b" strokeWidth={3} />
          <text x={-20} y={6} textAnchor="end" fontSize={11} fill="#b45309" fontWeight={700}>
            ℰ
          </text>
        </g>
      </svg>
    </div>
  )
}

export default CircuitSchematic
