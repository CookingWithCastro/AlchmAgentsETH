/**
 * ENSIP-25 / ENSIP-26 helpers — the ENS text-record keys + values that make an
 * agent discoverable and verifiable from its ENS name.
 *
 * ENSIP-26 (discovery):  agent-context, agent-endpoint[a2a|mcp|web]
 * ENSIP-25 (verifiable): agent-registration[<erc7930-registry>][<agentId>] = "1"
 *
 * The `<registry>` parameter is an ERC-7930 interoperable address (chainId +
 * contract address), NOT a plain 0x address. `encodeErc7930InteropAddress`
 * reproduces the ENSIP-25 spec's worked example exactly (see the unit assertion
 * in scripts/index-erc8004-registry.ts / tests).
 */

import { getAddress, type Address, type Hex } from 'viem'
import { ETH_MAINNET_CHAIN_ID, IDENTITY_REGISTRY } from './registry'

/** ENSIP-26 record keys. NOTE: bracketed keys are not documented by NameStone — verify round-trip. */
export const AGENT_CONTEXT_KEY = 'agent-context'
export const AGENT_ENDPOINT_KEYS = {
  a2a: 'agent-endpoint[a2a]',
  mcp: 'agent-endpoint[mcp]',
  web: 'agent-endpoint[web]',
} as const

export const AGENT_PAYMENT_KEYS = {
  address: 'agent-wallet[x402]',
  chain: 'agent-payment-chain',
} as const

/** Custom record pointing at the agent's Walrus memory blob (a resolvable URL). */
export const AGENT_MEMORY_KEY = 'agent-memory'

/** Custom record: operator is a World ID-verified unique human (nullifier or "true"). */
export const AGENT_HUMAN_VERIFIED_KEY = 'human-verified'

/** Minimal big-endian hex (even length) of a non-negative integer. */
function minimalBytesHex(n: number): string {
  if (n < 0) throw new Error('chainId must be non-negative')
  let h = n.toString(16)
  if (h.length % 2) h = '0' + h
  return h
}

/**
 * Encode an ERC-7930 interoperable address for an EVM (eip155) chain.
 * Layout: version(0x0001) · chainType(0x0000) · chainRefLen(1B) · chainRef · addrLen(0x14) · address(20B).
 *
 * Verified against the ENSIP-25 example: chainId 1 + 0x8004A169…432 →
 *   0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432
 */
export function encodeErc7930InteropAddress(chainId: number, address: Address): Hex {
  const addr = getAddress(address).toLowerCase().replace(/^0x/, '')
  if (addr.length !== 40) throw new Error('address must be 20 bytes')
  const chainRef = minimalBytesHex(chainId)
  const chainRefLen = minimalBytesHex(chainRef.length / 2).padStart(2, '0')
  const addrLen = '14' // 20 bytes
  return `0x0001${'0000'}${chainRefLen}${chainRef}${addrLen}${addr}` as Hex
}

export interface RegistrationRef {
  agentId: bigint | number
  chainId?: number
  registry?: Address
}

/** ENSIP-25 text-record key: `agent-registration[<erc7930>][<agentId>]`. */
export function agentRegistrationKey(ref: RegistrationRef): string {
  const chainId = ref.chainId ?? ETH_MAINNET_CHAIN_ID
  const registry = ref.registry ?? IDENTITY_REGISTRY
  return `agent-registration[${encodeErc7930InteropAddress(chainId, registry)}][${ref.agentId}]`
}

export interface AgentEnsRecordsInput {
  /** Free-form agent description (plain text / Markdown / JSON). */
  context: string
  a2aUrl?: string
  mcpUrl?: string
  webUrl?: string
  paymentAddress?: string
  paymentChain?: string
  /** Resolvable URL to the agent's Walrus memory blob (→ `agent-memory` record). */
  memoryUrl?: string
  /** Operator's World ID nullifier (or "true") → `human-verified` record. */
  humanVerified?: string
  /** If the agent is registered on-chain, add the ENSIP-25 verification record. */
  registration?: RegistrationRef
}

/** Build the ENSIP-26 (+ optional ENSIP-25) text-record map for an agent's ENS name. */
export function buildAgentTextRecords(input: AgentEnsRecordsInput): Record<string, string> {
  const rec: Record<string, string> = { [AGENT_CONTEXT_KEY]: input.context }
  if (input.a2aUrl) rec[AGENT_ENDPOINT_KEYS.a2a] = input.a2aUrl
  if (input.mcpUrl) rec[AGENT_ENDPOINT_KEYS.mcp] = input.mcpUrl
  if (input.webUrl) rec[AGENT_ENDPOINT_KEYS.web] = input.webUrl
  if (input.paymentAddress) rec[AGENT_PAYMENT_KEYS.address] = input.paymentAddress
  if (input.paymentChain) rec[AGENT_PAYMENT_KEYS.chain] = input.paymentChain
  if (input.memoryUrl) rec[AGENT_MEMORY_KEY] = input.memoryUrl
  if (input.humanVerified) rec[AGENT_HUMAN_VERIFIED_KEY] = input.humanVerified
  if (input.registration) rec[agentRegistrationKey(input.registration)] = '1'
  return rec
}

/** Normalize an agent slug into a valid ENS label (lowercase, [a-z0-9-]). */
export function ensLabel(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
