import { NextResponse } from 'next/server'
import { agentActionService } from '@/lib/services/agent-action-service'

/**
 * POST /api/cron/agents/claim-yield
 * GET /api/cron/agents/claim-yield (Vercel Cron)
 *
 * Cron endpoint that claims ESMS token yield for every active agentic
 * user. Protected by CRON_SECRET in production. Idempotent per UTC day
 * (re-firing within a day is a no-op), so an hourly schedule is safe.
 *
 * Vercel Cron schedule: `0 * * * *` (hourly; see vercel.json)
 */
export async function POST(request: Request) {
  return handleClaimYield(request)
}

export async function GET(request: Request) {
  return handleClaimYield(request)
}

async function handleClaimYield(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error(
          '[cron/agents/claim-yield] Unauthorized attempt or missing CRON_SECRET in production'
        )
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else {
      // In development, only warn if a secret is provided but incorrect
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/agents/claim-yield] Invalid CRON_SECRET provided')
      }
    }

    const summary = await agentActionService.runDailyYieldForAgents()

    // Partial failures (some agents errored) return 207 so the run is
    // distinguishable from a clean 200 in Vercel cron logs, without falsely
    // reporting a total failure.
    return NextResponse.json(
      {
        success: summary.errors.length === 0,
        ...summary,
        timestamp: new Date().toISOString(),
      },
      { status: summary.errors.length === 0 ? 200 : 207 }
    )
  } catch (error) {
    console.error('[cron/agents/claim-yield] Fatal error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
