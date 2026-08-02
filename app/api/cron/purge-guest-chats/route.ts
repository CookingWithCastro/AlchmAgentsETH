import { NextRequest, NextResponse } from 'next/server'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || process.env.PA_CRON_SECRET
    const authHeader = request.headers.get('authorization') || ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    const syncSecret =
      request.headers.get('x-sync-secret') || request.headers.get('x-cron-secret') || ''

    const isAuthorized =
      hasInternalApiSecret(request) ||
      (cronSecret && (bearerToken === cronSecret || syncSecret === cronSecret))

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Delete guest AgentConversation records older than 30 days
    const result = await prisma.agentConversation.deleteMany({
      where: {
        OR: [{ userId: null }, { userId: '' }, { userId: { startsWith: 'guest_' } }],
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    return NextResponse.json({
      success: true,
      purgedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
      message: `Successfully purged ${result.count} unauthenticated guest chat records older than 30 days under GDPR Art. 5(1)(e).`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error running guest chat retention purge:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to run guest chat retention purge',
      },
      { status: 500 }
    )
  }
}
