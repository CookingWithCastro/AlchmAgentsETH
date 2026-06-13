/**
 * Memory recall + write-back for the chat pipeline.
 *
 * `augmentPersonaWithMemory` injects an agent's most-relevant past memories into
 * its persona block before generation; `rememberConversation` stores each exchange
 * back to MemWal so future turns can recall it. Both are no-ops without MemWal
 * (the raw Walrus HTTP fallback has no semantic search), and both swallow errors so
 * memory never blocks or breaks a chat.
 */

import { recallMemory, writeMemory, isMemWalConfigured } from './memory'

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

/**
 * Append a "Recalled Memories" section to the persona block from the agent's most
 * relevant past memories (semantic search over `agent:<id>` namespace). Returns the
 * persona unchanged if MemWal isn't configured or nothing relevant is found.
 */
export async function augmentPersonaWithMemory(
  personaBlock: string,
  agentId: string,
  query: string,
  opts?: { limit?: number; maxDistance?: number }
): Promise<string> {
  if (!query?.trim()) return personaBlock
  try {
    const memories = await recallMemory({
      query,
      namespace: `agent:${agentId}`,
      limit: opts?.limit ?? 4,
      maxDistance: opts?.maxDistance ?? 0.7,
    })
    if (!memories.length) return personaBlock
    const lines = memories.map(m => `- ${truncate(m.text, 280)}`).join('\n')
    return (
      `${personaBlock}\n\n## Recalled Memories\n` +
      `Relevant moments from your past exchanges (most relevant first). Weave them in ` +
      `naturally where fitting; never quote them verbatim or mention that you "remember":\n${lines}`
    )
  } catch {
    return personaBlock
  }
}

/**
 * Store a completed exchange as a memory (MemWal-gated — skipped without MemWal,
 * since un-indexed raw blobs can't be recalled). Fire-and-forget; never throws.
 */
export async function rememberConversation(
  agentId: string,
  userMessage: string,
  reply: string
): Promise<void> {
  if (!isMemWalConfigured()) return
  try {
    const fact = `The user said: "${truncate(userMessage, 500)}". ${agentId} responded: "${truncate(reply, 800)}".`
    await writeMemory({ content: fact, namespace: `agent:${agentId}` })
  } catch {
    // Memory write-back must never affect the chat response.
  }
}
