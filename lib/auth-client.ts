'use client'

/**
 * Client-side entry point for identity (Google) sign-in.
 *
 * Two modes, chosen by NEXT_PUBLIC_AGENTS_LOCAL_AUTH:
 *
 *  - LOCAL (flag === 'true'): sign in through agents.alchm.kitchen's OWN
 *    NextAuth Google provider (see lib/auth-options.ts). The callback URL is
 *    same-origin, so NextAuth honors it and the user stays on the agents site.
 *    This is the fix for the "redirected to the kitchen profile" bug — that bug
 *    happens because alchm.kitchen's Auth.js rejects the cross-origin callback
 *    and drops the user on its own domain.
 *
 *  - LEGACY (flag unset/false): bounce to the shared alchm.kitchen Google
 *    sign-in via buildKitchenSignInUrl. Kept as a safe fallback so login never
 *    breaks in a deployment that has not yet been given its own Google OAuth
 *    credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) + redirect URI.
 *
 * Flip the flag once the agents Vercel project has the Google credentials and
 * the OAuth client lists https://agents.alchm.kitchen/api/auth/callback/google
 * as an authorized redirect URI. See docs/AUTH.md.
 */

import { signIn, signOut } from 'next-auth/react'
import {
  DEFAULT_POST_LOGIN_PATH,
  buildKitchenSignInUrl,
  normalizeAgentsCallbackUrl,
} from '@/lib/kitchen-signin'

/** Whether this deployment runs its own Google OAuth instead of the kitchen bounce. */
export const LOCAL_AUTH_ENABLED = process.env.NEXT_PUBLIC_AGENTS_LOCAL_AUTH === 'true'

/**
 * Start the Google sign-in flow.
 *
 * @param callbackPath  Path on agents.alchm.kitchen to return to after auth
 *                      (e.g. '/profile', '/dashboard'). Defaults to /profile.
 */
export function startGoogleSignIn(callbackPath: string = DEFAULT_POST_LOGIN_PATH): void {
  if (LOCAL_AUTH_ENABLED) {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    // Same-origin absolute URL — accepted by NextAuth's default redirect guard.
    const callbackUrl = normalizeAgentsCallbackUrl(callbackPath, origin)
    void signIn('google', { callbackUrl })
    return
  }

  // Legacy cross-site path.
  window.location.href = buildKitchenSignInUrl(callbackPath)
}

/**
 * Sign out of the local NextAuth session and return to the given path.
 *
 * Only meaningful when LOCAL_AUTH_ENABLED — a kitchen-bridged session is owned
 * by alchm.kitchen and must be ended there. When local auth is off this still
 * clears any native agents session cookie, which is harmless.
 */
export function signOutLocal(callbackPath = '/'): void {
  void signOut({ callbackUrl: callbackPath })
}
