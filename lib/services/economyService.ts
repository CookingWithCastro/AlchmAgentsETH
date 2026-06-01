import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  BASE_AGENTS_YIELD,
  PREMIUM_MULTIPLIER,
  TOKEN_TYPES,
  TokenType,
  AGENT_OPERATION_COSTS,
} from '@/lib/economy-config'

export type TransactionSourceType =
  | 'agents_yield'
  | 'agents_daily_yield'
  | 'kitchen_daily_yield'
  | 'agents_operation'
  | 'transit_attunement'
  | 'group_chat_quest'

function isSameUtcDay(iso: string | null | undefined): boolean {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  return (
    date.getUTCFullYear() === today.getUTCFullYear() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCDate() === today.getUTCDate()
  )
}

export interface TokenBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
  lastDailyClaimAt: string | null
  lastDailyClaimAgentsAt: string | null
}

export class EconomyService {
  static readonly ZERO_BALANCES: TokenBalances = {
    spirit: 0,
    essence: 0,
    matter: 0,
    substance: 0,
    lastDailyClaimAt: null,
    lastDailyClaimAgentsAt: null,
  }

  static async getBalances(userId: string): Promise<TokenBalances> {
    try {
      const balances = await prisma.tokenBalance.upsert({
        where: { userId },
        create: {
          userId,
          spirit: 0,
          essence: 0,
          matter: 0,
          substance: 0,
          updatedAt: new Date(),
        },
        update: {},
      })

      return {
        spirit: Number(balances.spirit),
        essence: Number(balances.essence),
        matter: Number(balances.matter),
        substance: Number(balances.substance),
        lastDailyClaimAt: balances.lastDailyClaimAt?.toISOString() || null,
        lastDailyClaimAgentsAt: balances.lastDailyClaimAgentsAt?.toISOString() || null,
      }
    } catch (err: any) {
      // userId is a CUID but token_balances.user_id is a UUID column — pending migration.
      if (err?.code === 'P2023' || err?.message?.includes('UUID')) {
        return this.ZERO_BALANCES
      }
      throw err
    }
  }

  static async hasClaimedAgentsYieldToday(userId: string): Promise<boolean> {
    const balances = await this.getBalances(userId)
    return isSameUtcDay(balances.lastDailyClaimAgentsAt)
  }

  static async hasClaimedKitchenYieldToday(userId: string): Promise<boolean> {
    const balances = await this.getBalances(userId)
    return isSameUtcDay(balances.lastDailyClaimAt)
  }

