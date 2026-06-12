import crypto from 'crypto'

/**
 * Short-lived signed tokens binding a duel-yield claim to a round that the
 * server actually ran and billed. /api/unified-multi-agent-chat mints one in
 * its `done` SSE event for paid multi-agent rounds; /api/economy/duel-yield
 * requires it before crediting. The millisecond timestamp doubles as the
 * idempotency key component, making each token single-spend.
 *
 * Format: `${userId}:${mintedAtMs}:${hmacSha256(userId:mintedAtMs)}`
 * (user ids are cuids — no colons).
 */

const TOKEN_TTL_MS = 10 * 60 * 1000

function tokenSecret(): string {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev-duel-claim-secret-do-not-use-in-prod'
  )
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', tokenSecret()).update(payload).digest('hex')
}

export function mintDuelClaimToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`
  return `${payload}:${sign(payload)}`
}

export function verifyDuelClaimToken(
  token: string,
  userId: string
): { ok: true; mintedAt: number } | { ok: false; reason: string } {
  const parts = token.split(':')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const [uid, tsStr, sig] = parts

  const expected = sign(`${uid}:${tsStr}`)
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return { ok: false, reason: 'bad-signature' }
    }
  } catch {
    return { ok: false, reason: 'bad-signature' }
  }

  if (uid !== userId) return { ok: false, reason: 'wrong-user' }

  const mintedAt = Number(tsStr)
  if (!Number.isFinite(mintedAt)) return { ok: false, reason: 'malformed' }
  if (Date.now() - mintedAt > TOKEN_TTL_MS) return { ok: false, reason: 'expired' }

  return { ok: true, mintedAt }
}
