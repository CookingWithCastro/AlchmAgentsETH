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
  | 'yield_claim'

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

  static async creditTokens(
    userId: string,
    amounts: { spirit: number; essence: number; matter: number; substance: number },
    source: string,
    description: string,
    idempotencyKey?: string
  ) {
    try {
      return await prisma.$transaction(async tx => {
        // Upsert balance
        const balances = await tx.tokenBalance.upsert({
          where: { userId },
          create: {
            userId,
            spirit: amounts.spirit,
            essence: amounts.essence,
            matter: amounts.matter,
            substance: amounts.substance,
            updatedAt: new Date(),
          },
          update: {
            spirit: { increment: amounts.spirit },
            essence: { increment: amounts.essence },
            matter: { increment: amounts.matter },
            substance: { increment: amounts.substance },
            updatedAt: new Date(),
          },
        })

        const transactionGroupId = crypto.randomUUID()
        const dateStr = new Date().toISOString().split('T')[0]

        // Create transaction logs
        const tokens = [
          { type: 'Spirit', amount: amounts.spirit },
          { type: 'Essence', amount: amounts.essence },
          { type: 'Matter', amount: amounts.matter },
          { type: 'Substance', amount: amounts.substance },
        ]

        for (const token of tokens) {
          if (token.amount <= 0) continue
          await tx.tokenTransaction.create({
            data: {
              transactionGroupId,
              userId,
              tokenType: token.type,
              amount: new Prisma.Decimal(token.amount),
              sourceType: source,
              description,
              idempotencyKey: idempotencyKey
                ? `${idempotencyKey}:${token.type}`
                : `credit:${source}:${userId}:${dateStr}:${crypto.randomUUID()}:${token.type}`,
              createdAt: new Date(),
            },
          })
        }

        // Fetch user email to sync credit to alchm.kitchen
        const user = await tx.users.findUnique({
          where: { id: userId },
          select: { email: true },
        })

        if (user?.email) {
          // Fire-and-forget sync to alchm.kitchen
          const amountStrings = {
            spirit: String(amounts.spirit),
            essence: String(amounts.essence),
            matter: String(amounts.matter),
            substance: String(amounts.substance),
          }

          import('@/lib/alchm-credit-sync').then(({ syncCreditToAlchm }) => {
            syncCreditToAlchm({
              userEmail: user.email,
              amounts: amountStrings,
              source,
              idempotencyKey: idempotencyKey || transactionGroupId,
            }).catch(syncErr => {
              console.error(
                '[EconomyService] failed to sync token credit to alchm.kitchen:',
                syncErr
              )
            })
          })
        }

        return {
          balances: {
            spirit: Number(balances.spirit),
            essence: Number(balances.essence),
            matter: Number(balances.matter),
            substance: Number(balances.substance),
            lastDailyClaimAt: balances.lastDailyClaimAt?.toISOString() || null,
            lastDailyClaimAgentsAt: balances.lastDailyClaimAgentsAt?.toISOString() || null,
          },
        }
      })
    } catch (error: any) {
      console.error('[EconomyService] failed to credit tokens:', error)
      throw error
    }
  }

  static async claimPlanetaryYield(historicalAgentId: string, planetaryAgentId: string) {
    // 1. Verify historical agent
    const agent = await prisma.historical_agents.findUnique({
      where: { agentId: historicalAgentId },
    })
    if (!agent) {
      throw new Error(`Historical agent with ID ${historicalAgentId} not found`)
    }

    const chart = agent.natalChart as any
    const hasBirthchart =
      chart &&
      typeof chart === 'object' &&
      chart.planets &&
      typeof chart.planets === 'object' &&
      Object.keys(chart.planets).length > 0

    if (!hasBirthchart) {
      throw new Error('Historical agent must have a birthchart to claim yield')
    }

    // 2. Classify planetary agent
    const { classifyAgent } = await import('@/lib/agents/agent-type-model')
    const c = classifyAgent(planetaryAgentId)
    if (!c.isSprite) {
      throw new Error(`Agent with ID ${planetaryAgentId} is not a planetary yield source`)
    }

    // 3. Upsert both users and balances
    const historicalEmail = `${historicalAgentId}@agentic.alchm.kitchen`
    const planetaryEmail = `${planetaryAgentId}@agentic.alchm.kitchen`

    const histUser = await prisma.users.upsert({
      where: { email: historicalEmail },
      create: {
        email: historicalEmail,
        name: agent.name,
        provider: 'agentic',
        role: 'agent',
        isAgentic: true,
      },
      update: {},
    })

    const planUser = await prisma.users.upsert({
      where: { email: planetaryEmail },
      create: {
        email: planetaryEmail,
        name: planetaryAgentId,
        provider: 'agentic',
        role: 'agent',
        isAgentic: true,
      },
      update: {},
    })

    // Upsert token balances if missing
    await prisma.tokenBalance.upsert({
      where: { userId: histUser.id },
      create: {
        userId: histUser.id,
        spirit: 0,
        essence: 0,
        matter: 0,
        substance: 0,
        updatedAt: new Date(),
      },
      update: {},
    })

    const { spriteReservoirFor } = await import('@/lib/agents/sprite-reservoirs')
    const reservoir = spriteReservoirFor(planetaryAgentId, 0.5) || {
      spirit: 100,
      essence: 100,
      matter: 100,
      substance: 100,
    }

    const currentPlanetaryBalance = await prisma.tokenBalance.upsert({
      where: { userId: planUser.id },
      create: {
        userId: planUser.id,
        spirit: reservoir.spirit,
        essence: reservoir.essence,
        matter: reservoir.matter,
        substance: reservoir.substance,
        updatedAt: new Date(),
      },
      update: {},
    })

    // 4. Calculate claim amount (10% of current planetary balance, minimum 5.0 total)
    const BESTOW_FRACTION = 0.1
    const bestow = {
      spirit: Number(currentPlanetaryBalance.spirit) * BESTOW_FRACTION,
      essence: Number(currentPlanetaryBalance.essence) * BESTOW_FRACTION,
      matter: Number(currentPlanetaryBalance.matter) * BESTOW_FRACTION,
      substance: Number(currentPlanetaryBalance.substance) * BESTOW_FRACTION,
    }
    let totalClaim = bestow.spirit + bestow.essence + bestow.matter + bestow.substance
    if (totalClaim < 5.0) {
      // If balance is too low, use default minimum tokens
      bestow.spirit = 2.5
      bestow.essence = 2.5
      bestow.matter = 2.5
      bestow.substance = 2.5
      totalClaim = 10.0
    }

    const transactionGroupId = crypto.randomUUID()
    // Keyed on the agent pair + UTC day (not Date.now()), so re-firing the
    // claim within a day is a no-op instead of a fresh balance transfer.
    const utcDay = new Date().toISOString().split('T')[0]
    const idempotencyKey = `claim:yield:${historicalAgentId}:${planetaryAgentId}:${utcDay}`

    // 5. Database transaction
    let updated
    try {
      updated = await runYieldTransfer()
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // Same pair already claimed today — the whole transfer rolled back.
        return { success: false as const, alreadyClaimed: true as const, amount: 0 }
      }
      throw error
    }

    async function runYieldTransfer() {
      return prisma.$transaction(async tx => {
        // Decrement planetary agent's balance
        await tx.tokenBalance.update({
          where: { userId: planUser.id },
          data: {
            spirit: { decrement: bestow.spirit },
            essence: { decrement: bestow.essence },
            matter: { decrement: bestow.matter },
            substance: { decrement: bestow.substance },
            updatedAt: new Date(),
          },
        })

        // Increment historical agent's balance
        const updatedBalance = await tx.tokenBalance.update({
          where: { userId: histUser.id },
          data: {
            spirit: { increment: bestow.spirit },
            essence: { increment: bestow.essence },
            matter: { increment: bestow.matter },
            substance: { increment: bestow.substance },
            updatedAt: new Date(),
          },
        })

        // Log transactions
        const tokens = [
          { type: 'Spirit', amount: bestow.spirit },
          { type: 'Essence', amount: bestow.essence },
          { type: 'Matter', amount: bestow.matter },
          { type: 'Substance', amount: bestow.substance },
        ]

        for (const token of tokens) {
          if (token.amount <= 0) continue
          // Outflow from planetary agent
          await tx.tokenTransaction.create({
            data: {
              transactionGroupId,
              userId: planUser.id,
              tokenType: token.type,
              amount: new Prisma.Decimal(-token.amount),
              sourceType: 'yield_claim',
              description: `Yield claimed by ${historicalAgentId}`,
              idempotencyKey: `${idempotencyKey}:out:${token.type}`,
              createdAt: new Date(),
            },
          })
          // Inflow to historical agent
          await tx.tokenTransaction.create({
            data: {
              transactionGroupId,
              userId: histUser.id,
              tokenType: token.type,
              amount: new Prisma.Decimal(token.amount),
              sourceType: 'yield_claim',
              description: `Yield claimed from ${planetaryAgentId}`,
              idempotencyKey: `${idempotencyKey}:in:${token.type}`,
              createdAt: new Date(),
            },
          })
        }

        // Create agent feed event
        await tx.agent_action_events.create({
          data: {
            agentId: historicalAgentId,
            agentEmail: historicalEmail,
            eventType: 'yield_claim',
            triggerType: 'yield_claim',
            triggerSummary: `${historicalAgentId} claimed yield from ${planetaryAgentId}`,
            score: 0.9,
            idempotencyKey,
            status: 'posted',
            evaluatedAt: new Date(),
            postedAt: new Date(),
            metadataPayload: {
              historicalAgentId,
              planetaryAgentId,
              amount: totalClaim,
              bestowed: bestow,
            },
          },
        })

        return updatedBalance
      })
    }

    // 6. Sync credit to alchm.kitchen if active
    try {
      const { syncCreditToAlchm } = await import('@/lib/alchm-credit-sync')
      await syncCreditToAlchm({
        userEmail: historicalEmail,
        amounts: {
          spirit: bestow.spirit.toFixed(4),
          essence: bestow.essence.toFixed(4),
          matter: bestow.matter.toFixed(4),
          substance: bestow.substance.toFixed(4),
        },
        source: 'yield_claim',
        idempotencyKey,
        metadata: {
          historicalAgentId,
          planetaryAgentId,
          amount: totalClaim,
        },
      })
    } catch (syncErr) {
      console.error('[EconomyService] failed to sync yield claim credit to alchm.kitchen:', syncErr)
    }

    return {
      success: true,
      amount: totalClaim,
      balances: {
        spirit: Number(updated.spirit),
        essence: Number(updated.essence),
        matter: Number(updated.matter),
        substance: Number(updated.substance),
      },
    }
  }
}
