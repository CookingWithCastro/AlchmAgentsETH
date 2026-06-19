/**
 * ERC-8004 BigQuery indexer — runs the generated queries (bigquery-queries.ts)
 * against the Ethereum mainnet public dataset and decodes the results into typed
 * registry objects + a ranking-app leaderboard.
 *
 * Auth: uses Application Default Credentials. Set either:
 *   • GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json, or
 *   • run on GCP with an attached service account / `gcloud auth application-default login`.
 * Project: GOOGLE_CLOUD_PROJECT (or GCP_PROJECT). Location defaults to "US"
 * (the public dataset lives in the US multi-region).
 *
 * SQL does the partition-pruned filtering + cheap SUBSTR/SAFE_CAST decode; this
 * layer re-decodes each log with viem (`decodeEventLog`) for exact, typed values
 * (BigInt agentId, checksummed addresses, multi-field reputation events).
 *
 * NOTE: requires `@google-cloud/bigquery` — install with:
 *   bun add @google-cloud/bigquery
 * It is lazy-loaded so the rest of the repo compiles/runs without it.
 */

import { decodeEventLog, getAddress, hexToString, type Address, type Hex } from 'viem'
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  VALIDATION_REGISTRY_ABI,
  globalAgentId,
} from './registry'
import {
  buildRegisteredQuery,
  buildUriUpdatedQuery,
  buildMetadataSetQuery,
  buildTransferQuery,
  buildNewFeedbackQuery,
  buildFeedbackRevokedQuery,
  buildValidationRequestQuery,
  buildValidationResponseQuery,
  type BigQuerySpec,
  type RegisteredQueryOptions,
  type MetadataSetQueryOptions,
  type TransferQueryOptions,
  type EventQueryOptions,
  type FeedbackQueryOptions,
  type ValidationQueryOptions,
} from './bigquery-queries'
import {
  safeParseRegistrationFile,
  qualifiesForPrize,
  type Erc8004RegistrationFile,
} from './registration-file'

// ── result types ─────────────────────────────────────────────────────────────

export interface RawLogRow {
  block_number: number
  block_timestamp: { value: string } | string
  transaction_hash: string
  log_index: number
  address: string
  topics: string[]
  data: string
  [decodedColumn: string]: unknown
}

