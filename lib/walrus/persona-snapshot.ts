/**
 * Persona snapshots → Walrus agent memory.
 *
 * Captures an agent's canonical persona (the same `personaBlock` the chat pipeline
 * uses, from buildAgentContext) as an immutable, (MemWal-)encrypted memory blob.
 * Each snapshot's blobId forms an auditable evolution timeline; the latest is
 * referenced in the agent's ENS `agent-memory` record.
 */

import { buildAgentContext } from '@/lib/agents/persona/build-agent-context'
import { writeMemory, type WriteMemoryResult } from './memory'

export interface PersonaSnapshot {
  agentId: string
  name?: string
  /** The rich persona prompt (essence/beliefs/traits/quotes/voice). */
  personaBlock: string
  /** Stable persona hash (changes when the persona changes). */
  cacheKey: string
  capturedAt: string
}

/** Build a persona snapshot for an agent (null if the agent isn't found). */
export function buildPersonaSnapshot(agentId: string, capturedAt: string): PersonaSnapshot | null {
  const ctx = buildAgentContext(agentId)
  if (!ctx) return null
  const name = (ctx.agent as { name?: string } | undefined)?.name
  return { agentId, name, personaBlock: ctx.personaBlock, cacheKey: ctx.cacheKey, capturedAt }
}

export interface SnapshotResult {
  snapshot: PersonaSnapshot
  memory: WriteMemoryResult
}

/**
 * Snapshot an agent's persona and persist it to Walrus memory (encrypted via MemWal
 * when configured, else a raw Walrus blob). Returns the snapshot + the blob result.
 */
export async function snapshotAgentPersonaToWalrus(
  agentId: string,
  opts?: { namespace?: string; capturedAt?: string }
): Promise<SnapshotResult> {
  const capturedAt = opts?.capturedAt ?? new Date().toISOString()
  const snapshot = buildPersonaSnapshot(agentId, capturedAt)
  if (!snapshot) throw new Error(`agent not found: ${agentId}`)
  const namespace = opts?.namespace ?? `agent:${agentId}`
  const memory = await writeMemory({ content: JSON.stringify(snapshot), namespace })
  return { snapshot, memory }
}
