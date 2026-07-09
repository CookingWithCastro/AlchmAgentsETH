/**
 * CDP-only wallet primitives (no DB import → safe for scripts and the app alike).
 *
 * Each agent maps to a CDP v2 **named server account** (`evm.getOrCreateAccount`),
 * which is permanently deterministic per name — so the same agent always resolves
 * to the same Base address. Persistence/ENS publishing live one layer up.
 */

import { CdpClient } from '@coinbase/cdp-sdk'

/** Base network for agent wallets. Matches the ESMS economy (Base Sepolia). */
export const CDP_NETWORK_ID = process.env.CDP_NETWORK_ID || 'base-sepolia'

export interface AgentWallet {
  agentId: string
  address: string
  network: string
}

export type EvmServerAccount = Awaited<ReturnType<CdpClient['evm']['getOrCreateAccount']>>

/** True when CDP server credentials are present. */
export function isCdpConfigured(): boolean {
  return Boolean(
    process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET
  )
}

/** CDP account name for an agent. Must match ^[a-zA-Z0-9 -]{1,64}$. */
export function accountName(agentId: string): string {
  const safe = agentId
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `alchm-${safe}`.slice(0, 64)
}

let _client: CdpClient | null = null
function client(): CdpClient {
  if (!_client) {
    _client = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    })
  }
  return _client
}

/** Provision (or fetch) the agent's CDP wallet address. CDP-only; never throws. */
export async function provisionCdpAccount(agentId: string): Promise<AgentWallet | null> {
  if (!agentId || !isCdpConfigured()) return null
  try {
    const account = await client().evm.getOrCreateAccount({ name: accountName(agentId) })
    return { agentId, address: account.address, network: CDP_NETWORK_ID }
  } catch (err) {
    console.error('[agentkit] failed to provision CDP account for', agentId, err)
    return null
  }
}

/** Load the agent's live CDP account object (for autonomous actions). Never throws. */
export async function getCdpAccount(agentId: string): Promise<EvmServerAccount | null> {
  if (!agentId || !isCdpConfigured()) return null
  try {
    return await client().evm.getOrCreateAccount({ name: accountName(agentId) })
  } catch (err) {
    console.error('[agentkit] failed to load CDP account for', agentId, err)
    return null
  }
}
