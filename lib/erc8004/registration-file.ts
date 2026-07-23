/**
 * ERC-8004 registration file — "an agent's homepage" JSON that `agentURI` points at
 * (ipfs://, https://, or a base64 `data:` URI). This is the document the Google Cloud
 * ranking-app prize indexes and ranks on.
 *
 * Shape (from the spec slide "The registration file: an agent's homepage"):
 *   {
 *     "name": "...", "description": "...",
 *     "services": [ {name:"A2A", endpoint:".../.well-known/agent-card.json"},
 *                   {name:"MCP", endpoint:"https://mcp.agent.eth/"},
 *                   {name:"ENS", endpoint:"vitalik.eth"} ],
 *     "x402Support": true,          // ← the prize cares about this flag
 *     "active": true,               // ← monitored flag for the prize track
 *     "registrations": [ {agentId:22, agentRegistry:"eip155:1:0x8004A1…"} ],
 *     "supportedTrust": ["reputation","crypto-economic","tee-attestation"]
 *   }
 */

import { z } from 'zod'
import { type Address } from 'viem'
import { agentRegistryCaip, IDENTITY_REGISTRY } from './registry'

/** A discoverable protocol endpoint advertised by the agent. */
export const Erc8004ServiceSchema = z.object({
  name: z.string(), // "A2A" | "MCP" | "ENS" | …
  endpoint: z.string(),
})
export type Erc8004Service = z.infer<typeof Erc8004ServiceSchema>

/** Pointer back to an on-chain registration (which registry + agentId). */
export const Erc8004RegistrationSchema = z.object({
  agentId: z.number().int().nonnegative(),
  agentRegistry: z.string(), // CAIP, e.g. "eip155:1:0x8004A169…"
})
export type Erc8004Registration = z.infer<typeof Erc8004RegistrationSchema>

export const Erc8004RegistrationFileSchema = z.object({
  name: z.string(),
  description: z.string(),
  services: z.array(Erc8004ServiceSchema).default([]),
  x402Support: z.boolean().default(false),
  active: z.boolean().default(true),
  registrations: z.array(Erc8004RegistrationSchema).default([]),
  supportedTrust: z.array(z.string()).default([]),
  // Optional, non-spec extras tolerated on read.
  image: z.string().optional(),
  endpoints: z.record(z.string()).optional(),
})
export type Erc8004RegistrationFile = z.infer<typeof Erc8004RegistrationFileSchema>

/** Known trust models surfaced on the slide; freeform strings are allowed too. */
export const TRUST_MODELS = ['reputation', 'crypto-economic', 'tee-attestation'] as const
export type TrustModel = (typeof TRUST_MODELS)[number]

export interface BuildRegistrationFileInput {
  name: string
  description: string
  /** ENS name for the agent, e.g. "plato.alchmagents.eth" → ENS service endpoint. */
  ensName?: string
  /** A2A agent-card URL (…/.well-known/agent-card.json) → A2A service endpoint. */
  a2aCardUrl?: string
  /** MCP server URL → MCP service endpoint. */
  mcpUrl?: string
  /** Human-facing web URL → an extra "Web" service endpoint. */
  webUrl?: string
  /** Defaults to true — the prize track monitors this flag. */
  x402Support?: boolean
  /** Defaults to true. */
  active?: boolean
  /** Defaults to ["reputation"]. */
  supportedTrust?: string[]
  /** On-chain registrations; if omitted, callers usually add one after register(). */
  registrations?: Erc8004Registration[]
  image?: string
}

/**
 * Build a spec-compliant registration file for an agent. `services` is assembled
 * in the canonical A2A → MCP → ENS order, including only the endpoints provided.
 */
export function buildRegistrationFile(input: BuildRegistrationFileInput): Erc8004RegistrationFile {
  const services: Erc8004Service[] = []
  if (input.a2aCardUrl) services.push({ name: 'A2A', endpoint: input.a2aCardUrl })
  if (input.mcpUrl) services.push({ name: 'MCP', endpoint: input.mcpUrl })
  if (input.ensName) services.push({ name: 'ENS', endpoint: input.ensName })
  if (input.webUrl) services.push({ name: 'Web', endpoint: input.webUrl })

  return Erc8004RegistrationFileSchema.parse({
    name: input.name,
    description: input.description,
    services,
    x402Support: input.x402Support ?? true,
    active: input.active ?? true,
    registrations: input.registrations ?? [],
    supportedTrust: input.supportedTrust ?? ['reputation'],
    ...(input.image ? { image: input.image } : {}),
  })
}

/** Append/replace the registration for a given registry once an agentId is known. */
export function withRegistration(
  file: Erc8004RegistrationFile,
  agentId: number,
  registry: Address = IDENTITY_REGISTRY
): Erc8004RegistrationFile {
  const agentRegistry = agentRegistryCaip(registry)
  const registrations = [
    ...file.registrations.filter(r => r.agentRegistry !== agentRegistry),
    { agentId, agentRegistry },
  ]
  return { ...file, registrations }
}

/** Parse + validate an arbitrary value as a registration file (throws on invalid). */
export function parseRegistrationFile(value: unknown): Erc8004RegistrationFile {
  return Erc8004RegistrationFileSchema.parse(value)
}

/** Non-throwing parse — returns null on invalid input. */
export function safeParseRegistrationFile(value: unknown): Erc8004RegistrationFile | null {
  const r = Erc8004RegistrationFileSchema.safeParse(value)
  return r.success ? r.data : null
}

/** Prize eligibility: the track monitors `x402Support` + `active`. */
export function qualifiesForPrize(file: Erc8004RegistrationFile): boolean {
  return file.x402Support === true && file.active === true
}

/** Serialize to a compact JSON string. */
export function toJsonString(file: Erc8004RegistrationFile): string {
  return JSON.stringify(file)
}

/** Encode as a fully on-chain `data:` URI usable directly as `agentURI` in register(). */
export function toDataUri(file: Erc8004RegistrationFile): string {
  const b64 = Buffer.from(toJsonString(file), 'utf8').toString('base64')
  return `data:application/json;base64,${b64}`
}
