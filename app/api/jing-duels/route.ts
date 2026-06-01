import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * POST /api/jing-duels
 *
 * Persists one Jing Arena duel for the personalization feed + admin
 * telemetry board. The desktop shell calls this fire-and-forget after
 * the cast resolves — failures must never block the UI, so this route
 * accepts partial payloads gracefully and just records what it has.
 *
 * Authentication is intentionally loose right now: the desktop's
 * `apiKey` is logged but not gated (mirrors how AgentConversation is
 * written today). Tighten when we wire real desktop accounts.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const requiredString = (key: string): string | null => {
    const value = body[key]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  const sessionId = requiredString('sessionId') || 'desktop-jing'
  const casterId = requiredString('casterId')
  const targetId = requiredString('targetId')
  const attackMoveId = requiredString('attackMoveId')
  const counterMoveId = requiredString('counterMoveId')
  const stance = requiredString('stance')

  if (!casterId || !targetId || !attackMoveId || !counterMoveId || !stance) {
    return NextResponse.json(
      {
        ok: false,
        error: 'casterId, targetId, attackMoveId, counterMoveId, and stance are required',
      },
      { status: 422, headers: CORS_HEADERS }
    )
  }

  const validStances = new Set(['clash', 'absorb', 'mirror'])
  if (!validStances.has(stance)) {
    return NextResponse.json(
      { ok: false, error: `stance must be one of ${[...validStances].join(', ')}` },
      { status: 422, headers: CORS_HEADERS }
    )
  }

  const optionalString = (key: string): string | null => {
    const value = body[key]
    return typeof value === 'string' ? value : null
  }
  const optionalJson = (key: string): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
    const value = body[key]
    if (value && typeof value === 'object') return value as Prisma.InputJsonValue
    return Prisma.JsonNull
  }
  const optionalNumber = (key: string): number | null => {
    const value = body[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const optionalBool = (key: string): boolean => Boolean(body[key])

  try {
    const duel = await prisma.agentJingDuel.create({
      data: {
        sessionId,
        userId: optionalString('userId'),
        source: optionalString('source') || 'desktop',
        casterId,
        targetId,
        attackMoveId,
        counterMoveId,
        stance,
        boostElement: optionalString('boostElement'),
        boostMagnitude: optionalNumber('boostMagnitude') ?? 0,
        cacheHit: optionalBool('cacheHit'),
        synastrySnapshot: optionalJson('synastrySnapshot'),
        casterTransitSnapshot: optionalJson('casterTransitSnapshot'),
        targetTransitSnapshot: optionalJson('targetTransitSnapshot'),
        casterPrompt: optionalString('casterPrompt'),
        casterResponse: optionalString('casterResponse'),
        targetPrompt: optionalString('targetPrompt'),
        targetResponse: optionalString('targetResponse'),
        latencyMs: optionalNumber('latencyMs'),
        modelUsed: optionalString('modelUsed'),
      },
    })

    return NextResponse.json({ ok: true, id: duel.id }, { headers: CORS_HEADERS })
  } catch (error) {
    // Foreign key violation is the most likely cause when an agentId
    // doesn't exist in historical_agents (e.g. a synthetic Stone agent).
    // Don't 500 the desktop shell over telemetry — log + 200 with a
    // skipped flag so the UI flow stays uninterrupted.
    console.error('Failed to persist Jing duel:', error)
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        error: error instanceof Error ? error.message : 'persist-failed',
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }
}

/**
 * GET /api/jing-duels?limit=20&casterId=...&targetId=...&userId=...
 *
 * Lightweight read for clients (admin dashboard uses the richer
 * /api/admin/dashboard route; this is for future agent profile views).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)
  const where: Record<string, unknown> = {}
  const casterId = searchParams.get('casterId')
  const targetId = searchParams.get('targetId')
  const userId = searchParams.get('userId')
  if (casterId) where.casterId = casterId
  if (targetId) where.targetId = targetId
  if (userId) where.userId = userId

  try {
    const duels = await prisma.agentJingDuel.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        source: true,
        casterId: true,
        targetId: true,
        attackMoveId: true,
        counterMoveId: true,
        stance: true,
        boostElement: true,
        boostMagnitude: true,
        latencyMs: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ ok: true, duels }, { headers: CORS_HEADERS })
  } catch (error) {
    // A read failure is a real error — return 500, not an empty 200 list
    // (an empty 200 hides a DB outage as "no duels yet"). The POST above is
    // deliberately fire-and-forget telemetry; this GET is not.
    console.error('Failed to list Jing duels:', error)
    return NextResponse.json(
      { ok: false, duels: [], error: error instanceof Error ? error.message : 'list-failed' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
