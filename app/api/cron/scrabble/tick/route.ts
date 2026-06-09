import { NextResponse } from 'next/server'
import { runLeagueTick } from '@/lib/agents/scrabble-league'

/**
 * POST/GET /api/cron/scrabble/tick (Vercel Cron, hourly)
 *
 * Advances the always-on Agent Scrabble League by one tick: plays a batch of
 * pending round-robin pairings (deterministic, LLM-free matches), updates ELO +
 * standings, and emits a capped set of persona-voiced feed posts for feed-worthy
 * outcomes. Gated by SCRABBLE_LEAGUE_ENABLED (off by default until reviewed).
 *
 * Mirrors app/api/cron/agents/tick: CRON_SECRET fail-closed in production, HTTP
 * 207 on partial failure so a degraded tick is visible in Vercel cron logs.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
          '[cron/scrabble/tick] Unauthorized attempt or missing CRON_SECRET in production'
        )
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cron/scrabble/tick] Invalid CRON_SECRET provided')
    }

    // Off by default until reviewed (see cost model). Flip SCRABBLE_LEAGUE_ENABLED=true to run.
    if (process.env.SCRABBLE_LEAGUE_ENABLED !== 'true') {
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          reason: 'SCRABBLE_LEAGUE_ENABLED is not true',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    const summary = await runLeagueTick()

    // 207 on partial failure so a degraded tick is visible in Vercel cron logs.
    return NextResponse.json(
      {
        success: summary.errors.length === 0,
        ...summary,
        timestamp: new Date().toISOString(),
      },
      { status: summary.errors.length === 0 ? 200 : 207 }
    )
  } catch (error) {
    console.error('[cron/scrabble/tick] Fatal error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
