import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'crypto'

// crypto.ts reads BYOK_ENCRYPTION_KEY lazily (at call time), so setting it in
// beforeAll is sufficient even though the import is hoisted.
beforeAll(() => {
  process.env.BYOK_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

import { encryptSecret, decryptSecret, last4 } from '@/lib/byok/crypto'

describe('byok crypto (AES-256-GCM)', () => {
  it('round-trips a secret and does not leak plaintext into ciphertext', () => {
    const plain = 'sk-ant-abc123XYZsecret'
    const enc = encryptSecret(plain)
    expect(enc.ciphertext).not.toContain('sk-ant')
    expect(decryptSecret(enc)).toBe(plain)
  })

  it('uses a unique IV per encryption (no deterministic ciphertext)', () => {
    const a = encryptSecret('same-value')
    const b = encryptSecret('same-value')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('rejects a tampered auth tag', () => {
    const enc = encryptSecret('secret-value')
    const tampered = { ...enc, authTag: Buffer.from('0'.repeat(16)).toString('base64') }
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('rejects tampered ciphertext', () => {
    const enc = encryptSecret('secret-value')
    const tampered = { ...enc, ciphertext: Buffer.from('different-bytes').toString('base64') }
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('last4 returns the final four characters', () => {
    expect(last4('sk-abcd1234')).toBe('1234')
  })
})
