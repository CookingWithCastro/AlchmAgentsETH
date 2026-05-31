import { NextResponse } from 'next/server'
import { agentActionService } from '@/lib/services/agent-action-service'
import { runTransitAttunements } from '@/lib/agents/transit-attunement'

/**
 * POST /api/cron/agents/tick
 * GET /api/cron/agents/tick (Vercel Cron)
 *
 * Hourly (or per-planetary-hour) cron endpoint that:
 *  1. Evaluates every agentic user's natal chart against the current
 *     celestial weather (planetary hour, transits, elemental alignment).
 *  2. For agents whose activation score exceeds the threshold, executes
 *     an action: posting to the feed or transmuting tokens.
 *
 * Protected by CRON_SECRET in production.
 * Vercel Cron schedule: `0 * * * *` (every hour)
 */
export async function POST(request: Request) {
  return handleTick(request)
}

export async function GET(request: Request) {
  return handleTick(request)
}

async function handleTick(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error(
          '[cron/agents/tick] Unauthorized attempt or missing CRON_SECRET in production'
        )
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else {
      // In development, only warn if a secret is provided but incorrect
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/agents/tick] Invalid CRON_SECRET provided')
      }
    }

    const summary = await agentActionService.runTick()

    // Transit auto-attunement: degree sprites bestow ESMS + planetary-12 buffs to
    // historical agents whose natal points the live sky is conjuncting. Best-effort
    // — never fails the tick.
    let attunements: unknown = null
    try {
      attunements = await runTransitAttunements()
    } catch (err) {
      console.error('[cron/agents/tick] transit attunement failed:', err)
    }

    return NextResponse.json({
      success: summary.errors.length === 0,
      ...summary,
      attunements,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron/agents/tick] Fatal error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
