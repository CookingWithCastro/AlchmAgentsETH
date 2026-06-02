import { afterEach, describe, expect, it, vi } from 'vitest'
import { wakeRenderBackend } from '@/lib/agents/render-wake'

const realFetch = global.fetch

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

const FAST = { initialDelayMs: 1, maxDelayMs: 2, pingTimeoutMs: 50, baseUrl: 'https://x.test' }

describe('wakeRenderBackend', () => {
  it('returns awake once the backend answers 200 (rides out the cold start)', async () => {
    let n = 0
    global.fetch = vi.fn(async () => {
      n++
      if (n < 3) throw new Error('cold start: connection refused')
      return new Response('ok', { status: 200 })
    }) as any

    const result = await wakeRenderBackend({ ...FAST, timeoutMs: 5_000 })
    expect(result.awake).toBe(true)
    expect(result.attempts).toBe(3)
  })

  it('treats a non-200 (e.g. 503 hibernate-wake-error) as not-yet-awake and keeps trying', async () => {
    let n = 0
    global.fetch = vi.fn(async () => {
      n++
      return new Response('', { status: n < 2 ? 503 : 200 })
    }) as any

    const result = await wakeRenderBackend({ ...FAST, timeoutMs: 5_000 })
    expect(result.awake).toBe(true)
    expect(result.attempts).toBe(2)
  })

  it('gives up (awake:false) when the budget is exhausted, never throws', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('down')
    }) as any

    const result = await wakeRenderBackend({ ...FAST, timeoutMs: 40 })
    expect(result.awake).toBe(false)
    expect(result.attempts).toBeGreaterThanOrEqual(1)
  })
})
