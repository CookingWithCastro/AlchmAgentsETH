/**
 * BigQuery SQL generator for the ERC-8004 mainnet registry.
 *
 * Targets the Google public dataset (zero infra, ~near real time):
 *   `bigquery-public-data.goog_blockchain_ethereum_mainnet_us.logs`
 *
 * Log-event mapping rules (from the "BigQuery: all of Ethereum" spec slide):
 *   • address              = LOWERCASE registry address
 *   • topics[OFFSET(0)]    = LOWERCASE event signature hash (topic0)
 *   • topics[OFFSET(1..3)] = padded indexed parameters
 *   • data                 = non-indexed ABI-encoded params (decode w/ SUBSTR + SAFE_CAST)
 *   • PARTITION PRUNING    = always append `block_timestamp >= '2026-01-28'`
 *                            (registry launch date — prunes scanned partitions)
 *
 * Each builder returns a {@link BigQuerySpec}: a `query` string plus named
 * `params`, ready to hand to `@google-cloud/bigquery`'s `query({ query, params })`.
 * Registry address + topic0 + indexed filters are passed as parameters (safe,
 * no injection); the partition floor + LIMIT are validated and inlined so the
 * optimizer can prune partitions and bound the result set.
 */

import type { Address, Hex } from 'viem'
import {
  IDENTITY_REGISTRY,
  REPUTATION_REGISTRY,
  VALIDATION_REGISTRY,
  TOPIC0,
  hashIndexedString,
  uintTopic,
  addressTopic,
} from './registry'

/** The only table that matters: decoded-friendly raw logs for all of mainnet. */
export const ETHEREUM_LOGS_TABLE = 'bigquery-public-data.goog_blockchain_ethereum_mainnet_us.logs'

/** ERC-8004 launch date — the partition-pruning floor appended to every query. */
export const ERC8004_LAUNCH_DATE = '2026-01-28'

/** Default / max rows returned (LIMIT is inlined, so we clamp it ourselves). */
const DEFAULT_LIMIT = 1000
const MAX_LIMIT = 50_000

export interface BigQuerySpec {
  /** Full Standard-SQL query, including the HEX_TO_INT temp UDF. */
  query: string
  /** Named query parameters consumed by `bigquery.query({ params })`. */
  params: Record<string, string>
}

export interface EventQueryOptions {
  /** Override the registry address (defaults per-event to the right singleton). */
  registry?: Address
  /** Partition floor (YYYY-MM-DD). Defaults to {@link ERC8004_LAUNCH_DATE}. */
  sinceDate?: string
  /** Max rows. Clamped to [1, 50000]. Defaults to 1000. */
  limit?: number
  /** Sort ascending by block instead of newest-first. */
  ascending?: boolean
}

// ── small SQL fragment helpers (the SUBSTR + SAFE_CAST decode kit) ───────────

/**
 * Self-contained JS temp UDF: hex string → INT64. Used to decode padded uint
 * topics and ABI string lengths. (agentId/tokenId are counters well within INT64.)
 */
const HEX_TO_INT_UDF = `CREATE TEMP FUNCTION HEX_TO_INT(h STRING) RETURNS INT64 LANGUAGE js AS r"""
  if (h === null || h === undefined || h === '') return null;
  try { return Number(BigInt('0x' + String(h).replace(/^0x/, ''))); } catch (e) { return null; }
""";`

/** Decode an indexed uint topic (full 32 bytes) at the given topic offset. */
const uintFromTopic = (i: number) => `HEX_TO_INT(SUBSTR(topics[SAFE_OFFSET(${i})], 3))`

/** Decode an indexed address topic (rightmost 20 bytes / 40 hex chars). */
const addressFromTopic = (i: number) => `CONCAT('0x', SUBSTR(topics[SAFE_OFFSET(${i})], 27))`

/**
 * Decode the FIRST dynamic `string` in `data` (single-string ABI layout):
 *   data = 0x | [32B offset=0x20] | [32B length L] | [L bytes content, padded]
 * → length word at hex chars 67..130, content begins at char 131.
 */
const FIRST_STRING_FROM_DATA = `SAFE_CONVERT_BYTES_TO_STRING(FROM_HEX(SUBSTR(data, 131, HEX_TO_INT(SUBSTR(data, 67, 64)) * 2)))`

