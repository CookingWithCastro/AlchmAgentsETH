/**
 * World ID cloud verification (proof-of-personhood). Pure fetch — no SDK needed
 * server-side. Verifies an IDKit proof against the World Developer Portal verify
 * endpoint; the caller then stores the returned `nullifier` to enforce one verified
 * human per `action` (the verify endpoint checks proof validity; YOUR app enforces
 * uniqueness by persisting the nullifier).
 *
 * Two endpoint generations exist:
 *   v2 (legacy, widely deployed):  https://developer.worldcoin.org/api/v2/verify/{app_id}
 *   v4 (current):                  https://developer.world.org/api/v4/verify/{rp_id}
 * Default below is v2 (what most apps/templates use); override via WORLD_VERIFY_URL.
 *
 * Env: NEXT_PUBLIC_WORLD_APP_ID (app_..., public) / WORLD_APP_ID, WORLD_VERIFY_URL (optional).
 */

export interface WorldIdProof {
  merkle_root: string
  nullifier_hash: string
  proof: string
  verification_level: string // 'orb' | 'device'
}

export interface WorldIdVerifyResult {
  success: boolean
  /** The nullifier_hash — unique per (human, app, action). Store to block duplicates. */
  nullifier?: string
  /** True when the dev/staging bypass produced this result — never persist or stamp it. */
  mock?: boolean
  verificationLevel?: string
  detail?: string
  raw?: unknown
}

export interface WorldIdVerifyOptions {
  /** The action id configured in the Developer Portal (e.g. "verify-operator"). */
  action: string
  /** Pre-hashed signal (signal_hash), if the proof was bound to a signal. */
  signalHash?: string
  appId?: string
  verifyUrl?: string
}

function resolveAppId(explicit?: string): string | undefined {
  return explicit ?? process.env.NEXT_PUBLIC_WORLD_APP_ID ?? process.env.WORLD_APP_ID
}

/** Verify an IDKit proof via the World cloud verify endpoint. */
export async function verifyWorldIdProof(
  proof: WorldIdProof,
  opts: WorldIdVerifyOptions
): Promise<WorldIdVerifyResult> {
  const appId = resolveAppId(opts.appId)
  if (!appId) return { success: false, detail: 'WORLD_APP_ID / NEXT_PUBLIC_WORLD_APP_ID not set' }

  // Bypass/mock verification for staging/testing — NEVER in production. A
  // mocked success must not be able to mint real human-verified state, so the
  // gate is hard on NODE_ENV and the returned nullifier is mock-namespaced.
  const bypassRequested =
    process.env.WORLD_VERIFY_BYPASS === 'true' ||
    appId.includes('mock') ||
    appId.includes('staging')
  if (bypassRequested && process.env.NODE_ENV !== 'production') {
    return {
      success: true,
      mock: true,
      nullifier: `mock_${proof.nullifier_hash || Math.random().toString(36).substring(2)}`,
      verificationLevel: proof.verification_level || 'device',
      raw: { mock: true, detail: 'Bypassed verification for development/testing.' },
    }
  }
  if (bypassRequested && process.env.NODE_ENV === 'production') {
    return {
      success: false,
      detail:
        'World ID bypass/staging app ids are disabled in production — configure a real World app.',
    }
  }

  const url =
    opts.verifyUrl ??
    process.env.WORLD_VERIFY_URL ??
    `https://developer.worldcoin.org/api/v2/verify/${appId}`
  const body = {
    nullifier_hash: proof.nullifier_hash,
    merkle_root: proof.merkle_root,
    proof: proof.proof,
    verification_level: proof.verification_level,
    action: opts.action,
    ...(opts.signalHash ? { signal_hash: opts.signalHash } : {}),
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean
      detail?: string
      code?: string
    }
    if (res.ok && json.success !== false) {
      return {
        success: true,
        nullifier: proof.nullifier_hash,
        verificationLevel: proof.verification_level,
        raw: json,
      }
    }
    return {
      success: false,
      detail: json.detail ?? json.code ?? `verify failed (${res.status})`,
      raw: json,
    }
  } catch (err) {
    return { success: false, detail: err instanceof Error ? err.message : 'verify request failed' }
  }
}
