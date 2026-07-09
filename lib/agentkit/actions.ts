/**
 * Autonomous on-chain actions for an agent's CDP wallet (send/transfer USDC).
 *
 * CDP-only (no DB import) so it stays usable from scripts and server routes.
 * Amounts are HUMAN units (e.g. 1.5 = 1.5 USDC); we convert to base units with
 * viem's `parseUnits` to avoid float precision loss. Never throws — failures are
 * logged and returned as null.
 *
 * ⚠️ Moving an agent's funds is privileged. Callers (see the transfer route) must
 * authorize the request; this module does not.
 */

import { parseUnits, isAddress } from 'viem'
import { getCdpAccount, isCdpConfigured, CDP_NETWORK_ID } from './cdp'

export type TransferToken = 'usdc' | 'eth'

const DECIMALS: Record<TransferToken, number> = { usdc: 6, eth: 18 }

export interface TransferResult {
  transactionHash: string
  from: string
  to: string
  amount: string
  token: TransferToken
  network: string
}

/**
 * Transfer `amount` (human units) of `token` from an agent's CDP wallet to `to`.
 * Returns null when CDP is unconfigured, the agent has no wallet, inputs are
 * invalid, or the transfer fails.
 */
export async function transferFromAgent(
  agentId: string,
  to: string,
  amount: number,
  token: TransferToken = 'usdc'
): Promise<TransferResult | null> {
  if (!isCdpConfigured()) return null
  if (!isAddress(to)) {
    console.error('[agentkit] transfer: invalid recipient address', to)
    return null
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('[agentkit] transfer: amount must be a positive number', amount)
    return null
  }

  const account = await getCdpAccount(agentId)
  if (!account) return null

  const baseUnits = parseUnits(String(amount), DECIMALS[token])

  try {
    const { transactionHash } = await account.transfer({
      to,
      amount: baseUnits,
      token,
      network: CDP_NETWORK_ID as Parameters<typeof account.transfer>[0]['network'],
    })
    return {
      transactionHash,
      from: account.address,
      to,
      amount: String(amount),
      token,
      network: CDP_NETWORK_ID,
    }
  } catch (err) {
    console.error('[agentkit] transfer failed', { agentId, to, amount, token }, err)
    return null
  }
}
