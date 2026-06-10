/**
 * Cross-site session bridge: let agents.alchm.kitchen (PA) recognize a user who
 * signed in on alchm.kitchen (WTEN).
 *
 * Why this exists: PA runs NextAuth v4 (cookie `next-auth.session-token`) while
 * WTEN runs Auth.js v5 (cookie `authjs.session-token`). Both cookies are scoped
 * to the shared parent domain `.alchm.kitchen`, so WTEN's session cookie is
 * already delivered to PA on every request — PA just never read it. Rather than
 * migrate PA's whole auth stack to v5, we let WTEN decode its own cookie: PA
 * calls WTEN's default `/api/auth/session` endpoint server-to-server, forwarding
 * the incoming cookies, and trusts the resulting identity.
 *
 * Once we know the kitchen user's email, we JIT-provision a local PA `users` row
 * (so FK relations like conversations/agents have a stable PA id to hang off)
 * and store the WTEN id in `users.alchmKitchenUserId` as the cross-site link.
 *
 * Safety: every failure path returns `null` — kitchen being slow or down must
 * never block PA auth. The network call is memoized per request via React
 * `cache()` so a render tree with many `auth()` calls makes at most one hop.
 */

import * as React from 'react'
import { prisma } from '@/lib/db'
import { provisionPaUser } from '@/lib/user-provisioning'

// React's `cache` is an RSC-only API (provided by Next's server React build);
// the bare `react` package on 18.x doesn't export it, and route handlers/tests
// have no React request scope. Use it when it's genuinely available (dedupes the
// kitchen call across multiple auth() calls in one server-component render),
// otherwise fall back to the plain function (correct, just un-memoized).
const perRequestCache: <T extends (...args: any[]) => any>(fn: T) => T =
  typeof (React as { cache?: unknown }).cache === 'function'
    ? (React as unknown as { cache: <T extends (...a: any[]) => any>(fn: T) => T }).cache
    : fn => fn

export type BridgeUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string | null
  tier: string | null
  /**
   * Whether alchm.kitchen considers this user premium (its session reports
   * tier==='premium' or an admin role). Unifies the premium role: a kitchen
   * subscription grants premium on PA too.
   */
  kitchenPremium: boolean
}

const KITCHEN_BASE_URL = (
  process.env.ALCHM_KITCHEN_SYNC_URL ||
  process.env.NEXT_PUBLIC_ALCHM_KITCHEN_URL ||
  'https://alchm.kitchen'
).replace(/\/$/, '')

const SESSION_FETCH_TIMEOUT_MS = 2500

type KitchenSession = {
  user?: {
    id?: string | null
    email?: string | null
    name?: string | null
    image?: string | null
    // alchm.kitchen exposes these on its session (see WTEN auth.config.ts).
    tier?: string | null
    role?: string | null
  } | null
}

/**
 * Ask alchm.kitchen who the forwarded cookies belong to. Returns the kitchen
 * session user, or null if not signed in / unreachable. Never throws.
 */
async function fetchKitchenSession(cookieHeader: string): Promise<KitchenSession['user'] | null> {
  if (!cookieHeader) return null
  try {
    const res = await fetch(`${KITCHEN_BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: { cookie: cookieHeader, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(SESSION_FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as KitchenSession
    const user = data?.user
    if (!user?.email) return null
    return user
  } catch {
    // Timeout, network error, or malformed JSON — degrade silently.
    return null
  }
}

/**
 * Resolve the PA user for the given forwarded cookie header by validating the
 * alchm.kitchen session and JIT-provisioning a local PA user. Memoized per
 * request. Returns null when there is no kitchen session.
 */
export const resolveBridgeUser = perRequestCache(
  async (cookieHeader: string): Promise<BridgeUser | null> => {
    const kitchenUser = await fetchKitchenSession(cookieHeader)
    if (!kitchenUser?.email) return null

    const email = kitchenUser.email.trim().toLowerCase()
    const kitchenPremium =
      (kitchenUser.tier ?? '').toLowerCase() === 'premium' ||
      (kitchenUser.role ?? '').toLowerCase() === 'admin'
    try {
      const { id } = await prisma.$transaction(tx =>
        provisionPaUser(tx, {
          email,
          name: kitchenUser.name ?? null,
          provider: 'alchm-kitchen-bridge',
          alchmKitchenUserId: kitchenUser.id ?? null,
        })
      )
      return {
        id,
        email,
        name: kitchenUser.name ?? null,
        image: kitchenUser.image ?? null,
        role: kitchenUser.role ?? null,
        tier: kitchenUser.tier ?? null,
        kitchenPremium,
      }
    } catch (err) {
      console.warn('[auth-bridge] failed to provision bridged user', err)
      return null
    }
  }
)
