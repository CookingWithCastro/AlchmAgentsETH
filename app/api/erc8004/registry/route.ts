/**
 * GET /api/erc8004/registry — ranking-app surface over the ERC-8004 mainnet
 * registry, indexed live from Google BigQuery.
 *
 * Query params:
 *   ?type=leaderboard | registrations | transfers | metadata   (default: leaderboard)
 *   ?agentId=<n>     filter to a single agent (registrations/metadata)
 *   ?key=<string>    metadata key filter (type=metadata), e.g. "agentWallet"
 *   ?limit=<n>       max rows (default 100, clamped server-side)
 *   ?dryRun=1        return estimated bytes scanned instead of executing
 *
 * Requires GOOGLE_CLOUD_PROJECT + ADC credentials.
 * Degrades to 503 with a hint when BigQuery is unavailable.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { Erc8004Indexer } from '@/lib/erc8004/bigquery-indexer'
import {
  buildRegisteredQuery,
  buildTransferQuery,
  buildMetadataSetQuery,
} from '@/lib/erc8004/bigquery-queries'

export const dynamic = 'force-dynamic'

// Serialize BigInt agentIds/tokenIds for JSON.
function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)))
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const type = sp.get('type') ?? 'leaderboard'
  const limit = Math.min(Number(sp.get('limit') ?? 100) || 100, 1000)
  const agentId = sp.get('agentId') ? Number(sp.get('agentId')) : undefined
  const key = sp.get('key') ?? undefined
  const dryRun = sp.get('dryRun') === '1'

  const indexer = new Erc8004Indexer()

  try {
    // Cost preview only — no scan.
    if (dryRun) {
      const spec =
        type === 'transfers'
          ? buildTransferQuery({ limit })
          : type === 'metadata'
            ? buildMetadataSetQuery({ agentId, key, limit })
            : buildRegisteredQuery({ agentId, limit })
      const cost = await indexer.dryRun(spec)
      return NextResponse.json({ type, dryRun: true, ...cost })
    }

    switch (type) {
      case 'registrations':
        return NextResponse.json(
          jsonSafe({ type, agents: await indexer.getRegistrations({ agentId, limit }) })
        )
      case 'transfers':
        return NextResponse.json(
          jsonSafe({ type, transfers: await indexer.getTransfers({ limit }) })
        )
      case 'metadata':
        return NextResponse.json(
          jsonSafe({ type, metadata: await indexer.getMetadata({ agentId, key, limit }) })
        )
      case 'leaderboard':
      default:
        return NextResponse.json(
          jsonSafe({ type: 'leaderboard', agents: await indexer.buildLeaderboard({ limit }) })
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'BigQuery indexing failed'
    console.warn('[erc8004/registry] index failed:', message)
    return NextResponse.json(
      {
        error: message,
        hint: 'Set GOOGLE_CLOUD_PROJECT and valid Google Cloud application credentials.',
      },
      { status: 503 }
    )
  }
}
