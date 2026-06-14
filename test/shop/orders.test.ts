import { describe, expect, it } from 'vitest'
import { shopOrderId, isValidNonce } from '@/lib/shop/orders'

describe('shop/orders', () => {
  it('shopOrderId is a 32-byte hex', () => {
    const id = shopOrderId('user-1', 'item-a')
    expect(id).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('is deterministic for the same (user, item) — one-time unlocks', () => {
    expect(shopOrderId('user-1', 'item-a')).toBe(shopOrderId('user-1', 'item-a'))
  })

  it('differs by user, by item, and by nonce', () => {
    const base = shopOrderId('user-1', 'item-a')
    expect(shopOrderId('user-2', 'item-a')).not.toBe(base)
    expect(shopOrderId('user-1', 'item-b')).not.toBe(base)
    expect(shopOrderId('user-1', 'item-a', 'n1')).not.toBe(base)
    expect(shopOrderId('user-1', 'item-a', 'n1')).not.toBe(shopOrderId('user-1', 'item-a', 'n2'))
  })

  it('reuses the same nonce → same order id (idempotent retry)', () => {
    expect(shopOrderId('u', 'i', 'nonce-x')).toBe(shopOrderId('u', 'i', 'nonce-x'))
  })

  it('isValidNonce accepts safe tokens and rejects junk', () => {
    expect(isValidNonce('abc-123_ok:1')).toBe(true)
    expect(isValidNonce('')).toBe(false)
    expect(isValidNonce('has space')).toBe(false)
    expect(isValidNonce(42)).toBe(false)
    expect(isValidNonce(null)).toBe(false)
  })
})
