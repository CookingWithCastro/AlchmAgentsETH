import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/services/planetary-positions-service', () => ({
  planetaryPositionsService: {
    getPlanetaryPositions: vi.fn(),
  },
}))

describe('Planetary degree feed responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.AGENT_FEED_RENDER_IMAGES
  })

  it('returns valid transit meal payloads for planetary and Moon degree agents', async () => {
    const { planetaryPositionsService } = await import('@/lib/services/planetary-positions-service')
    const { planetaryDegreeFeedService } = await import('@/lib/agents/planetary-degree-feed')

    vi.mocked(planetaryPositionsService.getPlanetaryPositions)
      .mockResolvedValueOnce({
        timestamp: '2026-05-12T12:00:00.000Z',
        source: 'enhanced-calculator',
        accuracy: 'high',
        cached: false,
        planetaryPositions: [
          {
            planet: 'Sun',
            sign: 'Taurus',
            degree: 22.1,
            longitude: 52.1,
            retrograde: false,
          },
          {
            planet: 'Moon',
            sign: 'Pisces',
            degree: 18.4,
            longitude: 348.4,
            retrograde: false,
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        timestamp: '2026-05-12T10:00:00.000Z',
        source: 'enhanced-calculator',
        accuracy: 'high',
        cached: false,
        planetaryPositions: [
          {
            planet: 'Sun',
            sign: 'Taurus',
            degree: 21.9,
            longitude: 51.9,
            retrograde: false,
          },
          {
            planet: 'Moon',
            sign: 'Pisces',
            degree: 17.3,
            longitude: 347.3,
            retrograde: false,
          },
        ],
      } as any)

    const messages = await planetaryDegreeFeedService.evaluateDegreeChanges({
      date: new Date('2026-05-12T12:00:00.000Z'),
      previousDate: new Date('2026-05-12T10:00:00.000Z'),
      planets: ['Sun', 'Moon'],
      force: true,
    })

    expect(messages).toHaveLength(3)
    expect(messages.every(message => message.valid)).toBe(true)
    expect(messages.every(message => message.response.length > 40)).toBe(true)
    expect(messages.every(message => message.action.eventType === 'recipe_generation')).toBe(true)
    expect(messages.every(message => Boolean(message.action.metadataPayload.recipeName))).toBe(true)
    expect(messages.every(message => Boolean(message.action.metadataPayload.recipePayload))).toBe(
      true
    )
    expect(messages.every(message => Boolean(message.action.metadataPayload.imagePrompt))).toBe(
      true
    )
    expect(
      messages.every(message => !message.action.metadataPayload.recipeName?.includes('entered'))
    ).toBe(true)
    expect(messages.map(message => message.action.metadataPayload.internalTrigger)).toEqual([
      'planet_degree_changed',
      'planet_degree_changed',
      'moon_degree_changed',
    ])
    expect(messages.map(message => message.action.metadataPayload.messageType)).toEqual([
      'planetary_degree_transit_meal',
      'planetary_degree_transit_meal',
      'moon_phase_transit_meal',
    ])
  })
})
