'use client'

import { useState, useEffect } from 'react'
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
  const [telemetryLoading, setTelemetryLoading] = useState(true)
  const [mcpStatus, setMcpStatus] = useState<any>(null)
  const [mcpSummary, setMcpSummary] = useState<any>(null)
  const [alchmMcpErrors, setAlchmMcpErrors] = useState<any>(null)

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const results = await Promise.allSettled([
          fetch('/api/admin/mcp-status').then(r =>
            r.ok ? r.json() : Promise.reject(r.statusText)
          ),
          fetch('/api/admin/mcp-summary?windowMinutes=60').then(r =>
            r.ok ? r.json() : Promise.reject(r.statusText)
          ),
          fetch('/api/admin/alchm-mcp-errors?windowMinutes=5').then(r =>
            r.ok ? r.json() : Promise.reject(r.statusText)
          ),
        ])

        if (results[0].status === 'fulfilled') setMcpStatus(results[0].value)
        else setMcpStatus({ success: false, error: 'MCP Status telemetry offline' })

        if (results[1].status === 'fulfilled') setMcpSummary(results[1].value)
        else setMcpSummary({ success: false, error: 'MCP Summary telemetry offline' })

        if (results[2].status === 'fulfilled') setAlchmMcpErrors(results[2].value)
        else setAlchmMcpErrors({ success: false, error: 'Alchm MCP Error telemetry offline' })
      } catch (err) {
        console.error('Error fetching MCP telemetry:', err)
      } finally {
        setTelemetryLoading(false)
      }
    }

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, 30000)
    return () => clearInterval(interval)
  }, [])

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

      {/* MCP Live Server & Network Telemetry */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Planetary Agents MCP Server Status */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-400">
                Planetary Agents MCP Server
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium">Synthetic Probe health status</p>
            </div>
            {telemetryLoading ? (
              <span className="text-[10px] text-zinc-500 font-bold uppercase animate-pulse">
                Checking...
              </span>
            ) : mcpStatus ? (
              <span
                className={cn(
                  'border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] rounded-full transition-all duration-300',
                  mcpStatus.status === 'healthy' &&
                    'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
                  mcpStatus.status === 'degraded' &&
                    'border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.08)]',
                  mcpStatus.status === 'unhealthy' &&
                    'border-rose-500/25 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.08)]',
                  mcpStatus.status === 'unknown' && 'border-sky-500/25 bg-sky-500/10 text-sky-300'
                )}
              >
                {mcpStatus.status}
              </span>
            ) : (
              <span className="border border-zinc-800 bg-zinc-900/60 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.14em]">
                Offline
              </span>
            )}
          </div>

          <div className="space-y-3 font-mono text-[11px] text-zinc-300">
            {mcpSummary?.syntheticProbe ? (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Verdict:</span>
                  <span
                    className={cn(
                      'font-bold',
                      mcpSummary.syntheticProbe.verdict === 'OK' && 'text-emerald-400',
                      mcpSummary.syntheticProbe.verdict === 'DEGRADED' && 'text-amber-400',
                      mcpSummary.syntheticProbe.verdict === 'INCIDENT' && 'text-rose-400',
                      mcpSummary.syntheticProbe.verdict === 'UNKNOWN' && 'text-sky-400'
                    )}
                  >
                    {mcpSummary.syntheticProbe.verdict}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Consecutive Failures:</span>
                  <span
                    className={cn(
                      'font-bold',
                      mcpSummary.syntheticProbe.consecutiveFailures > 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {mcpSummary.syntheticProbe.consecutiveFailures}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Called:</span>
                  <span>
                    {mcpSummary.syntheticProbe.lastCalledAt
                      ? new Date(mcpSummary.syntheticProbe.lastCalledAt).toLocaleTimeString()
                      : 'Never'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-zinc-500 italic">No probe data resolved.</p>
            )}
          </div>
        </div>

        {/* Alchm Data MCP Server Status */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-400">
                Alchm Data MCP Server
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium">
                Culinary & astrology hydration
              </p>
            </div>
            {telemetryLoading ? (
              <span className="text-[10px] text-zinc-500 font-bold uppercase animate-pulse">
                Checking...
              </span>
            ) : alchmMcpErrors ? (
              <span
                className={cn(
                  'border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] rounded-full transition-all duration-300',
                  alchmMcpErrors.verdict === 'OK' &&
                    'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
                  alchmMcpErrors.verdict === 'WARN' &&
                    'border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.08)]',
                  alchmMcpErrors.verdict === 'DEGRADED' &&
                    'border-rose-500/25 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.08)]'
                )}
              >
                {alchmMcpErrors.verdict}
              </span>
            ) : (
              <span className="border border-zinc-800 bg-zinc-900/60 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.14em]">
                Offline
              </span>
            )}
          </div>

          <div className="space-y-3 font-mono text-[11px] text-zinc-300">
            {alchmMcpErrors ? (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Error Count (5m Window):</span>
                  <span
                    className={cn(
                      'font-bold',
                      alchmMcpErrors.errorCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                    )}
                  >
                    {alchmMcpErrors.errorCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Error Rate per Minute:</span>
                  <span className="font-bold">{alchmMcpErrors.errorRatePerMin.toFixed(2)}</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-relaxed font-sans mt-2">
                  *Culinary MCP failures are caught and degraded to persona+RAG so chat works, but
                  errors indicate catalog lookup degradation.
                </p>
              </>
            ) : (
              <p className="text-zinc-500 italic">No Alchm MCP errors resolved.</p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Latency and Tier Gating Analytics */}
      {mcpSummary && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
            Advanced Performance & Tier Gating Analytics
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Latency percentiles */}
            <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Latency Distribution (60m window)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 border border-white/5 p-2 rounded-lg">
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">P50</span>
                  <span className="text-sm font-black text-white">
                    {mcpSummary.totals.p50LatencyMs ? `${mcpSummary.totals.p50LatencyMs}ms` : '—'}
                  </span>
                </div>
                <div className="bg-black/30 border border-white/5 p-2 rounded-lg">
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">P95</span>
                  <span className="text-sm font-black text-amber-300">
                    {mcpSummary.totals.p95LatencyMs ? `${mcpSummary.totals.p95LatencyMs}ms` : '—'}
                  </span>
                </div>
                <div className="bg-black/30 border border-white/5 p-2 rounded-lg">
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">P99</span>
                  <span className="text-sm font-black text-rose-400">
                    {mcpSummary.totals.p99LatencyMs ? `${mcpSummary.totals.p99LatencyMs}ms` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tier Gating / Downgrades */}
            <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-2 font-mono text-[11px] text-zinc-300">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                Tier Downgrades (Quota Gating)
              </span>
              <div className="flex justify-between">
                <span className="text-zinc-500">Downgraded requests:</span>
                <span
                  className={cn(
                    'font-bold',
                    mcpSummary.tierDowngrades.total > 0 ? 'text-amber-300' : 'text-emerald-400'
                  )}
                >
                  {mcpSummary.tierDowngrades.total}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500 font-sans">Requested breakdown:</span>
                <span className="text-[9px]">
                  {Object.entries(mcpSummary.tierDowngrades.byRequestedTier || {}).length > 0
                    ? Object.entries(mcpSummary.tierDowngrades.byRequestedTier || {}).map(
                        ([tier, count]) => (
                          <span key={tier} className="ml-2 font-bold text-zinc-400">
                            {tier}: {count as number}
                          </span>
                        )
                      )
                    : 'None'}
                </span>
              </div>
            </div>

            {/* Error Rate */}
            <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-2 font-mono text-[11px] text-zinc-300">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                Aggregate Errors (60m window)
              </span>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Tool Errors:</span>
                <span
                  className={cn(
                    'font-bold',
                    mcpSummary.totals.failures > 0 ? 'text-rose-400' : 'text-emerald-400'
                  )}
                >
                  {mcpSummary.totals.failures} / {mcpSummary.totals.calls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Error Rate:</span>
                <span
                  className={cn(
                    'font-bold',
                    mcpSummary.totals.errorRate > 0.05
                      ? 'text-rose-400'
                      : mcpSummary.totals.errorRate > 0
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                  )}
                >
                  {(mcpSummary.totals.errorRate * 100).toFixed(3)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
