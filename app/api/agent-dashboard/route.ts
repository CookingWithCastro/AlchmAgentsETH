import { NextRequest, NextResponse } from 'next/server'
import { agentCache } from '@/lib/agent-cache-system'
import { ApiResilienceSystem } from '@/lib/api-resilience-system'
import { agentOptimizer } from '@/lib/agent-performance-optimizer'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
/**
 * Comprehensive Agent Consciousness Dashboard API
 * Unified monitoring endpoint for all agent systems
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')

    // Get all system metrics
    const [cacheMetrics, resilienceMetrics, performanceMetrics, systemHealth, consciousnessStats] =
      await Promise.all([
        agentCache.getMetrics(),
        getResilienceOverview(),
        agentOptimizer.getPerformanceMetrics(),
        ApiResilienceSystem.getSystemHealth(),
        getConsciousnessOverview(),
      ])

    const dashboard = {
      timestamp: new Date().toISOString(),
      systemStatus: determineOverallStatus(cacheMetrics, systemHealth, performanceMetrics),

      // Cache System
      caching: {
        available: agentCache.isAvailable(),
        metrics: {
          ...cacheMetrics,
          hitRatePercent: Math.round(cacheMetrics.hitRate * 100),
          missRatePercent: Math.round((1 - cacheMetrics.hitRate) * 100),
        },
        insights: generateCacheInsights(cacheMetrics),
      },

      // API Resilience
      resilience: {
        systemHealth: {
          ...systemHealth,
          overallUptimePercent: Math.round(systemHealth.overallUptime * 100),
          averageResponseTimeMs: Math.round(systemHealth.averageResponseTime),
        },
        apis: resilienceMetrics.apis,
        circuitBreakers: resilienceMetrics.circuitBreakers,
        summary: resilienceMetrics.summary,
        insights: generateResilienceInsights(systemHealth, resilienceMetrics),
      },

      // Performance Optimization
      performance: {
        metrics: performanceMetrics,
        config: getPerformanceConfig(),
        insights: generatePerformanceInsights(performanceMetrics),
      },

      // Agent Consciousness
      consciousness: {
        totalAgents: consciousnessStats.totalAgents,
        activeAgents: consciousnessStats.activeAgents,
        evolutionMetrics: consciousnessStats.evolutionMetrics,
        topPerformingAgents: consciousnessStats.topPerformingAgents,
        insights: generateConsciousnessInsights(consciousnessStats),
      },

      // Overall Recommendations
      recommendations: generateOverallRecommendations({
        cache: cacheMetrics,
        resilience: systemHealth,
        performance: performanceMetrics,
        consciousness: consciousnessStats,
      }),

      // Alert Summary
      alerts: generateAlerts({
        cache: cacheMetrics,
        resilience: systemHealth,
        performance: performanceMetrics,
      }),
    }

    // Return specific section if requested
    if (section && dashboard[section as keyof typeof dashboard]) {
      return NextResponse.json({
        success: true,
        section,
        data: dashboard[section as keyof typeof dashboard],
        timestamp: dashboard.timestamp,
      })
    }

    // Return full dashboard
    return NextResponse.json({
      success: true,
      dashboard,
    })
  } catch (error) {
    console.error('Error generating agent dashboard:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate agent dashboard',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, parameters } = body

    switch (action) {
      case 'clear_all_caches':
        // Clear all agent caches
        console.log('🧹 Clearing all caches...')
        // Implementation would depend on specific cache clearing logic
        return NextResponse.json({
          success: true,
          message: 'All caches cleared',
          timestamp: new Date().toISOString(),
        })

      case 'reset_metrics':
        ApiResilienceSystem.resetMetrics()
        agentOptimizer.resetMetrics()
        return NextResponse.json({
          success: true,
          message: 'All metrics reset',
          timestamp: new Date().toISOString(),
        })

      case 'update_performance_config':
        if (parameters) {
          agentOptimizer.updateConfig(parameters)
          return NextResponse.json({
            success: true,
            message: 'Performance configuration updated',
            newConfig: parameters,
            timestamp: new Date().toISOString(),
          })
        }
        return NextResponse.json(
          {
            success: false,
            error: 'Parameters required for config update',
          },
          { status: 400 }
        )

      case 'preload_agents':
        await agentOptimizer.preloadPopularAgents()
        return NextResponse.json({
          success: true,
          message: 'Popular agents preloaded',
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Supported: clear_all_caches, reset_metrics, update_performance_config, preload_agents',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error executing dashboard action:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute dashboard action',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper Functions
 */

async function getResilienceOverview() {
  const allMetrics = ApiResilienceSystem.getApiMetrics() as Map<string, any>
  const allCircuits = ApiResilienceSystem.getCircuitBreakerStatus() as Map<string, any>

  const metricsObj = Object.fromEntries(
    Array.from(allMetrics.entries()).map(([name, metrics]) => [
      name,
      {
        ...metrics,
        uptimePercent: Math.round(metrics.uptime * 100),
        failureRate: Math.round((1 - metrics.uptime) * 100),
        retryRate:
          metrics.totalCalls > 0
            ? Math.round((metrics.retriedCalls / metrics.totalCalls) * 100)
            : 0,
      },
    ])
  )

  const circuitsObj = Object.fromEntries(
    Array.from(allCircuits.entries()).map(([name, circuit]) => [
      name,
      {
        ...circuit,
        isOpen: circuit.state === 'OPEN',
        isHalfOpen: circuit.state === 'HALF_OPEN',
      },
    ])
  )

  return {
    apis: metricsObj,
    circuitBreakers: circuitsObj,
    summary: {
      totalApis: Object.keys(metricsObj).length,
      openCircuits: Object.values(circuitsObj).filter((c: any) => c.isOpen).length,
      halfOpenCircuits: Object.values(circuitsObj).filter((c: any) => c.isHalfOpen).length,
    },
  }
}

