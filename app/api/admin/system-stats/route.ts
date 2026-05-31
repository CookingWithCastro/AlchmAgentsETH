import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentUser, getUserIdFromRequest } from '@/lib/auth-helpers'
import { performanceMonitor } from '@/lib/performance-monitor'

/**
 * Admin API for system statistics and monitoring
 * Requires admin privileges
 */

async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    })

    // Admin check: either email is admin or subscription tier is master
    const adminEmails = ['admin@planetaryagents.com', 'support@planetaryagents.com']
    return adminEmails.includes(user?.email || '') || user?.subscription?.tier === 'master'
  } catch (error) {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    const userId = (user as any)?.id || getUserIdFromRequest(req)

    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required',
        },
        { status: 401 }
      )
    }

    // Check admin privileges
    const isAdmin = await isAdminUser(userId)
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required',
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const timeRange = parseInt(searchParams.get('timeRange') || '24') // hours

    // Get system health from performance monitor
    const systemHealth = performanceMonitor.getSystemHealth()

    // Database statistics
    const now = new Date()
    const timeRangeStart = new Date(now.getTime() - timeRange * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers,
      totalInteractions,
      recentInteractions,
      totalAgentEvolutions,
      recentEvolutions,
      errorLogs,
      popularAgents,
    ] = await Promise.all([
      // Total users
      (prisma as any).user.count(),

      // Active users (had interaction in timeRange)
      (prisma as any).consciousnessInteraction
        .findMany({
          where: {
            timestamp: { gte: timeRangeStart },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((users: any[]) => users.length),

      // Total interactions
      (prisma as any).consciousnessInteraction.count(),

      // Recent interactions
      (prisma as any).consciousnessInteraction.count({
        where: {
          timestamp: { gte: timeRangeStart },
        },
      }),

      // Total agent evolutions
      (prisma as any).agentEvolutionState.count(),

      // Recent evolutions (level changes)
      (prisma as any).agentEvolutionState.count({
        where: {
          lastInteraction: { gte: timeRangeStart },
        },
      }),

      // Error logs from Monica interactions
      (prisma as any).monicaInteraction.findMany({
        where: {
          createdAt: { gte: timeRangeStart },
          monicaResponse: { contains: 'error' },
        },
        select: {
          id: true,
          createdAt: true,
          pageUrl: true,
          monicaResponse: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Popular agents by interaction count
      (prisma as any).consciousnessInteraction.groupBy({
        by: ['agentId'],
        where: {
          timestamp: { gte: timeRangeStart },
        },
        _count: {
          agentId: true,
        },
        orderBy: {
          _count: {
            agentId: 'desc',
          },
        },
        take: 10,
      }),
    ])

    // Performance metrics
    const slowEndpoints = performanceMonitor.getSlowEndpoints(5)

    // User tier distribution
    const tierDistribution = await (prisma as any).subscription.groupBy({
      by: ['tier'],
      _count: {
        tier: true,
      },
    })

    // Agent evolution level distribution
    const evolutionLevels = await (prisma as any).agentEvolutionState.groupBy({
      by: ['currentLevel'],
      _count: {
        currentLevel: true,
      },
    })

    // Memory and system metrics
    const memoryUsage = process.memoryUsage()
    const systemMetrics = {
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0],
    }

    return NextResponse.json({
      success: true,
      systemStats: {
        overview: {
          totalUsers,
          activeUsers,
          totalInteractions,
          recentInteractions,
          totalAgentEvolutions,
          recentEvolutions,
          timeRange: `${timeRange} hours`,
        },
        performance: {
          systemHealth,
          slowEndpoints,
          systemMetrics,
        },
        users: {
          tierDistribution: tierDistribution.map((t: any) => ({
            tier: t.tier,
            count: t._count?.tier || 0,
          })),
          growthRate: activeUsers > 0 ? `${((activeUsers / totalUsers) * 100).toFixed(1)}%` : '0%',
        },
        agents: {
          popularAgents: popularAgents.map((a: any) => ({
            agentId: a.agentId,
            interactionCount: a._count?.agentId || 0,
          })),
          evolutionLevels: evolutionLevels.map((l: any) => ({
            level: l.currentLevel,
            count: l._count?.currentLevel || 0,
          })),
        },
        errors: {
          recentErrorLogs: errorLogs.map((error: any) => ({
            id: error.id,
            timestamp: error.createdAt,
            source: error.pageUrl,
            message: error.monicaResponse?.substring(0, 200),
          })),
          errorRate: systemHealth.errorRate,
        },
        timestamp: now.toISOString(),
      },
    })
  } catch (error) {
    console.error('Admin system stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get system statistics',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId || !(await isAdminUser(userId))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required',
        },
        { status: 403 }
      )
    }

    const { action, data } = await req.json()

    switch (action) {
      case 'clear_cache':
        // Clear performance metrics
        performanceMonitor.clearMetrics()
        return NextResponse.json({
          success: true,
          message: 'Performance cache cleared',
        })

      case 'send_system_notification': {
        // Send notification to all users
        const { message, type } = data
        try {
          // Get all users
          const users = await (prisma as any).user.findMany({
            select: { id: true, email: true },
          })

          // Send notification to each user (would batch this in production)
          for (const user of users.slice(0, 10)) {
            // Limit to 10 for demo
            await fetch(
              `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: type || 'system_announcement',
                  userId: user.email,
                  metadata: { message, adminSent: true },
                }),
              }
            )
          }

          return NextResponse.json({
            success: true,
            message: `System notification sent to ${users.length} users`,
          })
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to send system notification',
            },
            { status: 500 }
          )
        }
      }

      case 'export_data': {
        // Export system data for backup
        const { format, tables } = data
        const exportData: any = {}

        if (tables?.includes('users')) {
          exportData.users = await (prisma as any).user.findMany({
            select: {
              email: true,
              name: true,
              createdAt: true,
              verified: true,
              provider: true,
            },
          })
        }

        if (tables?.includes('interactions')) {
          exportData.interactions = await (prisma as any).consciousnessInteraction.findMany({
            take: 1000, // Limit for demo
            orderBy: { timestamp: 'desc' },
          })
        }

        if (tables?.includes('evolutions')) {
          exportData.evolutions = await (prisma as any).agentEvolutionState.findMany()
        }

        return NextResponse.json({
          success: true,
          exportData,
          timestamp: new Date().toISOString(),
          format: format || 'json',
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid admin action',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute admin action',
      },
      { status: 500 }
    )
  }
}