/**
 * Decode the leading `string` when `data` holds (string, bytes) — the MetadataSet
 * layout. Two head words push the string's length word to the 0x40 offset (hex
 * chars 131..194); its content begins at char 195. (`metadataValue` bytes is the
 * second field — decode it in Node via viem.)
 */
const METADATA_KEY_FROM_DATA = `SAFE_CONVERT_BYTES_TO_STRING(FROM_HEX(SUBSTR(data, 195, HEX_TO_INT(SUBSTR(data, 131, 64)) * 2)))`

/** Decode a leading uint word from `data` (first 32 bytes), e.g. a uint8 score. */
const FIRST_UINT_FROM_DATA = `HEX_TO_INT(SUBSTR(data, 3, 64))`

function assertDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`ERC-8004 BigQuery: invalid date "${d}"`)
  return d
}

function clampLimit(n = DEFAULT_LIMIT): number {
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)))
}

/** Standard column set returned alongside any decoded fields. */
const RAW_COLUMNS =
  'block_number, block_timestamp, transaction_hash, log_index, address, topics, data'

interface CoreSpec {
  registry: Address
  topic0: Hex
  selectExtras: string[] // decoded SELECT expressions, e.g. "<expr> AS agent_id"
  extraWhere?: { sql: string; params: Record<string, string> }
  opts: EventQueryOptions
}

/** Shared assembler: WHERE registry + topic0 + partition floor (+ extra topic filters). */
function buildCore({ registry, topic0, selectExtras, extraWhere, opts }: CoreSpec): BigQuerySpec {
  const floor = assertDate(opts.sinceDate ?? ERC8004_LAUNCH_DATE)
  const limit = clampLimit(opts.limit)
  const order = opts.ascending ? 'ASC' : 'DESC'

  const params: Record<string, string> = {
    registry: registry.toLowerCase(),
    topic0: topic0.toLowerCase(),
    ...(extraWhere?.params ?? {}),
  }

  const select = [RAW_COLUMNS, ...selectExtras].join(',\n  ')
  const query = `${HEX_TO_INT_UDF}
SELECT
  ${select}
FROM \`${ETHEREUM_LOGS_TABLE}\`
WHERE address = @registry
  AND topics[SAFE_OFFSET(0)] = @topic0
  AND block_timestamp >= TIMESTAMP('${floor}')${extraWhere ? `\n  ${extraWhere.sql}` : ''}
ORDER BY block_number ${order}, log_index ${order}
LIMIT ${limit}`

  return { query, params }
}

// ── IdentityRegistry events ──────────────────────────────────────────────────

export interface RegisteredQueryOptions extends EventQueryOptions {
  /** Filter to a single agentId (indexed → topics[1]). */
  agentId?: bigint | number
  /** Filter to a single owner (indexed → topics[2]). */
  owner?: Address
}

/** `Registered(uint256 indexed agentId, string agentURI, address indexed owner)`. */
export function buildRegisteredQuery(opts: RegisteredQueryOptions = {}): BigQuerySpec {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (opts.agentId != null) {
    where.push('AND topics[SAFE_OFFSET(1)] = @agentIdTopic')
    params.agentIdTopic = uintTopic(opts.agentId)
  }
  if (opts.owner) {
    where.push('AND topics[SAFE_OFFSET(2)] = @ownerTopic')
    params.ownerTopic = addressTopic(opts.owner)
  }
  return buildCore({
    registry: opts.registry ?? IDENTITY_REGISTRY,
    topic0: TOPIC0.Registered,
    selectExtras: [
      `${uintFromTopic(1)} AS agent_id`,
      `${addressFromTopic(2)} AS owner`,
      `${FIRST_STRING_FROM_DATA} AS agent_uri`,
    ],
    extraWhere: where.length ? { sql: where.join('\n  '), params } : undefined,
    opts,
  })
}

export interface UriUpdatedQueryOptions extends EventQueryOptions {
  agentId?: bigint | number
}

/** `URIUpdated(uint256 indexed agentId, string newURI, address indexed by)`. */
export function buildUriUpdatedQuery(opts: UriUpdatedQueryOptions = {}): BigQuerySpec {
  const where =
    opts.agentId != null
      ? {
          sql: 'AND topics[SAFE_OFFSET(1)] = @agentIdTopic',
          params: { agentIdTopic: uintTopic(opts.agentId) },
        }
      : undefined
  return buildCore({
    registry: opts.registry ?? IDENTITY_REGISTRY,
    topic0: TOPIC0.URIUpdated,
    selectExtras: [
      `${uintFromTopic(1)} AS agent_id`,
      `${addressFromTopic(2)} AS updated_by`,
      `${FIRST_STRING_FROM_DATA} AS new_uri`,
    ],
    extraWhere: where,
    opts,
  })
}

