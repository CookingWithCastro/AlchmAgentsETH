/**
 * Walrus (WAL) Token Staking — Agent Storage Economy
 *
 * Direction: shift the decentralized-memory narrative from generic Sui interaction to native
 * WAL token staking — users stake WAL to fund their agents' encrypted storage footprint
 * (MemWal blobs on the Walrus Network).
 *
 * ⚠️ WIP / NOT YET WIRED. This is scaffolding for the WAL-staking direction:
 *   - There is NO `wal_staking` table in the Prisma schema yet — these raw queries will fail at
 *     runtime until a migration adds it (columns: user_id, agent_id, staked_wal, bytes_yield,
 *     tx_hash, created_at, updated_at; UNIQUE(agent_id) for the upsert's ON CONFLICT).
 *   - Nothing calls these functions yet (no route, no on-chain WAL transfer verification).
 *   - The byte-yield formula below is a placeholder, not a real Walrus pricing model.
 * It compiles (uses the repo's Prisma client) so it can be iterated on, but do not treat it as live.
 */

import type { Hex } from 'viem'
import { prisma } from '@/lib/db'

export interface WalStakingPosition {
  agentId: string
  stakedAmountWal: bigint
  storageYieldBytes: bigint
  lastUpdated: string
}

/**
 * Stake WAL tokens to allocate storage capacity for an agent. The yield from staked WAL
 * translates into encrypted blob bytes available via MemWal on the Walrus Network.
 * WIP: `txHash` is recorded but NOT yet verified on-chain — add WAL-transfer verification
 * before this funds real storage.
 */
export async function stakeWalForAgentStorage(
  userId: string,
  agentId: string,
  amountWal: bigint,
  txHash: Hex
): Promise<{ success: boolean; position?: WalStakingPosition; error?: string }> {
  // Placeholder pricing: 1 WAL ⇒ 1000 bytes/day of encrypted MemWal footprint.
  const bytesYield = amountWal * 1000n

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO wal_staking (user_id, agent_id, staked_wal, bytes_yield, tx_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (agent_id) DO UPDATE
       SET staked_wal = wal_staking.staked_wal + $3,
           bytes_yield = wal_staking.bytes_yield + $4,
           updated_at = now()`,
      userId,
      agentId,
      amountWal.toString(),
      bytesYield.toString(),
      txHash
    )

    const rows = await prisma.$queryRawUnsafe<
      Array<{ staked_wal: string; bytes_yield: string; updated_at: Date }>
    >(`SELECT staked_wal, bytes_yield, updated_at FROM wal_staking WHERE agent_id = $1`, agentId)

    if (rows.length > 0) {
      return {
        success: true,
        position: {
          agentId,
          stakedAmountWal: BigInt(rows[0].staked_wal),
          storageYieldBytes: BigInt(rows[0].bytes_yield),
          lastUpdated: new Date(rows[0].updated_at).toISOString(),
        },
      }
    }
    return { success: false, error: 'Failed to retrieve updated position' }
  } catch (error) {
    console.error('[wal-staking] Failed to stake WAL (table may not exist yet — WIP):', error)
    return { success: false, error: 'Database operation failed' }
  }
}

/**
 * Retrieve the current WAL staking storage capacity (in bytes) for an agent. Intended for MemWal
 * to verify an agent has sufficient funded footprint before writing a memory blob. WIP.
 */
export async function getAgentStorageCapacity(agentId: string): Promise<bigint> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ bytes_yield: string }>>(
      `SELECT bytes_yield FROM wal_staking WHERE agent_id = $1`,
      agentId
    )
    return rows.length > 0 ? BigInt(rows[0].bytes_yield) : 0n
  } catch (error) {
    console.error(
      '[wal-staking] getAgentStorageCapacity failed (table may not exist yet — WIP):',
      error
    )
    return 0n
  }
}