export interface AgentRegistration {
  agentId: bigint
  owner: Address
  agentURI: string
  globalId: string
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface UriUpdate {
  agentId: bigint
  newURI: string
  updatedBy: Address
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface MetadataEntry {
  agentId: bigint
  /** topics[2] = keccak256(metadataKey). */
  keyHash: Hex
  /** Plaintext metadata key (e.g. "agentWallet"). */
  key: string
  /** Raw metadataValue bytes (hex). */
  value: Hex
  /** Best-effort UTF-8 decode of the value bytes (undefined if non-text). */
  valueUtf8?: string
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface TransferRow {
  from: Address
  to: Address
  tokenId: bigint
  blockNumber: number
  txHash: string
  timestamp: string
}

/** ReputationRegistry `NewFeedback` — a single client rating of an agent. */
export interface FeedbackRow {
  agentId: bigint
  client: Address
  feedbackIndex: bigint
  /** Raw signed fixed-point value. */
  value: bigint
  valueDecimals: number
  /** value / 10**valueDecimals — the human-readable rating. */
  normValue: number
  tag1?: string
  tag2?: string
  endpoint?: string
  feedbackURI?: string
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface FeedbackRevocation {
  agentId: bigint
  client: Address
  feedbackIndex: bigint
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface ValidationResponseRow {
  validator: Address
  agentId: bigint
  requestHash: Hex
  /** 0–100 (0 = fail, 100 = pass). */
  response: number
  responseURI?: string
  tag?: string
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface ValidationRequestRow {
  validator: Address
  agentId: bigint
  requestURI?: string
  requestHash: Hex
  blockNumber: number
  txHash: string
  timestamp: string
}

export interface LeaderboardEntry {
  agentId: bigint
  globalId: string
  owner: Address
  agentURI: string
  /** Parsed registration file, if the URI resolved + validated. */
  file: Erc8004RegistrationFile | null
  prizeEligible: boolean
  supportedTrust: string[]
  /** Count of non-revoked client feedbacks. */
  feedbackCount: number
  /** Average normalized feedback rating, or null if none. */
  avgFeedback: number | null
  /** Count of validation responses. */
  validationCount: number
  /** Average validation response (0–100), or null if none. */
  avgValidation: number | null
  /** Fraction of validation responses at/above the pass threshold, or null. */
  validationPassRate: number | null
  /** Composite ranking score (feedback + validation + prize bonus). */
  score: number
  registeredAt: string
}

export interface IndexerConfig {
  projectId?: string
  /** BigQuery processing location; public Ethereum dataset is "US". */
  location?: string
}

// ── lazy BigQuery client (so the package stays optional) ─────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
let bqClient: any = null

async function getBigQuery(config: IndexerConfig): Promise<any> {
  if (bqClient) return bqClient
  let mod: any
  try {
    // Keep the specifier static so Next/Vercel includes the installed package in
    // the server function bundle. A variable import was omitted at deployment.
    mod = await import('@google-cloud/bigquery')
  } catch {
    throw new Error('The BigQuery client could not be loaded by this deployment.')
  }
  const BigQuery = mod.BigQuery
  bqClient = new BigQuery({
    projectId: config.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT,
  })
  return bqClient
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── helpers ──────────────────────────────────────────────────────────────────

function ts(row: RawLogRow): string {
  const v = row.block_timestamp
  return typeof v === 'string' ? v : (v?.value ?? '')
}

function topicsOf(row: RawLogRow): [Hex, ...Hex[]] {
  return (row.topics ?? []).map(t => t as Hex) as [Hex, ...Hex[]]
}

function dataOf(row: RawLogRow): Hex {
  return (row.data && row.data !== '' ? row.data : '0x') as Hex
}

// ── the indexer ──────────────────────────────────────────────────────────────

export class Erc8004Indexer {
  constructor(private readonly config: IndexerConfig = {}) {}

  /** Execute a generated spec and return raw rows. */
  async runQuery(spec: BigQuerySpec): Promise<RawLogRow[]> {
    const bq = await getBigQuery(this.config)
    const [rows] = await bq.query({
      query: spec.query,
      params: spec.params,
      location: this.config.location ?? 'US',
    })
    return rows as RawLogRow[]
  }

  /**
   * Estimate bytes scanned without running the query (the slide's "dry-run any
   * query to see cost first" — 1 TB/month is free). Returns bytes + a GB string.
   */
  async dryRun(spec: BigQuerySpec): Promise<{ bytesProcessed: number; gib: string }> {
    const bq = await getBigQuery(this.config)
    const [job] = await bq.createQueryJob({
      query: spec.query,
      params: spec.params,
      location: this.config.location ?? 'US',
      dryRun: true,
    })
    const bytes = Number(job.metadata?.statistics?.totalBytesProcessed ?? 0)
    return { bytesProcessed: bytes, gib: (bytes / 1024 ** 3).toFixed(4) }
  }

  // ── typed event readers ────────────────────────────────────────────────────

  async getRegistrations(opts: RegisteredQueryOptions = {}): Promise<AgentRegistration[]> {
    const rows = await this.runQuery(buildRegisteredQuery(opts))
    return rows.map(row => {
      let agentId: bigint
      let owner: Address
      let agentURI: string
      try {
        const { args } = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          eventName: 'Registered',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as { args: { agentId: bigint; agentURI: string; owner: Address } }
        agentId = args.agentId
        owner = getAddress(args.owner)
        agentURI = args.agentURI
      } catch {
        // Fall back to the SQL-decoded columns.
        agentId = BigInt((row.agent_id as number | string | null) ?? 0)
        owner = getAddress(String(row.owner))
        agentURI = String(row.agent_uri ?? '')
      }
      return {
        agentId,
        owner,
        agentURI,
        globalId: globalAgentId(agentId),
        blockNumber: row.block_number,
        txHash: row.transaction_hash,
        timestamp: ts(row),
      }
    })
  }

  async getUriUpdates(
    opts: { agentId?: bigint | number } & EventQueryOptions = {}
  ): Promise<UriUpdate[]> {
    const rows = await this.runQuery(buildUriUpdatedQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          eventName: 'URIUpdated',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as { args: { agentId: bigint; newURI: string; updatedBy: Address } }
        return {
          agentId: args.agentId,
          newURI: args.newURI,
          updatedBy: getAddress(args.updatedBy),
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          agentId: BigInt((row.agent_id as number) ?? 0),
          newURI: String(row.new_uri ?? ''),
          updatedBy: getAddress(String(row.updated_by)),
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  async getMetadata(opts: MetadataSetQueryOptions = {}): Promise<MetadataEntry[]> {
    const rows = await this.runQuery(buildMetadataSetQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          eventName: 'MetadataSet',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as {
          args: {
            agentId: bigint
            indexedMetadataKey: Hex
            metadataKey: string
            metadataValue: Hex
          }
        }
        let valueUtf8: string | undefined
        try {
          valueUtf8 = hexToString(args.metadataValue)
        } catch {
          valueUtf8 = undefined
        }
        return {
          agentId: args.agentId,
          keyHash: args.indexedMetadataKey,
          key: args.metadataKey,
          value: args.metadataValue,
          valueUtf8,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          agentId: BigInt((row.agent_id as number) ?? 0),
          keyHash: String(row.key_hash) as Hex,
          key: String(row.metadata_key ?? ''),
          value: '0x' as Hex,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  async getTransfers(opts: TransferQueryOptions = {}): Promise<TransferRow[]> {
    const rows = await this.runQuery(buildTransferQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          eventName: 'Transfer',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as { args: { from: Address; to: Address; tokenId: bigint } }
        return {
          from: getAddress(args.from),
          to: getAddress(args.to),
          tokenId: args.tokenId,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          from: getAddress(String(row.from_address)),
          to: getAddress(String(row.to_address)),
          tokenId: BigInt((row.token_id as number) ?? 0),
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  /** ReputationRegistry `NewFeedback` — client ratings (agentId indexed, no join). */
  async getFeedback(opts: FeedbackQueryOptions = {}): Promise<FeedbackRow[]> {
    const rows = await this.runQuery(buildNewFeedbackQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: REPUTATION_REGISTRY_ABI,
          eventName: 'NewFeedback',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as {
          args: {
            agentId: bigint
            clientAddress: Address
            feedbackIndex: bigint
            value: bigint
            valueDecimals: number
            tag1: string
            tag2: string
            endpoint: string
            feedbackURI: string
          }
        }
        const decimals = Number(args.valueDecimals)
        return {
          agentId: args.agentId,
          client: getAddress(args.clientAddress),
          feedbackIndex: args.feedbackIndex,
          value: args.value,
          valueDecimals: decimals,
          normValue: Number(args.value) / 10 ** decimals,
          tag1: args.tag1,
          tag2: args.tag2,
          endpoint: args.endpoint,
          feedbackURI: args.feedbackURI,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          agentId: BigInt((row.agent_id as number) ?? 0),
          client: getAddress(String(row.client_address)),
          feedbackIndex: 0n,
          value: 0n,
          valueDecimals: 0,
          normValue: 0,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  /** ReputationRegistry `FeedbackRevoked` — used to exclude revoked feedback from ranking. */
  async getFeedbackRevocations(
    opts: { agentId?: bigint | number } & EventQueryOptions = {}
  ): Promise<FeedbackRevocation[]> {
    const rows = await this.runQuery(buildFeedbackRevokedQuery(opts))
    return rows.map(row => ({
      agentId: BigInt((row.agent_id as number) ?? 0),
      client: getAddress(String(row.client_address)),
      feedbackIndex: BigInt((row.feedback_index as number) ?? 0),
      blockNumber: row.block_number,
      txHash: row.transaction_hash,
      timestamp: ts(row),
    }))
  }

  /** ValidationRegistry `ValidationRequest`. */
  async getValidationRequests(opts: ValidationQueryOptions = {}): Promise<ValidationRequestRow[]> {
    const rows = await this.runQuery(buildValidationRequestQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: VALIDATION_REGISTRY_ABI,
          eventName: 'ValidationRequest',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as {
          args: { validatorAddress: Address; agentId: bigint; requestURI: string; requestHash: Hex }
        }
        return {
          validator: getAddress(args.validatorAddress),
          agentId: args.agentId,
          requestURI: args.requestURI,
          requestHash: args.requestHash,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          validator: getAddress(String(row.validator)),
          agentId: BigInt((row.agent_id as number) ?? 0),
          requestHash: String(row.request_hash) as Hex,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  /** ValidationRegistry `ValidationResponse` — score 0–100, agentId indexed (no join). */
  async getValidationResponses(
    opts: ValidationQueryOptions = {}
  ): Promise<ValidationResponseRow[]> {
    const rows = await this.runQuery(buildValidationResponseQuery(opts))
    return rows.map(row => {
      try {
        const { args } = decodeEventLog({
          abi: VALIDATION_REGISTRY_ABI,
          eventName: 'ValidationResponse',
          data: dataOf(row),
          topics: topicsOf(row),
        }) as {
          args: {
            validatorAddress: Address
            agentId: bigint
            requestHash: Hex
            response: number
            responseURI: string
            tag: string
          }
        }
        return {
          validator: getAddress(args.validatorAddress),
          agentId: args.agentId,
          requestHash: args.requestHash,
          response: Number(args.response),
          responseURI: args.responseURI,
          tag: args.tag,
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      } catch {
        return {
          validator: getAddress(String(row.validator)),
          agentId: BigInt((row.agent_id as number) ?? 0),
          requestHash: String(row.request_hash) as Hex,
          response: Number(row.response ?? 0),
          blockNumber: row.block_number,
          txHash: row.transaction_hash,
          timestamp: ts(row),
        }
      }
    })
  }

  // ── registration file resolution ────────────────────────────────────────────

  /** Resolve + parse an agent's registration file from its `agentURI`. */
  async resolveRegistrationFile(agentURI: string): Promise<Erc8004RegistrationFile | null> {
    try {
      const json = await fetchUriJson(agentURI)
      return safeParseRegistrationFile(json)
    } catch {
      return null
    }
  }

  // ── ranking app surface ──────────────────────────────────────────────────────

  /**
   * Build a ranked leaderboard of agents — the Google Cloud "ranking app" surface
   * ("discover trustworthy, payable agents"). Aggregates ReputationRegistry
   * `NewFeedback` (minus `FeedbackRevoked`) and ValidationRegistry
   * `ValidationResponse` per agentId (both indexed → no request-hash join), then
   * ranks by a composite of feedback rating + validation pass rate, surfacing
   * x402-payable (`prizeEligible`) agents first. Reputation + file resolution
   * degrade gracefully.
   *
   * @param passThreshold validation response score counted as "pass" (default 50).
   */
  async buildLeaderboard(
    opts: {
      limit?: number
      resolveFiles?: boolean
      reputation?: boolean
      passThreshold?: number
    } = {}
  ): Promise<LeaderboardEntry[]> {
    const { limit = 100, resolveFiles = true, reputation = true, passThreshold = 50 } = opts
    const registrations = await this.getRegistrations({ limit })

    const feedbackByAgent = new Map<string, number[]>() // agentId → normalized ratings
    const validationByAgent = new Map<string, number[]>() // agentId → responses 0–100
    if (reputation) {
      try {
        const [feedback, revocations, responses] = await Promise.all([
          this.getFeedback({ limit: 5000 }),
          this.getFeedbackRevocations({ limit: 5000 }),
          this.getValidationResponses({ limit: 5000 }),
        ])
        const revoked = new Set(
          revocations.map(r => `${r.agentId}:${r.client.toLowerCase()}:${r.feedbackIndex}`)
        )
        for (const f of feedback) {
          if (revoked.has(`${f.agentId}:${f.client.toLowerCase()}:${f.feedbackIndex}`)) continue
          const k = f.agentId.toString()
          ;(feedbackByAgent.get(k) ?? feedbackByAgent.set(k, []).get(k)!).push(f.normValue)
        }
        for (const r of responses) {
          const k = r.agentId.toString()
          ;(validationByAgent.get(k) ?? validationByAgent.set(k, []).get(k)!).push(r.response)
        }
      } catch {
        // Reputation/Validation registries empty or unavailable — rank on registration only.
      }
    }

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

    const entries: LeaderboardEntry[] = []
    for (const reg of registrations) {
      const file = resolveFiles ? await this.resolveRegistrationFile(reg.agentURI) : null
      const fb = feedbackByAgent.get(reg.agentId.toString()) ?? []
      const val = validationByAgent.get(reg.agentId.toString()) ?? []
      const avgFeedback = fb.length ? mean(fb) : null
      const avgValidation = val.length ? mean(val) : null
      const validationPassRate = val.length
        ? val.filter(v => v >= passThreshold).length / val.length
        : null
      const prizeEligible = file ? qualifiesForPrize(file) : false

      // Composite: 60% feedback (clamped to 0–100), 40% validation pass %, +5 x402 bonus.
      const fComp = avgFeedback != null ? Math.max(0, Math.min(100, avgFeedback)) : 0
      const vComp = validationPassRate != null ? validationPassRate * 100 : 0
      const base = fb.length || val.length ? 0.6 * fComp + 0.4 * vComp : 0
      const score = base + (prizeEligible ? 5 : 0)

      entries.push({
        agentId: reg.agentId,
        globalId: reg.globalId,
        owner: reg.owner,
        agentURI: reg.agentURI,
        file,
        prizeEligible,
        supportedTrust: file?.supportedTrust ?? [],
        feedbackCount: fb.length,
        avgFeedback,
        validationCount: val.length,
        avgValidation,
        validationPassRate,
        score,
        registeredAt: reg.timestamp,
      })
    }

    // Rank: x402-payable first, then composite score, then recency.
    entries.sort((a, b) => {
      if (a.prizeEligible !== b.prizeEligible) return a.prizeEligible ? -1 : 1
      if (b.score !== a.score) return b.score - a.score
      return b.registeredAt.localeCompare(a.registeredAt)
    })
    return entries
  }
}

/** Fetch + JSON-parse a registration file from ipfs:// , http(s):// , or data: URIs. */
export async function fetchUriJson(uri: string): Promise<unknown> {
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',')
    const meta = uri.slice(5, comma)
    const payload = uri.slice(comma + 1)
    const decoded = meta.includes('base64')
      ? Buffer.from(payload, 'base64').toString('utf8')
      : decodeURIComponent(payload)
    return JSON.parse(decoded)
  }
  let url = uri
  if (uri.startsWith('ipfs://')) {
    const gateway = process.env.IPFS_GATEWAY ?? 'https://ipfs.io/ipfs/'
    url = gateway.replace(/\/$/, '/') + uri.replace(/^ipfs:\/\/(ipfs\/)?/, '')
  }
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
  return res.json()
}
