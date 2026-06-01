'use client'

import { useState } from 'react'
import { Swords, Activity, Clock, ShieldAlert, ChevronRight, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminJingDuel } from '@/types/admin'

interface JingArenaProps {
  data: {
    jingAggregates?: {
      total: number
      last24h: number
      last7d: number
      stanceHistogram: Record<string, number>
      boostElementHistogram: Record<string, number>
      topPairs: {
        casterId: string
        targetId: string
        casterName: string
        targetName: string
        count: number
      }[]
      avgLatencyMs: number | null
    }
    recentJingDuels: AdminJingDuel[]
  }
  onSelectDuel: (duel: AdminJingDuel) => void
}

export default function JingArenaPanel({ data, onSelectDuel }: JingArenaProps) {
  const aggregates = data.jingAggregates
  const duels = data.recentJingDuels

  if (!aggregates) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
        Jing Arena aggregates are unavailable. Cast a duel first.
      </div>
    )
  }

  // Combat stances calculations
  const clashCount = aggregates.stanceHistogram.clash ?? 0
  const absorbCount = aggregates.stanceHistogram.absorb ?? 0
  const mirrorCount = aggregates.stanceHistogram.mirror ?? 0
  const totalStances = clashCount + absorbCount + mirrorCount || 1

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Duels */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Total Conflicts
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {aggregates.total.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Swords className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">All-time persisted casts</p>
        </div>

        {/* Latency */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Avg Resolution
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {aggregates.avgLatencyMs ? `${aggregates.avgLatencyMs}ms` : 'n/a'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Both turns combined latency</p>
        </div>

        {/* 24 Hours */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Velocity (24h)
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {aggregates.last24h.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Duels active in past 24 hours</p>
        </div>

        {/* 7 Days */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Weekly Total
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {aggregates.last7d.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Casts in past 7 days</p>
        </div>
      </div>

      {/* Histograms & Stance Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stance Histogram */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Combat Stance Ratio
          </h4>

          <div className="space-y-4">
            {[
              {
                label: 'Clash Stance (Offensive)',
                count: clashCount,
                color: 'from-rose-600 to-rose-400',
                pct: Math.round((clashCount / totalStances) * 100),
                text: 'text-rose-300 bg-rose-500/10 border-rose-500/10',
              },
              {
                label: 'Absorb Stance (Defensive)',
                count: absorbCount,
                color: 'from-sky-600 to-sky-400',
                pct: Math.round((absorbCount / totalStances) * 100),
                text: 'text-sky-300 bg-sky-500/10 border-sky-500/10',
              },
              {
                label: 'Mirror Stance (Reactive)',
                count: mirrorCount,
                color: 'from-fuchsia-600 to-fuchsia-400',
                pct: Math.round((mirrorCount / totalStances) * 100),
                text: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/10',
              },
            ].map(stance => (
              <div key={stance.label} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-300">{stance.label}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 font-mono text-[10px] font-bold rounded-md border',
                      stance.text
                    )}
                  >
                    {stance.count} ({stance.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r', stance.color)}
                    style={{ width: `${stance.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Elemental Boost Histogram */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Elemental Resonance Boost
          </h4>

          {(() => {
            const hist = aggregates.boostElementHistogram
            const order = ['fire', 'water', 'earth', 'air', 'none']
            const entries = order.map(el => ({ el, count: hist[el] ?? 0 }))
            const totalBoosts = entries.reduce((a, b) => a + b.count, 0) || 1
            const maxVal = Math.max(1, ...entries.map(e => e.count))

            const toneMap: Record<string, string> = {
              fire: 'from-rose-500 to-orange-400 text-rose-300',
              water: 'from-sky-500 to-cyan-400 text-sky-300',
              earth: 'from-emerald-500 to-teal-400 text-emerald-300',
              air: 'from-amber-500 to-yellow-400 text-amber-300',
              none: 'from-zinc-600 to-zinc-500 text-zinc-400',
            }

            return (
              <div className="space-y-3.5">
                {entries.map(({ el, count }) => {
                  const pct = Math.round((count / totalBoosts) * 100)
                  const barPct = Math.round((count / maxVal) * 100)
                  return (
                    <div key={el} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="capitalize font-semibold text-zinc-300">{el}</span>
                        <span className="font-mono text-zinc-400 text-[10px] font-bold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full bg-gradient-to-r',
                            toneMap[el].split(' ')[0]
                          )}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Top Matches Pairs */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <Swords className="h-4 w-4 text-violet-400" />
            Top Conflict Pairs
          </h4>

          {aggregates.topPairs.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-850 rounded-xl bg-black/10">
              No matching records.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {aggregates.topPairs.map(pair => (
                <div
                  key={`${pair.casterId}::${pair.targetId}`}
                  className="flex justify-between items-center border border-white/5 bg-zinc-950/40 rounded-xl px-3 py-2.5 hover:border-violet-500/20 transition-all"
                >
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-semibold truncate max-w-[200px]">
                    <span className="truncate">{pair.casterName}</span>
                    <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="truncate">{pair.targetName}</span>
                  </div>
                  <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-violet-500/10 border border-violet-500/15 text-violet-300 rounded-md shrink-0">
                    {pair.count} runs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Duel Ledgers */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md">
        <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
          Conflict Stream Logs (Real-time Duel Feeds)
        </h4>

        {duels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
            No live records resolved. Cast a duel in the Desktop companion.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="px-4 py-3 text-left font-semibold">Initiator (Caster)</th>
                  <th className="px-4 py-3 text-left font-semibold">Defender (Target)</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Relational Move (Caster → Defender)
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Stance</th>
                  <th className="px-4 py-3 text-left font-semibold">Elemental Boost</th>
                  <th className="px-4 py-3 text-left font-semibold">Resolution</th>
                  <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {duels.map(duel => {
                  const stanceColors: Record<string, string> = {
                    clash: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
                    absorb: 'border-sky-500/20 bg-sky-500/5 text-sky-300',
                    mirror: 'border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300',
                  }
                  const boostPct = Math.round(duel.boostMagnitude * 100)

                  return (
                    <tr
                      key={duel.id}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      onClick={() => onSelectDuel(duel)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-zinc-200 group-hover:text-violet-300 transition-colors">
                          {duel.casterName}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[130px]">
                          {duel.casterId}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-zinc-200">{duel.targetName}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[130px]">
                          {duel.targetId}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-300">
                        <span className="text-zinc-450">{duel.attackMoveId}</span>
                        <ChevronRight className="inline h-3.5 w-3.5 mx-1 text-zinc-650" />
                        <span className="text-zinc-200">{duel.counterMoveId}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                            stanceColors[duel.stance] || 'border-zinc-700 bg-zinc-800 text-zinc-300'
                          )}
                        >
                          {duel.stance}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-300">
                        {duel.boostElement ? (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] border font-bold capitalize',
                              duel.boostElement === 'fire' &&
                                'bg-rose-500/10 border-rose-500/20 text-rose-300',
                              duel.boostElement === 'water' &&
                                'bg-sky-500/10 border-sky-500/20 text-sky-300',
                              duel.boostElement === 'earth' &&
                                'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
                              duel.boostElement === 'air' &&
                                'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            )}
                          >
                            {boostPct}% {duel.boostElement}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-300">
                        {duel.latencyMs ? `${duel.latencyMs}ms` : 'n/a'}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 text-[10px] whitespace-nowrap font-medium">
                        {new Date(duel.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
