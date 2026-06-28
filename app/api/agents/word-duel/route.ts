import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isPlanet, type Planet } from '@/lib/agents/planetary-traits'
import { chooseWordMove, type Candidate, type DuelContext } from '@/lib/agents/duel/word-duel'

// fs-free, but does network LLM + Prisma work → Node runtime, never cached.
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
 * POST /api/agents/word-duel
 *
 * The in-character "brain" for Pentacles' Word Duels of the Spheres. Given a
 * planet, a rack, and the legal candidate words (the caller owns the
 * dictionary — see lib/agents/duel/word-duel.ts), returns the word that planet
 * would play with a one-line rationale in its voice.
 *
 * API-only: this is not surfaced in any web UI. It exists so a desktop caller
 * or a future Pentacles companion worker can reach the agent brain.
 *
 * Request: { planet, rack, candidates: [{word,score}] | string[], context?, sessionId?, userId?, source? }
 * Response: { success, planet, move: { word, rationale, score, source, ... }, timestamp }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const { planet, rack, candidates, context } = body

    if (!isPlanet(planet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing planet. Must be one of the ten spheres.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!rack || (typeof rack !== 'string' && typeof rack !== 'object')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing rack. Must be a string or {letter:count} map.',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Thin brain: the caller MUST supply candidates (PA owns no dictionary).
    // An absent/invalid `candidates` is a caller error (422). An *empty* array
    // is legitimate ("no legal words") and resolves to a yield move below.
    if (!Array.isArray(candidates)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing candidates[]. Send the legal words from your solver (string[] or {word,score}[]).',
        },
        { status: 422, headers: CORS_HEADERS }
      )
    }

    const agentId =
      typeof body.agentId === 'string'
        ? body.agentId
        : typeof context === 'object' &&
            context &&
            'agentId' in context &&
            typeof (context as any).agentId === 'string'
          ? (context as any).agentId
          : undefined

    const move = await chooseWordMove({
      planet: planet as Planet,
      rack: rack as string | Record<string, number>,
      candidates: candidates as Array<Candidate | string>,
      context: (context as DuelContext) || undefined,
      agentId,
    })

    // Fire-and-forget telemetry — layered onto the agent duel family. Never let
    // a persistence problem (incl. a not-yet-migrated table) break the move.
    void persistWordDuel(body, planet as Planet, move)

    return NextResponse.json(
      { success: true, planet, move, timestamp: new Date().toISOString() },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[word-duel] Error handling duel move:', error)
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

async function persistWordDuel(
  body: Record<string, unknown>,
  planet: Planet,
  move: Awaited<ReturnType<typeof chooseWordMove>>
): Promise<void> {
  try {
    // The AgentWordDuel model is added in prisma/schema.prisma; until the
    // migration + client generation land, prisma.agentWordDuel is undefined.
    // Guard so this is an inert no-op rather than a crash.
    const client = (
      prisma as unknown as { agentWordDuel?: { create: (a: unknown) => Promise<unknown> } }
    ).agentWordDuel
    if (!client) return

    const str = (k: string): string | null =>
      typeof body[k] === 'string' ? (body[k] as string) : null
    const num = (k: string): number | null =>
      typeof body[k] === 'number' && Number.isFinite(body[k]) ? (body[k] as number) : null
    const ctx = (body.context && typeof body.context === 'object' ? body.context : null) as
      | (DuelContext & Record<string, unknown>)
      | null

    await client.create({
      data: {
        sessionId: str('sessionId') || 'desktop-word-duel',
        userId: str('userId'),
        source: str('source') || 'api',
        planet,
        rack:
          typeof body.rack === 'string' ? (body.rack as string) : JSON.stringify(body.rack ?? null),
        candidateCount: Array.isArray(body.candidates) ? (body.candidates as unknown[]).length : 0,
        agentWord: move.word,
        agentRationale: move.rationale,
        agentScore: move.score,
        playerWord: ctx?.playerWord ?? null,
        playerScore: typeof ctx?.playerScore === 'number' ? ctx.playerScore : null,
        round: typeof ctx?.round === 'number' ? ctx.round : null,
        roundDegree: typeof ctx?.seasonDegree === 'number' ? Math.round(ctx.seasonDegree) : null,
        moveSource: move.source,
        provider: move.provider ?? null,
        modelUsed: move.model ?? null,
        fallbackUsed: move.source !== 'model',
        latencyMs: typeof move.latencyMs === 'number' ? move.latencyMs : null,
        contextSnapshot: ctx ?? undefined,
      },
    })
  } catch (error) {
    console.error('[word-duel] telemetry persist skipped:', error)
  }
}
