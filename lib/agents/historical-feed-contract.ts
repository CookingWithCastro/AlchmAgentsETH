/**
 * Shared contract for the historical-agent feed PRODUCER endpoint
 * (`GET /api/feed/historical-agents`).
 *
 * This is the wire format consumed by WTEN / alchm.kitchen's "Live Network Feed".
 * WTEN runtime-validates each item and DROPS any item missing a required field or
 * with the wrong type, then re-applies its own filter (keeps only
 * `recipe_post` items where `agent.kind === 'historical'` and
 * `agent.hasBirthchart === true`; `yield_claim` items always pass).
 *
 * IMPORTANT: field names here MUST stay in lock-step with the WTEN consumer.
 * If you change a name/shape, reconcile it on the WTEN side too.
 *
 * This module is additive and pure (no DB / no proprietary alchemical logic) —
 * the route layer fetches rows and hands them to these serializers.
 */

export type HistoricalAgentKind = 'historical' | 'planetary'
export type ElementName = 'Fire' | 'Water' | 'Earth' | 'Air'
export type EsmsTag = 'Spirit' | 'Essence' | 'Matter' | 'Substance'

/** Compact birthchart summary surfaced to the consumer (all optional). */
export interface BirthchartSummary {
  sun?: string
  moon?: string
  ascendant?: string
  [key: string]: unknown
}

export interface RecipePostItem {
  id: string
  type: 'recipe_post'
  agent: {
    id: string
    name: string
    kind: HistoricalAgentKind
    hasBirthchart: boolean
    birthchart?: BirthchartSummary
    /** PA chat slug — powers the consumer's "Chat ✦" link. Equals `agentId`. */
    slug?: string
  }
  recipe: {
    name: string
    elements?: Partial<Record<ElementName, number>>
    /** recipe permalink id, when one exists */
    id?: string
  }
  planetaryHour?: string
  esmsTag?: EsmsTag
  element?: ElementName
  /** ISO 8601 */
  createdAt: string
}

export interface YieldClaimItem {
  id: string
  type: 'yield_claim'
  historicalAgentId: string
  planetaryAgentId: string
  amount: number
  /** ISO 8601 */
  createdAt: string
  historicalAgentName?: string
  planetaryAgentName?: string
}

export type HistoricalFeedItem = RecipePostItem | YieldClaimItem

export interface HistoricalFeedResponse {
  items: HistoricalFeedItem[]
}

/** Minimal agent metadata the serializers need, looked up from `historical_agents`. */
export interface AgentMeta {
  name?: string | null
  natalChart?: unknown
  dominantElement?: string | null
}

/** Minimal shape of an `agent_action_events` row the serializers read. */
export interface ActionEventRow {
  id?: string | null
  idempotencyKey?: string | null
  agentId: string
  eventType: string
  metadataPayload?: unknown
  evaluatedAt?: Date | string | null
  postedAt?: Date | string | null
  createdAt?: Date | string | null
}

export const ELEMENTS: ElementName[] = ['Fire', 'Water', 'Earth', 'Air']

export const ELEMENT_TO_ESMS: Record<ElementName, EsmsTag> = {
  Fire: 'Spirit',
  Water: 'Essence',
  Earth: 'Matter',
  Air: 'Substance',
}

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

/** Standard 30°-per-sign lookup (display-only; not a proprietary calculation). */
export function signFromLongitude(longitude: number): string | undefined {
  if (typeof longitude !== 'number' || Number.isNaN(longitude)) return undefined
  const normalized = ((longitude % 360) + 360) % 360
  return SIGN_ORDER[Math.floor(normalized / 30) % 12]
}

