/**
 * Shared server-to-server authorization for internal API routes.
 *
 * Returns true iff the request carries the configured internal secret as either
 * an `Authorization: Bearer <secret>` or `X-Sync-Secret: <secret>` header.
 *
 * Fail-closed: if NO secret is configured, this returns false (callers should
 * combine it with another gate, e.g. an admin session, or reject). Never
 * fail-open on a missing secret — that turns a misconfigured env into an open
 * privileged endpoint.
 */
export function hasInternalApiSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET || process.env.ALCHM_KITCHEN_SYNC_SECRET
  if (!secret) return false
  const authToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const syncToken = request.headers.get('x-sync-secret') || ''
  return authToken === secret || syncToken === secret
}
