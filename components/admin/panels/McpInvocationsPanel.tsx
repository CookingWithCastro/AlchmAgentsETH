'use client'

import { useState } from 'react'
import {
  TerminalSquare,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface McpItem {
  toolName: string
  calledAt: string
  completedAt: string | null
  latencyMs: number | null
  success: boolean
  caller: string | null
  arguments: any
  errorMessage: string | null
  agentId: string | null
}

interface McpData {
  total: number
  last24h: number
  successRate: number
  avgLatencyMs: number
  topTools: Array<{ toolName: string; count: number }>
  recent: McpItem[]
}

interface McpPanelProps {
  data: McpData
}

export default function McpInvocationsPanel({ data }: McpPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const filteredInvocations = data.recent.filter(
    i =>
      i.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.caller && i.caller.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (i.agentId && i.agentId.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total calls */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                MCP Invokes
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.total.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">All-time tool calls</p>
        </div>

        {/* 24h calls */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Calls past 24h
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.last24h.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <TerminalSquare className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Daily running velocity</p>
        </div>

        {/* Success rate */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Success Ratio
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.successRate}%</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Successful tool completions</p>
        </div>

        {/* Latency */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-zinc-500">
                Mean Latency
              </p>
              <p className="mt-2 text-3xl font-black text-white">{data.avgLatencyMs}ms</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 font-medium">Mean successful resolution time</p>
        </div>
      </div>

      {/* Grid: Top Tools vs Terminal Logs */}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Top Tools List */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md h-fit">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
            Most Active MCP Tools
          </h4>

          {data.topTools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-xs text-zinc-500">
              No tool runs recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const max = Math.max(1, ...data.topTools.map(t => t.count))
                return data.topTools.map(t => {
                  const pct = Math.round((t.count / max) * 100)
                  return (
                    <div key={t.toolName} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-zinc-300 font-bold">{t.toolName}</span>
                        <span className="font-mono text-zinc-500 font-bold bg-zinc-800 border border-white/5 px-2 py-0.5 rounded text-[10px]">
                          {t.count} runs
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* Live Terminal logs */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md flex flex-col min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3 mb-4">
            <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest">
              Observed execution shell (Terminal logs)
            </h4>

            {/* Search */}
            <div className="relative w-full sm:max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-555" />
              <input
                type="text"
                placeholder="Search tools, agents, callers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-black/30 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-sky-500/50 text-zinc-200"
              />
            </div>
          </div>

          {filteredInvocations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
              No matching records resolved.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {filteredInvocations.map((item, index) => {
                const isExpanded = expandedIndex === index
                const isSuccess = item.success
                const argsStr = JSON.stringify(item.arguments || {}, null, 2)

                return (
                  <div
                    key={index}
                    className={cn(
                      'border rounded-xl transition-all select-text font-mono text-[11px]',
                      isSuccess
                        ? 'bg-zinc-950/40 border-zinc-850 hover:border-sky-500/20'
                        : 'bg-rose-950/10 border-rose-500/10 hover:border-rose-500/30'
                    )}
                  >
                    {/* Header bar */}
                    <div
                      className="flex items-center justify-between gap-4 p-3.5 cursor-pointer select-none"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSuccess ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                        )}
                        <span className="font-bold text-zinc-200 truncate">{item.toolName}</span>
                        {item.agentId && (
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold truncate bg-zinc-800/80 px-1.5 py-0.5 rounded">
                            {item.agentId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-zinc-450 font-bold">
                        <span>{item.latencyMs ? `${item.latencyMs}ms` : 'n/a'}</span>
                        <span className="h-3 w-px bg-white/10" />
                        <span>{new Date(item.calledAt).toLocaleTimeString()}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-zinc-555" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-555" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 space-y-3 bg-black/20 select-text">
                        {item.caller && (
                          <div className="flex gap-2">
                            <span className="text-zinc-500 font-semibold uppercase text-[9px] w-20 shrink-0">
                              Caller:
                            </span>
                            <span className="text-zinc-350">{item.caller}</span>
                          </div>
                        )}

                        {/* Arguments */}
                        <div className="space-y-1">
                          <span className="text-zinc-500 font-semibold uppercase text-[9px]">
                            Input Parameters (Arguments):
                          </span>
                          <pre className="bg-black/30 border border-white/5 rounded-lg p-3 text-[10px] text-sky-200 overflow-x-auto whitespace-pre-wrap select-text max-h-[150px]">
                            {argsStr}
                          </pre>
                        </div>

                        {/* Error Message */}
                        {item.errorMessage && (
                          <div className="space-y-1">
                            <span className="text-rose-400 font-semibold uppercase text-[9px]">
                              Execution Error:
                            </span>
                            <pre className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 text-[10px] text-rose-300 overflow-x-auto whitespace-pre-wrap select-text">
                              {item.errorMessage}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
