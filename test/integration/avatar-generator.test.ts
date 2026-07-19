import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/agents/free-image-generation', () => ({
  generateFreeImage: vi.fn(),
}))

import { buildAvatarPrompt, generateAgentAvatar } from '@/lib/agents/avatar-generator'
import { generateFreeImage } from '@/lib/agents/free-image-generation'

describe('agent avatar generator', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('builds a themed caricature prompt from agent metadata', () => {
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

    expect(prompt).toContain(
      'Stylized character caricature portrait of Hildegard of Bingen, the Mystic Composer and Herbalist'
    )
    expect(prompt).toContain('Physical likeness: Elder medieval Benedictine abbess')
    expect(prompt).toContain('earth elemental aura')
    expect(prompt).toContain('Faint Mercury planetary energy')
    expect(prompt).toContain('Facial expression and mood conveying: Luminous, practical')
    expect(prompt).toContain('No text, no lettering, no watermark')
  })

  it('falls back to the well-known likeness when no portrait description is given', () => {
    const prompt = buildAvatarPrompt({
      agentId: 'socrates',
      name: 'Socrates',
      slug: 'socrates',
      cosmicRole: 'The Questioner',
    })

    expect(prompt).toContain(
      'Render the well-known appearance of Socrates from established historical depictions'
    )
    // The article guard avoids doubling: "The Questioner" stays as-is.
    expect(prompt).toContain('Stylized character caricature portrait of Socrates, The Questioner')
  })

  it('generates via the free image chain and forwards the caricature prompt', async () => {
    ;(generateFreeImage as any).mockResolvedValue({
      success: true,
      dataUri: 'data:image/png;base64,abc123',
      provider: 'pollinations',
    })

    const result = await generateAgentAvatar({
      agentId: 'hildegard-of-bingen',
      name: 'Hildegard of Bingen',
      slug: 'hildegard-of-bingen',
      title: 'Mystic Composer and Herbalist',
      element: 'Earth',
      portraitDescription:
        'Elder medieval Benedictine abbess with white wimple, black veil, and serene penetrating eyes.',
    })

    expect(generateFreeImage).toHaveBeenCalledTimes(1)
    const [prompt, options] = (generateFreeImage as any).mock.calls[0]
    expect(prompt).toContain('Hildegard of Bingen')
    expect(options).toMatchObject({ width: 1024, height: 1024 })
    expect(options.negativePrompt).toContain('watermark')

    expect(result.success).toBe(true)
    expect(result.mode).toBe('generate-image')
    expect(result.provider).toBe('pollinations')
    expect(result.imageUrl).toBe('data:image/png;base64,abc123')
  })

  it('surfaces free-generation failures without throwing', async () => {
    ;(generateFreeImage as any).mockResolvedValue({
      success: false,
      dataUri: null,
      provider: undefined,
      error: 'all providers exhausted',
    })

    const result = await generateAgentAvatar({
      agentId: 'socrates',
      name: 'Socrates',
      slug: 'socrates',
    })

    expect(result.success).toBe(false)
    expect(result.imageUrl).toBeNull()
    expect(result.error).toBe('all providers exhausted')
  })
})
