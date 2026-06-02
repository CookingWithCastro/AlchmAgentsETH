import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildRenderPostPrompt,
  generateRenderPostImage,
  normalizeRenderBirthInfo,
} from '@/lib/agents/render-post-image'

describe('Render post image integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.ALCHM_RENDER_BACKEND_URL = 'https://render.test'
  })

  it('builds a direct post prompt when no explicit prompt is supplied', () => {
    const prompt = buildRenderPostPrompt({
      agentId: 'marie-curie',
      agentName: 'Marie Curie',
      title: 'Radium Kitchen',
      body: 'A luminous reflection on matter and nourishment.',
    })

    expect(prompt).toContain('Marie Curie')
    expect(prompt).toContain('Radium Kitchen')
    expect(prompt).toContain('no readable text')
  })

  it('normalizes one-based month input to Render zero-based month input', () => {
    expect(
      normalizeRenderBirthInfo(
        {
          name: 'Comparison Subject',
          year: 1990,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          latitude: 40.7128,
          longitude: -74.006,
        },
        'Fallback'
      )
    ).toMatchObject({
      name: 'Comparison Subject',
      year: 1990,
      month: 0,
      date: 1,
      hour: 12,
      minute: 0,
      latitude: 40.7128,
      longitude: -74.006,
    })
  })

  it('calls Render alchmize and extracts image metadata without treating quantities as canonical', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'))
      expect(body.birth_info.month).toBe(0)
      expect(body.imaginizer_info.image).toBe('avatar')
      expect(body.imaginizer_info.architecture).toBe('DALL-E Algorithm')

      return new Response(
        JSON.stringify({
          imaginizer_info: {
            image_URL: 'https://cdn.example/image.png',
            prompt: 'wizard with a Capricorn aura',
            prompt_dict: { 0: 'wizard' },
          },
          alchemy_info: {
            totals: {
              Spirit: 7,
              Essence: 2,
              Matter: 15,
              Substance: 0,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    global.fetch = fetchMock as any

    const result = await generateRenderPostImage({
      agentId: 'comparison-subject',
      agentName: 'Comparison Subject',
      birthInfo: {
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        latitude: 40.7128,
        longitude: -74.006,
      },
      mode: 'alchmize',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://render.test/alchmize-public',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.success).toBe(true)
    expect(result.imageUrl).toBe('https://cdn.example/image.png')
    expect(result.prompt).toBe('wizard with a Capricorn aura')
    expect(result.renderData.alchemyTotals).toMatchObject({ Matter: 15 })
  })

  it('uses Render generate-image for prompt-only requests', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'))
      expect(body.prompt).toContain('direct prompt')

      return new Response(JSON.stringify({ image_URL: 'https://cdn.example/direct.png' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    global.fetch = fetchMock as any

    const result = await generateRenderPostImage({
      agentId: 'tesla',
      prompt: 'direct prompt for a lightning table',
      mode: 'generate-image',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://render.test/generate-image',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.imageUrl).toBe('https://cdn.example/direct.png')
  })
})
