/**
 * GET /api/admin/scrabble-standings
 *
 * Agent Scrabble League telemetry for the admin console: season ELO standings,
 * recent match results, and highlight (bingo/upset/sweep) tallies. Admin-gated,
 * reads Neon via Prisma. Guarded — returns `available:false` (not an error) when
 * the league tables haven't been migrated yet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { getHistoricalAgent } from '@/lib/agents/historical'

export const dynamic = 'force-dynamic'

const UNAVAILABLE = {
  success: true,
  available: false,
  aggregates: null,
  standings: [] as unknown[],
  recentMatches: [] as unknown[],
}

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) return adminErrorResponse(admin)

    const matchClient = (prisma as any).agentScrabbleMatch
    const standingClient = (prisma as any).agentScrabbleStanding
    if (!matchClient || !standingClient) {
      return NextResponse.json({ ...UNAVAILABLE, reason: 'tables_not_migrated' })
    }

    const name = (id: string | null | undefined): string =>
      (id && getHistoricalAgent(id)?.name) || id || 'Unknown'
    const since24h = new Date(Date.now() - 86_400_000)

    const [totalMatches, last24h, recent, topStandings, bingo, upset, sweep, seasonRows] =
      await Promise.all([
        matchClient.count(),
        matchClient.count({ where: { createdAt: { gte: since24h } } }),
        matchClient.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
        standingClient.findMany({ orderBy: [{ elo: 'desc' }, { won: 'desc' }], take: 15 }),
        matchClient.count({ where: { highlight: 'bingo' } }),
        matchClient.count({ where: { highlight: 'upset' } }),
        matchClient.count({ where: { highlight: 'sweep' } }),
        standingClient.findMany({
          distinct: ['seasonId'],
          select: { seasonId: true },
          orderBy: { updatedAt: 'desc' },
          take: 8,
        }),
      ])

    const standings = topStandings.map((s: any, i: number) => ({
      rank: i + 1,
      agentId: s.agentId,
      name: name(s.agentId),
      elo: s.elo,
      played: s.played,
      won: s.won,
      lost: s.lost,
      tied: s.tied,
      pointsFor: s.pointsFor,
      seasonId: s.seasonId,
    }))

    const recentMatches = recent.map((m: any) => ({
      id: m.id,
      seasonId: m.seasonId,
      agentA: name(m.agentAId),
      agentB: name(m.agentBId),
      winner: m.winnerId ? name(m.winnerId) : null,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      margin: m.margin,
      highlight: m.highlight,
      tie: m.tie,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }))

    return NextResponse.json({
      success: true,
      available: true,
      aggregates: {
        totalMatches,
        last24h,
        activeSeasons: seasonRows.length,
        latestSeason: seasonRows[0]?.seasonId || null,
        highlights: { bingo, upset, sweep },
      },
      standings,
      recentMatches,
    })
  } catch (error) {
    console.error('[admin/scrabble-standings] error:', error)
    // Most likely the tables exist in the client but not the DB — degrade gracefully.
    return NextResponse.json({ ...UNAVAILABLE, reason: 'query_failed' })
  }
}
