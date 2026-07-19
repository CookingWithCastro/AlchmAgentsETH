import { beforeEach, describe, expect, it, vi } from 'vitest'

// The real wake helper polls the hibernating Render backend for up to 75s;
// unmocked it would blow through the test timeout on the failure path.
vi.mock('@/lib/agents/render-wake', () => ({
  wakeRenderBackend: vi.fn(),
}))

import { fetchRenderSupplementalData } from '@/lib/agents/render-supplemental'
import { wakeRenderBackend } from '@/lib/agents/render-wake'

describe('Render supplemental data integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.ALCHM_RENDER_BACKEND_URL = 'https://render.test'
    ;(wakeRenderBackend as any).mockResolvedValue({ awake: false, attempts: 1 })
  })

  it('calls Render alchmize-public with skip: true and formats month correctly', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'))

      // Verify skip is true so image generation is bypassed
      expect(body.imaginizer_info.output.skip).toBe(true)

      // Verify month normalization (1-based Jan -> 0-based Jan)
      expect(body.birth_info.month).toBe(0)

      return new Response(
        JSON.stringify({
          astrology_info: {
            totals: {
              Sun: 1,
            },
          },
          alchemy_info: {
            totals: {
              Spirit: 7,
            },
          },
          imaginizer_info: {
            prompt: 'beautiful cosmic sigil',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    global.fetch = fetchMock as any

    const result = await fetchRenderSupplementalData({
      year: 1990,
      month: 1, // January (1-based)
      day: 1,
      hour: 12,
      minute: 0,
      latitude: 40.7128,
      longitude: -74.006,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://render.test/alchmize-public',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(result.success).toBe(true)
    expect(result.astrologyTotals).toMatchObject({ Sun: 1 })
    expect(result.alchemyTotals).toMatchObject({ Spirit: 7 })
    expect(result.imaginizerInfo).toMatchObject({ prompt: 'beautiful cosmic sigil' })
  })

  it('handles fetch failures gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await fetchRenderSupplementalData({
      year: 1990,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      latitude: 40.7128,
      longitude: -74.006,
    })

    expect(result.success).toBe(false)
    expect(result.raw).toBeNull()
  })
})
