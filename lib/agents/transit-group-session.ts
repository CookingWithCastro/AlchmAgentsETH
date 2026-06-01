import 'server-only'

import { prisma } from '@/lib/db'
import { normalizeTransitAgents, type TransitAgentDetail } from './degree-agent'

// Persistence for transit-driven group chats. A click on a transit at alchm.kitchen
// resolves the two transiting planets to degree-agent IDs and POSTs them to
// /api/internal/group-chat, which stores a session here and hands back a URL to
// /gallery/group/<id>. The group page hydrates the session by id and pre-populates
// the council. Stored in the `group_chat_sessions` table on the (Neon) frontend DB —
// the same store the rest of the economy/feed already use, so no extra backend hop.

export interface TransitInfo {
  aspect?: string | null
  key?: string | null
  label?: string | null
}

export interface TransitGroupSession {
  id: string
  agentIds: string[]
  agents: TransitAgentDetail[]
  transit: TransitInfo | null
  origin: string | null
  source: string | null
  userId: string | null
  createdAt: string
}

export interface CreateTransitGroupSessionInput {
  agentIds: string[]
  agents: TransitAgentDetail[]
  transit: TransitInfo | null
  origin: string | null
  source: string | null
  userId: string | null
}

// Repeat clicks on the same transit (same key + user) within this window resume the
// existing session instead of spawning a duplicate. The transit itself is stable for
// hours, so this collapses accidental double-clicks without pinning stale councils forever.
const IDEMPOTENCY_WINDOW_MS = 6 * 60 * 60 * 1000

/**
 * Deterministic dedupe key for the create race. Two near-simultaneous POSTs for the
 * same transit + user fall in the same ~6h wall-clock bucket → identical key → they
 * collide on the unique index (one inserts, the other reads back the winner). The
 * `findRecentTransitSession` range query still handles ordinary within-6h reuse first,
 * so this key only ever fires for the true concurrent race (or replica-lag misses) —
 * and a fresh bucket after the window yields a new session, preserving current
 * semantics. Keyless sessions get a NULL key (the unique index permits many NULLs), so
 * they behave exactly as before (always create).
 */
function computeDedupeKey(transitKey: string | null, userId: string | null): string | null {
  if (!transitKey) return null
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)
  return `${transitKey}::${userId ?? 'anon'}::${bucket}`
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002'
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(v => String(v)).filter(Boolean)
}

function toDetailArray(value: unknown): Array<Partial<TransitAgentDetail> & { id?: string }> {
  return Array.isArray(value) ? (value as Array<Partial<TransitAgentDetail> & { id?: string }>) : []
}

/**
 * Find a recent session for the same transit + user, for idempotent re-clicks.
 * Matches on the exact user bucket (a value, or null for anonymous) so logged-in
 * users never collide with each other or with anonymous traffic.
 */
export async function findRecentTransitSession(
  transitKey: string | null | undefined,
  userId: string | null
): Promise<TransitGroupSession | null> {
  if (!transitKey) return null
  try {
    const row = await prisma.group_chat_sessions.findFirst({
      where: {
        transitKey,
        userId: userId ?? null,
        createdAt: { gt: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    })
    return row ? rowToSession(row) : null
  } catch (error) {
    console.error('[transit-group-session] idempotency lookup failed:', error)
    return null
  }
}

export async function createTransitGroupSession(
  input: CreateTransitGroupSessionInput
): Promise<TransitGroupSession> {
  const dedupeKey = computeDedupeKey(input.transit?.key ?? null, input.userId)
  try {
    const row = await prisma.group_chat_sessions.create({
      data: {
        agentIds: input.agentIds,
        agents: input.agents as unknown as object,
        transit: (input.transit ?? undefined) as unknown as object | undefined,
        transitKey: input.transit?.key ?? null,
        dedupeKey,
        origin: input.origin,
        source: input.source,
        userId: input.userId,
      },
    })
    return rowToSession(row)
  } catch (error) {
    // A concurrent create for the same (transit, user, ~6h bucket) lost the race on
    // the dedupe_key unique index. The DB constraint is the source of truth — read
    // back the winner and treat it as a reuse rather than surfacing the conflict.
    if (dedupeKey && isUniqueViolation(error)) {
      const winner = await prisma.group_chat_sessions.findUnique({ where: { dedupeKey } })
      if (winner) return rowToSession(winner)
    }
    throw error
  }
}

/**
 * Atomically claim the one-time council opener for a session. Returns true only for
 * the single caller that flips `seeded_at` from NULL → now(); every later or concurrent
 * caller (including fresh browsers / incognito / cleared storage) gets false. This is
 * the server-side gate that makes the auto-seed unrepeatable, replacing the old
 * localStorage-only guard. Fails closed (false) on error so a DB hiccup can never grant
 * a duplicate opener.
 */
export async function claimGroupChatSeed(sessionId: string): Promise<boolean> {
  if (!sessionId) return false
  try {
    const result = await prisma.group_chat_sessions.updateMany({
      where: { id: sessionId, seededAt: null },
      data: { seededAt: new Date() },
    })
    return result.count === 1
  } catch (error) {
    console.error('[transit-group-session] seed claim failed:', error)
    return false
  }
}

export async function getTransitGroupSession(id: string): Promise<TransitGroupSession | null> {
  if (!id) return null
  try {
    const row = await prisma.group_chat_sessions.findUnique({ where: { id } })
    return row ? rowToSession(row) : null
  } catch (error) {
    console.error('[transit-group-session] fetch failed:', error)
    return null
  }
}

function rowToSession(row: {
  id: string
  agentIds: unknown
  agents: unknown
  transit: unknown
  origin: string | null
  source: string | null
  userId: string | null
  createdAt: Date
}): TransitGroupSession {
  const agentIds = toStringArray(row.agentIds)
  const agents = normalizeTransitAgents(agentIds, toDetailArray(row.agents))
  return {
    id: row.id,
    agentIds,
    agents,
    transit: (row.transit as TransitInfo | null) ?? null,
    origin: row.origin,
    source: row.source,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  }
}
