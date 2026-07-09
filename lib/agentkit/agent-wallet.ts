/**
 * Agent CDP wallets — DB-backed layer over lib/agentkit/cdp.
 *
 * Gives each agent its OWN Base wallet (Coinbase CDP named account) so it can
 * receive x402 USDC and, later, settle autonomously. The address is cached in
 * `agent_wallets` for fast reads and published as the agent's `agent-wallet[x402]`
 * ENS record (see lib/erc8004/ensip.ts) via NameStone.
 *
 * Server-only (imports @/lib/db). Scripts should use lib/agentkit/cdp directly.
 */

import { prisma } from '@/lib/db'
import { provisionCdpAccount, type AgentWallet } from './cdp'

export {
  isCdpConfigured,
  CDP_NETWORK_ID,
  getCdpAccount as getAgentAccount,
  type AgentWallet,
} from './cdp'

const memo = new Map<string, AgentWallet>()

async function readPersisted(agentId: string): Promise<AgentWallet | null> {
  try {
    const row = await prisma.agent_wallets.findUnique({ where: { agentId } })
    return row ? { agentId: row.agentId, address: row.address, network: row.network } : null
  } catch (err) {
    // Table not migrated yet, or DB unreachable — treat as "not provisioned".
    console.warn('[agentkit] agent_wallets read failed (migration pending?)', err)
    return null
  }
}

async function persist(w: AgentWallet): Promise<void> {
  try {
    await prisma.agent_wallets.upsert({
      where: { agentId: w.agentId },
      create: { agentId: w.agentId, address: w.address, network: w.network },
      update: { address: w.address, network: w.network },
    })
  } catch (err) {
    console.warn('[agentkit] agent_wallets write failed (migration pending?)', err)
  }
}

/**
 * Get (or first-time create) the agent's CDP wallet, cached in `agent_wallets`.
 * Returns null when CDP is not configured and no wallet is persisted. Never throws.
 */
export async function getOrCreateAgentWallet(agentId: string): Promise<AgentWallet | null> {
  if (!agentId) return null

  const cached = memo.get(agentId)
  if (cached) return cached

  // Fast path: already persisted → no CDP round-trip.
  const persisted = await readPersisted(agentId)
  if (persisted) {
    memo.set(agentId, persisted)
    return persisted
  }

  const wallet = await provisionCdpAccount(agentId)
  if (!wallet) return null

  await persist(wallet)
  memo.set(agentId, wallet)
  return wallet
}
