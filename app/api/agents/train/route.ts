/**
 * POST /api/agents/train   { traineeAgentId, mentorAgentId }
 *
 * Dedicated training action for the desktop companion (which has no NextAuth
 * session, so it can't use the unified-chat training path). The trainee earns
 * XP and EVs in the mentor's dominant Sacred 7 stat; the mentor earns a little
 * XP for participating. Awaited so the caller gets the updated leveling back.
 *
 * Auth is intentionally loose (mirrors /api/jing-duels); gains are bounded by
 * the engine's per-interaction XP and the 252/510 EV caps. CORS-enabled.
 */
import { NextRequest, NextResponse } from 'next/server'
import { HistoricalAgentsService } from '@/lib/historical-agents-db'
import { CORS_HEADERS, corsPreflight } from '@/lib/cors'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'

// Training mutates the shared global roster without auth (the desktop
// companion has no NextAuth session), so cap the grind rate per IP.
const TRAIN_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 }

export function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const limited = rateLimit(`agents-train:${ip}`, TRAIN_RATE_LIMIT)
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many training requests — slow down' },
      {
        status: 429,
        headers: { ...CORS_HEADERS, 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) },
      }
    )
  }

  let body: { traineeAgentId?: string; mentorAgentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const traineeAgentId = String(body.traineeAgentId || '').trim()
  const mentorAgentId = String(body.mentorAgentId || '').trim()

  if (!traineeAgentId || !mentorAgentId) {
    return NextResponse.json(
      { success: false, error: 'traineeAgentId and mentorAgentId are required' },
      { status: 422, headers: CORS_HEADERS }
    )
  }
  if (traineeAgentId === mentorAgentId) {
    return NextResponse.json(
      { success: false, error: 'An agent cannot train with itself' },
      { status: 422, headers: CORS_HEADERS }
    )
  }

  try {
    // EVs to the trainee in the mentor's dominant stat + XP to both.
    const [evResult, traineeXp, mentorXp] = await Promise.all([
      HistoricalAgentsService.awardEvs(traineeAgentId, mentorAgentId),
      HistoricalAgentsService.awardXp(traineeAgentId, { qualityMultiplier: 1.25 }),
      HistoricalAgentsService.awardXp(mentorAgentId, { qualityMultiplier: 0.5 }),
    ])

    if (!evResult && !traineeXp) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${traineeAgentId}` },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      {
        success: true,
        trainee: {
          agentId: traineeAgentId,
          level: traineeXp?.level ?? null,
          xp: traineeXp?.xp ?? null,
          xpGained: traineeXp?.awarded ?? 0,
          leveledUp: traineeXp?.leveledUp ?? false,
          stat: evResult?.stat ?? null,
          evGained: evResult?.gain ?? 0,
          evTotal: evResult?.evTotal ?? null,
        },
        mentor: {
          agentId: mentorAgentId,
          level: mentorXp?.level ?? null,
          xpGained: mentorXp?.awarded ?? 0,
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('train error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
