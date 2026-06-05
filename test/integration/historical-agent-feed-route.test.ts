import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/feed/historical-agents/route'
import {
  deriveBirthchartSummary,
  hasBirthchart,
  humanizeAgentId,
  serializeRecipePost,
  serializeYieldClaim,
  signFromLongitude,
  type HistoricalFeedItem,
  type RecipePostItem,
  type YieldClaimItem,
} from '@/lib/agents/historical-feed-contract'

const SECRET = 'test-internal-secret'
const NOW = '2026-06-05T12:00:00.000Z'

function feedRequest(opts: { limit?: number | string; auth?: string | false } = {}): Request {
  const url = new URL('http://localhost/api/feed/historical-agents')
  if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit))
  const headers: Record<string, string> = {}
  const auth = opts.auth === undefined ? `Bearer ${SECRET}` : opts.auth
  if (auth) headers.authorization = auth
  return new Request(url.toString(), { headers })
}

describe('historical-feed-contract serializers', () => {
  it('signFromLongitude maps degrees to zodiac signs (display-only)', () => {
    expect(signFromLongitude(0)).toBe('Aries')
    expect(signFromLongitude(52.1)).toBe('Taurus')
    expect(signFromLongitude(348.4)).toBe('Pisces')
    expect(signFromLongitude(-30)).toBe('Pisces') // normalizes negatives
    expect(signFromLongitude(NaN)).toBeUndefined()
  })

  it('humanizeAgentId title-cases slug fallbacks', () => {
    expect(humanizeAgentId('sun-gemini')).toBe('Sun Gemini')
    expect(humanizeAgentId('leonardo-da-vinci')).toBe('Leonardo Da Vinci')
    expect(humanizeAgentId('')).toBeUndefined()
    expect(humanizeAgentId(null)).toBeUndefined()
  })

  it('hasBirthchart requires a non-empty planets object', () => {
    expect(hasBirthchart({ planets: { Sun: { sign: 'Leo' } } })).toBe(true)
    expect(hasBirthchart({ planets: {} })).toBe(false)
    expect(hasBirthchart({})).toBe(false)
    expect(hasBirthchart(null)).toBe(false)
  })

  it('deriveBirthchartSummary extracts sun/moon and ascendant (number or sign)', () => {
    expect(
      deriveBirthchartSummary({
        planets: { Sun: { sign: 'Taurus' }, Moon: { sign: 'Pisces' } },
        ascendant: 165, // Virgo
      })
    ).toEqual({ sun: 'Taurus', moon: 'Pisces', ascendant: 'Virgo' })

    expect(
      deriveBirthchartSummary({ planets: { Sun: { sign: 'Leo' } }, ascendantSign: 'Cancer' })
    ).toEqual({ sun: 'Leo', ascendant: 'Cancer' })

    expect(deriveBirthchartSummary({})).toBeUndefined()
    expect(deriveBirthchartSummary(null)).toBeUndefined()
  })

  it('serializeRecipePost emits a contract recipe_post with slug + birthchart + esmsTag', () => {
    const row = {
      id: 'evt-1',
      agentId: 'leonardo-da-vinci',
      eventType: 'recipe_generation',
      metadataPayload: {
        recipeName: 'Saffron Risotto',
        element: 'Fire',
        elemental_tags: { Fire: 0.6, Earth: 0.4 },
        planetaryHour: 'Venus',
        recipeId: 'recipe-xyz',
      },
      postedAt: NOW,
    }
    const agent = {
      name: 'Leonardo da Vinci',
      dominantElement: 'Fire',
      natalChart: { planets: { Sun: { sign: 'Taurus' }, Moon: { sign: 'Pisces' } }, ascendant: 0 },
    }
    const item = serializeRecipePost(row, agent, NOW)

    expect(item.type).toBe('recipe_post')
    expect(item.id).toBe('evt-1')
    expect(item.agent).toMatchObject({
      id: 'leonardo-da-vinci',
      name: 'Leonardo da Vinci',
      kind: 'historical',
      hasBirthchart: true,
      slug: 'leonardo-da-vinci',
    })
    expect(item.agent.birthchart).toEqual({ sun: 'Taurus', moon: 'Pisces', ascendant: 'Aries' })
    expect(item.recipe).toEqual({
      name: 'Saffron Risotto',
      elements: { Fire: 0.6, Earth: 0.4 },
      id: 'recipe-xyz',
    })
    expect(item.planetaryHour).toBe('Venus')
    expect(item.esmsTag).toBe('Spirit')
    expect(item.element).toBe('Fire')
    expect(item.createdAt).toBe(NOW)
  })

  it('serializeYieldClaim emits a contract yield_claim with both names', () => {
    const row = {
      id: 'evt-2',
      agentId: 'leonardo-da-vinci',
      eventType: 'yield_claim',
      metadataPayload: {
        historicalAgentId: 'leonardo-da-vinci',
        planetaryAgentId: 'sun-gemini',
        amount: 12.5,
      },
      postedAt: NOW,
    }
    const item = serializeYieldClaim(
      row,
      { historicalAgentName: 'Leonardo da Vinci', planetaryAgentName: 'Sun in Gemini' },
      NOW
    )
    expect(item).toEqual({
      id: 'evt-2',
      type: 'yield_claim',
      historicalAgentId: 'leonardo-da-vinci',
      planetaryAgentId: 'sun-gemini',
      amount: 12.5,
      createdAt: NOW,
      historicalAgentName: 'Leonardo da Vinci',
      planetaryAgentName: 'Sun in Gemini',
    })
  })
})

