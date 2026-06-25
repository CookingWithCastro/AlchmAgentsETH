'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Cloud,
  Database,
  ExternalLink,
  Gauge,
  GitBranch,
  HardDrive,
  LayoutDashboard,
  Lock,
  Monitor,
  RefreshCw,
  Server,
  ShieldCheck,
  Swords,
  TerminalSquare,
  UserCog,
  Users,
  Workflow,
  XCircle,
  Cpu,
  Network,
  FileSearch,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { PerformanceDashboard } from '@/components/admin/performance-dashboard'
import BatchProcessingDashboard from '@/components/dashboards/batch-processing-dashboard'
import { cn } from '@/lib/utils'
import { ALCHM_DESKTOP_DOWNLOAD_LABEL, DESKTOP_APP_DOWNLOAD_URL } from '@/lib/desktop-download'

// Import modular panels
import CosmicTelemetryPanel from '@/components/admin/panels/CosmicTelemetryPanel'
import JingArenaPanel from '@/components/admin/panels/JingArenaPanel'
import CosmicLevelingPanel from '@/components/admin/panels/CosmicLevelingPanel'
import McpInvocationsPanel from '@/components/admin/panels/McpInvocationsPanel'
import RagKnowledgePanel from '@/components/admin/panels/RagKnowledgePanel'
import GroupChatSessionsPanel from '@/components/admin/panels/GroupChatSessionsPanel'
import ScrabbleLeaguePanel from '@/components/admin/panels/ScrabbleLeaguePanel'
import Web3TelemetryPanel from '@/components/admin/panels/Web3TelemetryPanel'

import type {
  AdminDashboardData,
  AdminHealthValue,
  AdminSystemStats,
  AdminRecentChat,
  AdminJingDuel,
} from '@/types/admin'

type AdminTab =
  | 'overview'
  | 'users'
  | 'agents'
  | 'chats'
  | 'mcp'
  | 'web3'
  | 'groupChats'
  | 'jing'
  | 'scrabble'
  | 'leveling'
  | 'rag'
  | 'infrastructure'
  | 'deployments'
  | 'jobs'
  | 'desktop'

type AdminOperatorConsoleProps = {
  initialUser: {
    id?: string | null
    email?: string | null
    name?: string | null
    role?: string | null
    tier?: string | null
  }
  authSource: string
}

interface AdminLevelingSummary {
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

const tabs: Array<{ id: AdminTab; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'chats', label: 'Chat Status', icon: TerminalSquare },
  { id: 'mcp', label: 'MCP Invocations', icon: Cpu },
  { id: 'web3', label: 'Web3 Integration', icon: ShieldCheck },
  { id: 'groupChats', label: 'Council Convenings', icon: Network },
  { id: 'jing', label: 'Jing Arena', icon: Swords },
  { id: 'scrabble', label: 'Scrabble League', icon: Trophy },
  { id: 'leveling', label: 'Cosmic Leveling', icon: Gauge },
  { id: 'rag', label: 'RAG / Knowledge', icon: FileSearch },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'deployments', label: 'Deployments', icon: GitBranch },
  { id: 'jobs', label: 'Jobs', icon: Workflow },
  { id: 'desktop', label: 'Desktop Companion', icon: Monitor },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return 'n/a'
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function healthLabel(value: AdminHealthValue | 'healthy' | 'error' | boolean) {
  if (value === true || value === 'healthy') return 'healthy'
  if (value === false || value === 'error') return 'error'
  return 'unknown'
}

function statusClasses(status: 'healthy' | 'error' | 'unknown' | 'warn') {
  return cn(
    'border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] rounded-full transition-all duration-300',
    status === 'healthy' &&
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
    status === 'warn' &&
      'border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.08)]',
    status === 'unknown' && 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    status === 'error' &&
      'border-rose-500/25 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.08)]'
  )
}

