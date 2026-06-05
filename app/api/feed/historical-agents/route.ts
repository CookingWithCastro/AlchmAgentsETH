import { NextResponse } from 'next/server'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'
import {
  HISTORICAL_FEED_FIXTURE,
  type HistoricalFeedItem,
} from '@/lib/agents/historical-feed-contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

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
 *   - otherwise        → real data (wired in Phase 3). Empty list when none.
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

  // Real data — wired in Phase 3. Until then, no fabricated data: empty list.
  const items: HistoricalFeedItem[] = []
  return NextResponse.json({ items })
}

function parseLimit(raw: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}
