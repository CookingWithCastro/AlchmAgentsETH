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
  const row = await prisma.group_chat_sessions.create({
    data: {
      agentIds: input.agentIds,
      agents: input.agents as unknown as object,
      transit: (input.transit ?? undefined) as unknown as object | undefined,
      transitKey: input.transit?.key ?? null,
      origin: input.origin,
      source: input.source,
      userId: input.userId,
    },
  })
  return rowToSession(row)
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
