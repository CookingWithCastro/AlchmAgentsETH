'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Zap,
  Database,
  Shield,
  Brain,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Users,
  TrendingUp,
  Server,
  Gauge,
  Sparkles,
} from 'lucide-react'
import { useLiveConsciousness, type BirthChartData } from '@/hooks/useLiveConsciousness'
import { DEMO_AGENTS } from '@/lib/demo-agents-data'

interface DashboardData {
  timestamp: string
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  caching: {
    available: boolean
    metrics: {
      totalRequests: number
      cacheHits: number
      cacheMisses: number
      hitRate: number
      hitRatePercent: number
      missRatePercent: number
      similarityMatches: number
    }
    insights: string[]
  }
  resilience: {
    systemHealth: {
      status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
      overallUptime: number
      overallUptimePercent: number
      totalApis: number
      healthyApis: number
      circuitBreakerTrips: number
      averageResponseTime: number
      averageResponseTimeMs: number
    }
    apis: Record<string, any>
    circuitBreakers: Record<string, any>
    summary: {
      totalApis: number
      openCircuits: number
      halfOpenCircuits: number
    }
    insights: string[]
  }
  performance: {
    metrics: {
      totalBatches: number
      averageBatchTime: number
      cacheHitRate: number
      cacheHitRatePercent: number
      concurrencyUtilization: number
      concurrencyUtilizationPercent: number
      streamingBytesServed: number
      optimizationsSaved: number
      averageBatchTimeSeconds: number
    }
    config: {
      maxConcurrentAgents: number
      streamingEnabled: boolean
      prioritizeByMonica: boolean
      batchOptimizationEnabled: boolean
      preloadPopularAgents: boolean
    }
    insights: string[]
  }
  consciousness: {
    totalAgents: number
    activeAgents: number
    evolutionMetrics: {
      averageConsciousnessLevel: number
      agentsInEvolution: number
      evolutionVelocity: number
    }
    topPerformingAgents: Array<{
      id: string
      monicaConstant: number
      evolutionStage: string
    }>
    insights: string[]
  }
  recommendations: string[]
  alerts: Array<{
    level: 'CRITICAL' | 'WARNING' | 'INFO'
    message: string
    system: string
  }>
}