export interface MetadataSetQueryOptions extends EventQueryOptions {
  agentId?: bigint | number
  /** Filter to a specific metadata key (indexed string → topics[2] = keccak256(key)). */
  key?: string
}

/**
 * `MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey,
 *              string metadataKey, bytes metadataValue)`.
 * The indexed key is hashed (topics[2] = keccak256(key)); the plaintext
 * `metadataKey` is decoded from `data`, and the `bytes metadataValue` (second
 * data field) is decoded in Node via viem. Filter by plaintext key via `opts.key`.
 */
export function buildMetadataSetQuery(opts: MetadataSetQueryOptions = {}): BigQuerySpec {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (opts.agentId != null) {
    where.push('AND topics[SAFE_OFFSET(1)] = @agentIdTopic')
    params.agentIdTopic = uintTopic(opts.agentId)
  }
  if (opts.key) {
    where.push('AND topics[SAFE_OFFSET(2)] = @keyHash')
    params.keyHash = hashIndexedString(opts.key)
  }
  return buildCore({
    registry: opts.registry ?? IDENTITY_REGISTRY,
    topic0: TOPIC0.MetadataSet,
    selectExtras: [
      `${uintFromTopic(1)} AS agent_id`,
      `topics[SAFE_OFFSET(2)] AS key_hash`,
      `${METADATA_KEY_FROM_DATA} AS metadata_key`,
      // metadataValue (bytes) is the 2nd data field — decode in Node via viem.
    ],
    extraWhere: where.length ? { sql: where.join('\n  '), params } : undefined,
    opts,
  })
}

export interface TransferQueryOptions extends EventQueryOptions {
  /** Filter by recipient (indexed → topics[2]); e.g. mints have from = 0x0. */
  to?: Address
  from?: Address
  tokenId?: bigint | number
}

/** `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)` (ERC-721). */
export function buildTransferQuery(opts: TransferQueryOptions = {}): BigQuerySpec {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (opts.from) {
    where.push('AND topics[SAFE_OFFSET(1)] = @fromTopic')
    params.fromTopic = addressTopic(opts.from)
  }
  if (opts.to) {
    where.push('AND topics[SAFE_OFFSET(2)] = @toTopic')
    params.toTopic = addressTopic(opts.to)
  }
  if (opts.tokenId != null) {
    where.push('AND topics[SAFE_OFFSET(3)] = @tokenIdTopic')
    params.tokenIdTopic = uintTopic(opts.tokenId)
  }
  return buildCore({
    registry: opts.registry ?? IDENTITY_REGISTRY,
    topic0: TOPIC0.Transfer,
    selectExtras: [
      `${addressFromTopic(1)} AS from_address`,
      `${addressFromTopic(2)} AS to_address`,
      `${uintFromTopic(3)} AS token_id`,
    ],
    extraWhere: where.length ? { sql: where.join('\n  '), params } : undefined,
    opts,
  })
}

// ── ReputationRegistry events ────────────────────────────────────────────────

export interface FeedbackQueryOptions extends EventQueryOptions {
  agentId?: bigint | number
  /** Filter to a single feedback author (indexed → topics[2]). */
  client?: Address
  /** Filter to a feedback tag (indexed string → topics[3] = keccak256(tag)). */
  tag1?: string
}

/**
 * `NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
 *  int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2,
 *  string endpoint, string feedbackURI, bytes32 feedbackHash)`.
 * SQL surfaces the indexed fields (agentId, client, tag1 hash); the signed
 * fixed-point `value`/`valueDecimals` + plaintext tags live in `data` and are
 * decoded in Node via viem (signed int128 isn't safe to decode in SQL).
 */
