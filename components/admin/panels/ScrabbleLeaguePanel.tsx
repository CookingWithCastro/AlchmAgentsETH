'use client'

import { Trophy, Activity, Sparkles, Zap, Target, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Standing {
  rank: number
  agentId: string
  name: string
  elo: number
  played: number
  won: number
  lost: number
  tied: number
  pointsFor: number
  seasonId: string
}

interface RecentMatch {
  id: string
  seasonId: string
  agentA: string
  agentB: string
  winner: string | null
  scoreA: number
  scoreB: number
  margin: number
  highlight: string | null
  tie: boolean
  createdAt: string
}

interface ScrabbleLeagueData {
  available: boolean
  aggregates: {
    totalMatches: number
    last24h: number
    activeSeasons: number
    latestSeason: string | null
    highlights: { bingo: number; upset: number; sweep: number }
  } | null
  standings: Standing[]
  recentMatches: RecentMatch[]
}

interface ScrabbleLeagueProps {
  data: ScrabbleLeagueData | null
  loading: boolean
}

const HIGHLIGHT_BADGE: Record<string, { label: string; cls: string }> = {
  bingo: { label: '🎯 Bingo', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  upset: { label: '⚡ Upset', cls: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
  sweep: { label: '⚔️ Sweep', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  hint: string
  icon: typeof Trophy
  tone: string
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className={cn('h-10 w-10 rounded-xl border flex items-center justify-center', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500 font-medium">{hint}</p>
    </div>
  )
}

export default function ScrabbleLeaguePanel({ data, loading }: ScrabbleLeagueProps) {
  if (loading && !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/40"
          />
        ))}
      </div>
    )
  }

  if (!data || !data.available || !data.aggregates) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
        The Agent Scrabble League has no data yet. Enable it with{' '}
        <code className="text-zinc-300">SCRABBLE_LEAGUE_ENABLED=true</code> and run the hourly tick
        (the standings tables must be migrated first).
      </div>
    )
  }

  const { aggregates, standings, recentMatches } = data

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Matches"
          value={aggregates.totalMatches.toLocaleString()}
          hint={`Season ${aggregates.latestSeason || '—'}`}
          icon={Trophy}
          tone="border-amber-500/20 bg-amber-500/10 text-amber-400"
        />
        <MetricCard
          label="Last 24h"
          value={aggregates.last24h.toLocaleString()}
          hint="Matches resolved today"
          icon={Activity}
          tone="border-sky-500/20 bg-sky-500/10 text-sky-400"
        />
        <MetricCard
          label="Active Seasons"
          value={aggregates.activeSeasons}
          hint="Rolling round-robins"
          icon={Sparkles}
          tone="border-violet-500/20 bg-violet-500/10 text-violet-400"
        />
        <MetricCard
          label="Highlights"
          value={
            aggregates.highlights.bingo + aggregates.highlights.upset + aggregates.highlights.sweep
          }
          hint={`${aggregates.highlights.bingo} bingo · ${aggregates.highlights.upset} upset · ${aggregates.highlights.sweep} sweep`}
          icon={Zap}
          tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* Standings */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Season Standings (by ELO)</h3>
        </div>
        {standings.length === 0 ? (
          <p className="text-sm text-zinc-500">No standings recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <th className="pb-2 pr-3 font-bold">#</th>
                  <th className="pb-2 pr-3 font-bold">Agent</th>
                  <th className="pb-2 pr-3 font-bold text-right">ELO</th>
                  <th className="pb-2 pr-3 font-bold text-right">W–L–T</th>
                  <th className="pb-2 pr-3 font-bold text-right">Played</th>
                  <th className="pb-2 font-bold text-right">Points</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {standings.map(s => (
                  <tr key={s.agentId} className="border-t border-white/5">
                    <td className="py-2 pr-3 font-mono text-zinc-500">{s.rank}</td>
                    <td className="py-2 pr-3 font-medium text-white">{s.name}</td>
                    <td className="py-2 pr-3 text-right font-mono font-bold text-amber-300">
                      {s.elo}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {s.won}–{s.lost}–{s.tied}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{s.played}</td>
                    <td className="py-2 text-right font-mono">{s.pointsFor.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent matches */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Recent Matches</h3>
        </div>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-zinc-500">No matches played yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentMatches.map(m => {
              const badge = m.highlight ? HIGHLIGHT_BADGE[m.highlight] : null
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-4 py-2.5"
                >
                  <div className="min-w-0 text-sm">
                    <span
                      className={cn(
                        'font-medium',
                        m.winner === m.agentA ? 'text-white' : 'text-zinc-400'
                      )}
                    >
                      {m.agentA}
                    </span>
                    <span className="mx-2 font-mono text-zinc-600">
                      {m.scoreA}–{m.scoreB}
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        m.winner === m.agentB ? 'text-white' : 'text-zinc-400'
                      )}
                    >
                      {m.agentB}
                    </span>
                    {m.tie && <span className="ml-2 text-xs text-zinc-500">(tie)</span>}
                  </div>
                  {badge && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                        badge.cls
                      )}
                    >
                      {badge.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
