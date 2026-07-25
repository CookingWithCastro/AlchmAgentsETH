import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as postBatch } from '@/app/api/consciousness/batch/route'
import { POST as postLive } from '@/app/api/consciousness/live/route'

const backendFetch = vi.fn()
vi.stubGlobal('fetch', backendFetch)

describe('consciousness proxy absence handling', () => {
  beforeEach(() => {
    backendFetch.mockReset()
    backendFetch.mockResolvedValue(new Response(null, { status: 404 }))
  })

  it('does not generate a plausible live Monica value when the calculator is absent', async () => {
    const response = await postLive(
      new NextRequest('http://localhost/api/consciousness/live', {
        method: 'POST',
        body: JSON.stringify({ name: 'Uncomputed Agent' }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toEqual({
      error: 'Backend consciousness calculation is not available',
      code: 'CONSCIOUSNESS_NOT_COMPUTED',
    })
    expect(payload).not.toHaveProperty('data')
  })

  it('does not generate batch metrics from agent names', async () => {
    const response = await postBatch(
      new NextRequest('http://localhost/api/consciousness/batch', {
        method: 'POST',
        body: JSON.stringify({ agents: [{ name: 'Uncomputed Agent' }] }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.code).toBe('CONSCIOUSNESS_NOT_COMPUTED')
    expect(payload).not.toHaveProperty('data')
  })
})
