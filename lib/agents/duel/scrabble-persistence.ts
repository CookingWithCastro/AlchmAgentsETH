/**
 * Best-effort, fire-and-forget persistence for the Agent Scrabble League.
 *
 * Mirrors `app/api/agents/word-duel/route.ts:persistWordDuel`: every call is guarded
 * so a not-yet-migrated table (or any DB hiccup) is an inert no-op rather than a
 * crash. The league tick must keep producing feed posts even when the
 * `AgentScrabbleMatch` / `AgentScrabbleStanding` tables don't exist yet.
 */
import { prisma } from '@/lib/db'

export interface ScrabbleMatchRecord {
  seasonId: string
  matchKey: string
  agentAId: string
  agentBId: string
  winnerId: string | null
  loserId: string | null
  tie: boolean
  scoreA: number
  scoreB: number
  margin: number
  rounds: number
  seedUsed: number
  highlight: string | null
  eloAAfter: number
  eloBAfter: number
  turns?: unknown
  totalLatencyMs?: number
}

export interface ScrabbleStandingDelta {
  seasonId: string
  agentId: string
  result: 'win' | 'loss' | 'tie'
  pointsFor: number
  elo: number
}

type MatchDelegate = {
  create: (args: unknown) => Promise<unknown>
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>
}
type StandingDelegate = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>
  upsert: (args: unknown) => Promise<unknown>
}

function matchClient(): MatchDelegate | undefined {
  return (prisma as unknown as { agentScrabbleMatch?: MatchDelegate }).agentScrabbleMatch
}
function standingClient(): StandingDelegate | undefined {
  return (prisma as unknown as { agentScrabbleStanding?: StandingDelegate }).agentScrabbleStanding
}

/** Match keys already played this season — used to skip replayed pairings. */
export async function loadPlayedMatchKeys(seasonId: string): Promise<Set<string>> {
  const client = matchClient()
  if (!client) return new Set()
  try {
    const rows = await client.findMany({ where: { seasonId }, select: { matchKey: true } })
    return new Set(rows.map(r => String(r.matchKey)))
  } catch (error) {
    console.warn('[scrabble] loadPlayedMatchKeys skipped:', error)
    return new Set()
  }
}

/** Current ELO for the given agents this season (defaults applied by the caller). */
export async function loadSeasonElo(
  seasonId: string,
  agentIds: string[]
): Promise<Record<string, number>> {
  const client = standingClient()
  if (!client || agentIds.length === 0) return {}
  try {
    const rows = await client.findMany({
      where: { seasonId, agentId: { in: agentIds } },
      select: { agentId: true, elo: true },
    })
    const out: Record<string, number> = {}
    for (const r of rows) out[String(r.agentId)] = Number(r.elo)
    return out
  } catch (error) {
    console.warn('[scrabble] loadSeasonElo skipped:', error)
    return {}
  }
}

/** Persist one match row + upsert both agents' standings. Never throws. */
export async function persistScrabbleMatch(
  record: ScrabbleMatchRecord,
  deltas: ScrabbleStandingDelta[]
): Promise<void> {
  const mClient = matchClient()
  if (mClient) {
    try {
      await mClient.create({ data: { ...record, turns: record.turns ?? undefined } })
    } catch (error) {
      console.warn('[scrabble] match persist skipped:', error)
    }
  }

  const sClient = standingClient()
  if (sClient) {
    for (const d of deltas) {
      try {
        await sClient.upsert({
          where: { seasonId_agentId: { seasonId: d.seasonId, agentId: d.agentId } },
          create: {
            seasonId: d.seasonId,
            agentId: d.agentId,
            played: 1,
            won: d.result === 'win' ? 1 : 0,
            lost: d.result === 'loss' ? 1 : 0,
            tied: d.result === 'tie' ? 1 : 0,
            pointsFor: d.pointsFor,
            elo: d.elo,
          },
          update: {
            played: { increment: 1 },
            won: { increment: d.result === 'win' ? 1 : 0 },
            lost: { increment: d.result === 'loss' ? 1 : 0 },
            tied: { increment: d.result === 'tie' ? 1 : 0 },
            pointsFor: { increment: d.pointsFor },
            elo: d.elo,
          },
        })
      } catch (error) {
        console.warn(`[scrabble] standing persist skipped for ${d.agentId}:`, error)
      }
    }
  }
}
