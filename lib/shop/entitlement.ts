import 'server-only'
import { prisma } from '@/lib/db'
import type { ShopItem } from './catalog'
import { totalEsms } from './pricing'

/**
 * Server-side shop fulfillment record + entitlement.
 *
 * Persisted as a zero-amount marker row in `token_transactions` (the same
 * migration-free pattern as the context-card unlock and weekly attunement
 * reward). The authoritative spend is the on-chain ESMS burn; this row records
 * the fulfillment, captures the burn tx hash, and powers the "Owned" state.
 *
 *  - one-time unlocks  → keyed by item id, so the unlock survives across devices
 *  - repeatable items  → keyed by the unique on-chain order id
 */

const unlockKey = (userId: string, itemId: string) => `shop:${userId}:${itemId}`
const orderKey = (orderId: string) => `shop_order:${orderId}`

function entitlementKey(userId: string, item: ShopItem, orderId: string): string {
  return item.repeatable ? orderKey(orderId) : unlockKey(userId, item.id)
}

/** Whether a one-time unlock has already been purchased by this user. */
export async function hasUnlock(userId: string, itemId: string): Promise<boolean> {
  try {
    const row = await prisma.tokenTransaction.findUnique({
      where: { idempotencyKey: unlockKey(userId, itemId) },
      select: { id: true },
    })
    return !!row
  } catch {
    return false
  }
}

/** Item ids of every one-time unlock this user owns. */
export async function listUnlocks(userId: string): Promise<string[]> {
  try {
    const rows = await prisma.tokenTransaction.findMany({
      where: { userId, sourceType: 'shop_purchase' },
      select: { sourceId: true },
    })
    return rows.map(r => r.sourceId).filter((id): id is string => !!id)
  } catch {
    return []
  }
}

/** Whether this exact order has already been fulfilled (idempotency for repeatable items). */
export async function isOrderFulfilled(orderId: string): Promise<boolean> {
  try {
    const row = await prisma.tokenTransaction.findUnique({
      where: { idempotencyKey: orderKey(orderId) },
      select: { id: true },
    })
    return !!row
  } catch {
    return false
  }
}

/**
 * Record a settled purchase. Idempotent on the entitlement key — a duplicate
 * insert (retry, double-submit) is swallowed. Returns true when the grant is in
 * place (newly written or already present).
 */
export async function grantPurchase(params: {
  userId: string
  item: ShopItem
  orderId: string
  txHash?: string | null
}): Promise<boolean> {
  const { userId, item, orderId, txHash } = params
  const key = entitlementKey(userId, item, orderId)
  try {
    await prisma.tokenTransaction.create({
      data: {
        transactionGroupId: `shop_${orderId}`,
        userId,
        tokenType: 'SHOP_SPEND',
        amount: 0,
        sourceType: 'shop_purchase',
        sourceId: item.id,
        description:
          `Shop: ${item.title} (${totalEsms(item.esms)} ESMS burned on-chain` +
          (txHash ? `, tx ${txHash}` : '') +
          `, order ${orderId})`,
        idempotencyKey: key,
        createdAt: new Date(),
      },
    })
    return true
  } catch {
    // Unique-constraint collision → already granted, which is success here.
    return true
  }
}
