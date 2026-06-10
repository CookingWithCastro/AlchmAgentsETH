/**
 * Single source of truth for the unified Alchm sign-in redirect.
 *
 * Both `agents.alchm.kitchen` (this app) and `alchm.kitchen` share a Google
 * provider. Signing in through `alchm.kitchen`'s NextAuth handler sets a
 * cookie on `.alchm.kitchen` (see `lib/auth-options.ts`), which makes the
 * session visible to every subdomain — including the Tauri desktop's deep
 * link handshake that reads it on the server side.
 *
 * The desktop, web landing page, and `/auth/signin` page must all go through
 * the same redirect or the cookie domain / callbackUrl edge cases drift.
 */

export const ALCHM_KITCHEN_URL =
  process.env.NEXT_PUBLIC_ALCHM_KITCHEN_URL || 'https://alchm.kitchen'

export const AGENTS_APP_URL =
  process.env.NEXT_PUBLIC_AGENTS_APP_URL || 'https://agents.alchm.kitchen'

export const DEFAULT_POST_LOGIN_PATH = '/profile'

export function normalizeAgentsCallbackUrl(
  callbackPath: string | null | undefined,
  browserOrigin?: string
): string {
  const fallbackOrigin = browserOrigin || AGENTS_APP_URL
  const fallback = new URL(DEFAULT_POST_LOGIN_PATH, fallbackOrigin)

  if (!callbackPath) return fallback.toString()

  try {
    const callback = new URL(callbackPath, fallbackOrigin)
    const allowedOrigins = new Set([new URL(AGENTS_APP_URL).origin, new URL(fallbackOrigin).origin])
    if (!allowedOrigins.has(callback.origin)) return fallback.toString()
    if (callback.protocol !== 'http:' && callback.protocol !== 'https:') return fallback.toString()
    return callback.toString()
  } catch {
    return fallback.toString()
  }
}

/**
 * Build the kitchen Google sign-in URL.
 *
 * @param callbackPath  Path on `agents.alchm.kitchen` to land on after auth
 *                      (e.g. `/yield?link=true`). May be a relative path or
 *                      an absolute URL — relative paths are resolved against
 *                      `window.location.origin` when called in the browser.
 */
export function buildKitchenSignInUrl(callbackPath = DEFAULT_POST_LOGIN_PATH): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : AGENTS_APP_URL
  const absoluteCallback = normalizeAgentsCallbackUrl(callbackPath, origin)

  return `${ALCHM_KITCHEN_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(
    absoluteCallback
  )}`
}

/**
 * Build the local `/auth/signin` href with a properly encoded callback path,
 * for use inside `<a href>` and `Link` elements. The signin page itself
 * forwards to `buildKitchenSignInUrl` so this stays consistent.
 */
export function buildLocalSignInHref(callbackPath: string): string {
  return `/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`
}