/** Title-case an agent id into a human-readable fallback name (e.g. `sun-gemini` → `Sun Gemini`). */
export function humanizeAgentId(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  const words = id
    .split(/[-_]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  return words.length ? words.join(' ') : undefined
}

/** True iff the natal chart contains at least one planet (the canonical hasBirthchart check). */
export function hasBirthchart(natalChart: unknown): boolean {
  const chart = natalChart as { planets?: unknown } | null
  return Boolean(
    chart &&
    typeof chart === 'object' &&
    chart.planets &&
    typeof chart.planets === 'object' &&
    Object.keys(chart.planets as Record<string, unknown>).length > 0
  )
}

/** Pull a compact { sun, moon, ascendant } summary out of a stored natal chart. */
export function deriveBirthchartSummary(natalChart: unknown): BirthchartSummary | undefined {
  if (!natalChart || typeof natalChart !== 'object') return undefined
  const chart = natalChart as Record<string, any>
  const planets = (chart.planets || {}) as Record<string, { sign?: string }>
  const sun = planets.Sun?.sign ?? planets.sun?.sign
  const moon = planets.Moon?.sign ?? planets.moon?.sign

  let ascendant: string | undefined
  if (typeof chart.ascendantSign === 'string') {
    ascendant = chart.ascendantSign
  } else if (typeof chart.ascendant === 'number') {
    ascendant = signFromLongitude(chart.ascendant)
  } else if (chart.ascendant && typeof chart.ascendant === 'object') {
    const ascObj = chart.ascendant as { sign?: string }
    if (typeof ascObj.sign === 'string') ascendant = ascObj.sign
  }

  const summary: BirthchartSummary = {}
  if (sun) summary.sun = sun
  if (moon) summary.moon = moon
  if (ascendant) summary.ascendant = ascendant
  return Object.keys(summary).length ? summary : undefined
}

function coerceElement(value: unknown, fallback: ElementName = 'Fire'): ElementName {
  return ELEMENTS.includes(value as ElementName) ? (value as ElementName) : fallback
}

function toIso(value: Date | string | null | undefined, fallback: Date | string): string {
  const v = value ?? fallback
  if (v instanceof Date) return v.toISOString()
  return typeof v === 'string' ? v : new Date(v).toISOString()
}

/**
 * Serialize an `agent_action_events` recipe row into a contract `recipe_post`.
 * Caller is responsible for only passing rows whose agent has a birthchart.
 */
export function serializeRecipePost(
  row: ActionEventRow,
  agent: AgentMeta | undefined,
  now: Date | string
): RecipePostItem {
  const metadata = (row.metadataPayload || {}) as Record<string, any>
  const element = coerceElement(metadata.element || agent?.dominantElement)
  const elements = (metadata.elemental_tags || metadata.elements || { [element]: 0.8 }) as Partial<
    Record<ElementName, number>
  >
  const planetaryHour =
    metadata.planetarySignature?.planetaryHour || metadata.planetaryHour || 'Sun'
  const recipeId = metadata.recipeId || metadata.recipe_id

  const item: RecipePostItem = {
    id: String(row.id || row.idempotencyKey),
    type: 'recipe_post',
    agent: {
      id: row.agentId,
      name: agent?.name || row.agentId,
      kind: 'historical',
      hasBirthchart: true,
      slug: row.agentId,
    },
    recipe: {
      name: metadata.recipeName || metadata.dishName || 'Cosmic Recipe',
      elements,
    },
    planetaryHour,
    esmsTag: ELEMENT_TO_ESMS[element],
    element,
    createdAt: toIso(row.postedAt || row.createdAt || row.evaluatedAt, now),
  }

  const birthchart = deriveBirthchartSummary(agent?.natalChart)
  if (birthchart) item.agent.birthchart = birthchart
  if (recipeId) item.recipe.id = String(recipeId)
  return item
}

/** Serialize an `agent_action_events` yield_claim row into a contract `yield_claim`. */
export function serializeYieldClaim(
  row: ActionEventRow,
  names: { historicalAgentName?: string; planetaryAgentName?: string },
  now: Date | string
): YieldClaimItem {
  const metadata = (row.metadataPayload || {}) as Record<string, any>
  const historicalAgentId = metadata.historicalAgentId || row.agentId
  const planetaryAgentId = metadata.planetaryAgentId || 'planetary-unknown'

  const item: YieldClaimItem = {
    id: String(row.id || row.idempotencyKey),
    type: 'yield_claim',
    historicalAgentId,
    planetaryAgentId,
    amount: Number(metadata.amount || 0),
    createdAt: toIso(row.postedAt || row.createdAt || row.evaluatedAt, now),
  }
  if (names.historicalAgentName) item.historicalAgentName = names.historicalAgentName
  if (names.planetaryAgentName) item.planetaryAgentName = names.planetaryAgentName
  return item
}

/**
 * Fixture used when `FEED_FIXTURE=1`, so WTEN can integration-test against a live
 * URL before real data is wired. Ordered newest-first. Deliberately includes two
 * EXCLUDED cases (a `planetary` recipe_post and a `hasBirthchart:false` historical
 * recipe_post) so the consumer's filter is exercised end-to-end.
 */
export const HISTORICAL_FEED_FIXTURE: HistoricalFeedItem[] = [
  {
    id: 'fixture-yield-001',
    type: 'yield_claim',
    historicalAgentId: 'leonardo-da-vinci',
    planetaryAgentId: 'sun-gemini',
    amount: 12.5,
    createdAt: '2026-06-05T12:00:00.000Z',
    historicalAgentName: 'Leonardo da Vinci',
    planetaryAgentName: 'Sun in Gemini',
  },
  {
    id: 'fixture-recipe-keep-001',
    type: 'recipe_post',
    agent: {
      id: 'leonardo-da-vinci',
      name: 'Leonardo da Vinci',
      kind: 'historical',
      hasBirthchart: true,
      slug: 'leonardo-da-vinci',
      birthchart: { sun: 'Taurus', moon: 'Pisces', ascendant: 'Virgo' },
    },
    recipe: {
      name: 'Sfumato Saffron Risotto',
      elements: { Fire: 0.5, Earth: 0.3, Air: 0.2 },
      id: 'recipe-sfumato-risotto',
    },
    planetaryHour: 'Venus',
    esmsTag: 'Spirit',
    element: 'Fire',
    createdAt: '2026-06-05T11:30:00.000Z',
  },
  {
    // EXCLUDED by WTEN: kind === 'planetary'
    id: 'fixture-recipe-drop-planetary-001',
    type: 'recipe_post',
    agent: {
      id: 'sun-gemini',
      name: 'Sun in Gemini',
      kind: 'planetary',
      hasBirthchart: false,
      slug: 'sun-gemini',
    },
    recipe: {
      name: 'Mercurial Citrus Salad',
      elements: { Air: 0.7, Water: 0.3 },
    },
    planetaryHour: 'Mercury',
    esmsTag: 'Substance',
    element: 'Air',
    createdAt: '2026-06-05T11:00:00.000Z',
  },
  {
    // EXCLUDED by WTEN: historical but hasBirthchart === false
    id: 'fixture-recipe-drop-nobirthchart-001',
    type: 'recipe_post',
    agent: {
      id: 'anonymous-cook',
      name: 'Anonymous Cook',
      kind: 'historical',
      hasBirthchart: false,
      slug: 'anonymous-cook',
    },
    recipe: {
      name: 'Plain Hearth Bread',
      elements: { Earth: 0.8, Fire: 0.2 },
    },
    planetaryHour: 'Saturn',
    esmsTag: 'Matter',
    element: 'Earth',
    createdAt: '2026-06-05T10:30:00.000Z',
  },
]
