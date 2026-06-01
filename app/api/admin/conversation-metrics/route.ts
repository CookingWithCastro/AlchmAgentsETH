/**
 * Conversation Metrics API
 * Provides real conversation statistics for dashboards
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) return adminErrorResponse(admin)

    // Get conversations from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const conversations = await prisma.agentConversation.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        agentId: true,
        createdAt: true,
        responseTime: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Group by day for daily metrics
    const dailyMetrics = new Map<
      string,
      { requests: number; success: number; failure: number; totalLatency: number }
    >()

    conversations.forEach(conv => {
      const dayKey = conv.createdAt.toISOString().split('T')[0]

      if (!dailyMetrics.has(dayKey)) {
        dailyMetrics.set(dayKey, { requests: 0, success: 0, failure: 0, totalLatency: 0 })
      }

      const day = dailyMetrics.get(dayKey)!
      day.requests++
      day.success++ // Count all as success for now (no failure tracking yet)
      day.totalLatency += conv.responseTime || 800
    })

    // Convert to chart format
    const dailyMetricsArray = Array.from(dailyMetrics.entries())
      .map(([_date, stats], index) => ({
        name: `Day ${index + 1}`,
        requests: stats.requests,
        success: stats.success,
        failure: stats.failure,
        avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 800,
      }))
      .slice(-7) // Last 7 days

    // Group by agent for planetary data
    const agentMetrics = new Map<string, { requests: number; totalLatency: number }>()

    conversations.forEach(conv => {
      if (!agentMetrics.has(conv.agentId)) {
        agentMetrics.set(conv.agentId, { requests: 0, totalLatency: 0 })
      }

      const agent = agentMetrics.get(conv.agentId)!
      agent.requests++
      agent.totalLatency += conv.responseTime || 800
    })

    // Convert to chart format and get top agents
    const agentMetricsArray = Array.from(agentMetrics.entries())
      .map(([agentId, stats]) => ({
        name: agentId
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        requests: stats.requests,
        avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 800,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10) // Top 10 agents

    return NextResponse.json({
      success: true,
      dailyMetrics: dailyMetricsArray,
      agentMetrics: agentMetricsArray,
      totalConversations: conversations.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Surface DB failures as a fault, not a clean zero. Returning
    // `success: true` with zeroed metrics made a DB outage render as
    // "0 conversations, all healthy" on the admin board.
    console.error('[Conversation Metrics API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'metrics_unavailable',
        dailyMetrics: [],
        agentMetrics: [],
        totalConversations: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
