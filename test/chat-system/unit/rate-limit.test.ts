// Fixed-window rate limiter backing the per-IP cap on /api/unified-multi-agent-chat.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit, getClientIp, __resetRateLimitStore } from '@/lib/security/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStore()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to the limit then blocks within the window', () => {
    const opts = { limit: 3, windowMs: 60_000 }
    expect(rateLimit('k', opts).ok).toBe(true) // 1
    expect(rateLimit('k', opts).ok).toBe(true) // 2
    const third = rateLimit('k', opts) // 3
    expect(third.ok).toBe(true)
    expect(third.remaining).toBe(0)
    expect(rateLimit('k', opts).ok).toBe(false) // 4 → blocked
  })

  it('tracks keys independently', () => {
    const opts = { limit: 1, windowMs: 60_000 }
    expect(rateLimit('a', opts).ok).toBe(true)
    expect(rateLimit('a', opts).ok).toBe(false)
    expect(rateLimit('b', opts).ok).toBe(true) // different key unaffected
  })

  it('resets after the window elapses', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    const opts = { limit: 1, windowMs: 1000 }
    expect(rateLimit('k', opts).ok).toBe(true)
    expect(rateLimit('k', opts).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit('k', opts).ok).toBe(true) // fresh window
  })

  it('limit of 0 blocks everything', () => {
    expect(rateLimit('k', { limit: 0, windowMs: 1000 }).ok).toBe(false)
  })
})

describe('getClientIp', () => {
  it('uses the first x-forwarded-for hop', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7'
    )
  })

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
