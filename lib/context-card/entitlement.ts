import 'server-only'
import { prisma } from '@/lib/db'

/**
 * Server-side "has the user unlocked the context card?" entitlement.
 *
 * Persisted as a zero-amount marker row in `token_transactions` (the same
 * migration-free pattern used by the weekly attunement reward), keyed by a
 * stable idempotency key so the unlock survives across devices and
 * localStorage clears. The real ESMS debit lives on alchm.kitchen; this row is
 * only the entitlement flag.
 */
const key = (userId: string) => `card_unlock:${userId}`

export async function hasUnlockedCard(userId: string): Promise<boolean> {
  try {
    const row = await prisma.tokenTransaction.findUnique({
      where: { idempotencyKey: key(userId) },
      select: { id: true },
    })
    return !!row
  } catch {
    return false
  }
}

export async function markCardUnlocked(userId: string): Promise<void> {
  try {
    await prisma.tokenTransaction.create({
      data: {
        transactionGroupId: `card_unlock_${userId}`,
        userId,
        tokenType: 'CARD_UNLOCK',
        amount: 0,
        sourceType: 'context_card',
        sourceId: 'context_card_export',
        description: 'Alchm Context Card unlocked (ESMS debit synced to alchm.kitchen)',
        idempotencyKey: key(userId),
        createdAt: new Date(),
      },
    })
  } catch {
    // Unique-constraint collisions just mean it was already marked — fine.
  }
}
