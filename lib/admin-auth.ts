import 'server-only'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ADMIN_EMAILS,
  ADMIN_HANDLES,
  GREG_EMAIL,
  GREG_HANDLE,
  isGregIdentity,
  normalizeEmail,
  normalizeHandle,
  type AdminIdentity,
} from '@/lib/admin-identity'

export { ADMIN_EMAILS, ADMIN_HANDLES, isGregIdentity, normalizeHandle } from '@/lib/admin-identity'

export type AdminSessionUser = AdminIdentity & {
  role?: string | null
  tier?: string | null
}

export type AdminAuthSuccess = {
  ok: true
  user: AdminSessionUser
  source: 'session-role' | 'configured-identity' | 'greg-identity' | 'db-role' | 'db-identity'
}

export type AdminAuthFailure = {
  ok: false
  status: 401 | 403
  error: 'Authentication required' | 'Admin privileges required'
  user?: AdminSessionUser | null
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure

function hasSessionIdentity(user?: AdminSessionUser | null) {
  return Boolean(user?.id || user?.email || user?.name)
}

function getTrustedHandles(identity?: AdminIdentity | null) {
  if (!identity) return []

  const email = normalizeEmail(identity.email)
  const emailHandle = email.includes('@') ? email.split('@')[0] : email

  return [normalizeHandle(identity.id), normalizeHandle(emailHandle)].filter(Boolean)
}

function isTrustedGregIdentity(identity?: AdminIdentity | null) {
  if (!identity) return false

  return (
    normalizeEmail(identity.email) === GREG_EMAIL ||
    getTrustedHandles(identity).includes(GREG_HANDLE)
  )
}

function isTrustedAdminIdentity(identity?: AdminIdentity | null) {
  if (!identity) return false

  const email = normalizeEmail(identity.email)
  if (email && ADMIN_EMAILS.includes(email)) return true

  return getTrustedHandles(identity).some(handle => ADMIN_HANDLES.includes(handle))
}

function toSessionUser(user?: AdminSessionUser | null): AdminSessionUser | null {
  if (!user) return null

  return {
    id: user.id ?? null,
    email: user.email ?? null,
    name: user.name ?? null,
    role: user.role ?? null,
    tier: user.tier ?? null,
  }
}

export function isAdminSession(user?: AdminSessionUser | null) {
  if (!hasSessionIdentity(user)) return false

  if (user?.role === 'admin') return true

  return isTrustedAdminIdentity(user)
}

export function adminErrorResponse(result: AdminAuthFailure) {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

async function getSessionUser(): Promise<AdminSessionUser | null> {
  const session = await auth()
  const user = session?.user as AdminSessionUser | undefined

  return toSessionUser(user)
}

async function findDbAdminUser(user: AdminSessionUser) {
  const email = normalizeEmail(user.email)
  const clauses: Array<{ id: string } | { email: string }> = []

  if (user.id) clauses.push({ id: user.id })
  if (email) clauses.push({ email })

  if (clauses.length === 0) return null

  return prisma.users.findFirst({
    where: { OR: clauses },
    select: { id: true, email: true, name: true, role: true },
  })
}

export async function requireAdmin(
  userOverride?: AdminSessionUser | null
): Promise<AdminAuthResult> {
  const user = userOverride === undefined ? await getSessionUser() : toSessionUser(userOverride)

  if (!user || !hasSessionIdentity(user)) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required',
      user,
    }
  }

  if (user?.role === 'admin') {
    return { ok: true, user, source: 'session-role' }
  }

  if (isTrustedGregIdentity(user)) {
    return { ok: true, user, source: 'greg-identity' }
  }

  if (isTrustedAdminIdentity(user)) {
    return { ok: true, user, source: 'configured-identity' }
  }

  try {
    const dbUser = await findDbAdminUser(user)
    if (!dbUser) {
      return {
        ok: false,
        status: 403,
        error: 'Admin privileges required',
        user,
      }
    }

    const resolvedUser: AdminSessionUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      tier: user.tier,
    }

    if (dbUser.role === 'admin') {
      return { ok: true, user: resolvedUser, source: 'db-role' }
    }

    if (isTrustedGregIdentity(resolvedUser)) {
      return { ok: true, user: resolvedUser, source: 'db-identity' }
    }

    if (isTrustedAdminIdentity(resolvedUser)) {
      return { ok: true, user: resolvedUser, source: 'db-identity' }
    }
  } catch (error) {
    console.warn('[AdminAuth] Failed to verify database admin role:', error)
  }

  return {
    ok: false,
    status: 403,
    error: 'Admin privileges required',
    user,
  }
}
