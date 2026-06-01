import { NextResponse } from 'next/server'
import { feedPusherService } from '@/lib/agents/feed-pusher'

/**
 * POST /api/cron/push-feed
 * GET /api/cron/push-feed (Vercel Cron)
 *
 * Cron endpoint to trigger the evaluation of agentic feed actions and
 * push them to the WTEN ingestion endpoint.
 */
export async function POST(request: Request) {
  return handlePushFeed(request)
}

export async function GET(request: Request) {
  return handlePushFeed(request)
}

async function handlePushFeed(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/push-feed] Unauthorized attempt or missing CRON_SECRET in production')
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else {
      // In development, only warn if a secret is provided but incorrect
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/push-feed] Invalid CRON_SECRET provided')
      }
    }

    const result = await feedPusherService.evaluateAndPush()

    // 207 on partial failure so a degraded push is visible in Vercel cron logs.
    return NextResponse.json(
      {
        success: result.success,
        pushedCount: result.pushedCount,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 207 }
    )
  } catch (error) {
    console.error('Error executing cron push-feed:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
