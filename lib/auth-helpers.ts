import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Get the current authenticated user from NextAuth session
 * Returns null if not authenticated
 */
export async function getCurrentUser(req?: NextRequest) {
  try {
    const session = await auth()

    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        tier: session.user.tier || 'free',
      }
    }

    // No authentication found
    return null
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

/**
 * Get user ID from request, returns 'anonymous' if not authenticated
 * For backward compatibility with existing code
 */
export function getUserIdFromRequest(req: NextRequest): string {
  // Identity is resolved asynchronously by getCurrentUser(). Never trust a
  // caller-controlled userId cookie as an authenticated identity.
  return 'anonymous'
}

/**
 * Require authentication or throw error
 * Use this in API routes that must have an authenticated user
 */
export async function requireAuth(req?: NextRequest) {
  const user = await getCurrentUser(req)

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}
