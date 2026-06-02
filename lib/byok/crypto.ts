/**
 * AES-256-GCM encryption for BYOK provider keys.
 *
 * The encryption key comes from `BYOK_ENCRYPTION_KEY` (a base64-encoded 32-byte
 * value). Plaintext API keys are NEVER logged. Only ciphertext + iv + authTag
 * are persisted; `last4` (for display) is derived separately by the caller.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit nonce, the GCM standard

export type EncryptedSecret = {
  ciphertext: string // base64
  iv: string // base64
  authTag: string // base64
}

function getKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('BYOK_ENCRYPTION_KEY is not set — cannot encrypt/decrypt provider keys')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('BYOK_ENCRYPTION_KEY must be a base64-encoded 32-byte key (AES-256)')
  }
  return key
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(secret.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}

/** Last 4 chars of a key, for non-sensitive display (e.g. "••••a1b2"). */
export function last4(plaintext: string): string {
  return plaintext.trim().slice(-4)
}
