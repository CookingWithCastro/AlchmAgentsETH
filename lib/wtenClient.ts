/**
 * WhatToEatNext (WTEN) sync client — single entrypoint for the
 * /api/internal/agent-sync push.
 *
 * Owns the WTEN base URL + shared-secret validation so callers
 * (scripts/provision-agentic-users.ts, scripts/backfill-agent-sync.ts,
 * future server routes) cannot drift on header name, endpoint path,
 * or env-var convention.
 *
 * The endpoint is idempotent: it returns 200 with the wtenUserId
 * whether the row was just created or already existed. Do NOT branch
 * on a `reason: "already_applied"` field — it does not exist for this
 * endpoint (that's the /api/economy/sync-debit contract).
 */

const DEFAULT_WTEN_BASE = 'https://whattoeatnext-production.up.railway.app'

export interface SyncAgentToWtenResult {
  wtenUserId: string
  created: boolean
}

export interface SyncAgentProfilePayload {
  avatar?: string
  bio?: string
  birthDate?: string
  birthTime?: string
  birthLocation?: unknown
  natalChart?: unknown
  natalPositions?: unknown
  monicaConstant?: number
  dominantElement?: string
}

let cachedConfig: { baseUrl: string; syncSecret: string; internalSecret: string } | null = null

function loadConfig(): { baseUrl: string; syncSecret: string; internalSecret: string } {
  if (cachedConfig) return cachedConfig
  const syncSecret = process.env.ALCHM_KITCHEN_SYNC_SECRET || ''
  const internalSecret = process.env.INTERNAL_API_SECRET || syncSecret
  const baseUrl = (
    process.env.ALCHM_KITCHEN_SYNC_URL ||
    process.env.WTEN_API_BASE_URL ||
    DEFAULT_WTEN_BASE
  ).replace(/\/$/, '')
  cachedConfig = { baseUrl, syncSecret, internalSecret }
  return cachedConfig
}

/**
 * Push an agentic user to WTEN's user table and return the WTEN-side UUID.
 * Throws on any non-2xx response — callers decide whether to retry, log,
 * or surface the failure. Header name is exact: `X-Sync-Secret`
 * (case-sensitive on WTEN's side).
 */
export async function syncAgentToWten(
  email: string,
  displayName?: string | null,
  profile?: SyncAgentProfilePayload
): Promise<SyncAgentToWtenResult> {
  if (!email.endsWith('@agentic.alchm.kitchen') && !email.endsWith('@agents.alchm.kitchen')) {
    throw new Error(
      `syncAgentToWten: email must end with @agentic.alchm.kitchen or @agents.alchm.kitchen (got ${email}).`
    )
  }
  const { baseUrl, syncSecret } = loadConfig()
  if (!syncSecret) {
    throw new Error(
      'ALCHM_KITCHEN_SYNC_SECRET is required. Set it in the environment before calling syncAgentToWten().'
    )
  }
  const res = await fetch(`${baseUrl}/api/internal/agent-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Secret': syncSecret,
    },
    body: JSON.stringify({
      email,
      displayName: displayName ?? undefined,
      ...profile,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    throw new Error(`agent-sync ${res.status} for ${email}: ${body}`)
  }
  const data = (await res.json()) as { ok?: boolean; wtenUserId?: string; created?: boolean }
  if (!data.ok || !data.wtenUserId) {
    throw new Error(`agent-sync returned malformed payload for ${email}: ${JSON.stringify(data)}`)
  }
  return { wtenUserId: data.wtenUserId, created: data.created ?? false }
}

export interface WeeklyMenuMeal {
  id: string
  dayOfWeek: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: number
  recipe?: {
    id: string
    name: string
    cuisine?: string
    ingredients?: string[]
    nutrition?: any
    elementalProperties?: any
  }
  planetarySnapshot?: {
    dominantPlanet: string
    zodiacSign: string
    lunarPhase: string
    elementalState: {
      Fire: number
      Water: number
      Earth: number
      Air: number
    }
    timestamp: string
  }
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyMenu {
  id?: string
  agentSlug: string
  agentDisplayName: string
  weekStartDate: string // ISO date format
  status: 'draft' | 'completed'
  shareToFeed: boolean
  title: string
  summary: string
  meals: WeeklyMenuMeal[]
  nutritionalTotals?: Record<string, any>
  groceryList?: Array<{
    name: string
    category?: string
    quantity?: number
    unit?: string
    checked?: boolean
  }>
  inventory?: string[]
  weeklyBudget?: number | null
  planetaryFocus?: string
  dietaryFocus?: string
  featuredMeals?: Array<{
    dayOfWeek: number
    mealType: string
    recipeId: string
    recipeName: string
  }>
  planetarySignature?: {
    planetaryHour: string
    planetaryDay: string
    dominantElement: string
    postedAt?: string
    dominantSign?: string
    natalPositions?: any[]
    transitPositions?: any[]
  }
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyMenuResponse {
  success: boolean
  agentEmail: string
  userId: string
  menu: { id: string }
  feedShared?: boolean
  feedMetadata?: any
}

/**
 * Fetch a weekly menu for an agent by slug and weekStartDate.
 * Attunes Authorization to "Bearer ${secret}".
 */
export async function getAgentWeeklyMenu(
  agentSlug: string,
  weekStartDate: string
): Promise<WeeklyMenu | null> {
  const { baseUrl, internalSecret } = loadConfig()
  if (!internalSecret) {
    throw new Error('INTERNAL_API_SECRET or ALCHM_KITCHEN_SYNC_SECRET is required.')
  }
  const url = `${baseUrl}/api/menu-planner/agent-weekly-menu?agentSlug=${encodeURIComponent(agentSlug)}&weekStartDate=${encodeURIComponent(weekStartDate)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${internalSecret}`,
      Accept: 'application/json',
    },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)')
    throw new Error(`getAgentWeeklyMenu failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.success && data.menu ? data.menu : null
}

/**
 * Create or update a weekly menu for an agent.
 * Attunes Authorization to "Bearer ${secret}".
 */
export async function postAgentWeeklyMenu(menu: WeeklyMenu): Promise<WeeklyMenuResponse> {
  const { baseUrl, internalSecret } = loadConfig()
  if (!internalSecret) {
    throw new Error('INTERNAL_API_SECRET or ALCHM_KITCHEN_SYNC_SECRET is required.')
  }
  const url = `${baseUrl}/api/menu-planner/agent-weekly-menu`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${internalSecret}`,
    },
    body: JSON.stringify(menu),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)')
    throw new Error(`postAgentWeeklyMenu failed (${res.status}): ${text}`)
  }

  return (await res.json()) as WeeklyMenuResponse
}
