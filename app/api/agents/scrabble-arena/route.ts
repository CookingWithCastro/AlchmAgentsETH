import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  listScrabbleArenaAgents,
  simulateScrabbleArenaMatch,
  storedScrabbleMatchToArenaMatch,
  type StoredScrabbleArenaMatch,
} from '@/lib/agents/duel/scrabble-arena'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

type MatchDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<StoredScrabbleArenaMatch | null>
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId')?.trim()
  if (!matchId) {
    return NextResponse.json(
      { success: true, agents: listScrabbleArenaAgents() },
      { headers: CORS_HEADERS }
    )
  }

  const matchClient = (prisma as unknown as { agentScrabbleMatch?: MatchDelegate })
    .agentScrabbleMatch
  if (!matchClient) {
    return NextResponse.json(
      { success: false, error: 'Scrabble league match storage is not available.' },
      { status: 503, headers: CORS_HEADERS }
    )
  }

  try {
    const row = await matchClient.findUnique({ where: { id: matchId } })
    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Scrabble match not found.' },
        { status: 404, headers: CORS_HEADERS }
      )
    }
    return NextResponse.json(
      { success: true, match: storedScrabbleMatchToArenaMatch(row) },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[agents/scrabble-arena] replay failed:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load the Scrabble match replay.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const agentAId = typeof body.agentAId === 'string' ? body.agentAId.trim() : ''
    const agentBId = typeof body.agentBId === 'string' ? body.agentBId.trim() : ''
    if (!agentAId || !agentBId) {
      return NextResponse.json(
        { success: false, error: 'Choose two agents before simulating a match.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const rounds = typeof body.rounds === 'number' ? body.rounds : undefined
    const seed = typeof body.seed === 'number' ? body.seed : undefined
    const match = simulateScrabbleArenaMatch({ agentAId, agentBId, rounds, seed })
    return NextResponse.json({ success: true, match }, { headers: CORS_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scrabble simulation failed.'
    const status = /choose|must exist/i.test(message) ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status, headers: CORS_HEADERS })
  }
}
