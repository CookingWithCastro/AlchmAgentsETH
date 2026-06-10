import { getServerSession } from 'next-auth'
import { authOptions } from './auth-options'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { resolveBridgeUser } from './auth-bridge'

export type SessionUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  role?: string | null
  tier?: string | null
  /**
   * Set when the user was resolved via the alchm.kitchen bridge and the kitchen
   * reports them as premium. Used to unify the premium role across both sites.
   * Undefined for native PA sessions (premium then comes from PA's own sub).
   */
  kitchenPremium?: boolean
}

export type Session = {
  user: SessionUser
}

export async function auth(): Promise<Session | null> {
  // 1. Native PA session first (PA's own Google OAuth flow). Existing users
  //    short-circuit here and pay zero network cost.
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const u = session.user as any
      if (u.id) {
        return {
          user: {
            id: u.id,
            email: u.email ?? null,
            name: u.name ?? null,
            image: u.image ?? null,
            role: u.role ?? null,
            tier: u.tier ?? null,
          },
        }
      }
    }
  } catch (err) {
    unstable_rethrow(err)
    // A NextAuth provider/config error should not block the shared kitchen
    // session bridge, but surface it so a misconfiguration is visible.
    console.warn('[auth] getServerSession failed; falling back to the kitchen bridge', err)
  }

  // 2. Cross-site bridge: the user may be signed in on alchm.kitchen, whose
  //    session cookie is shared on `.alchm.kitchen`. Forward the cookies and let
  //    the kitchen identify them. See lib/auth-bridge.ts. Never throws.
  try {
    const c = await cookies()
    const cookieHeader = c
      .getAll()
      .map(ck => `${ck.name}=${ck.value}`)
      .join('; ')
    if (cookieHeader) {
      const bridged = await resolveBridgeUser(cookieHeader)
      if (bridged) {
        return {
          user: {
            id: bridged.id,
            email: bridged.email,
            name: bridged.name,
            image: bridged.image,
            role: bridged.role,
            tier: bridged.tier,
            kitchenPremium: bridged.kitchenPremium,
          },
        }
      }
    }
  } catch (err) {
    unstable_rethrow(err)
    console.warn('[auth] bridge resolution failed', err)
  }

  return null
}

export async function requireAuthOrRedirect(): Promise<SessionUser | null> {
  const session = await auth()
  return session?.user ?? null
}
