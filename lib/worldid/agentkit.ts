/**
 * World AgentKit — proof-of-human for agents. Each agent's wallet registers in
 * AgentBook via a World ID proof (one-time, gasless); on an x402 request the server
 * resolves the verified human behind the agent and applies the access policy
 * (default: 3 free uses, then $0.01 USDC). Strongest thematic fit for our stack
 * (agents + x402 USDC + proof-of-human).
 *
 * Install: bun add @worldcoin/agentkit @worldcoin/agentkit-cli
 * Lazy-loaded so the repo compiles without it. SDK shapes below are best-effort
 * (per the AgentKit README) — confirm against the installed version.
 *
 * Env: AGENTKIT_WALLET_ADDRESS, AGENTKIT_WALLET_PRIVATE_KEY (agent side).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

async function loadAgentkit(): Promise<any | null> {
  const pkg = '@worldcoin/agentkit'
  try {
    return await import(pkg)
  } catch {
    return null
  }
}

export interface AgentHumanResult {
  /** Is the agent wallet registered in AgentBook (backed by a verified human)? */
  registered: boolean
  /** An identifier for the human behind the agent (nullifier/humanId), if resolvable. */
  human?: string
  detail?: string
}

/**
 * Server-side: resolve the World ID-verified human behind an agent wallet — use to
 * gate / meter x402 calls per unique human. No-op (registered:false) without the SDK.
 */
export async function resolveAgentHuman(walletAddress: string): Promise<AgentHumanResult> {
  const mod = await loadAgentkit()
  if (!mod) return { registered: false, detail: '@worldcoin/agentkit not installed' }
  try {
    const verifier = (mod.createAgentBookVerifier ?? mod.AgentBookVerifier)?.({})
    const res = await verifier?.verify?.(walletAddress)
    if (!res) return { registered: false }
    return { registered: true, human: res.human ?? res.humanId ?? res.nullifier }
  } catch (e) {
    return { registered: false, detail: e instanceof Error ? e.message : 'agentbook verify failed' }
  }
}

/**
 * Agent-side: a `fetch` wrapper that pays x402 with AgentKit proof-of-human, so this
 * agent can call other paid agents/tools. Returns null without the SDK.
 */
export async function createAgentFetch(opts?: {
  walletPrivateKey?: string
}): Promise<typeof fetch | null> {
  const mod = await loadAgentkit()
  if (!mod) return null
  try {
    const client = mod.createAgentkitClient?.({
      privateKey: opts?.walletPrivateKey ?? process.env.AGENTKIT_WALLET_PRIVATE_KEY,
    })
    return (client?.fetch as typeof fetch) ?? null
  } catch {
    return null
  }
}