describe('GET /api/feed/historical-agents — auth', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = SECRET
    delete process.env.FEED_FIXTURE
  })
  afterEach(() => {
    delete process.env.ALCHM_KITCHEN_SYNC_SECRET
  })

  it('rejects a request with no Authorization header (fail-closed → 401)', async () => {
    const res = await GET(feedRequest({ auth: false }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized', items: [] })
  })

  it('rejects a request with the wrong secret', async () => {
    const res = await GET(feedRequest({ auth: 'Bearer nope' }))
    expect(res.status).toBe(401)
  })

  it('fails closed when no secret is configured', async () => {
    delete process.env.INTERNAL_API_SECRET
    const res = await GET(feedRequest({ auth: 'Bearer anything' }))
    expect(res.status).toBe(401)
  })

  it('accepts the X-Sync-Secret header form too', async () => {
    const url = new URL('http://localhost/api/feed/historical-agents')
    const res = await GET(new Request(url.toString(), { headers: { 'x-sync-secret': SECRET } }))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/feed/historical-agents — fixture mode', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = SECRET
    process.env.FEED_FIXTURE = '1'
  })
  afterEach(() => {
    delete process.env.FEED_FIXTURE
  })

  it('returns the contract-shaped fixture newest-first, incl. excluded cases', async () => {
    const res = await GET(feedRequest())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: HistoricalFeedItem[] }
    const items = body.items

    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThanOrEqual(4)

    // newest-first ordering
    const times = items.map(i => Date.parse(i.createdAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))

    // every item carries the required keys
    for (const item of items) {
      expect(typeof item.id).toBe('string')
      expect(typeof item.createdAt).toBe('string')
      if (item.type === 'recipe_post') {
        const r = item as RecipePostItem
        expect(typeof r.agent.id).toBe('string')
        expect(typeof r.agent.name).toBe('string')
        expect(['historical', 'planetary']).toContain(r.agent.kind)
        expect(typeof r.agent.hasBirthchart).toBe('boolean')
        expect(typeof r.recipe.name).toBe('string')
      } else {
        const y = item as YieldClaimItem
        expect(typeof y.historicalAgentId).toBe('string')
        expect(typeof y.planetaryAgentId).toBe('string')
        expect(typeof y.amount).toBe('number')
      }
    }

    // exercises the consumer filter: a planetary post and a no-birthchart post are present
    const recipes = items.filter((i): i is RecipePostItem => i.type === 'recipe_post')
    expect(recipes.some(r => r.agent.kind === 'planetary')).toBe(true)
    expect(
      recipes.some(r => r.agent.kind === 'historical' && r.agent.hasBirthchart === false)
    ).toBe(true)
    // and at least one item WTEN keeps
    expect(recipes.some(r => r.agent.kind === 'historical' && r.agent.hasBirthchart === true)).toBe(
      true
    )
    expect(items.some(i => i.type === 'yield_claim')).toBe(true)
  })

  it('caps results to ?limit', async () => {
    const res = await GET(feedRequest({ limit: 2 }))
    const body = (await res.json()) as { items: HistoricalFeedItem[] }
    expect(body.items).toHaveLength(2)
  })

  it('defaults to a sane limit for missing/garbage values', async () => {
    const res = await GET(feedRequest({ limit: 'abc' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: HistoricalFeedItem[] }
    expect(body.items.length).toBeGreaterThan(0)
  })
})