function StatusBadge({
  status,
  label,
}: {
  status: 'healthy' | 'error' | 'unknown' | 'warn'
  label: string
}) {
  const Icon = status === 'healthy' ? CheckCircle2 : status === 'error' ? XCircle : CircleDashed
  return (
    <span className={cn('inline-flex items-center gap-1.5', statusClasses(status))}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function MetricPanel({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'sky',
}: {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  tone?: 'sky' | 'emerald' | 'amber' | 'rose'
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-zinc-50">{value}</p>
          {detail && <p className="mt-1 text-xs text-zinc-500 font-medium">{detail}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300',
            tone === 'sky' && 'border-sky-500/20 bg-sky-500/10 text-sky-300',
            tone === 'emerald' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
            tone === 'amber' && 'border-amber-500/20 bg-amber-500/10 text-amber-300',
            tone === 'rose' && 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/20 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4 bg-zinc-950/20">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-350">
          <Icon className="h-4.5 w-4.5 text-indigo-400" />
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-xs text-zinc-500">
      {label}
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string
  icon: LucideIcon
  label: string
  external?: boolean
}) {
  const className =
    'inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-bold text-zinc-300 transition duration-300 hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-100'
  const content = (
    <>
      <Icon className="h-4 w-4 text-zinc-400 group-hover:text-sky-300 shrink-0" />
      <span>{label}</span>
      {external && <ExternalLink className="h-3.5 w-3.5 text-zinc-650 shrink-0" />}
    </>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn(className, 'group')}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={cn(className, 'group')}>
      {content}
    </Link>
  )
}

export function AdminOperatorConsole({ initialUser, authSource }: AdminOperatorConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [data, setData] = useState<any | null>(null)
  const [systemStats, setSystemStats] = useState<AdminSystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<AdminRecentChat | null>(null)
  const [selectedDuel, setSelectedDuel] = useState<AdminJingDuel | null>(null)
  const [leveling, setLeveling] = useState<AdminLevelingSummary | null>(null)
  const [levelingLoading, setLevelingLoading] = useState(false)
  const [scrabble, setScrabble] = useState<any | null>(null)
  const [scrabbleLoading, setScrabbleLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (response.status === 401 || response.status === 403) {
        setAuthError(payload?.error || 'Admin privileges required')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || `Dashboard API returned ${response.status}`)
      }

      setData(payload)
      setError(null)
      setAuthError(null)
      setLastUpdated(new Date().toISOString())
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error ? dashboardError.message : 'Failed to load dashboard'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchSystemStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/admin/system-stats?timeRange=24', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (response.ok && payload?.success) {
        setSystemStats(payload.systemStats as AdminSystemStats)
      }
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const interval = window.setInterval(fetchDashboard, 30000)
    return () => window.clearInterval(interval)
  }, [fetchDashboard])

  const fetchLeveling = useCallback(async () => {
    setLevelingLoading(true)
    try {
      const response = await fetch('/api/admin/leveling-summary', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.success) setLeveling(payload as AdminLevelingSummary)
    } finally {
      setLevelingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'infrastructure' && !systemStats && !statsLoading) {
      fetchSystemStats()
    }
  }, [activeTab, fetchSystemStats, statsLoading, systemStats])

  useEffect(() => {
    if (activeTab === 'leveling' && !leveling && !levelingLoading) {
      fetchLeveling()
    }
  }, [activeTab, fetchLeveling, leveling, levelingLoading])

  const fetchScrabble = useCallback(async () => {
    setScrabbleLoading(true)
    try {
      const response = await fetch('/api/admin/scrabble-standings', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.success) setScrabble(payload)
    } finally {
      setScrabbleLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'scrabble' && !scrabble && !scrabbleLoading) {
      fetchScrabble()
    }
  }, [activeTab, fetchScrabble, scrabble, scrabbleLoading])

  const totalAgents = data
    ? data.agents.historical + data.agents.planetary + data.agents.created
    : 0
  const healthChecks = useMemo(() => {
    if (!data) return []

    return [
      data.system.database === 'healthy',
      data.system.railwayBackend === 'healthy',
      data.system.aiProviders.openai,
      data.system.aiProviders.anthropic,
      data.system.aiProviders.google,
      data.system.aiProviders.gateway,
    ]
  }, [data])
  const healthScore =
    healthChecks.length > 0
      ? Math.round((healthChecks.filter(Boolean).length / healthChecks.length) * 100)
      : 0
  const degraded = data ? healthScore < 75 : false
  const productionUrl = data?.system.vercelDeployment.url?.startsWith('http')
    ? data.system.vercelDeployment.url
    : 'https://agents.alchm.kitchen'

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100 select-none">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 p-7 backdrop-blur-lg">
          <Lock className="h-9 w-9 text-rose-400" />
          <h1 className="mt-4 text-2xl font-black tracking-tight">Admin Console Locked</h1>
          <p className="mt-2 text-sm text-zinc-400">{authError}</p>
          <Link
            href="/auth/signin?callbackUrl=/admin"
            className="mt-6 inline-flex rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-200 active:scale-95 duration-200"
          >
            Sign in again
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 select-none">
      <div className="mx-auto flex max-w-[1550px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Glowing Headlights */}
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/5 pb-6">
          <div>
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={degraded ? 'warn' : data ? 'healthy' : 'unknown'}
                label={data ? `${healthScore}% field health` : 'loading'}
              />
              <span className="h-1.5 w-1.5 rounded-full bg-white/20 shrink-0" />
              <StatusBadge status="healthy" label={authSource.replace(/-/g, ' ')} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-50 uppercase tracking-widest bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Operator Console
            </h1>
            <p className="mt-1 text-xs text-zinc-500 font-bold">
              {initialUser.email || initialUser.name || initialUser.id} · agents.alchm.kitchen
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <QuickLink href={productionUrl} icon={Cloud} label="Production" external />
            <QuickLink href="/api/health" icon={Gauge} label="Health API" />
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-bold text-zinc-300 transition duration-300 hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4 shrink-0', refreshing && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200 backdrop-blur-md animate-pulse">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
              API Synchronization Failure
            </div>
            <p className="mt-2 text-xs text-amber-100/75 leading-relaxed font-mono">{error}</p>
          </div>
        )}

        {/* Sidebar + Main Command Rail Grid */}
        <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
          {/* Glassmorphic Navigation Bar */}
          <nav className="h-fit rounded-2xl border border-white/5 bg-zinc-900/20 p-2 backdrop-blur-md lg:sticky lg:top-4 select-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider transition-all duration-300',
                  activeTab === tab.id
                    ? 'bg-zinc-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]'
                    : 'text-zinc-450 hover:bg-white/[0.04] hover:text-zinc-100'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <tab.icon className="h-4.5 w-4.5 shrink-0" />
                  {tab.label}
                </span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-300',
                    activeTab === tab.id ? 'translate-x-0.5' : 'text-zinc-600'
                  )}
                />
              </button>
            ))}
          </nav>

          {/* Main Display Pane */}
          <section className="min-w-0">
            {loading && !data ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md"
                  />
                ))}
              </div>
            ) : data ? (
              <>
                {/* 1. OVERVIEW PANEL */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Alchemical Harmony Metaphysical header card */}
                    <CosmicTelemetryPanel data={data} />

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricPanel
                        icon={Users}
                        label="Users Registry"
                        value={formatNumber(data.users.total)}
                        detail={`+${data.users.newToday} today`}
                        tone="sky"
                      />
                      <MetricPanel
                        icon={Bot}
                        label="Roster Size"
                        value={formatNumber(totalAgents)}
                        detail={`${data.agents.historical} hist · ${data.agents.created} created`}
                        tone="amber"
                      />
                      <MetricPanel
                        icon={BrainCircuit}
                        label="Council Chats"
                        value={formatNumber(data.agents.totalConversations)}
                        detail="Total conversations run"
                        tone="emerald"
                      />
                      <MetricPanel
                        icon={ShieldCheck}
                        label="Service Integrity"
                        value={`${healthScore}%`}
                        detail={`${healthChecks.filter(Boolean).length}/${healthChecks.length} diagnostics green`}
                        tone={degraded ? 'rose' : 'emerald'}
                      />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <Panel title="Metaphysical Activity Feed" icon={Activity}>
                        {data.recentActivity.length === 0 ? (
                          <EmptyState label="No recent events resolved" />
                        ) : (
                          <div className="divide-y divide-white/5">
                            {data.recentActivity.slice(0, 8).map((activity: any) => (
                              <div
                                key={`${activity.type}-${activity.timestamp}`}
                                className="grid gap-2 py-3.5 sm:grid-cols-[1fr_auto]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-zinc-250">
                                    {activity.description}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-555 font-bold font-mono">
                                    {formatDate(activity.timestamp)}
                                  </p>
                                </div>
                                <span className="h-fit rounded-md border border-white/5 bg-zinc-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 capitalize">
                                  {activity.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Panel>

                      <Panel title="Roster Popularity Index" icon={Bot}>
                        {data.topAgents.length === 0 ? (
                          <EmptyState label="Roster popularity index is currently empty" />
                        ) : (
                          <div className="space-y-4">
                            {data.topAgents.map((agent: any, index: number) => {
                              const max = Math.max(
                                ...data.topAgents.map((item: any) => item.interactions),
                                1
                              )
                              const width = Math.round((agent.interactions / max) * 100)

                              return (
                                <div key={agent.id} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="truncate font-bold text-zinc-300">
                                      {index + 1}. {agent.name}
                                    </span>
                                    <span className="font-mono text-zinc-500 font-bold bg-zinc-800 border border-white/5 px-2 py-0.5 rounded text-[10px]">
                                      {formatNumber(agent.interactions)} runs
                                    </span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-zinc-850">
                                    <div
                                      className="h-full rounded-full bg-sky-400"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Panel>
                    </div>
                  </div>
                )}

                {/* 2. USERS REGISTRY PANEL */}
                {activeTab === 'users' && (
                  <Panel title="Shared Users Registry" icon={UserCog}>
                    {data.users.recent.length === 0 ? (
                      <EmptyState label="No users registered in this system" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-xs">
                          <thead className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800 font-extrabold">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">User Entity</th>
                              <th className="px-4 py-3 text-left font-semibold">Access Role</th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Verification Timestamp
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">Identity UUID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {data.users.recent.map((user: any) => (
                              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="font-bold text-zinc-200">
                                    {user.name || 'Unnamed Alchemist'}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={cn(
                                      'rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase border',
                                      user.role === 'admin'
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                        : 'border-zinc-800 bg-zinc-900 text-zinc-450'
                                    )}
                                  >
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-450 font-bold font-mono">
                                  {formatDate(user.createdAt)}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-555 select-text">
                                  {user.id}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                )}

                {/* 3. AGENTS METRICS PANEL */}
                {activeTab === 'agents' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <MetricPanel
                        icon={BriefcaseBusiness}
                        label="Historical Entities"
                        value={formatNumber(data.agents.historical)}
                        tone="sky"
                      />
                      <MetricPanel
                        icon={Cloud}
                        label="Planetary Archetypes"
                        value={formatNumber(data.agents.planetary)}
                        tone="emerald"
                      />
                      <MetricPanel
                        icon={Bot}
                        label="User Created Entities"
                        value={formatNumber(data.agents.created)}
                        tone="amber"
                      />
                    </div>
                    <Panel title="Roster Telemetry Graphs" icon={Activity}>
                      <div className="rounded-2xl border border-white/5 bg-zinc-950 p-4">
                        <PerformanceDashboard />
                      </div>
                    </Panel>
                  </div>
                )}

                {/* 4. CHAT STATUS PANEL */}
                {activeTab === 'chats' && (
                  <Panel title="Live Agent Chat Status Feed" icon={TerminalSquare}>
                    {!data.recentChats || data.recentChats.length === 0 ? (
                      <EmptyState label="No agent chats resolved" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-xs">
                          <thead className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800 font-extrabold">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Agent Entity</th>
                              <th className="px-4 py-3 text-left font-semibold">User Query</th>
                              <th className="px-4 py-3 text-left font-semibold">Agent Response</th>
                              <th className="px-4 py-3 text-left font-semibold">Provider Lane</th>
                              <th className="px-4 py-3 text-left font-semibold">Latency</th>
                              <th className="px-4 py-3 text-left font-semibold">Verdict</th>
                              <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {data.recentChats.map((chat: any) => {
                              const isSuccess =
                                chat.agentResponse &&
                                !chat.agentResponse.includes('[All providers unavailable]')
                              const latency = chat.responseTime ? `${chat.responseTime}ms` : 'n/a'

                              return (
                                <tr
                                  key={chat.id}
                                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                  onClick={() => setSelectedChat(chat)}
                                >
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-zinc-200 group-hover:text-sky-350 transition-colors">
                                      {chat.agentName}
                                    </div>
                                    <div
                                      className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[150px]"
                                      title={chat.agentId}
                                    >
                                      {chat.agentId}
                                    </div>
                                  </td>
                                  <td
                                    className="px-4 py-3.5 max-w-[200px] truncate text-zinc-300 font-semibold"
                                    title={chat.userMessage}
                                  >
                                    {chat.userMessage}
                                  </td>
                                  <td
                                    className="px-4 py-3.5 max-w-[250px] truncate text-zinc-450"
                                    title={chat.agentResponse}
                                  >
                                    {chat.agentResponse}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-400">
                                    {chat.modelUsed || 'n/a'}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-zinc-300 font-semibold">
                                    {latency}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span
                                      className={cn(
                                        'rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase border tracking-wider',
                                        isSuccess
                                          ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                          : 'border-rose-500/25 bg-rose-500/5 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.05)]'
                                      )}
                                    >
                                      {isSuccess ? 'Success' : 'Failed'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-zinc-500 text-[10px] whitespace-nowrap font-medium">
                                    {formatDate(chat.createdAt)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                )}

                {/* 5. MCP INVOCATIONS PANEL */}
                {activeTab === 'mcp' && <McpInvocationsPanel data={data.mcp} />}

                {/* 6. COUNCIL CONVENINGS PANEL */}
                {activeTab === 'groupChats' && <GroupChatSessionsPanel data={data.groupChats} />}

                {/* 7. JING ARENA PANEL */}
                {activeTab === 'jing' && (
                  <JingArenaPanel data={data} onSelectDuel={setSelectedDuel} />
                )}

                {/* 8. COSMIC LEVELING PANEL */}
                {activeTab === 'leveling' && (
                  <CosmicLevelingPanel leveling={leveling} loading={levelingLoading} />
                )}

                {/* AGENT SCRABBLE LEAGUE PANEL */}
                {activeTab === 'scrabble' && (
                  <ScrabbleLeaguePanel data={scrabble} loading={scrabbleLoading} />
                )}

                {/* 9. RAG / KNOWLEDGE PANEL */}
                {activeTab === 'rag' && <RagKnowledgePanel productionUrl={productionUrl} />}

                {/* WEB3 INTEGRATION PANEL */}
                {activeTab === 'web3' && <Web3TelemetryPanel />}

                {/* 10. INFRASTRUCTURE PANEL */}
                {activeTab === 'infrastructure' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricPanel
                        icon={Database}
                        label="Database Cluster"
                        value={data.system.database}
                        tone={data.system.database === 'healthy' ? 'emerald' : 'rose'}
                      />
                      <MetricPanel
                        icon={Server}
                        label="Railway Core"
                        value={data.system.railwayBackend}
                        tone={data.system.railwayBackend === 'healthy' ? 'emerald' : 'amber'}
                      />
                      <MetricPanel
                        icon={Cloud}
                        label="AI Gateway"
                        value={data.system.aiProviders.gateway ? 'Active' : 'Offline'}
                        tone={data.system.aiProviders.gateway ? 'emerald' : 'amber'}
                      />
                      <MetricPanel
                        icon={Gauge}
                        label="Memory RSS Usage"
                        value={
                          systemStats
                            ? `${systemStats.performance.systemMetrics.memoryUsage.rss} MB`
                            : statsLoading
                              ? 'calculating'
                              : 'n/a'
                        }
                        tone="sky"
                      />
                    </div>

                    <Panel
                      title="AI Provider Routing matrix"
                      icon={ShieldCheck}
                      action={
                        <button
                          type="button"
                          onClick={fetchSystemStats}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.04] transition duration-200"
                        >
                          <RefreshCw
                            className={cn('h-3.5 w-3.5 shrink-0', statsLoading && 'animate-spin')}
                          />
                          <span>Sync stats</span>
                        </button>
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(data.system.aiProviders).map(([provider, enabled]) => (
                          <div
                            key={provider}
                            className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-950/40 px-4 py-3"
                          >
                            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-bold">
                              {provider}
                            </span>
                            <StatusBadge
                              status={healthLabel(enabled as boolean)}
                              label={enabled ? 'live' : 'off'}
                            />
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Execution Telemetry Panel" icon={Gauge}>
                      <PerformanceDashboard />
                    </Panel>
                  </div>
                )}

                {/* 11. DEPLOYMENTS PANEL */}
                {activeTab === 'deployments' && (
                  <div className="space-y-6">
                    <Panel title="Production Deployment registry" icon={Cloud}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
                          <p className="text-[10px] uppercase font-bold tracking-[0.14em] text-zinc-500">
                            Domain Alias
                          </p>
                          <a
                            href="https://agents.alchm.kitchen"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-350 transition-colors"
                          >
                            agents.alchm.kitchen <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
                          <p className="text-[10px] uppercase font-bold tracking-[0.14em] text-zinc-500">
                            Vercel deployment
                          </p>
                          <p className="mt-2 break-all font-mono text-xs text-zinc-300 select-text">
                            {data.system.vercelDeployment.url}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
                          <p className="text-[10px] uppercase font-bold tracking-[0.14em] text-zinc-500">
                            Git Commit SHA
                          </p>
                          <p className="mt-2 font-mono text-xs text-zinc-350 select-text font-bold">
                            {data.system.vercelDeployment.commitSha || 'n/a'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
                          <p className="text-[10px] uppercase font-bold tracking-[0.14em] text-zinc-500">
                            Deploy Timestamp
                          </p>
                          <p className="mt-2 text-xs text-zinc-300 font-bold font-mono">
                            {formatDate(data.system.vercelDeployment.lastDeploy)}
                          </p>
                        </div>
                      </div>
                    </Panel>
                  </div>
                )}

                {/* 12. BATCH JOBS PANEL */}
                {activeTab === 'jobs' && (
                  <Panel title="Running Batch Jobs" icon={Workflow}>
                    <BatchProcessingDashboard embedded />
                  </Panel>
                )}

                {/* 13. DESKTOP COMPANION PANEL */}
                {activeTab === 'desktop' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricPanel
                        icon={Monitor}
                        label="Tauri Companion Release"
                        value="GitHub v1.0.4"
                        detail="alchm-agents-app"
                        tone="sky"
                      />
                      <MetricPanel
                        icon={HardDrive}
                        label="Model Sandboxed Cache"
                        value="Synced"
                        detail="$APPDATA/models"
                        tone="emerald"
                      />
                      <MetricPanel
                        icon={ShieldCheck}
                        label="Sidecar IPC Handshake"
                        value="Nonce Gated"
                        detail="X-IPC-Nonce active"
                        tone="amber"
                      />
                    </div>

                    <Panel title="Desktop downloads and model API gates" icon={Monitor}>
                      <div className="flex flex-wrap gap-3">
                        <QuickLink
                          href={DESKTOP_APP_DOWNLOAD_URL}
                          icon={ExternalLink}
                          label={ALCHM_DESKTOP_DOWNLOAD_LABEL}
                          external
                        />
                        <QuickLink
                          href="/api/models/catalog"
                          icon={Database}
                          label="Model Catalog API"
                        />
                      </div>
                    </Panel>
                  </div>
                )}
              </>
            ) : (
              <EmptyState label="Unable to resolve administrative telemetry data" />
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-5 text-[10px] text-zinc-555 font-mono font-bold select-none">
          <span>Telemetry updated: {lastUpdated ? formatDate(lastUpdated) : 'n/a'}</span>
          <span>Visibility Polling Rate: 30s</span>
        </footer>

        {/* Chat Telemetry Detail Modal */}
        {selectedChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-2xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-md">
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2 uppercase tracking-wider text-sm">
                    <TerminalSquare className="w-5 h-5 text-sky-400 animate-pulse" />
                    Interaction details ledger
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                    Agent:{' '}
                    <span className="font-semibold text-zinc-300">{selectedChat.agentName}</span>
                    <span className="text-zinc-600 font-mono">({selectedChat.agentId})</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs select-text">
                {/* Status & Latency Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/40 p-4 border border-white/5 rounded-xl font-mono text-[10px] font-bold">
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Verdict
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        selectedChat.agentResponse &&
                          !selectedChat.agentResponse.includes('[All providers unavailable]')
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      )}
                    >
                      {selectedChat.agentResponse &&
                      !selectedChat.agentResponse.includes('[All providers unavailable]')
                        ? 'SUCCESS'
                        : 'FAILED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Latency
                    </span>
                    <span className="text-zinc-300 font-bold">
                      {selectedChat.responseTime ? `${selectedChat.responseTime}ms` : 'n/a'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Provider Model
                    </span>
                    <span className="text-zinc-300 font-bold">
                      {selectedChat.modelUsed || 'n/a'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Timestamp
                    </span>
                    <span className="text-zinc-300">
                      {new Date(selectedChat.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* User Message */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    User Input Query
                  </h4>
                  <div className="bg-zinc-950/60 border border-white/5 p-4 rounded-xl text-zinc-200 whitespace-pre-wrap select-text leading-relaxed font-mono">
                    {selectedChat.userMessage}
                  </div>
                </div>

                {/* Agent Response */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Agent Output Response
                  </h4>
                  <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl text-zinc-300 whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto leading-relaxed">
                    {selectedChat.agentResponse}
                  </div>
                </div>

                {/* Session Identification */}
                <div className="pt-3 text-[10px] font-mono text-zinc-500 flex justify-between border-t border-white/5">
                  <span>Session: {selectedChat.sessionId}</span>
                  <span>ID: {selectedChat.id}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-zinc-900/40 flex justify-end">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-100 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                >
                  Close details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jing Duel Detail Modal */}
        {selectedDuel && (
          <JingDuelModal duel={selectedDuel} onClose={() => setSelectedDuel(null)} />
        )}
      </div>
    </main>
  )
}

function JingDuelModal({ duel, onClose }: { duel: AdminJingDuel; onClose: () => void }) {
  const synastry = duel.synastrySnapshot as {
    pair?: { agentA?: string; agentB?: string; cacheHit?: boolean }
    scores?: {
      tension?: number
      harmony?: number
      intensification?: number
      aspectCount?: number
    }
    dominantStance?: string
    interchartAspects?: Array<{
      planetA: string
      planetB: string
      type: string
      orb: number
      exactness: number
      harmonic: string
    }>
  } | null
  const casterTransit = duel.casterTransitSnapshot as {
    summary?: string
    boostElement?: string | null
    boostMagnitude?: number
    stressNotes?: string[]
    activations?: Array<{
      transitPlanet: string
      natalPoint: string
      type: string
      orb: number
      exactness: number
      natalElement: string
      valence: string
    }>
  } | null
  const targetTransit = duel.targetTransitSnapshot as typeof casterTransit
  const stanceTone: Record<string, string> = {
    clash: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    absorb: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    mirror: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  }
  const boostPct = Math.round(duel.boostMagnitude * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-4xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-md">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2 uppercase tracking-wider text-sm">
              <Swords className="w-5 h-5 text-fuchsia-400 animate-pulse" />
              Conflict Duel Ledger
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-zinc-200">{duel.casterName}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
              <span className="font-semibold text-zinc-200">{duel.targetName}</span>
              <span className="text-zinc-500 font-bold">·</span>
              <span className="font-mono text-zinc-400 font-bold">
                {duel.attackMoveId} → {duel.counterMoveId}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs select-text">
          {/* Headline cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/40 p-4 border border-white/5 rounded-xl font-mono text-[10px] font-bold">
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                Stance
              </span>
              <span
                className={cn(
                  'inline-block mt-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase border tracking-wider capitalize',
                  stanceTone[duel.stance] || 'border-zinc-700 bg-zinc-800 text-zinc-300'
                )}
              >
                {duel.stance}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                Boost Magnitude
              </span>
              <span className="text-zinc-300 font-bold mt-1 block">
                {duel.boostElement ? `${boostPct}% ${duel.boostElement}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                Resolution time
              </span>
              <span className="text-zinc-300 font-bold mt-1 block">
                {duel.latencyMs ? `${duel.latencyMs}ms` : 'n/a'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                Metaphysical Cache
              </span>
              <span
                className={cn(
                  'font-bold mt-1 block',
                  duel.cacheHit ? 'text-emerald-400' : 'text-zinc-500'
                )}
              >
                {duel.cacheHit ? 'HIT' : 'MISS'}
              </span>
            </div>
          </div>

          {/* Synastry summary */}
          {synastry && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Pair Synastry Harmonics
              </h4>
              <div className="bg-zinc-950/60 border border-white/5 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-3 gap-3 text-[10px] font-mono font-bold">
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Tension
                    </span>
                    <span className="text-rose-400">
                      {synastry.scores?.tension?.toFixed(2) ?? '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Harmony
                    </span>
                    <span className="text-sky-400">
                      {synastry.scores?.harmony?.toFixed(2) ?? '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase tracking-wider text-[9px]">
                      Intensification
                    </span>
                    <span className="text-fuchsia-400">
                      {synastry.scores?.intensification?.toFixed(2) ?? '0.00'}
                    </span>
                  </div>
                </div>
                {synastry.interchartAspects && synastry.interchartAspects.length > 0 && (
                  <ul className="space-y-1.5 text-[10px] font-mono text-zinc-350 pt-3 border-t border-white/5">
                    {synastry.interchartAspects.slice(0, 6).map((a, i) => (
                      <li key={i} className="flex justify-between">
                        <span>
                          {duel.casterName.split(' ')[0]} {a.planetA}{' '}
                          <span
                            className={cn(
                              'mx-1 font-bold',
                              a.harmonic === 'friction'
                                ? 'text-rose-400 bg-rose-500/5 px-1 rounded border border-rose-500/10'
                                : a.harmonic === 'harmony'
                                  ? 'text-sky-400 bg-sky-500/5 px-1 rounded border border-sky-500/10'
                                  : 'text-fuchsia-400 bg-fuchsia-500/5 px-1 rounded border border-fuchsia-500/10'
                            )}
                          >
                            {a.type}
                          </span>
                          {duel.targetName.split(' ')[0]} {a.planetB}
                        </span>
                        <span className="text-zinc-555 font-bold">{a.orb.toFixed(1)}° orb</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Per-agent transit overlays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: duel.casterName, overlay: casterTransit, role: 'Initiator (Caster)' },
              {
                label: duel.targetName,
                overlay: defenderTransit(duel, targetTransit),
                role: 'Defender (Target)',
              },
            ].map((entry, i) => (
              <div
                key={i}
                className="bg-zinc-950/60 border border-white/5 p-4 rounded-xl space-y-2.5"
              >
                <div className="flex justify-between items-baseline border-b border-white/5 pb-2">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    {entry.role} Transit
                  </h4>
                  <span className="text-xs text-zinc-350 font-bold">{entry.label}</span>
                </div>
                {entry.overlay ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-300 italic leading-relaxed">
                      {entry.overlay.summary || 'No summary'}
                    </p>
                    {entry.overlay.activations && entry.overlay.activations.length > 0 && (
                      <ul className="space-y-1 text-[10px] font-mono text-zinc-450 pt-1 leading-relaxed">
                        {entry.overlay.activations.slice(0, 4).map((a: any, j: number) => (
                          <li key={j}>
                            transit {a.transitPlanet} {a.type} natal {a.natalPoint}{' '}
                            <span className="text-zinc-555">({a.orb.toFixed(1)}°)</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {entry.overlay.stressNotes && entry.overlay.stressNotes.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        {entry.overlay.stressNotes.map((note: string, k: number) => (
                          <p key={k} className="text-[10px] text-rose-300/80 font-bold font-mono">
                            ⚠ {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-555 italic font-medium">No transit captured</p>
                )}
              </div>
            ))}
          </div>

          {/* Prompts + Responses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Caster Input Prompt
              </h4>
              <div className="bg-zinc-950/60 border border-white/5 p-4 rounded-xl text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed select-text">
                {duel.casterPrompt || <span className="text-zinc-650 italic">not captured</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Caster Output Response
              </h4>
              <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl text-xs text-zinc-200 whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed select-text">
                {duel.casterResponse || <span className="text-zinc-650 italic">not captured</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Target Input Prompt
              </h4>
              <div className="bg-zinc-950/60 border border-white/5 p-4 rounded-xl text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed select-text">
                {duel.targetPrompt || <span className="text-zinc-650 italic">not captured</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Target Output Response
              </h4>
              <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl text-xs text-zinc-200 whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed select-text">
                {duel.targetResponse || <span className="text-zinc-650 italic">not captured</span>}
              </div>
            </div>
          </div>

          {/* Footer ids */}
          <div className="pt-3 text-[10px] font-mono text-zinc-500 flex justify-between border-t border-white/5">
            <span>Session: {duel.sessionId}</span>
            <span>ID: {duel.id}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 transition-all duration-200 text-zinc-100 rounded-xl text-[10px] font-bold uppercase tracking-wider"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  )
}

// Helpers
function defenderTransit(duel: AdminJingDuel, snapshot: any) {
  // If targetTransitSnapshot is empty, fall back to targetTransitSnapshot fields
  if (snapshot) return snapshot
  return (duel as any).targetTransitSnapshot || null
}
