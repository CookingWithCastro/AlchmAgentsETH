import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getHistoricalAgent } from '@/lib/agents/historical'
import { listScrabbleArenaAgents } from '@/lib/agents/duel/scrabble-arena'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function unavailable(reason: string) {
  return {
    success: true,
    available: false,
    reason,
    aggregates: null,
    standings: [] as unknown[],
    recentMatches: [] as unknown[],
    availableAgents: listScrabbleArenaAgents(),
  }
}

export async function GET(_req: NextRequest) {
  try {
    const matchClient = (prisma as any).agentScrabbleMatch
    const standingClient = (prisma as any).agentScrabbleStanding
    if (!matchClient || !standingClient) {
      return NextResponse.json(unavailable('tables_not_migrated'), { headers: CORS_HEADERS })
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
      agentAId: m.agentAId,
      agentB: name(m.agentBId),
      agentBId: m.agentBId,
      winner: m.winnerId ? name(m.winnerId) : null,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      margin: m.margin,
      highlight: m.highlight,
      tie: m.tie,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }))

    return NextResponse.json(
      {
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
        availableAgents: listScrabbleArenaAgents(),
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[agents/scrabble-standings] error:', error)
    return NextResponse.json(unavailable('query_failed'), { headers: CORS_HEADERS })
  }
}
