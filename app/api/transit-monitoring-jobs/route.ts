/**
 * Transit Monitoring Jobs API
 * ============================
 *
 * REST API endpoints for managing transit monitoring background jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  runTransitMonitoringJob,
  TransitMonitoringScheduler,
  TransitMonitoringOptions,
  TransitMonitoringResult,
} from '@/lib/jobs/transit-monitoring-job'
import {
  getJobHistory,
  getJobStatistics,
  cancelJob,
  getActiveJobs,
} from '@/lib/services/job-management-service'

// Global scheduler instance
let globalScheduler: TransitMonitoringScheduler | null = null

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/transit-monitoring-jobs
 * Get job history and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 })
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Get job history
    const history = await getJobHistory(userId, limit, offset)

    // Get statistics
    const stats = await getJobStatistics(userId)

    // Get active jobs
    const activeJobs = await getActiveJobs(userId)

    // Get scheduler status
    const schedulerStatus = {
      isActive: globalScheduler?.isActive() || false,
      intervalMinutes: globalScheduler ? (globalScheduler as any).intervalMinutes : 60,
    }

    return NextResponse.json({
      success: true,
      scheduler: schedulerStatus,
      activeJobs,
      history,
      statistics: stats,
    })
  } catch (error) {
    console.error('Error fetching transit monitoring jobs:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch transit monitoring jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transit-monitoring-jobs
 * Create and run a transit monitoring job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, options, runImmediately } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Validate options
    const validOptions: TransitMonitoringOptions = {}

    if (body.options?.dateRange) {
      validOptions.dateRange = {
        start: new Date(body.options.dateRange.start),
        end: new Date(body.options.dateRange.end),
      }

      if (
        isNaN(validOptions.dateRange.start.getTime()) ||
        isNaN(validOptions.dateRange.end.getTime())
      ) {
        return NextResponse.json({ error: 'Invalid date range format' }, { status: 400 })
      }
    }

    if (body.options?.significanceThreshold !== undefined) {
      const threshold = Number(body.options.significanceThreshold)
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        return NextResponse.json(
          { error: 'significanceThreshold must be between 0 and 1' },
          { status: 400 }
        )
      }
      validOptions.significanceThreshold = threshold
    }

    if (body.options?.priorityFilter) {
      const validPriorities = ['low', 'medium', 'high', 'critical']
      const priorities = body.options.priorityFilter.filter((p: string) =>
        validPriorities.includes(p)
      )
      if (priorities.length > 0) {
        validOptions.priorityFilter = priorities as any[]
      }
    }

    if (body.options?.maxChartsPerRun !== undefined) {
      const maxCharts = Number(body.options.maxChartsPerRun)
      if (isNaN(maxCharts) || maxCharts < 1 || maxCharts > 1000) {
        return NextResponse.json(
          { error: 'maxChartsPerRun must be between 1 and 1000' },
          { status: 400 }
        )
      }
      validOptions.maxChartsPerRun = maxCharts
    }

    validOptions.skipChartsWithoutPreferences = body.options?.skipChartsWithoutPreferences ?? true

    console.log('🚀 Starting transit monitoring job for user:', userId)

    // Run the job
    const result = await runTransitMonitoringJob(validOptions)

    // Store job result in database
    await prisma.transitMonitoringJob.create({
      data: {
        jobType: runImmediately ? 'manual_run' : 'scheduled',
        targetUserId: userId,
        scheduledFor: new Date(),
        startedAt: new Date(result.startTime),
        completedAt: new Date(result.endTime),
        status: 'completed',
        chartsProcessed: result.chartsProcessed,
        notificationsCreated: result.notificationsCreated,
        significantTransits: result.significantTransits || 0,
        executionTime: result.performance.totalDuration,
      },
    })

    console.log('✅ Transit monitoring job completed:', {
      chartsProcessed: result.chartsProcessed,
      notificationsCreated: result.notificationsCreated,
      duration: result.performance.totalDuration,
    })

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      result,
    })
  } catch (error) {
    console.error('Error running transit monitoring job:', error)

    // Store failed job in database
    try {
      if (request.body) {
        const body = await request.json()
        await prisma.transitMonitoringJob.create({
          data: {
            jobType: 'manual_run',
            targetUserId: body.userId,
            scheduledFor: new Date(),
            status: 'failed',
            chartsProcessed: 0,
            notificationsCreated: 0,
            significantTransits: 0,
          },
        })
      }
    } catch (dbError) {
      console.error('Failed to store failed job:', dbError)
    }

    return NextResponse.json(
      {
        error: 'Failed to run transit monitoring job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/transit-monitoring-jobs/scheduler
 * Control the background scheduler
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, intervalMinutes, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    switch (action) {
      case 'start': {
        if (globalScheduler && globalScheduler.isActive()) {
          return NextResponse.json({
            success: true,
            message: 'Scheduler is already running',
            scheduler: {
              isActive: true,
              intervalMinutes: (globalScheduler as any).intervalMinutes,
            },
          })
        }

        const interval = Math.max(Number(intervalMinutes) || 60, 15) // Minimum 15 minutes
        globalScheduler = new TransitMonitoringScheduler(interval)

        try {
          globalScheduler.start()
          console.log(`🕐 Transit monitoring scheduler started (every ${interval} minutes)`)

          return NextResponse.json({
            success: true,
            message: `Scheduler started successfully`,
            scheduler: {
              isActive: true,
              intervalMinutes: interval,
            },
          })
        } catch (error) {
          console.error('Failed to start scheduler:', error)
          return NextResponse.json(
            {
              error: 'Failed to start scheduler',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      }

      case 'stop':
        if (!globalScheduler || !globalScheduler.isActive()) {
          return NextResponse.json({
            success: true,
            message: 'Scheduler is not running',
            scheduler: { isActive: false },
          })
        }

        globalScheduler.stop()
        console.log('🛑 Transit monitoring scheduler stopped')

        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped successfully',
          scheduler: { isActive: false },
        })

      case 'status':
        return NextResponse.json({
          success: true,
          scheduler: {
            isActive: globalScheduler?.isActive() || false,
            intervalMinutes: globalScheduler ? (globalScheduler as any).intervalMinutes : null,
          },
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "start", "stop", or "status"' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error controlling transit monitoring scheduler:', error)
    return NextResponse.json(
      {
        error: 'Failed to control transit monitoring scheduler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/transit-monitoring-jobs/[jobId]
 * Cancel a running job
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobId = url.pathname.split('/').pop()
    const { searchParams } = url
    const userId = searchParams.get('userId')

    if (!jobId || !userId) {
      return NextResponse.json({ error: 'jobId and userId are required' }, { status: 400 })
    }

    // Cancel the job
    const success = await cancelJob(jobId, userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Job not found or could not be cancelled' },
        { status: 404 }
      )
    }

    // Update job status in database
    await prisma.transitMonitoringJob.updateMany({
      where: {
        id: jobId,
        targetUserId: userId,
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling transit monitoring job:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel transit monitoring job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
