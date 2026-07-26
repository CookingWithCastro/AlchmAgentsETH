/**
 * Security Audit Logger (NIST CSF 2.0 Detect/Protect & OWASP ASVS V7 Conformance)
 * Records security-relevant events (authorization failures, rate limits, prompt injection attempts, SSRF blocks).
 */

import { logger } from '@/lib/structured-logger'

export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'AUTHORIZATION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROMPT_INJECTION_DETECTED'
  | 'SSRF_BLOCKED'
  | 'SECRET_ACCESS'
  | 'ADMIN_ACTION'

export interface SecurityEventPayload {
  eventType: SecurityEventType
  userId?: string
  ip?: string
  resource?: string
  details?: Record<string, any>
}

/**
 * Logs a security event to structured logger while masking sensitive secrets.
 */
export function logSecurityEvent(payload: SecurityEventPayload): void {
  const { eventType, userId, ip, resource, details } = payload

  // Sanitize details object to prevent leaking sensitive API keys or password hashes
  const safeDetails: Record<string, any> = {}
  if (details) {
    for (const [k, v] of Object.entries(details)) {
      if (/key|token|secret|password|auth/i.test(k)) {
        safeDetails[k] = '[REDACTED_SECRET]'
      } else {
        safeDetails[k] = v
      }
    }
  }

  logger.warn(`SECURITY EVENT: [${eventType}] on ${resource || 'unknown'}`, {
    system: 'security_audit',
    operation: eventType.toLowerCase(),
    userId: userId || 'anonymous',
    metadata: {
      eventType,
      ip: ip || 'unknown',
      resource: resource || 'unknown',
      timestamp: new Date().toISOString(),
      ...safeDetails,
    },
  })
}
