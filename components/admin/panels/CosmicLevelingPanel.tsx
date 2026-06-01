'use client'

import { Bot, Gauge, Activity, Swords, Medal, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LevelingSummary {
  totals: {
    agents: number
    maxedLevel100: number
    untrainedLevel1: number
    avgLevel: number
    totalEvsTrained: number
    evTotalCap: number
    agentsInTraining: number
  }
  distribution: Array<{ band: string; count: number }>
  topAgents: Array<{ agentId: string; name: string; level: number; xp: number }>
  inTraining: Array<{
    agentId: string
    name: string
    level: number
    evTotal: number
    lastTrainingPartner: string | null
  }>
}

interface CosmicLevelingProps {
  leveling: LevelingSummary | null
  loading: boolean
}

export default function CosmicLevelingPanel({ leveling, loading }: CosmicLevelingProps) {
  if (loading && !leveling) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/40"
          />
        ))}
      </div>
    )
  }

  if (!leveling) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
        Cosmic Leveling data is currently unavailable.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 4 Cards Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Roster */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Roster Capacity
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {leveling.totals.agents.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Active alchemical entities</p>
        </div>

        {/* Avg Level */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Mean Level
              </p>
              <p className="mt-2 text-3xl font-black text-white">Lv.{leveling.totals.avgLevel}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Gauge className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">
            {leveling.totals.maxedLevel100.toLocaleString()} maxed at Lv.100
          </p>
        </div>

        {/* In Training */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Active Gym Queue
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {leveling.totals.agentsInTraining.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Entities gaining EVs/XP</p>
        </div>

        {/* EVs trained */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                EV Pool Accumulated
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {leveling.totals.totalEvsTrained.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Swords className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">
            EV sum (cap: {leveling.totals.evTotalCap.toLocaleString()}/agent)
          </p>
        </div>
      </div>

      {/* Grid for distribution and leaderboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Level distribution */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400" />
            Cosmic Level Distribution
          </h4>

          <div className="space-y-4">
            {leveling.distribution.map(b => {
              const pct = leveling.totals.agents
                ? Math.round((b.count / leveling.totals.agents) * 100)
                : 0
              return (
                <div key={b.band} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span className="text-zinc-300">{b.band}</span>
                    <span className="font-mono text-[10px] bg-zinc-800 border border-white/5 px-2 py-0.5 rounded text-zinc-350">
                      {b.count.toLocaleString()} agents ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-sky-400 transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legends Leaderboard */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <Medal className="h-4 w-4 text-amber-400 animate-bounce" />
            Legends Leaderboard (Top XP)
          </h4>

          {leveling.topAgents.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-850 rounded-xl bg-black/10">
              No ranked entities.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {leveling.topAgents.map((a, i) => {
                const medalColors = [
                  'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
                  'bg-zinc-300/10 text-zinc-300 border-zinc-300/20',
                  'bg-amber-600/10 text-amber-300 border-amber-600/20',
                ]
                const colorClass = medalColors[i] || 'bg-zinc-850 text-zinc-450 border-white/5'
                return (
                  <div
                    key={a.agentId}
                    className="flex justify-between items-center border border-white/5 bg-zinc-950/40 rounded-xl px-3 py-2.5 hover:border-amber-500/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-mono font-black',
                          colorClass
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="font-bold text-xs text-zinc-200 truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] font-bold text-zinc-450">
                      <span className="text-emerald-400">Lv.{a.level}</span>
                      <span className="h-3 w-px bg-white/10" />
                      <span>{a.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Currently Training EV Table */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md">
        <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
          Training Arena EV Matrix Queue
        </h4>

        {leveling.inTraining.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
            No agents are actively in training queue (all EV balances at zero).
          </div>
        ) : (
          <div className="space-y-2.5">
            {leveling.inTraining.map(a => {
              const maxEV = leveling.totals.evTotalCap || 510
              const progressPct = Math.min(100, Math.round((a.evTotal / maxEV) * 100))
              return (
                <div
                  key={a.agentId}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/5 bg-zinc-950/40 rounded-xl p-3.5 hover:border-rose-500/20 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-200 group-hover:text-rose-300 transition-colors">
                      {a.name}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-500/10 border border-rose-500/15 text-rose-400 uppercase tracking-wider rounded">
                      Lv.{a.level}
                    </span>
                  </div>

                  <div className="flex-1 max-w-sm flex items-center gap-3">
                    <div className="h-1.5 flex-1 bg-zinc-850 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-zinc-450 shrink-0">
                      {a.evTotal} / {maxEV} EV ({progressPct}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold font-mono">
                    <span>Partner:</span>
                    {a.lastTrainingPartner ? (
                      <span className="text-zinc-350">{a.lastTrainingPartner}</span>
                    ) : (
                      <span className="text-zinc-650">none</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
