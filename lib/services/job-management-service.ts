/**
 * Job Management Service
 * =====================
 *
 * Service for managing background jobs, tracking their status,
 * and providing job history and statistics.
 */

import { prisma } from '@/lib/db'

export interface JobHistoryEntry {
  id: string
  jobType: string
  scheduledFor: Date
  startedAt?: Date
  completedAt?: Date
  status: string
  chartsProcessed: number
  notificationsCreated: number
  significantTransits: number
  executionTime?: number
  errors?: Array<{
    chartId: string
    error: string
    timestamp: Date
  }>
}

export interface JobStatistics {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  averageExecutionTime: number
  totalChartsProcessed: number
  totalNotificationsCreated: number
  totalSignificantTransits: number
  jobsLast24Hours: number
  jobsLast7Days: number
  jobsLast30Days: number
  successRate: number
}

export interface ActiveJob {
  id: string
  jobType: string
  startedAt: Date
  progress?: {
    chartsProcessed: number
    totalCharts: number
    notificationsCreated: number
  }
}

/**
 * Get job history for a user
 */
export async function getJobHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<JobHistoryEntry[]> {
  try {
    const jobs = await prisma.transitMonitoringJob.findMany({
      where: {
        targetUserId: userId,
      },
      orderBy: {
        scheduledFor: 'desc',
      },
      take: limit,
      skip: offset,
    })

    return jobs.map((job: any) => ({
      id: job.id,
      jobType: job.jobType,
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      status: job.status,
      chartsProcessed: job.chartsProcessed,
      notificationsCreated: job.notificationsCreated,
      significantTransits: job.significantTransits,
      executionTime: job.executionTime || undefined,
    }))
  } catch (error) {
    console.error('Error fetching job history:', error)
    throw new Error('Failed to fetch job history')
  }
}

/**
 * Get job statistics for a user
 */
export async function getJobStatistics(userId: string): Promise<JobStatistics> {
  try {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalJobsResult,
      completedJobsResult,
      failedJobsResult,
      executionTimeResult,
      chartsProcessedResult,
      notificationsCreatedResult,
      significantTransitsResult,
      jobsLast24HoursResult,
      jobsLast7DaysResult,
      jobsLast30DaysResult,
    ] = await Promise.all([
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId },
      }),
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId, status: 'completed' },
      }),
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId, status: 'failed' },
      }),
      prisma.transitMonitoringJob.aggregate({
        where: { targetUserId: userId, executionTime: { not: null } },
        _avg: { executionTime: true },
      }),
      prisma.transitMonitoringJob.aggregate({
        where: { targetUserId: userId },
        _sum: { chartsProcessed: true },
      }),
      prisma.transitMonitoringJob.aggregate({
        where: { targetUserId: userId },
        _sum: { notificationsCreated: true },
      }),
      prisma.transitMonitoringJob.aggregate({
        where: { targetUserId: userId },
        _sum: { significantTransits: true },
      }),
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId, scheduledFor: { gte: last24Hours } },
      }),
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId, scheduledFor: { gte: last7Days } },
      }),
      prisma.transitMonitoringJob.count({
        where: { targetUserId: userId, scheduledFor: { gte: last30Days } },
      }),
    ])

    const totalJobs = totalJobsResult
    const completedJobs = completedJobsResult
    const failedJobs = failedJobsResult
    const averageExecutionTime = executionTimeResult._avg.executionTime || 0
    const totalChartsProcessed = chartsProcessedResult._sum.chartsProcessed || 0
    const totalNotificationsCreated = notificationsCreatedResult._sum.notificationsCreated || 0
    const totalSignificantTransits = significantTransitsResult._sum.significantTransits || 0
    const jobsLast24Hours = jobsLast24HoursResult
    const jobsLast7Days = jobsLast7DaysResult
    const jobsLast30Days = jobsLast30DaysResult

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      averageExecutionTime,
      totalChartsProcessed,
      totalNotificationsCreated,
      totalSignificantTransits,
      jobsLast24Hours,
      jobsLast7Days,
      jobsLast30Days,
      successRate,
    }
  } catch (error) {
    console.error('Error fetching job statistics:', error)
    throw new Error('Failed to fetch job statistics')
  }
}

/**
 * Get currently active jobs for a user
 */
export async function getActiveJobs(_userId: string): Promise<ActiveJob[]> {
  // For now, return empty array since we don't have real-time job tracking.
  // In a production system, this would check for jobs that are currently running.
  return []
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string, userId: string): Promise<boolean> {
  try {
    // In a production system, this would send a signal to cancel the running job
    // For now, we'll just mark it as cancelled in the database

    const result = await prisma.transitMonitoringJob.updateMany({
      where: {
        id: jobId,
        targetUserId: userId,
        status: { in: ['pending', 'running'] },
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    })

    return result.count > 0
  } catch (error) {
    console.error('Error cancelling job:', error)
    return false
  }
}

/**
 * Clean up old job records
 */
export async function cleanupOldJobs(userId: string, daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.transitMonitoringJob.deleteMany({
      where: {
        targetUserId: userId,
        scheduledFor: { lt: cutoffDate },
        status: { in: ['completed', 'failed', 'cancelled'] },
      },
    })

    console.log(`Cleaned up ${result.count} old jobs for user ${userId}`)
    return result.count
  } catch (error) {
    console.error('Error cleaning up old jobs:', error)
    throw new Error('Failed to cleanup old jobs')
  }
}

/**
 * Get job performance metrics
 */
export async function getJobPerformanceMetrics(
  userId: string,
  days: number = 30
): Promise<{
  dailyJobCounts: Array<{ date: string; count: number }>
  averageExecutionTimes: Array<{ date: string; avgTime: number }>
  successRateTrend: Array<{ date: string; successRate: number }>
}> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const jobs = await prisma.transitMonitoringJob.findMany({
      where: {
        targetUserId: userId,
        scheduledFor: { gte: cutoffDate },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    })

    // Group by date
    const dailyStats = new Map<
      string,
      {
        total: number
        completed: number
        executionTimes: number[]
      }
    >()

    jobs.forEach((job: any) => {
      const dateKey = job.scheduledFor.toISOString().split('T')[0]

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, { total: 0, completed: 0, executionTimes: [] })
      }

      const stats = dailyStats.get(dateKey)!
      stats.total++
      if (job.status === 'completed') {
        stats.completed++
      }
      if (job.executionTime) {
        stats.executionTimes.push(job.executionTime)
      }
    })

    const dailyJobCounts = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      count: stats.total,
    }))

    const averageExecutionTimes = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        avgTime:
          stats.executionTimes.length > 0
            ? stats.executionTimes.reduce((sum, time) => sum + time, 0) /
              stats.executionTimes.length
            : 0,
      }))
      .filter(item => item.avgTime > 0)

    const successRateTrend = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }))

    return {
      dailyJobCounts,
      averageExecutionTimes,
      successRateTrend,
    }
  } catch (error) {
    console.error('Error fetching job performance metrics:', error)
    throw new Error('Failed to fetch job performance metrics')
  }
}
