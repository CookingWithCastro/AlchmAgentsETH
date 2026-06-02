import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildAvatarPrompt, generateAgentAvatar } from '@/lib/agents/avatar-generator'

describe('agent avatar generator', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.ALCHM_RENDER_BACKEND_URL = 'https://render.test'
  })

  it('builds a themed avatar prompt from agent metadata', () => {
    const prompt = buildAvatarPrompt({
      agentId: 'hildegard-of-bingen',
      name: 'Hildegard of Bingen',
      slug: 'hildegard-of-bingen',
      title: 'Mystic Composer and Herbalist',
      zodiacSign: 'Virgo',
      element: 'Earth',
      planet: 'Mercury',
      cosmicRole: 'Sacred medicine and visionary music',
      personality: 'Luminous, practical, prophetic, and deeply attuned to living systems.',
      portraitDescription:
        'Elder medieval Benedictine abbess with pale lined face, serene eyes, white wimple and black veil.',
    })

    expect(prompt).toContain('recognizable historically informed portrait likeness')
    expect(prompt).toContain('physical reference: Elder medieval Benedictine abbess')
    expect(prompt).toContain('Virgo zodiac signature')
    expect(prompt).toContain('Earth elemental energy')
    expect(prompt).toContain('ruled by Mercury')
    expect(prompt).toContain('no readable text')
  })

  it('uses alchmize mode for agents with birth info and forwards the avatar prompt', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'))

      expect(body.imaginizer_info.prompt).toContain('Hildegard of Bingen')
      expect(body.imaginizer_info.image).toBe('avatar')

      return new Response(
        JSON.stringify({
          imaginizer_info: {
            image_URL: 'https://cdn.example/hildegard-avatar.png',
            prompt: body.imaginizer_info.prompt,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    global.fetch = fetchMock as any

    const result = await generateAgentAvatar({
      agentId: 'hildegard-of-bingen',
      name: 'Hildegard of Bingen',
      slug: 'hildegard-of-bingen',
      title: 'Mystic Composer and Herbalist',
      element: 'Earth',
      portraitDescription:
        'Elder medieval Benedictine abbess with white wimple, black veil, and serene penetrating eyes.',
      birthInfo: {
        name: 'Hildegard of Bingen',
        year: 1098,
        month: 8,
        date: 17,
        hour: 12,
        minute: 0,
        latitude: 49.79,
        longitude: 8.09,
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://render.test/alchmize-public',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.success).toBe(true)
    expect(result.mode).toBe('alchmize')
    expect(result.imageUrl).toBe('https://cdn.example/hildegard-avatar.png')
  })
})
