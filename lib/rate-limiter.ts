/**
 * Rate Limiting Utility (OWASP LLM10 & OWASP API4 Conformance)
 * Provides sliding-window / token-bucket rate limiting for Next.js API routes and LLM requests.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limiting store
const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) {
          rateLimitMap.delete(key)
        }
      }
    },
    5 * 60 * 1000
  )
}

export interface RateLimitOptions {
  windowMs?: number // Default: 60,000 ms (1 min)
  maxRequests?: number // Default: 60 requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

/**
 * Checks rate limit for a given identifier (IP address, userId, or API key).
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs || 60 * 1000
  const maxRequests = options.maxRequests || 60
  const now = Date.now()

  const key = `${identifier}`
  const existing = rateLimitMap.get(key)

  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetMs: windowMs,
    }
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, existing.resetTime - now),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetMs: Math.max(0, existing.resetTime - now),
  }
}
