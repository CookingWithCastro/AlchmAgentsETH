import { NextResponse } from 'next/server'

/**
 * Unified sign-out funnel for the Alchm ecosystem.
 *
 * Both agents.alchm.kitchen (PA) and alchm.kitchen (WTEN) set their session
 * cookie on the shared parent domain `.alchm.kitchen`. Because a page on a
 * subdomain may clear a cookie scoped to the parent domain, PA can sign the
 * user out of BOTH sites in one step by expiring every relevant session cookie
 * on `.alchm.kitchen` — no bounce through the kitchen's signout page required.
 * Both stacks use stateless JWT sessions, so clearing the cookie IS the logout.
 *
 * If WTEN later enables server-side session revocation, this should instead
 * redirect through `${alchm.kitchen}/api/auth/signout` (see WTEN_CHANGES.md).
 */

// Session cookies for both stacks, in both prod (__Secure-) and dev forms.
const SESSION_COOKIE_NAMES = [
  'next-auth.session-token', // PA (NextAuth v4)
  '__Secure-next-auth.session-token',
  'authjs.session-token', // WTEN (Auth.js v5)
  '__Secure-authjs.session-token',
]

// Legacy host-only cookies from the manual login flow.
const LEGACY_COOKIE_NAMES = ['userId', 'userName', 'userAvatar']

function clearAndRedirect(request: Request): NextResponse {
  let origin: string | null = null
  try {
    origin = new URL(request.url).origin
  } catch {
    origin = null
  }
  const base = process.env.NEXTAUTH_URL || origin || 'http://localhost:3000'
  const res = NextResponse.redirect(new URL('/', base))

  const isProd = process.env.NODE_ENV === 'production'
  // Shared session cookies are domain-scoped only on the production apex.
  const sharedDomain = process.env.VERCEL_ENV === 'production' ? '.alchm.kitchen' : undefined

  for (const name of SESSION_COOKIE_NAMES) {
    const isSecurePrefixed = name.startsWith('__Secure-')
    res.cookies.set(name, '', {
      domain: sharedDomain,
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecurePrefixed || isProd,
    })
  }

  for (const name of LEGACY_COOKIE_NAMES) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 })
  }

  return res
}

export async function POST(request: Request) {
  return clearAndRedirect(request)
}

// Allow GET so simple link/navigation sign-out works too.
export async function GET(request: Request) {
  return clearAndRedirect(request)
}
