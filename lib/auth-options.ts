import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { provisionPaUser } from '@/lib/user-provisioning'
import { getPaTier } from '@/lib/premium/entitlements'

const DB_TIMEOUT_MS = 5000
const DEV_AUTH_SECRET = 'consciousness-evolution-secret-dev-only'

function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (configured) return configured
  if (process.env.NODE_ENV === 'production') {
    // `next build` evaluates this module while collecting page data; only a
    // serving process must refuse to boot without a real secret.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return 'build-phase-placeholder-secret-unused-at-runtime'
    }
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is required in production')
  }
  return DEV_AUTH_SECRET
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB timeout')), ms)),
  ])
}

export const authOptions: import('next-auth').NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: getAuthSecret(),
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.VERCEL_ENV === 'production' ? '.alchm.kitchen' : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = profile?.email || user?.email
        if (!email) {
          console.error('Google login failed: No email provided')
          return false
        }

        try {
          const name = profile?.name || user?.name || email.split('@')[0]
          // Shared provisioning logic — see lib/user-provisioning.ts. The same
          // helper backs the cross-site bridge so both flows create users identically.
          await prisma.$transaction(tx => provisionPaUser(tx, { email, name, provider: 'google' }))
          return true
        } catch (error) {
          console.error('Error during Google sign-in transaction:', error)
          // Crucial: return false to prevent ghost sessions if DB fails
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign-in
      if (user && account?.provider === 'google') {
        try {
          const dbUser = await withTimeout(
            prisma.users.findUnique({ where: { email: user.email! } }),
            DB_TIMEOUT_MS
          )
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role || 'user'
          }
        } catch (error) {
          console.error('Error resolving database user ID for Google (initial):', error)
        }
      }

      // Fallback: if token.id is missing but we have an email, try to resolve it
      if (!token.id && token.email) {
        try {
          const dbUser = await withTimeout(
            prisma.users.findUnique({ where: { email: token.email } }),
            DB_TIMEOUT_MS
          )
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role || 'user'
          }
        } catch (error) {
          // Only log once to avoid spamming logs if DB is down
          console.error('Error resolving database user ID for Google (fallback):', error)
        }
      }

      // Resolve the real PA tier (subscription/role-driven). While the premium
      // enforcement flag is off, getPaTier returns 'master' for everyone, so
      // this preserves the prior behavior until enforcement is enabled.
      if (token.id) {
        try {
          token.tier = await getPaTier(token.id as string)
        } catch {
          token.tier = 'free'
        }
      } else {
        token.tier = 'free'
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        const sessionUser = session.user as typeof session.user & {
          id?: string
          role?: string
          tier?: string
        }
        sessionUser.id = token.id as string
        sessionUser.role = (token.role as string) || 'user'
        sessionUser.tier = (token.tier as string) || 'master'
      }
      return session
    },
  },
}
