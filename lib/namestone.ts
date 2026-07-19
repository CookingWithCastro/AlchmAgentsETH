/**
 * NameStone client — gasless offchain ENS subnames (+ text records) under our
 * parent domain (e.g. `plato.alchmagents.eth`). One-time on-chain setup: point
 * the parent domain's ENS resolver at NameStone's resolver
 * (0xA87361C4E58B619c390f469B9E6F27d759715125) and enable the domain; thereafter
 * every subname + text record is a gasless API call that resolves on mainnet via
 * CCIP-Read.
 *
 * Verified API surface (docs):
 *   BASE  https://namestone.com/api/public_v1        ← note: public_v1, not v1
 *   AUTH  header `Authorization: <API_KEY>`          ← raw key, no "Bearer"
 *   POST  /set-name      { domain, name, address?, contenthash?, text_records?, coin_types? }
 *   POST  /set-names     { domain, names: [...] }    ← max 50 names/request
 *   GET   /get-names     ?domain&address&limit&offset&text_records
 *   POST  /delete-name   { domain, name }            ← POST, not DELETE
 *
 * `set-name` is an upsert: creating an existing subname updates it (no "already
 * taken" error to special-case).
 *
 * Env: NAMESTONE_API_KEY (required), NAMESTONE_DOMAIN (parent, e.g. alchmagents.eth),
 *      NAMESTONE_API_URL (override base), NAMESTONE_DEFAULT_ADDRESS (fallback addr).
 */

import { buildAgentTextRecords, ensLabel } from '@/lib/erc8004/ensip'

const NAMESTONE_BASE = process.env.NAMESTONE_API_URL ?? 'https://namestone.com/api/public_v1'

/** Max names accepted by a single /set-names request (documented). */
export const NAMESTONE_MAX_BATCH = 50

export class NameStoneError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(`NameStone ${status}: ${message}`)
    this.name = 'NameStoneError'
  }
}

export interface NameStoneSubname {
  name: string
  address?: string
  contenthash?: string
  text_records?: Record<string, string>
  coin_types?: Record<string, string>
}

function requireApiKey(): string {
  const key = process.env.NAMESTONE_API_KEY
  if (!key) throw new Error('NAMESTONE_API_KEY is not set')
  return key
}

function requireDomain(domain?: string): string {
  const d = domain ?? process.env.NAMESTONE_DOMAIN
  if (!d) throw new Error('NAMESTONE_DOMAIN is not set (e.g. "alchmagents.eth")')
  return d
}

async function nsFetch<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${NAMESTONE_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: requireApiKey(),
      ...(init.headers ?? {}),
    },
  })
  const raw = await res.text()
  let json: unknown
  try {
    json = raw ? JSON.parse(raw) : {}
  } catch {
    json = { raw }
  }
  if (!res.ok) {
    const msg = (json as { error?: string })?.error ?? raw ?? res.statusText
    throw new NameStoneError(res.status, msg, json)
  }
  return json as T
}

export interface SetSubnameInput {
  /** The label (e.g. "plato"), NOT the full name. */
  name: string
  address?: string
  domain?: string
  textRecords?: Record<string, string>
  coinTypes?: Record<string, string>
  contenthash?: string
}

/**
 * Create or update a single subname (e.g. map `plato` under `alchmagents.eth` to
 * an address + ENSIP-25/26 text records). Idempotent upsert.
 */
export async function setSubname(input: SetSubnameInput): Promise<void> {
  await nsFetch('/set-name', {
    method: 'POST',
    body: JSON.stringify({
      domain: requireDomain(input.domain),
      name: input.name,
      address: input.address,
      contenthash: input.contenthash,
      text_records: input.textRecords,
      coin_types: input.coinTypes,
    }),
  })
}

export interface BulkSetResult {
  processed: number
  batches: number
}

/**
 * Batch-create subnames, chunked to NameStone's 50-per-request limit.
 * For ~3,960 agents this is ~80 requests.
 */
export async function bulkSetSubnames(
  names: NameStoneSubname[],
  opts?: { domain?: string; onBatch?: (i: number, total: number, processed: number) => void }
): Promise<BulkSetResult> {
  const domain = requireDomain(opts?.domain)
  let processed = 0
  let batches = 0
  const totalBatches = Math.ceil(names.length / NAMESTONE_MAX_BATCH)
  for (let i = 0; i < names.length; i += NAMESTONE_MAX_BATCH) {
    const chunk = names.slice(i, i + NAMESTONE_MAX_BATCH)
    const r = await nsFetch<{ processed?: number }>('/set-names', {
      method: 'POST',
      body: JSON.stringify({ domain, names: chunk }),
    })
    processed += r?.processed ?? chunk.length
    batches += 1
    opts?.onBatch?.(batches, totalBatches, processed)
  }
  return { processed, batches }
}

