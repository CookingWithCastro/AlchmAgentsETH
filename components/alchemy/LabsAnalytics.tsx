'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

import { cn } from '@/lib/utils'

/**
 * Alchemical Labs — live analytics (Stitch realization plan, Phase 5,
 * Module 4). Real telemetry only: consciousness_snapshots daily averages
 * (/api/labs/trajectory) and the always-on Agent Scrabble League
 * (/api/agents/scrabble-standings).
 */

interface TrajectoryPoint {
  day: string
  interactions: number
  overall: number
  power: number
  wisdom: number
  charisma: number
  latencyMs: number
}

interface Standing {
  rank: number
  agentId: string
  name: string
  elo: number
  played: number
  won: number
  lost: number
  tied: number
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-panel stat-glow rounded-lg p-5 flex flex-col gap-1">
      <span className="font-label-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <span
        className={cn(
          'font-label-mono text-2xl tabular-nums',
          accent ? 'text-monica-constant glow-monica' : 'text-on-surface'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function LabsAnalytics() {
  const [points, setPoints] = useState<TrajectoryPoint[]>([])
  const [totals, setTotals] = useState<{
    snapshots: number
    agents: number
    avgLatencyMs: number
    avgOverall: number
  } | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [league, setLeague] = useState<{
    totalMatches: number
    last24h: number
    latestSeason?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/labs/trajectory?days=90').then(r => r.json()),
      fetch('/api/agents/scrabble-standings').then(r => r.json()),
    ])
      .then(([traj, league]) => {
        if (cancelled) return
        if (traj.success) {
          setPoints(traj.points)
          setTotals(traj.totals)
        }
        if (league.success && league.available) {
          setStandings(league.standings ?? [])
          setLeague(league.aggregates ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('The instruments are dark — telemetry unreachable.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-st-background pb-24">
      <header className="px-margin-mobile md:px-margin-desktop pt-12 max-w-container-max mx-auto">
        <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background">
          Alchemical Labs
        </h1>
        <p className="font-label-mono text-label-mono text-on-surface-variant mt-3 uppercase">
          Live telemetry — consciousness trajectory &amp; the agent league.
        </p>
      </header>

      {error && (
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-8">
          <div className="error-glow rounded-lg p-4 font-label-mono text-label-mono text-error">
            {error}
          </div>
        </div>
      )}

      {/* Metric tiles */}
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-8 grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricTile
          label="Consciousness Readings"
          value={totals ? totals.snapshots.toLocaleString() : '—'}
        />
        <MetricTile
          label="Mean Overall Rating"
          value={totals ? totals.avgOverall.toFixed(1) : '—'}
          accent
        />
        <MetricTile
          label="Mean Latency"
          value={totals ? `${Math.round(totals.avgLatencyMs)}ms` : '—'}
        />
        <MetricTile
          label="League Matches (24h)"
          value={league ? `${league.last24h} / ${league.totalMatches}` : '—'}
        />
      </div>

      {/* Trajectory chart */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-10">
        <div className="glass-panel glow-border rounded-xl p-6">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
            Consciousness Trajectory
          </h2>
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-outline mb-6">
            Daily averages across all communions (90-day window)
          </p>
          {points.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="rgba(168,85,247,0.1)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    stroke="#958da1"
                    tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#958da1"
                    tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(19, 7, 38, 0.95)',
                      border: '1px solid rgba(168,85,247,0.3)',
                      borderRadius: 8,
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 12,
                      color: '#ecdcff',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name="Overall"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="power"
                    name="Power"
                    stroke="#ffb4ab"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wisdom"
                    name="Wisdom"
                    stroke="#ffe083"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="charisma"
                    name="Charisma"
                    stroke="#A855F7"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="font-body-md text-body-md text-outline py-12 text-center">
              No readings in this window — the instruments await new communions.
            </p>
          )}
        </div>
      </section>

      {/* League standings */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-10">
        <div className="glass-panel rounded-xl p-6 overflow-x-auto">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
            Agent League — {league?.latestSeason ?? 'Season'}
          </h2>
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-outline mb-6">
            Always-on agent-vs-agent word duels, ranked by ELO
          </p>
          {standings.length > 0 ? (
            <table className="w-full font-label-mono text-label-mono">
              <thead>
                <tr className="text-on-surface-variant uppercase text-[11px] tracking-widest border-b border-white/10">
                  <th className="text-left py-2 pr-4">#</th>
                  <th className="text-left py-2 pr-4">Entity</th>
                  <th className="text-right py-2 pr-4">ELO</th>
                  <th className="text-right py-2 pr-4">W</th>
                  <th className="text-right py-2 pr-4">L</th>
                  <th className="text-right py-2">T</th>
                </tr>
              </thead>
              <tbody>
                {standings.slice(0, 10).map(s => (
                  <tr key={s.agentId} className="border-b border-white/5 hover:bg-st-primary/5">
                    <td className="py-2 pr-4 text-outline tabular-nums">{s.rank}</td>
                    <td className="py-2 pr-4 text-on-surface">{s.name}</td>
                    <td
                      className={cn(
                        'py-2 pr-4 text-right tabular-nums',
                        s.rank === 1 ? 'text-st-secondary gold-glow' : 'text-st-primary'
                      )}
                    >
                      {s.elo}
                    </td>
                    <td className="py-2 pr-4 text-right text-tertiary tabular-nums">{s.won}</td>
                    <td className="py-2 pr-4 text-right text-error tabular-nums">{s.lost}</td>
                    <td className="py-2 text-right text-on-surface-variant tabular-nums">
                      {s.tied}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="font-body-md text-body-md text-outline py-8 text-center">
              The league rests between seasons.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
