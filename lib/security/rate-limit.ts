// Lightweight fixed-window rate limiter for the anonymous, unmetered LLM paths
// (notably /api/unified-multi-agent-chat, which runs backend chat calls without auth or
// an ESMS debit). It caps a single abuser from rapid-firing council turns; the durable
// once-per-session guard for the auto-seed lives separately in claimGroupChatSeed.
//
// Storage is per-instance in-memory. On serverless this resets on cold start and is not
// shared across lambdas, so it is best-effort — enough to blunt a script hammering one
// instance, not a distributed flood. A cross-instance limit would swap this store for
// Redis/Vercel KV behind the same interface; kept dependency-free for now so it imports
// nothing server-only and unit-tests without mocks.

export interface RateLimitOptions {
  /** Max requests permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  /** True while at or under the limit for the current window. */
  ok: boolean
  /** Requests remaining in the current window (never negative). */
  remaining: number
  limit: number
  /** Milliseconds until the current window resets. */
  resetMs: number
}

interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, WindowState>()
const MAX_TRACKED_KEYS = 50_000

/**
 * Count one hit against `key` and report whether it is allowed. Fixed-window: the first
 * hit of a window starts a timer of `windowMs`; subsequent hits increment until the
 * window rolls over. `ok` is false once the count exceeds `limit`.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    // Opportunistically evict expired keys so the map can't grow unbounded under churn.
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k)
      }
    }
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return {
      ok: opts.limit >= 1,
      remaining: Math.max(0, opts.limit - 1),
      limit: opts.limit,
      resetMs: opts.windowMs,
    }
  }

  existing.count += 1
  return {
    ok: existing.count <= opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    limit: opts.limit,
    resetMs: Math.max(0, existing.resetAt - now),
  }
}

/** Best-effort client IP from proxy headers (Vercel sets `x-forwarded-for`). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Test-only: clear all tracked windows. */
export function __resetRateLimitStore(): void {
  buckets.clear()
}
