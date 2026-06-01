import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { normalizeTransitAgents } from '@/lib/agents/degree-agent'
import {
  createTransitGroupSession,
  findRecentTransitSession,
  type TransitInfo,
} from '@/lib/agents/transit-group-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Server-to-server endpoint called by alchm.kitchen's group-chat proxy when a user
// clicks a transit. It creates (or idempotently resumes) a transit council session
// and returns { sessionId, url } pointing at this app's /gallery/group/<id> page.
//
// Contract: see NEXT_SESSION_PROMPT_PA_TRANSIT_GROUP_CHAT.md §2a.

const MAX_AGENTS = 6

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Auth: timing-safe compare against INTERNAL_API_SECRET (also PA_INTERNAL_API_SECRET).
 * alchm.kitchen's admin sync proxy sends `X-Sync-Secret`; we also accept
 * `X-Internal-Secret` and `Authorization: Bearer <secret>`. When no secret is
 * configured we allow non-production (local dev) but reject in production.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_SECRET || process.env.PA_INTERNAL_API_SECRET
  if (!expected) return process.env.NODE_ENV !== 'production'

  const authHeader = request.headers.get('authorization') || ''
  const bearer = /^bearer\s+/i.test(authHeader) ? authHeader.replace(/^bearer\s+/i, '').trim() : ''

  const candidates = [
    request.headers.get('x-sync-secret'),
    request.headers.get('x-internal-secret'),
    request.headers.get('internal_api_secret'),
    bearer || null,
  ].filter((v): v is string => Boolean(v))

  return candidates.some(value => constantTimeEquals(value, expected))
}

/**
 * Resolve this app's public origin for the absolute `url` in the response.
 * Prefer an explicit env, then forwarded headers, then the incoming request origin.
 */
function resolveAppOrigin(request: NextRequest): string {
  const env =
    process.env.NEXT_PUBLIC_AGENTS_UI_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL
  if (env) return env.replace(/\/+$/, '')

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${forwardedHost}`
  }

  try {
    return new URL(request.url).origin
  } catch {
    return 'https://agents.alchm.kitchen'
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawIds: string[] = Array.isArray(body?.agentIds)
    ? body.agentIds.map((x: any) => String(x))
    : []
  const detail = Array.isArray(body?.agents) ? body.agents : []

  // Normalize against canonical ids (prefer parsed values; backfill from `agents`),
  // dedupe, then cap. A transit council is the two transiting planets, but we accept
  // up to MAX_AGENTS defensively.
  const normalized = normalizeTransitAgents(rawIds, detail).slice(0, MAX_AGENTS)
  if (normalized.length < 2) {
    return NextResponse.json(
      { error: 'A group chat requires at least 2 valid planetary-degree agents' },
      { status: 400 }
    )
  }

  const transit: TransitInfo | null =
    body?.transit && typeof body.transit === 'object'
      ? {
          aspect: typeof body.transit.aspect === 'string' ? body.transit.aspect : null,
          key: typeof body.transit.key === 'string' ? body.transit.key : null,
          label: typeof body.transit.label === 'string' ? body.transit.label : null,
        }
      : null
  const origin = typeof body?.origin === 'string' ? body.origin : null
  const source = typeof body?.source === 'string' ? body.source : null
  const userId = typeof body?.userId === 'string' && body.userId.trim() ? body.userId.trim() : null

  const appOrigin = resolveAppOrigin(request)

  try {
    // Idempotency: resume a recent session for the same transit + user bucket.
    const existing = await findRecentTransitSession(transit?.key, userId)
    if (existing) {
      return NextResponse.json({
        sessionId: existing.id,
        url: `${appOrigin}/gallery/group/${existing.id}`,
        reused: true,
      })
    }

    const session = await createTransitGroupSession({
      agentIds: normalized.map(a => a.id),
      agents: normalized,
      transit,
      origin,
      source,
      userId,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: `${appOrigin}/gallery/group/${session.id}`,
    })
  } catch (error) {
    console.error('[internal/group-chat] failed to create session:', error)
    return NextResponse.json({ error: 'Failed to create group chat session' }, { status: 500 })
  }
}

export async function GET() {
  // Lightweight descriptor; never returns session data (creation is POST-only).
  return NextResponse.json({
    name: 'Transit Group Chat (internal)',
    method: 'POST',
    description: 'Creates a transit-driven group chat session and returns { sessionId, url }.',
  })
}
