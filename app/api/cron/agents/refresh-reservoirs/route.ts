import { NextResponse } from 'next/server'
import { refreshSpriteReservoirs } from '@/lib/agents/sprite-reservoirs'

/**
 * GET/POST /api/cron/agents/refresh-reservoirs
 *
 * Daily cron: re-mints every sky-sprite's ESMS reservoir from the live sky
 * (degree → dignity, moon → phase). Wallet agents are untouched. Protected by
 * CRON_SECRET in production.
 *
 * Vercel Cron schedule: `0 0 * * *` (daily at 00:00 UTC).
 */
export async function POST(request: Request) {
  return handleRefresh(request)
}

export async function GET(request: Request) {
  return handleRefresh(request)
}

async function handleRefresh(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error(
          '[cron/agents/refresh-reservoirs] Unauthorized attempt or missing CRON_SECRET in production'
        )
        return new NextResponse('Unauthorized', { status: 401 })
      }
    }

    const summary = await refreshSpriteReservoirs()

    return NextResponse.json({
      success: summary.errors === 0,
      ...summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron/agents/refresh-reservoirs] Fatal error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
