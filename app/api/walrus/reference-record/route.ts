import { NextResponse } from 'next/server'
import { snapshotAgentPersonaToWalrus } from '@/lib/walrus'

/**
 * Returns a REAL, resolvable Walrus memory record for the landing page's
 * "Reference memory record" card: a persona snapshot of a flagship agent,
 * published via MemWal when configured or the raw Walrus HTTP publisher
 * otherwise (public testnet publisher pays — no wallet needed).
 *
 * The result is memoized per server instance and re-published at most daily,
 * so the card never shows a fabricated address and never spams the publisher.
 */

const REFERENCE_AGENT_ID = 'hildegard-of-bingen'
const TTL_MS = 24 * 60 * 60 * 1000

interface CachedRecord {
  blobId: string
  url: string
  agentId: string
  agentName?: string
  backend: string
  capturedAt: string
}

let cached: { record: CachedRecord; at: number } | null = null
let inflight: Promise<CachedRecord> | null = null

async function publishReferenceRecord(): Promise<CachedRecord> {
  const { snapshot, memory } = await snapshotAgentPersonaToWalrus(REFERENCE_AGENT_ID)
  return {
    blobId: memory.blobId,
    url: memory.url,
    agentId: snapshot.agentId,
    agentName: snapshot.name,
    backend: memory.backend,
    capturedAt: snapshot.capturedAt,
  }
}

export async function GET() {
  try {
    if (cached && Date.now() - cached.at < TTL_MS) {
      return NextResponse.json({ success: true, record: cached.record, cached: true })
    }
    inflight ??= publishReferenceRecord()
    const record = await inflight
    inflight = null
    cached = { record, at: Date.now() }
    return NextResponse.json({ success: true, record, cached: false })
  } catch (error) {
    inflight = null
    // Stale-if-error: a previously published blob stays resolvable forever.
    if (cached) {
      return NextResponse.json({ success: true, record: cached.record, cached: true })
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Walrus publish failed',
      },
      { status: 503 }
    )
  }
}
