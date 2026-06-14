/**
 * Shop order ids. The same bytes32 id keys the on-chain burn idempotency
 * (EsmsToken.redeemedOrders) and the off-chain entitlement marker, so a retried
 * purchase can never double-burn or double-grant.
 *
 *  - one-time unlocks  → deterministic id from (user, item); re-purchase is a no-op
 *  - repeatable items  → id also folds in a per-purchase nonce
 */

import { keccak256, toHex, type Hex } from 'viem'

const NONCE_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/

/** Deterministic bytes32 order id for a purchase. */
export function shopOrderId(userId: string, itemId: string, nonce?: string): Hex {
  const safeNonce = nonce && NONCE_PATTERN.test(nonce) ? nonce : ''
  return keccak256(toHex(`shop:${userId}:${itemId}:${safeNonce}`))
}

/** Validate a client-supplied nonce (repeatable items). */
export function isValidNonce(nonce: unknown): nonce is string {
  return typeof nonce === 'string' && NONCE_PATTERN.test(nonce)
}
