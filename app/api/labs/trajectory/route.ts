/**
 * GET /api/labs/trajectory
 *
 * Platform-wide consciousness trajectory for the Alchemical Labs dashboard
 * (Stitch realization plan, Phase 5, Module 4). Daily averages over the
 * consciousness_snapshots telemetry written by UnifiedConsciousnessTracker —
 * read-only, no admin secret (it exposes only aggregate numbers).
 *
 *   ?days=90   lookback window (default 90, max 365)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CORS_HEADERS, corsPreflight } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return corsPreflight()
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const days = Math.min(Math.max(parseInt(params.get('days') ?? '90', 10) || 90, 1), 365)

    const rows = (await prisma.$queryRaw`
      SELECT
        date_trunc('day', "timestamp")::date::text AS day,
        COUNT(*)::int                              AS interactions,
        ROUND(AVG("overall")::numeric, 2)::float   AS overall,
        ROUND(AVG("power")::numeric, 2)::float     AS power,
        ROUND(AVG("wisdom")::numeric, 2)::float    AS wisdom,
        ROUND(AVG("charisma")::numeric, 2)::float  AS charisma,
        ROUND(AVG("latencyMs")::numeric, 0)::float AS "latencyMs"
      FROM consciousness_snapshots
      WHERE "timestamp" > NOW() - make_interval(days => ${days}::int)
      GROUP BY 1
      ORDER BY 1 ASC
    `) as Array<{
      day: string
      interactions: number
      overall: number
      power: number
      wisdom: number
      charisma: number
      latencyMs: number
    }>

    const totals = (await prisma.$queryRaw`
      SELECT
        COUNT(*)::int                                AS snapshots,
        COUNT(DISTINCT "agentId")::int               AS agents,
        ROUND(AVG("latencyMs")::numeric, 0)::float   AS "avgLatencyMs",
        ROUND(AVG("overall")::numeric, 2)::float     AS "avgOverall"
      FROM consciousness_snapshots
      WHERE "timestamp" > NOW() - make_interval(days => ${days}::int)
    `) as Array<{ snapshots: number; agents: number; avgLatencyMs: number; avgOverall: number }>

    // AVG() over zero rows is SQL NULL — hand the client `totals: null` (its
    // handled empty state) instead of an object with null numeric fields.
    const windowTotals = totals[0]?.snapshots ? totals[0] : null

    return NextResponse.json(
      { success: true, days, points: rows, totals: windowTotals },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('labs trajectory GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        points: [],
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