  /**
   * Claim the daily Kitchen-side yield. Mirrors `claimAgentsYield` but bumps
   * `lastDailyClaimAt` and tags transactions as `kitchen_daily_yield` so the
   * desktop and `/yield` page hand out the same amount with the same multiplier
   * rules as the Agents-side claim.
   */
  static async claimKitchenYield(userId: string, isPremium: boolean) {
    try {
      return await prisma.$transaction(async tx => {
        const balances = await tx.tokenBalance.findUnique({ where: { userId } })
        if (isSameUtcDay(balances?.lastDailyClaimAt?.toISOString())) {
          throw new Error('Already claimed today')
        }

        const total = BASE_AGENTS_YIELD * (isPremium ? PREMIUM_MULTIPLIER : 1)
        const perType = total / 4
        const dateStr = new Date().toISOString().split('T')[0]
        const distribution: Record<string, number> = {}
        const transactionGroupId = crypto.randomUUID()

        for (const token of TOKEN_TYPES) {
          distribution[token] = perType
          await tx.tokenTransaction.create({
            data: {
              transactionGroupId,
              userId,
              tokenType: token,
              amount: new Prisma.Decimal(perType),
              sourceType: 'kitchen_daily_yield',
              description: 'Cosmic Yield from Kitchen',
              idempotencyKey: `daily:kitchen:${userId}:${dateStr}:${token}`,
              createdAt: new Date(),
            },
          })
        }

        const updated = await tx.tokenBalance.update({
          where: { userId },
          data: {
            spirit: { increment: perType },
            essence: { increment: perType },
            matter: { increment: perType },
            substance: { increment: perType },
            lastDailyClaimAt: new Date(),
            updatedAt: new Date(),
          },
        })

        return {
          distribution,
          balances: {
            spirit: Number(updated.spirit),
            essence: Number(updated.essence),
            matter: Number(updated.matter),
            substance: Number(updated.substance),
            lastDailyClaimAt: updated.lastDailyClaimAt?.toISOString() || null,
            lastDailyClaimAgentsAt: updated.lastDailyClaimAgentsAt?.toISOString() || null,
          },
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002' || error.message === 'Already claimed today') {
        throw new Error('Already claimed today')
      }
      throw error
    }
  }

  static async claimAgentsYield(userId: string, isPremium: boolean) {
    try {
      return await prisma.$transaction(async tx => {
        // Re-check hasClaimedAgentsYieldToday within transaction
        const balances = await tx.tokenBalance.findUnique({ where: { userId } })
        if (balances?.lastDailyClaimAgentsAt) {
          const lastClaim = new Date(balances.lastDailyClaimAgentsAt)
          const today = new Date()
          if (
            lastClaim.getUTCFullYear() === today.getUTCFullYear() &&
            lastClaim.getUTCMonth() === today.getUTCMonth() &&
            lastClaim.getUTCDate() === today.getUTCDate()
          ) {
            throw new Error('Already claimed today')
          }
        }

        const total = BASE_AGENTS_YIELD * (isPremium ? PREMIUM_MULTIPLIER : 1)
        const perType = total / 4
        const dateStr = new Date().toISOString().split('T')[0]

        const distribution: Record<string, number> = {}

        // Group ID for these transactions
        const transactionGroupId = crypto.randomUUID()

        for (const token of TOKEN_TYPES) {
          distribution[token] = perType
          await tx.tokenTransaction.create({
            data: {
              transactionGroupId,
              userId,
              tokenType: token,
              amount: new Prisma.Decimal(perType),
              sourceType: 'agents_yield',
              description: 'Cosmic Yield from Agents',
              idempotencyKey: `daily:agents:${userId}:${dateStr}:${token}`,
              createdAt: new Date(),
            },
          })
        }

        const updated = await tx.tokenBalance.update({
          where: { userId },
          data: {
            spirit: { increment: perType },
            essence: { increment: perType },
            matter: { increment: perType },
            substance: { increment: perType },
            lastDailyClaimAgentsAt: new Date(),
            updatedAt: new Date(),
          },
        })

        return {
          distribution,
          balances: {
            spirit: Number(updated.spirit),
            essence: Number(updated.essence),
            matter: Number(updated.matter),
            substance: Number(updated.substance),
            lastDailyClaimAt: updated.lastDailyClaimAt?.toISOString() || null,
            lastDailyClaimAgentsAt: updated.lastDailyClaimAgentsAt?.toISOString() || null,
          },
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002' || error.message === 'Already claimed today') {
        throw new Error('Already claimed today')
      }
      throw error
    }
  }

  static async debitOperation(userId: string, operationKey: string) {
    const cost = AGENT_OPERATION_COSTS[operationKey]
    if (!cost) {
      throw new Error(`Invalid operation key: ${operationKey}`)
    }

    const spirit = cost.Spirit || 0
    const essence = cost.Essence || 0
    const matter = cost.Matter || 0
    const substance = cost.Substance || 0

    // Single atomic CTE query
    const updatedBalanceRows = await prisma.$queryRawUnsafe<any[]>(
      `
      WITH updated AS (
        UPDATE token_balances
        SET spirit = spirit - $1,
            essence = essence - $2,
            matter = matter - $3,
            substance = substance - $4,
            updated_at = NOW()
        WHERE user_id = $5
          AND spirit >= $1
          AND essence >= $2
          AND matter >= $3
          AND substance >= $4
        RETURNING *
      )
      SELECT * FROM updated;
    `,
      spirit,
      essence,
      matter,
      substance,
      userId
    )

    if (!updatedBalanceRows || updatedBalanceRows.length === 0) {
      return { ok: false, reason: 'insufficient_funds' }
    }

    const updated = updatedBalanceRows[0]
    const transactionGroupId = crypto.randomUUID()

    // Insert transaction rows for non-zero costs
    const entries = Object.entries(cost).filter(([_, amount]) => amount && amount > 0)
    for (const [token, amount] of entries) {
      await prisma.$queryRawUnsafe(
        `
        INSERT INTO token_transactions (
          transaction_group_id, user_id, token_type, amount, source_type, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW()
        )
      `,
        transactionGroupId,
        userId,
        token,
        -amount,
        'agents_operation'
      )
    }

    return {
      ok: true,
      transactionGroupId,
      balances: {
        spirit: Number(updated.spirit),
        essence: Number(updated.essence),
        matter: Number(updated.matter),
        substance: Number(updated.substance),
        lastDailyClaimAt: updated.last_daily_claim_at?.toISOString() || null,
        lastDailyClaimAgentsAt: updated.last_daily_claim_agents_at?.toISOString() || null,
      },
    }
  }

  static async debitDynamic(userId: string, cost: Partial<Record<TokenType, number>>) {
    const spirit = cost.Spirit || 0
    const essence = cost.Essence || 0
    const matter = cost.Matter || 0
    const substance = cost.Substance || 0

    // Single atomic CTE query
    const updatedBalanceRows = await prisma.$queryRawUnsafe<any[]>(
      `
      WITH updated AS (
        UPDATE token_balances
        SET spirit = spirit - $1,
            essence = essence - $2,
            matter = matter - $3,
            substance = substance - $4,
            updated_at = NOW()
        WHERE user_id = $5
          AND spirit >= $1
          AND essence >= $2
          AND matter >= $3
          AND substance >= $4
        RETURNING *
      )
      SELECT * FROM updated;
    `,
      spirit,
      essence,
      matter,
      substance,
      userId
    )

    if (!updatedBalanceRows || updatedBalanceRows.length === 0) {
      return { ok: false, reason: 'insufficient_funds' }
    }

    const updated = updatedBalanceRows[0]
    const transactionGroupId = crypto.randomUUID()

    // Insert transaction rows for non-zero costs
    const entries = Object.entries(cost).filter(([_, amount]) => amount && amount > 0)
    for (const [token, amount] of entries) {
      await prisma.$queryRawUnsafe(
        `
        INSERT INTO token_transactions (
          transaction_group_id, user_id, token_type, amount, source_type, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW()
        )
      `,
        transactionGroupId,
        userId,
        token,
        -amount,
        'agents_operation'
      )
    }

    return {
      ok: true,
      transactionGroupId,
      balances: {
        spirit: Number(updated.spirit),
        essence: Number(updated.essence),
        matter: Number(updated.matter),
        substance: Number(updated.substance),
        lastDailyClaimAt: updated.last_daily_claim_at?.toISOString() || null,
        lastDailyClaimAgentsAt: updated.last_daily_claim_agents_at?.toISOString() || null,
      },
    }
  }
}
