/**
 * Server-only store for BYOK provider keys. Encrypts on write, decrypts only at
 * call time, and NEVER returns plaintext/ciphertext to callers that surface to
 * the client (`listKeys` returns masked summaries only).
 */

import { prisma } from '@/lib/db'
import { encryptSecret, decryptSecret, last4 } from './crypto'
import { validateProviderKey } from './validate'
import type { ByokProvider } from '@/lib/premium/tiers'

export type StoredKeySummary = {
  provider: ByokProvider
  last4: string
  validatedAt: Date | null
}

export type SaveKeyResult = { ok: true; summary: StoredKeySummary } | { ok: false; error: string }

export async function saveKey(
  userId: string,
  provider: ByokProvider,
  plaintextKey: string
): Promise<SaveKeyResult> {
  const validation = await validateProviderKey(provider, plaintextKey)
  if (!validation.valid) {
    return { ok: false, error: validation.error || 'Invalid API key' }
  }

  const trimmed = plaintextKey.trim()
  const enc = encryptSecret(trimmed)
  const masked = last4(trimmed)
  const now = new Date()

  const row = await prisma.user_provider_keys.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      last4: masked,
      validatedAt: now,
    },
    update: {
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      last4: masked,
      validatedAt: now,
    },
  })

  return { ok: true, summary: { provider, last4: row.last4, validatedAt: row.validatedAt } }
}

/** Server-only: decrypt a stored key for use in a provider call. */
export async function getDecryptedKey(
  userId: string,
  provider: ByokProvider
): Promise<string | null> {
  const row = await prisma.user_provider_keys.findUnique({
    where: { userId_provider: { userId, provider } },
  })
  if (!row) return null
  try {
    return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag })
  } catch (err) {
    console.error('[byok] decrypt failed for', provider, err)
    return null
  }
}

/** Masked summaries safe to return to the client. */
export async function listKeys(userId: string): Promise<StoredKeySummary[]> {
  try {
    const rows = await prisma.user_provider_keys.findMany({
      where: { userId },
      select: { provider: true, last4: true, validatedAt: true },
    })
    return rows.map(r => ({
      provider: r.provider as ByokProvider,
      last4: r.last4,
      validatedAt: r.validatedAt,
    }))
  } catch (err) {
    console.error('[byok] listKeys failed', err)
    return []
  }
}

/** Providers with a validated key — the entitlement source for premium tiers. */
export async function listByokProviders(userId: string): Promise<ByokProvider[]> {
  const keys = await listKeys(userId)
  return keys.filter(k => k.validatedAt).map(k => k.provider)
}

export async function deleteKey(userId: string, provider: ByokProvider): Promise<void> {
  await prisma.user_provider_keys.deleteMany({ where: { userId, provider } })
}
