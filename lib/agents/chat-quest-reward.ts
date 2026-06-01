/**
 * Chat-quest ESMS rewards.
 *
 * Completing a guided group chat (the weekly "attunement circle") grants the
 * HUMAN a small ESMS reward. Human wallets live on alchm.kitchen (Railway), so
 * the credit is sent over `syncCreditToAlchm` — never written to Neon as a real
 * balance. We keep a Neon marker row purely as the per-week claim cap (mirrors
 * the transit-attunement pattern: credit on Railway first, then mark on Neon).
 *
 * NOTE: this uses `source: 'group_chat_quest'` — alchm.kitchen must whitelist
 * that source (same way it whitelisted `transit_attunement`). Until it does,
 * syncCreditToAlchm returns { ok:false } and the reward is reported as pending,
 * never silently dropped.
 */

import { prisma } from '@/lib/db'
import { syncCreditToAlchm } from '@/lib/alchm-credit-sync'
import { CHAT_QUEST_REWARD } from '@/lib/economy-config'
import { getWeekKey } from '@/lib/agents/weekly-feature-rotation'

export interface QuestRewardResult {
  ok: boolean
  alreadyClaimed?: boolean
  amounts?: { spirit: number; essence: number; matter: number; substance: number }
  total?: number
  error?: string
}

/**
 * Grant the weekly attunement-circle reward to a human, once per week, SCALED
 * by how much they engaged (`exchanges`, counted up to maxExchanges).
 * Idempotent on `group_quest:<userId>:<weekKey>`.
 */
export async function grantWeeklyAttunementReward(params: {
  userId: string
  userEmail: string
  exchanges: number
  date?: Date
}): Promise<QuestRewardResult> {
  const { userId, userEmail } = params
  if (!userEmail) return { ok: false, error: 'missing_email' }

  const weekKey = getWeekKey(params.date ?? new Date())
  const idempotencyKey = `group_quest:${userId}:${weekKey}`

  // Per-week cap: if we already marked this week, it's been granted.
  const existing = await prisma.tokenTransaction.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  })
  if (existing) return { ok: true, alreadyClaimed: true }

  // Scale by engagement: perAxisPerExchange × min(exchanges, maxExchanges).
  const effectiveExchanges = Math.min(
    Math.max(0, Math.floor(params.exchanges)),
    CHAT_QUEST_REWARD.maxExchanges
  )
  const perAxis =
    Math.round(CHAT_QUEST_REWARD.perAxisPerExchange * effectiveExchanges * 10000) / 10000
  const amounts = { spirit: perAxis, essence: perAxis, matter: perAxis, substance: perAxis }
  const total = perAxis * 4
  if (total <= 0) return { ok: false, error: 'no_reward' }

  // 1) Credit on Railway FIRST (source of truth for human wallets).
  const sync = await syncCreditToAlchm({
    userEmail,
    amounts: {
      spirit: amounts.spirit.toFixed(4),
      essence: amounts.essence.toFixed(4),
      matter: amounts.matter.toFixed(4),
      substance: amounts.substance.toFixed(4),
    },
    source: 'group_chat_quest',
    idempotencyKey,
    metadata: { totalTokens: total },
  })
  if (!sync.ok) {
    console.warn(`[chat-quest-reward] sync failed for ${userEmail} (${weekKey}): ${sync.error}`)
    return { ok: false, error: sync.error ?? 'sync_failed' }
  }

  // 2) Railway credit landed — write the Neon cap marker (amount 0; the real
  //    credit lives on alchm.kitchen). alchm's idempotency guards a marker race.
  await prisma.tokenTransaction
    .create({
      data: {
        transactionGroupId: `group_quest_${weekKey}`,
        userId,
        tokenType: 'GROUP_QUEST',
        amount: 0,
        sourceType: 'group_chat_quest',
        sourceId: `weekly_attunement_circle:${weekKey}`,
        description: `Weekly attunement circle reward (+${total} ESMS) synced to alchm.kitchen`,
        idempotencyKey,
        createdAt: new Date(),
      },
    })
    .catch(() => {
      /* unique-key race: alchm idempotency already prevents a double credit */
    })

  return { ok: true, amounts, total }
}
