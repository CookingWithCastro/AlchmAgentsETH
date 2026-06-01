'use client'

import { Users, GitBranch, Calendar, Compass, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupChatSessionItem {
  id: string
  agentIds: any // array / object
  transitKey: string | null
  userId: string | null
  origin: string | null
  createdAt: string
}

interface GroupChatData {
  total: number
  last24h: number
  recent: GroupChatSessionItem[]
  originHistogram: Record<string, number>
}

interface GroupChatPanelProps {
  data: GroupChatData
}

export default function GroupChatSessionsPanel({ data }: GroupChatPanelProps) {
  // Format agent ID lists beautifully
  const formatAgentsList = (agentIdsRaw: any) => {
    try {
      const arr = Array.isArray(agentIdsRaw)
        ? agentIdsRaw
        : typeof agentIdsRaw === 'string'
          ? JSON.parse(agentIdsRaw)
          : []
      return arr
        .map((id: string) =>
          id
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        )
        .join(', ')
    } catch {
      return String(agentIdsRaw)
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Councils */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Dynamic Councils
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.total.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">
            Transit group chat sessions convened
          </p>
        </div>

        {/* past 24h */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Convened (24h)
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.last24h.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Compass className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">
            Dynamic session creation velocity
          </p>
        </div>

        {/* Origin stats */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                WTEN Sync Gating
              </p>
              <p className="mt-2 text-3xl font-black text-white">Active</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <GitBranch className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">
            Double-create deduplication active
          </p>
        </div>
      </div>

      {/* Grid: Origin Histogram vs Recent Sessions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Origin Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md h-fit">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
            Council Origin Breakdown
          </h4>

          {Object.keys(data.originHistogram).length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-xs text-zinc-500">
              No origin history recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const max = Math.max(1, ...Object.values(data.originHistogram))
                const total = Object.values(data.originHistogram).reduce((a, b) => a + b, 0)
                return Object.entries(data.originHistogram).map(([origin, count]) => {
                  const pct = Math.round((count / total) * 100)
                  const barPct = Math.round((count / max) * 100)
                  return (
                    <div key={origin} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-zinc-300 font-bold capitalize">
                          {origin === 'null' || origin === 'unknown' ? 'Unspecified Web' : origin}
                        </span>
                        <span className="font-mono text-zinc-400 text-[10px] font-bold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* Recent Councils list */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md flex flex-col min-w-0">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
            Recently Convened Councils
          </h4>

          {data.recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
              No group chat sessions convened yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {data.recent.map(item => (
                <div
                  key={item.id}
                  className="border border-white/5 bg-zinc-950/40 rounded-xl p-3.5 hover:border-violet-500/20 transition-all text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2 mb-2 font-mono text-[10px] text-zinc-500">
                    <span className="font-bold text-zinc-400">ID: {item.id}</span>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                      <span className="capitalize">{item.origin || 'Web app'}</span>
                      <span className="h-3 w-px bg-white/10" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 font-sans">
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-500 font-semibold w-16 shrink-0">Council:</span>
                      <span className="text-zinc-200 font-bold text-[11px] leading-relaxed">
                        {formatAgentsList(item.agentIds)}
                      </span>
                    </div>

                    {item.transitKey && (
                      <div className="flex items-start gap-2 font-mono text-[10px]">
                        <span className="text-zinc-500 font-semibold w-16 shrink-0">
                          Transit Key:
                        </span>
                        <span className="text-zinc-350">{item.transitKey}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
