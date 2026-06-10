import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'
import {
  hasBirthchart,
  humanizeAgentId,
  serializeRecipePost,
  serializeYieldClaim,
  HISTORICAL_FEED_FIXTURE,
  type AgentMeta,
  type HistoricalFeedItem,
} from '@/lib/agents/historical-feed-contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

// Event types that map to a contract `recipe_post`, plus `yield_claim`.
// Mirrors the set surfaced by the existing GET /api/feed handler.
const FEED_EVENT_TYPES = [
  'recipe_generation',
  'recipe',
  'made_it',
  'made-it',
  'transmutation',
  'lab_entry',
  'lab-entry',
  'yield_claim',
]

/**
 * GET /api/feed/historical-agents?limit=N
 *
 * Internal feed PRODUCER for WTEN / alchm.kitchen's "Live Network Feed".
 * Returns newest-first historical-agent activity (recipe posts + yield claims)
 * in the shared contract from `lib/agents/historical-feed-contract.ts`.
 *
 * Auth: `Authorization: Bearer <INTERNAL_API_SECRET>` (fail-closed — same secret
 * as the existing POST /api/feed ingestion handler). A missing/invalid secret
 * returns 401; the consumer treats any non-200 as an empty feed.
 *
 * Data source:
 *   - `FEED_FIXTURE=1` → deterministic fixture (lets WTEN integration-test a live URL).
 *   - otherwise        → real data from `agent_action_events`. Empty list when none.
 */
export async function GET(req: Request): Promise<Response> {
  if (!hasInternalApiSecret(req)) {
    return NextResponse.json({ error: 'unauthorized', items: [] }, { status: 401 })
  }

  const limit = parseLimit(new URL(req.url).searchParams.get('limit'))

  // Mock-first: behind FEED_FIXTURE the endpoint serves a contract-shaped fixture
  // (including the consumer's excluded cases) so WTEN can wire up against a real URL.
  if (process.env.FEED_FIXTURE === '1') {
    return NextResponse.json({ items: HISTORICAL_FEED_FIXTURE.slice(0, limit) })
  }

  try {
    const items = await loadHistoricalFeedItems(limit)
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[feed/historical-agents] failed to load feed:', err)
    // Degrade gracefully — the consumer renders an empty feed on any non-200.
    return NextResponse.json({ items: [] }, { status: 503 })
  }
}

/**
 * Load newest-first recipe-post + yield-claim items from real PA data.
 *
 * recipe_post is emitted only for historical agents that have a birthchart
 * (`natalChart.planets` non-empty); yield claims are authored by those same
 * birthchart-bearing agents. No fabricated data — empty list when there's none.
 */
async function loadHistoricalFeedItems(limit: number): Promise<HistoricalFeedItem[]> {
  // 1. Load agents → lookup map + birthchart whitelist.
  const dbAgents = await prisma.historical_agents.findMany({
    select: { agentId: true, name: true, natalChart: true, dominantElement: true },
  })

  const agentsMap = new Map<string, AgentMeta>()
  const validAgentIds: string[] = []
  for (const a of dbAgents) {
    agentsMap.set(a.agentId, a)
    if (hasBirthchart(a.natalChart)) validAgentIds.push(a.agentId)
  }
  if (validAgentIds.length === 0) return []

  // 2. Newest-first events authored by birthchart-bearing historical agents.
  const rows = await prisma.agent_action_events.findMany({
    where: {
      status: { in: ['executed', 'posted'] },
      agentId: { in: validAgentIds },
      eventType: { in: FEED_EVENT_TYPES },
    },
    orderBy: { evaluatedAt: 'desc' },
    take: limit,
  })

  const now = new Date()
  return rows.map(row => {
    if (row.eventType === 'yield_claim') {
      const metadata = (row.metadataPayload || {}) as Record<string, unknown>
      const historicalAgentId = (metadata.historicalAgentId as string) || row.agentId
      const planetaryAgentId = metadata.planetaryAgentId as string | undefined
      return serializeYieldClaim(
        row,
        {
          historicalAgentName:
            agentsMap.get(historicalAgentId)?.name ?? humanizeAgentId(historicalAgentId),
          planetaryAgentName:
            agentsMap.get(planetaryAgentId ?? '')?.name ?? humanizeAgentId(planetaryAgentId),
        },
        now
      )
    }
    return serializeRecipePost(row, agentsMap.get(row.agentId), now)
  })
}

function parseLimit(raw: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}