export interface GetNamesOptions {
  domain?: string
  /** One or more addresses (comma-separated) to filter by. */
  address?: string
  limit?: number
  offset?: number
  /** Include text records (default true). */
  textRecords?: boolean
}

/** List subnames under a domain (optionally filtered by address). */
export async function getNames(opts?: GetNamesOptions): Promise<NameStoneSubname[]> {
  const p = new URLSearchParams()
  p.set('domain', requireDomain(opts?.domain))
  if (opts?.address) p.set('address', opts.address)
  if (opts?.limit != null) p.set('limit', String(opts.limit))
  if (opts?.offset != null) p.set('offset', String(opts.offset))
  p.set('text_records', opts?.textRecords === false ? '0' : '1')
  return nsFetch<NameStoneSubname[]>(`/get-names?${p.toString()}`, { method: 'GET' })
}

/** Delete a subname. */
export async function deleteName(name: string, opts?: { domain?: string }): Promise<void> {
  await nsFetch('/delete-name', {
    method: 'POST',
    body: JSON.stringify({ domain: requireDomain(opts?.domain), name }),
  })
}

/**
 * Exact-match lookup of a single subname (with its text records) via
 * GET /search-names?exact_match=1. Returns null when the name doesn't exist.
 */
export async function getSubname(
  name: string,
  opts?: { domain?: string }
): Promise<NameStoneSubname | null> {
  const p = new URLSearchParams()
  p.set('domain', requireDomain(opts?.domain))
  p.set('name', name)
  p.set('exact_match', '1')
  p.set('text_records', '1')
  p.set('limit', '1')
  const rows = await nsFetch<NameStoneSubname[]>(`/search-names?${p.toString()}`, {
    method: 'GET',
  })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/**
 * Read-merge-write subname upsert. NameStone does NOT document whether
 * /set-name merges or replaces text_records on update, so partial writers
 * (agent-create, world-id stamp, memory snapshot, on-chain registration) MUST
 * go through this — a plain setSubname with a partial record set could silently
 * erase the other flows' records (e.g. a human-verified stamp deleting
 * agent-endpoint[a2a] and agent-wallet[x402]). New keys win; existing keys and
 * the existing address are preserved unless overridden.
 */
export async function mergeSetSubname(input: SetSubnameInput): Promise<void> {
  let existing: NameStoneSubname | null = null
  try {
    existing = await getSubname(input.name, { domain: input.domain })
  } catch {
    // Lookup failure degrades to a plain upsert — better a partial write than
    // no write at all (the name may simply not exist yet).
  }

  const existingRecords =
    (existing as { text_records?: Record<string, string>; textRecords?: Record<string, string> })
      ?.text_records ??
    (existing as { textRecords?: Record<string, string> })?.textRecords ??
    {}

  await setSubname({
    ...input,
    address: input.address ?? (existing as { address?: string })?.address,
    textRecords: { ...existingRecords, ...(input.textRecords ?? {}) },
  })
}

/**
 * On-demand hook: assign a newly-created agent its gasless ENS subname.
 * Best-effort + non-blocking — silently no-ops if NameStone isn't configured
 * or no address is resolvable, so it never breaks agent creation.
 */
export async function registerAgentSubnameOnCreate(
  agent:
    | { id?: string; agentId?: string; slug?: string; name?: string; walletAddress?: string }
    | null
    | undefined,
  params?: {
    walletAddress?: string
    slug?: string
    id?: string
    /** Per-agent x402 payment wallet — published as agent-wallet[x402]. */
    paymentAddress?: string
    paymentChain?: string
  } | null
): Promise<void> {
  if (!process.env.NAMESTONE_API_KEY || !process.env.NAMESTONE_DOMAIN) return
  const slug = agent?.slug ?? agent?.agentId ?? agent?.id ?? params?.slug ?? params?.id
  if (!slug) return
  const address =
    params?.walletAddress ?? agent?.walletAddress ?? process.env.NAMESTONE_DEFAULT_ADDRESS
  if (!address) return

  const label = ensLabel(String(slug))
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  // merge (not plain set): other flows write their own partial records for
  // this name (human-verified, agent-memory, agent-registration) and NameStone
  // upsert semantics are undocumented — never clobber them.
  await mergeSetSubname({
    name: label,
    address,
    textRecords: buildAgentTextRecords({
      context: agent?.name
        ? `${agent.name} — an Alchm planetary/historical agent.`
        : `Alchm agent ${label}.`,
      webUrl: site ? `${site}/agents/${label}` : undefined,
      paymentAddress: params?.paymentAddress,
      paymentChain: params?.paymentChain ?? (params?.paymentAddress ? 'base' : undefined),
    }),
  })
}