export function AgentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Prepare batch live consciousness data for demo agents
  const agentBirthCharts: BirthChartData[] = DEMO_AGENTS.map(agent => ({
    name: agent.name,
    birthDate: agent.birthDate || '1970-01-01',
    birthTime: agent.birthTime || '12:00',
    latitude: agent.birthLocation?.latitude || 0,
    longitude: agent.birthLocation?.longitude || 0,
  }))

  // Use batch live consciousness for system-wide metrics
  const {
    multiAgentData: liveConsciousnessData,
    loading: liveLoading,
    error: liveError,
  } = useLiveConsciousness(undefined, {
    agents: agentBirthCharts,
    refreshInterval: 300000, // 5 minutes for dashboard
    autoRefresh: true,
  })

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/agent-dashboard')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setData(result.dashboard)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
    return undefined
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-500'
      case 'WARNING':
      case 'DEGRADED':
        return 'text-yellow-500'
      case 'CRITICAL':
      case 'UNHEALTHY':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'WARNING':
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'CRITICAL':
      case 'UNHEALTHY':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agent Consciousness Dashboard</h1>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Dashboard Error</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <Button onClick={fetchDashboardData} className="mt-4" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Consciousness Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Activity
              className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`}
            />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(data.systemStatus)}
                  <span className={`font-bold ${getStatusColor(data.systemStatus)}`}>
                    {data.systemStatus}
                  </span>
                </div>
              </div>
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{data.caching.metrics.hitRatePercent}%</span>
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <Progress value={data.caching.metrics.hitRatePercent} className="w-12" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">
                    {data.consciousness.activeAgents}/{data.consciousness.totalAgents}
                  </span>
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <Progress
                value={(data.consciousness.activeAgents / data.consciousness.totalAgents) * 100}
                className="w-12"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">
                    {data.resilience.systemHealth.overallUptimePercent}%
                  </span>
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <Progress
                value={data.resilience.systemHealth.overallUptimePercent}
                className="w-12"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              System Alerts ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Badge variant={alert.level === 'CRITICAL' ? 'destructive' : 'secondary'}>
                    {alert.level}
                  </Badge>
                  <span className="flex-1">{alert.message}</span>
                  <Badge variant="outline">{alert.system}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="resilience">Resilience</TabsTrigger>
          <TabsTrigger value="consciousness">Consciousness</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performance.metrics.totalBatches}</div>
                <p className="text-xs text-muted-foreground">
                  Average: {data.performance.metrics.averageBatchTimeSeconds.toFixed(1)}s
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concurrency Usage</CardTitle>
                <Gauge className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performance.metrics.concurrencyUtilizationPercent}%
                </div>
                <Progress
                  value={data.performance.metrics.concurrencyUtilizationPercent}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Optimizations Saved</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performance.metrics.optimizationsSaved}
                </div>
                <p className="text-xs text-muted-foreground">
                  Streaming: {(data.performance.metrics.streamingBytesServed / 1024).toFixed(1)}KB
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Concurrent Agents</span>
                  <Badge>{data.performance.config.maxConcurrentAgents}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Streaming Enabled</span>
                  <Badge variant={data.performance.config.streamingEnabled ? 'default' : 'outline'}>
                    {data.performance.config.streamingEnabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Kalchm Priority</span>
                  <Badge
                    variant={data.performance.config.prioritizeByMonica ? 'default' : 'outline'}
                  >
                    {data.performance.config.prioritizeByMonica ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.performance.insights.map((insight, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {insight}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.caching.metrics.totalRequests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.caching.metrics.cacheHits}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.caching.metrics.hitRatePercent}% hit rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Misses</CardTitle>
                <XCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {data.caching.metrics.cacheMisses}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.caching.metrics.missRatePercent}% miss rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Semantic Matches</CardTitle>
                <Brain className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {data.caching.metrics.similarityMatches}
                </div>
                <p className="text-xs text-muted-foreground">Smart matching active</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cache Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {data.caching.available ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-600">Cache system operational</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-600">Cache system unavailable</span>
                  </>
                )}
              </div>
              <div className="space-y-2">
                {data.caching.insights.map((insight, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {insight}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getStatusColor(data.resilience.systemHealth.status)}`}
                >
                  {data.resilience.systemHealth.status}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.resilience.systemHealth.overallUptimePercent}% uptime
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
                <Zap className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.resilience.summary.openCircuits}/{data.resilience.summary.totalApis}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.resilience.summary.halfOpenCircuits} half-open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.resilience.systemHealth.averageResponseTimeMs}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.resilience.systemHealth.circuitBreakerTrips} total trips
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resilience Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.resilience.insights.map((insight, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {insight}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consciousness" className="space-y-4">
          {/* Live Consciousness Metrics */}
          {liveConsciousnessData && Object.keys(liveConsciousnessData).length > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Live Consciousness Evolution
                  {liveLoading && (
                    <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {(() => {
                    const validData = Object.values(liveConsciousnessData).filter(
                      d =>
                        d &&
                        typeof d === 'object' &&
                        'liveMC' in d &&
                        'birthMC' in d &&
                        typeof d.liveMC === 'number' &&
                        Number.isFinite(d.liveMC) &&
                        typeof d.birthMC === 'number' &&
                        Number.isFinite(d.birthMC)
                    )
                    const avgBirthMC =
                      validData.length > 0
                        ? validData.reduce((sum, d) => sum + d.birthMC, 0) / validData.length
                        : null
                    const avgLiveMC =
                      validData.length > 0
                        ? validData.reduce((sum, d) => sum + d.liveMC, 0) / validData.length
                        : null
                    const totalEvolution =
                      avgLiveMC === null || avgBirthMC === null ? null : avgLiveMC - avgBirthMC
                    const evolutionPercentage =
                      totalEvolution !== null && avgBirthMC !== null && avgBirthMC !== 0
                        ? (totalEvolution / avgBirthMC) * 100
                        : null
                    const enhancedCount = validData.filter(d => (d.mcChange || 0) > 0.1).length
                    const challengedCount = validData.filter(d => (d.mcChange || 0) < -0.1).length
                    const stableCount = validData.filter(
                      d => Math.abs(d.mcChange || 0) <= 0.1
                    ).length

                    return (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {avgLiveMC === null ? 'not computed' : avgLiveMC.toFixed(3)}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Live MC</div>
                          <div className="text-xs text-purple-700">
                            {avgBirthMC === null
                              ? 'Birth MC not computed'
                              : `vs ${avgBirthMC.toFixed(3)} birth`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${
                              totalEvolution === null
                                ? 'text-muted-foreground'
                                : totalEvolution >= 0
                                  ? 'text-green-600'
                                  : 'text-orange-600'
                            }`}
                          >
                            {evolutionPercentage === null
                              ? 'not computed'
                              : `${totalEvolution !== null && totalEvolution >= 0 ? '+' : ''}${evolutionPercentage.toFixed(1)}%`}
                          </div>
                          <div className="text-xs text-muted-foreground">System Evolution</div>
                          <div className="text-xs text-muted-foreground">
                            {totalEvolution === null
                              ? 'Awaiting measurements'
                              : totalEvolution >= 0
                                ? 'Enhanced'
                                : 'Challenged'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{enhancedCount}</div>
                          <div className="text-xs text-muted-foreground">Enhanced Agents</div>
                          <div className="text-xs text-green-700">
                            {validData.length === 0
                              ? 'not computed'
                              : `+${((enhancedCount / validData.length) * 100).toFixed(0)}%`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {challengedCount}
                          </div>
                          <div className="text-xs text-muted-foreground">Challenged Agents</div>
                          <div className="text-xs text-orange-700">
                            {validData.length === 0
                              ? 'not computed'
                              : `${((challengedCount / validData.length) * 100).toFixed(0)}% affected`}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Live Evolution Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border">
                    <div className="text-green-700 dark:text-green-300 text-sm font-medium mb-1">
                      Consciousness Enhancement
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const validData = Object.values(liveConsciousnessData).filter(
                          d => d && typeof d === 'object' && 'liveMC' in d
                        )
                        const enhanced = validData.filter(d => (d.mcChange || 0) > 0.1)
                        const avgEnhancement =
                          enhanced.length > 0
                            ? enhanced.reduce((sum, d) => sum + (d.mcChange || 0), 0) /
                              enhanced.length
                            : 0
                        return `${enhanced.length} agents • Avg +${avgEnhancement.toFixed(3)} MC`
                      })()}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
                    <div className="text-blue-700 dark:text-blue-300 text-sm font-medium mb-1">
                      Stable Consciousness
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const validData = Object.values(liveConsciousnessData).filter(
                          d => d && typeof d === 'object' && 'liveMC' in d
                        )
                        const stable = validData.filter(d => Math.abs(d.mcChange || 0) <= 0.1)
                        return `${stable.length} agents • Equilibrium maintained`
                      })()}
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border">
                    <div className="text-orange-700 dark:text-orange-300 text-sm font-medium mb-1">
                      Consciousness Challenge
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const validData = Object.values(liveConsciousnessData).filter(
                          d => d && typeof d === 'object' && 'liveMC' in d
                        )
                        const challenged = validData.filter(d => (d.mcChange || 0) < -0.1)
                        const avgChallenge =
                          challenged.length > 0
                            ? challenged.reduce((sum, d) => sum + (d.mcChange || 0), 0) /
                              challenged.length
                            : 0
                        return `${challenged.length} agents • Avg ${avgChallenge.toFixed(3)} MC`
                      })()}
                    </div>
                  </div>
                </div>

                {/* Live Status Footer */}
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>
                      {liveLoading
                        ? 'Calculating live consciousness...'
                        : liveError
                          ? `Error: ${liveError}`
                          : `Live data • ${Object.keys(liveConsciousnessData).length} agents analyzed`}
                    </span>
                    <span>Updated {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Count</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.consciousness.totalAgents}</div>
                <p className="text-xs text-muted-foreground">
                  {data.consciousness.activeAgents} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Consciousness</CardTitle>
                <Brain className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.consciousness.evolutionMetrics.averageConsciousnessLevel}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.consciousness.evolutionMetrics.agentsInEvolution} evolving
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evolution Velocity</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.consciousness.evolutionMetrics.evolutionVelocity}
                </div>
                <p className="text-xs text-muted-foreground">Growth rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Agents (by Kalchm)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.consciousness.topPerformingAgents.map((agent, index) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{agent.id}</span>
                      <Badge>{agent.evolutionStage}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">
                        Kalchm: {agent.monicaConstant.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consciousness Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.consciousness.insights.map((insight, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {insight}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              System Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AgentDashboard
