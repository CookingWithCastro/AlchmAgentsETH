/**
 * Walrus agent-memory layer.
 *
 * Two backends, chosen automatically:
 *  1. MemWal (`@mysten-incubation/memwal`, beta) — END-TO-END ENCRYPTED memory on
 *     Walrus + Sui with semantic recall, via the hosted testnet relayer. Used when
 *     MEMWAL_PRIVATE_KEY + MEMWAL_ACCOUNT_ID are set and the package is installed.
 *     (Provision the account id + delegate key at https://memory.walrus.xyz.)
 *  2. Raw Walrus HTTP publisher/aggregator — no SDK, no wallet (the public testnet
 *     publisher pays). Fallback when MemWal isn't configured. Persistence + a blobId,
 *     but no encryption and no semantic search.
 *
 * Both return a Walrus `blobId` + a resolvable aggregator URL, which we write into
 * the ENS `agent-memory` text record (see lib/erc8004/ensip.ts).
 *
 * Install for the MemWal path:
 *   bun add @mysten-incubation/memwal @mysten/sui @mysten/seal @mysten/walrus
 * The HTTP fallback needs nothing. MemWal is beta (0.0.7) — treat as movable.
 */

const STAGING_RELAYER = 'https://relayer-staging.memory.walrus.xyz'
const TESTNET_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
const TESTNET_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'

export type MemoryBackend = 'memwal' | 'walrus-http'

export interface WriteMemoryResult {
  backend: MemoryBackend
  /** Walrus blob id — the durable identifier. */
  blobId: string
  /** MemWal record/job id (MemWal backend only). */
  memoryId?: string
  encrypted: boolean
  /** Resolvable aggregator URL for the blob (use as the ENS `agent-memory` value). */
  url: string
  namespace?: string
}

export interface RecallResultItem {
  blobId: string
  text: string
  /** Lower = more similar. */
  distance: number
}

function publisherUrl(): string {
  return (process.env.WALRUS_PUBLISHER_URL ?? TESTNET_PUBLISHER).replace(/\/$/, '')
}
function aggregatorUrl(): string {
  return (process.env.WALRUS_AGGREGATOR_URL ?? TESTNET_AGGREGATOR).replace(/\/$/, '')
}
function blobUrl(blobId: string): string {
  return `${aggregatorUrl()}/v1/blobs/${blobId}`
}

export function isMemWalConfigured(): boolean {
  return Boolean(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let memwalClient: any = null

/** Lazily construct the MemWal client (kept optional so the repo compiles without it). */
async function getMemWal(): Promise<any | null> {
  if (!isMemWalConfigured()) return null
  if (memwalClient) return memwalClient
  const pkg = '@mysten-incubation/memwal'
  let mod: any
  try {
    mod = await import(pkg)
  } catch {
    // Package not installed — fall back to the HTTP publisher.
    return null
  }
  memwalClient = mod.MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? STAGING_RELAYER,
    namespace: process.env.MEMWAL_NAMESPACE ?? 'alchm',
  })
  return memwalClient
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface WriteMemoryOptions {
  /** The memory content (a persona snapshot JSON, a conversation, a fact). */
  content: string
  /** Isolation scope — e.g. `agent:plato`. MemWal scopes memory per owner+namespace. */
  namespace?: string
}

/**
 * Persist a memory. Uses MemWal (encrypted, semantic) when configured, else the
 * raw Walrus HTTP publisher. Returns the blobId + resolvable URL.
 */
export async function writeMemory(opts: WriteMemoryOptions): Promise<WriteMemoryResult> {
  const mw = await getMemWal()
  if (mw) {
    // remember + wait for the async job (embed → SEAL encrypt → Walrus upload → index).
    const res = await mw.rememberAndWait(opts.content, opts.namespace)
    const blobId: string = res?.blob_id ?? res?.blobId
    if (!blobId) throw new Error('MemWal returned no blob_id')
    return {
      backend: 'memwal',
      blobId,
      memoryId: res?.id ?? res?.job_id,
      encrypted: true,
      url: blobUrl(blobId),
      namespace: opts.namespace,
    }
  }

  // Fallback: raw Walrus HTTP publisher (public testnet publisher pays storage).
  const epochs = Number(process.env.WALRUS_EPOCHS ?? 5)
  const res = await fetch(`${publisherUrl()}/v1/blobs?epochs=${epochs}`, {
    method: 'PUT',
    body: opts.content,
  })
  if (!res.ok) {
    throw new Error(`Walrus publisher ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = (await res.json()) as {
    newlyCreated?: { blobObject?: { blobId?: string } }
    alreadyCertified?: { blobId?: string }
  }
  const blobId = json?.newlyCreated?.blobObject?.blobId ?? json?.alreadyCertified?.blobId
  if (!blobId) throw new Error('Walrus publisher returned no blobId')
  return {
    backend: 'walrus-http',
    blobId,
    encrypted: false,
    url: blobUrl(blobId),
    namespace: opts.namespace,
  }
}

/** Read a blob's bytes back as a string (aggregator GET — no wallet/auth needed). */
export async function readBlob(blobId: string): Promise<string> {
  const res = await fetch(blobUrl(blobId))
  if (!res.ok) throw new Error(`Walrus aggregator ${res.status} for blob ${blobId}`)
  return res.text()
}

export interface RecallOptions {
  query: string
  namespace?: string
  limit?: number
  /** Drop results with distance >= this (client-side). */
  maxDistance?: number
}

/**
 * Semantic recall over an agent's memories. MemWal-only — returns [] on the HTTP
 * fallback (raw Walrus has no vector search).
 */
export async function recallMemory(opts: RecallOptions): Promise<RecallResultItem[]> {
  const mw = await getMemWal()
  if (!mw) return []
  const r = await mw.recall({
    query: opts.query,
    namespace: opts.namespace,
    limit: opts.limit ?? 10,
    maxDistance: opts.maxDistance,
  })
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (r?.results ?? []).map((x: any) => ({
    blobId: x.blob_id ?? x.blobId,
    text: x.text,
    distance: x.distance,
  }))
}
