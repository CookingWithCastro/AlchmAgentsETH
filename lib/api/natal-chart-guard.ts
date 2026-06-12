import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Natal charts are birth-data PII, so every route in the family pins the
 * acting user to the session: a caller-supplied userId is only honored when
 * it matches the signed-in user (admins exempt). Returns the authorized
 * userId, or a ready-to-return error response.
 */
export async function resolveAuthorizedNatalUserId(
  requestedUserId: string | null | undefined
): Promise<{ userId: string } | { error: NextResponse }> {
  // Dev/test keep the old explicit-userId contract (integration tests drive
  // several synthetic users with no session). Production fails closed below.
  if (process.env.NODE_ENV !== 'production' && requestedUserId) {
    return { userId: requestedUserId }
  }

  let user
  try {
    user = (await auth())?.user
  } catch {
    user = undefined
  }

  if (!user?.id) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  if (requestedUserId && requestedUserId !== user.id && user.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Cannot access another user’s charts' }, { status: 403 }),
    }
  }

  return { userId: requestedUserId || user.id }
}
