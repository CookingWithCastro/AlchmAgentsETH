import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth'
import { getPaTier } from '@/lib/premium/entitlements'

// Signed unlock links are entitlements for the desktop app, so minting one
// requires a signed-in web session, the expiry is server-clamped, and the
// premium tier is only granted to subscribers — the caller's word is not
// enough for any of the three.
const MAX_LINK_TTL_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id, name, expiresAt, tier = 'base' } = await req.json()

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required parameters: id, name' }, { status: 400 })
    }

    let normalizedTier: 'base' | 'premium' = 'base'
    if (tier === 'premium') {
      const paTier = await getPaTier(session.user.id)
      if (paTier === 'free') {
        return NextResponse.json(
          { error: 'Premium unlock requires an active subscription' },
          { status: 403 }
        )
      }
      normalizedTier = 'premium'
    }

    // Clamp the expiry server-side; the caller may shorten it but never extend it.
    const maxExpiresAt = Date.now() + MAX_LINK_TTL_MS
    const requestedExpiresAt = Number(expiresAt)
    const normalizedExpiresAt =
      Number.isFinite(requestedExpiresAt) && requestedExpiresAt > Date.now()
        ? Math.min(requestedExpiresAt, maxExpiresAt)
        : maxExpiresAt

    const secret =
      process.env.DEEP_LINK_SHARED_SECRET ||
      (process.env.NODE_ENV === 'production' ? undefined : 'DEV_SECRET_DO_NOT_USE_IN_PROD')
    if (!secret) {
      // Graceful degradation: desktop deep-linking is optional and not all
      // deployments configure the shared secret.  Return 503 so the caller
      // can surface a user-friendly "not available" state instead of an
      // alarming 500.
      return NextResponse.json(
        {
          error: 'Deep-link signing is not configured for this deployment',
          code: 'DEEP_LINK_NOT_CONFIGURED',
        },
        { status: 503 }
      )
    }

    // Define the exact payload structure to mirror in the Rust verifier.
    // This unlocks an agent inside Alchm Desktop; the desktop app itself is the downloaded chat interface.
    // Format: id:name:tier:expiresAt
    const payload = `${id}:${name}:${normalizedTier}:${normalizedExpiresAt}`

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const sig = hmac.digest('hex')

    // Construct the signed deep link. The desktop verifier intentionally signs the payload fields,
    // not the path, so this remains compatible with older install-agent links.
    const deepLink = `alchm://unlock-agent?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&tier=${encodeURIComponent(normalizedTier)}&expiresAt=${encodeURIComponent(normalizedExpiresAt)}&sig=${encodeURIComponent(sig)}`

    return NextResponse.json({ deepLink, sig, payload, tier: normalizedTier })
  } catch (error) {
    console.error('Error signing deep link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