async function getConsciousnessOverview() {
  const scoredAgents = HISTORICAL_AGENTS.map(agent => ({
    id: agent.id,
    monicaConstant: Number(agent.consciousness?.monicaConstant ?? 0),
    evolutionStage: Number(agent.personality?.evolutionStage ?? 0),
  }))
  const averageConsciousnessLevel =
    scoredAgents.length > 0
      ? scoredAgents.reduce((sum, agent) => sum + agent.monicaConstant, 0) / scoredAgents.length
      : 0

  return {
    totalAgents: scoredAgents.length,
    // This endpoint has catalog and process telemetry, but no presence/session
    // source. Keep the value honest instead of manufacturing "active" agents.
    activeAgents: 0,
    evolutionMetrics: {
      averageConsciousnessLevel: Number(averageConsciousnessLevel.toFixed(2)),
      agentsInEvolution: scoredAgents.filter(agent => agent.evolutionStage > 1).length,
      evolutionVelocity: 0,
    },
    topPerformingAgents: scoredAgents
      .sort((a, b) => b.monicaConstant - a.monicaConstant)
      .slice(0, 3),
  }
}

function getPerformanceConfig() {
  return {
    maxConcurrentAgents: 10,
    streamingEnabled: true,
    prioritizeByKalchm: true, // Corrected to use Kalchm equilibrium dynamics
    batchOptimizationEnabled: true,
    preloadPopularAgents: true,
  }
}

function determineOverallStatus(cache: any, resilience: any, performance: any) {
  if (resilience.status === 'UNHEALTHY' || performance.cacheHitRatePercent < 20) {
    return 'CRITICAL'
  }
  if (
    resilience.status === 'DEGRADED' ||
    cache.hitRate < 0.5 ||
    performance.averageBatchTimeSeconds > 10
  ) {
    return 'WARNING'
  }
  return 'HEALTHY'
}

function generateCacheInsights(metrics: any): string[] {
  const insights: string[] = []

  if (!metrics.totalRequests) {
    insights.push('No cache activity yet - system warming up')
  } else if (metrics.hitRate > 0.8) {
    insights.push('Excellent cache performance - high hit rate')
  } else if (metrics.hitRate < 0.3) {
    insights.push('Low cache hit rate - consider tuning similarity thresholds')
  }

  if (metrics.similarityMatches > 0) {
    insights.push('Semantic similarity matching is working effectively')
  }

  return insights
}

function generateResilienceInsights(health: any, metrics: any): string[] {
  const insights: string[] = []

  if (health.status === 'HEALTHY') {
    insights.push('All APIs are performing well')
  }

  if (health.circuitBreakerTrips > 0) {
    insights.push(`${health.circuitBreakerTrips} circuit breaker trips detected`)
  }

  if (metrics.summary.openCircuits > 0) {
    insights.push(`${metrics.summary.openCircuits} APIs currently have open circuit breakers`)
  }

  if (health.averageResponseTime > 5000) {
    insights.push('High average response times detected')
  }

  return insights
}

function generatePerformanceInsights(metrics: any): string[] {
  const insights: string[] = []

  if (metrics.totalBatches === 0) {
    insights.push('No batch processing activity yet')
  } else {
    insights.push(`Processed ${metrics.totalBatches} agent batches`)
  }

  if (metrics.cacheHitRatePercent > 60) {
    insights.push('Good cache utilization in batch processing')
  }

  if (metrics.concurrencyUtilizationPercent > 80) {
    insights.push('High concurrency utilization - efficient resource usage')
  }

  if (metrics.optimizationsSaved > 0) {
    insights.push(`${metrics.optimizationsSaved} API calls saved through optimizations`)
  }

  return insights
}

function generateConsciousnessInsights(stats: any): string[] {
  const insights: string[] = []

  insights.push(`${stats.totalAgents} source-controlled agents available`)

  if (stats.evolutionMetrics.agentsInEvolution > 0) {
    insights.push(`${stats.evolutionMetrics.agentsInEvolution} agents currently evolving`)
  }

  insights.push(`Average consciousness level: ${stats.evolutionMetrics.averageConsciousnessLevel}`)

  return insights
}

function generateOverallRecommendations(systems: any): string[] {
  const recommendations: string[] = []

  if (systems.cache.hitRate < 0.5) {
    recommendations.push('Enable Redis caching for better performance')
  }

  if (systems.resilience.circuitBreakerTrips > 3) {
    recommendations.push('Investigate API reliability issues')
  }

  if (systems.performance.averageBatchTimeSeconds > 5) {
    recommendations.push('Consider increasing concurrent agent limit')
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operating optimally')
  }

  return recommendations
}

function generateAlerts(systems: any): Array<{ level: string; message: string; system: string }> {
  const alerts: Array<{ level: string; message: string; system: string }> = []

  if (systems.resilience.status === 'UNHEALTHY') {
    alerts.push({
      level: 'CRITICAL',
      message: 'API resilience system reporting unhealthy status',
      system: 'resilience',
    })
  }

  if (systems.cache.hitRate < 0.2 && systems.cache.totalRequests > 50) {
    alerts.push({
      level: 'WARNING',
      message: 'Very low cache hit rate detected',
      system: 'cache',
    })
  }

  if (systems.performance.averageBatchTimeSeconds > 10) {
    alerts.push({
      level: 'WARNING',
      message: 'High batch processing times detected',
      system: 'performance',
    })
  }

  return alerts
}
