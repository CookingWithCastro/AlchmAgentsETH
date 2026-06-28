import { NextRequest, NextResponse } from 'next/server'
import { isPlanet, type Planet } from '@/lib/agents/planetary-traits'
import { chooseJingMove, isJingMove, type JingMoveName } from '@/lib/agents/duel/jing-move'

// Pure compute (no LLM, no DB) but force dynamic + uncached so it always answers live.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * POST /api/agents/jing
 *
 * The in-character "brain" for Pentacles' Jing Arena. Given a planet and the
 * player's OPENING move, returns the move that planet plays to counter it
 * (the winning reply on the fixed counter graph) plus a one-line voice.
 *
 * Matches the Pentacles feeder contract (feeder/jing-service.ts): it reads
 * `move` (which MUST be one of Meltdown|Freeze|TectonicRoot|Vacuum|Erode) and
 * `voice`. The feeder falls back to its own local counter pick if this is
 * unreachable, so this endpoint is purely additive (it adds the persona voice).
 *
 * Request:  { planet, opening, source? }
 * Response: { success, planet, move, voice, element, source, timestamp }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const { planet, opening, agentId } = body

    if (!isPlanet(planet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing planet. Must be one of the ten spheres.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    if (!isJingMove(opening)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing opening. Must be Meltdown|Freeze|TectonicRoot|Vacuum|Erode.',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { move, voice, element } = await chooseJingMove(
      planet as Planet,
      opening as JingMoveName,
      typeof agentId === 'string' ? agentId : undefined
    )

    return NextResponse.json(
      {
        success: true,
        planet,
        move,
        voice,
        element,
        source: 'counter',
        timestamp: new Date().toISOString(),
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[jing] Error handling jing move:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