export function buildNewFeedbackQuery(opts: FeedbackQueryOptions = {}): BigQuerySpec {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (opts.agentId != null) {
    where.push('AND topics[SAFE_OFFSET(1)] = @agentIdTopic')
    params.agentIdTopic = uintTopic(opts.agentId)
  }
  if (opts.client) {
    where.push('AND topics[SAFE_OFFSET(2)] = @clientTopic')
    params.clientTopic = addressTopic(opts.client)
  }
  if (opts.tag1) {
    where.push('AND topics[SAFE_OFFSET(3)] = @tag1Hash')
    params.tag1Hash = hashIndexedString(opts.tag1)
  }
  return buildCore({
    registry: opts.registry ?? REPUTATION_REGISTRY,
    topic0: TOPIC0.NewFeedback,
    selectExtras: [
      `${uintFromTopic(1)} AS agent_id`,
      `${addressFromTopic(2)} AS client_address`,
      `topics[SAFE_OFFSET(3)] AS tag1_hash`,
      // value / valueDecimals / tags / hash are in `data` — decode in Node via viem.
    ],
    extraWhere: where.length ? { sql: where.join('\n  '), params } : undefined,
    opts,
  })
}

/** `FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)`. */
export function buildFeedbackRevokedQuery(
  opts: { agentId?: bigint | number } & EventQueryOptions = {}
): BigQuerySpec {
  const where =
    opts.agentId != null
      ? {
          sql: 'AND topics[SAFE_OFFSET(1)] = @agentIdTopic',
          params: { agentIdTopic: uintTopic(opts.agentId) },
        }
      : undefined
  return buildCore({
    registry: opts.registry ?? REPUTATION_REGISTRY,
    topic0: TOPIC0.FeedbackRevoked,
    selectExtras: [
      `${uintFromTopic(1)} AS agent_id`,
      `${addressFromTopic(2)} AS client_address`,
      `${uintFromTopic(3)} AS feedback_index`,
    ],
    extraWhere: where,
    opts,
  })
}

// ── ValidationRegistry events ────────────────────────────────────────────────

export interface ValidationQueryOptions extends EventQueryOptions {
  agentId?: bigint | number
}

/** `ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)`. */
export function buildValidationRequestQuery(opts: ValidationQueryOptions = {}): BigQuerySpec {
  const where =
    opts.agentId != null
      ? {
          sql: 'AND topics[SAFE_OFFSET(2)] = @agentIdTopic',
          params: { agentIdTopic: uintTopic(opts.agentId) },
        }
      : undefined
  return buildCore({
    registry: opts.registry ?? VALIDATION_REGISTRY,
    topic0: TOPIC0.ValidationRequest,
    selectExtras: [
      `${addressFromTopic(1)} AS validator`,
      `${uintFromTopic(2)} AS agent_id`,
      `topics[SAFE_OFFSET(3)] AS request_hash`,
      `${FIRST_STRING_FROM_DATA} AS request_uri`,
    ],
    extraWhere: where,
    opts,
  })
}

/**
 * `ValidationResponse(address indexed validatorAddress, uint256 indexed agentId,
 *  bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)`.
 * `response` is a uint8 0–100 (first data word). agentId is indexed (topic2) — no join needed.
 */
export function buildValidationResponseQuery(opts: ValidationQueryOptions = {}): BigQuerySpec {
  const where =
    opts.agentId != null
      ? {
          sql: 'AND topics[SAFE_OFFSET(2)] = @agentIdTopic',
          params: { agentIdTopic: uintTopic(opts.agentId) },
        }
      : undefined
  return buildCore({
    registry: opts.registry ?? VALIDATION_REGISTRY,
    topic0: TOPIC0.ValidationResponse,
    selectExtras: [
      `${addressFromTopic(1)} AS validator`,
      `${uintFromTopic(2)} AS agent_id`,
      `topics[SAFE_OFFSET(3)] AS request_hash`,
      `${FIRST_UINT_FROM_DATA} AS response`,
    ],
    extraWhere: where,
    opts,
  })
}

// ── escape hatch + debug ─────────────────────────────────────────────────────

/** Generic builder for any event on any registry (raw topics+data, no decode). */
export function buildRawEventQuery(
  registry: Address,
  topic0: Hex,
  opts: EventQueryOptions = {}
): BigQuerySpec {
  return buildCore({ registry, topic0, selectExtras: [], opts })
}

/**
 * Inline a spec's named params into its SQL for copy-paste / debugging.
 * NOT for execution — always run via `bigquery.query({ query, params })`.
 */
export function renderInlineSql(spec: BigQuerySpec): string {
  let out = spec.query
  // Replace longest names first so e.g. `@agentIdTopic` isn't clipped by `@agentId`.
  const names = Object.keys(spec.params).sort((a, b) => b.length - a.length)
  for (const name of names) {
    out = out.replaceAll(`@${name}`, `'${String(spec.params[name]).replace(/'/g, "''")}'`)
  }
  return out
}
