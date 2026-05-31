import 'server-only'

import { DEMO_AGENTS } from '@/lib/demo-agents-data'
import { prisma } from '@/lib/db'

type JsonRecord = Record<string, unknown>

export const ACTIVITY_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const ACTIVITY_OPTIONS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export interface InternalAuthResult {
  ok: boolean
  status?: number
  error?: string
}

export interface AgentReference {
  slug: string
  name: string
}

export interface AgentAction {
  id: string
  type: string
  createdAt: string
  metadata: JsonRecord
  links: {
    chatThread?: string
    recipe?: string
  }
}

export interface AgentInteraction {
  id: string
  kind: 'agent_to_agent' | 'agent_to_user'
  counterparty: {
    slug?: string
    name: string
    userId?: string
  }
  topic: string
  messagePreview: string
  messageCount: number
  startedAt: string
  lastTurnAt: string
  chatThread: string
}

export interface AgentArtifact {
  id: string
  kind: 'recipe' | 'lab_entry' | 'insight'
  title: string
  createdAt: string
  summary: string
  alchmKitchenPath?: string
  /** True for an agent-authored recipe (persisted in WTEN user_custom_recipes). */
  authored?: boolean
  /** Inline recipe payload for authored recipes (not resolvable via the catalog proxy). */
  recipe?: JsonRecord
}

interface CursorPayload {
  createdAt?: string
  lastTurnAt?: string
  id?: string
}

const AGENTS_BASE_URL =
  process.env.AGENTS_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  'https://agents.alchm.kitchen'

const ALCHM_KITCHEN_BASE_URL =
  process.env.ALCHM_KITCHEN_PUBLIC_URL ||
  process.env.ALCHM_KITCHEN_SYNC_URL ||
  process.env.ALCHM_KITCHEN_BASE_URL ||
  'https://alchm.kitchen'

const ARTIFACT_EVENT_TYPES = ['recipe_generation', 'lab_entry', 'insight'] as const

export function validateInternalBearer(request: Request): InternalAuthResult {
  const expected = process.env.INTERNAL_API_SECRET
  if (!expected) {
    return { ok: false, status: 500, error: 'INTERNAL_API_SECRET is not configured' }
  }

  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (token !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  return { ok: true }
}

export function parseLimit(searchParams: URLSearchParams, fallback: number, max: number): number {
  const raw = Number(searchParams.get('limit') || fallback)
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.min(max, Math.floor(raw)))
}

export function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function asRecord(value: unknown): JsonRecord {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return asRecord(parsed)
    } catch {
      return {}
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord
  return {}
}

function firstString(metadata: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function truncate(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= limit) return compact
  return `${compact.slice(0, Math.max(0, limit - 3)).trim()}...`
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | null): CursorPayload | undefined {
  if (!cursor) return undefined
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload
  } catch {
    return undefined
  }
}

function chatThreadUrl(sessionId: string): string {
  return `${AGENTS_BASE_URL.replace(/\/$/, '')}/gallery/chat/${encodeURIComponent(sessionId)}`
}

function recipeUrl(recipeId: string): string {
  return `${ALCHM_KITCHEN_BASE_URL.replace(/\/$/, '')}/recipes/${encodeURIComponent(recipeId)}`
}

function alchmKitchenPath(recipeId: string): string {
  return `/recipes/${recipeId}`
}

function normalizeMetadata(eventType: string, metadata: JsonRecord): JsonRecord {
  const normalized: JsonRecord = { ...metadata }
  const targetName = firstString(normalized, 'targetName', 'withAgent', 'partnerName')
  if (targetName) {
    normalized.targetName ??= targetName
    normalized.withAgent ??= targetName
  }

  const topic =
    firstString(normalized, 'topic', 'subject', 'summary') ||
    firstString(normalized, 'item', 'recipeName', 'dishName', 'insightTitle', 'message')
  if (topic) normalized.topic ??= truncate(topic, 90)

  if (['agent_chat', 'chat', 'agent.chat'].includes(eventType)) {
    const excerpt = firstString(
      normalized,
      'messageExcerpt',
      'message',
      'responsePreview',
      'insightContent',
      'description'
    )
    if (excerpt) {
      normalized.messageExcerpt ??= truncate(excerpt, 160)
      normalized.message ??= truncate(excerpt, 500)
    }
  }

  const recipeId = firstString(normalized, 'recipeId', 'recipe_id')
  if (recipeId) {
    normalized.recipeId ??= recipeId
    normalized.recipe_id ??= recipeId
  }

  const summary = firstString(normalized, 'summary', 'insightContent', 'description', 'review')
  if (summary) normalized.summary ??= truncate(summary, 180)

  return normalized
}

function linksForMetadata(metadata: JsonRecord) {
  const sessionId = firstString(metadata, 'sessionId', 'groupChatId', 'threadKey')
  const recipeId = firstString(metadata, 'recipeId', 'recipe_id')

  return {
    ...(sessionId ? { chatThread: chatThreadUrl(sessionId) } : {}),
    ...(recipeId ? { recipe: recipeUrl(recipeId) } : {}),
  }
}

function conversationMetadata(row: {
  sessionId: string
  userId: string | null
  userMessage: string
  agentResponse: string
  contextData: unknown
}): JsonRecord {
  const context = asRecord(row.contextData)
  const nested = asRecord(context.metadata)
  const metadata = normalizeMetadata('agent_chat', {
    ...nested,
    ...context,
    sessionId: row.sessionId,
    targetName:
      firstString(context, 'targetName', 'withAgent', 'partnerName', 'targetAgentName') ||
      firstString(nested, 'targetName', 'withAgent', 'partnerName', 'targetAgentName'),
    topic:
      firstString(context, 'topic', 'subject', 'summary') ||
      firstString(nested, 'topic', 'subject', 'summary') ||
      truncate(row.userMessage, 90),
    userMessageExcerpt: truncate(row.userMessage, 160),
    messageExcerpt: truncate(row.agentResponse, 160),
    message: row.agentResponse,
    ...(row.userId ? { userId: row.userId } : {}),
  })

  return metadata
}

function actionKind(eventType: string): 'recipe' | 'lab_entry' | 'insight' | null {
  if (eventType === 'recipe_generation') return 'recipe'
  if (eventType === 'lab_entry') return 'lab_entry'
  if (eventType === 'insight') return 'insight'
  return null
}

function artifactFromAction(row: {
  id: string
  eventType: string
  createdAt: Date
  metadataPayload: unknown
}): AgentArtifact | null {
  const kind = actionKind(row.eventType)
  if (!kind) return null

  const metadata = normalizeMetadata(row.eventType, asRecord(row.metadataPayload))
  const recipeId = firstString(metadata, 'recipeId', 'recipe_id')
  const title =
    firstString(metadata, 'recipeName', 'dishName', 'insightTitle', 'title') ||
    titleCaseSlug(row.eventType)
  const summary =
    firstString(
      metadata,
      'summary',
      'description',
      'insightContent',
      'messageExcerpt',
      'message',
      'review'
    ) || ''

  // Authored recipes live in WTEN user_custom_recipes, which the catalog proxy
  // /api/recipes/[id] does NOT resolve — so render them inline from the stored
  // payload instead of attaching an alchmKitchenPath (which would 404).
  const authored = firstString(metadata, 'source') === 'agent'
  const recipePayload = authored ? asRecord(metadata.recipePayload) : null
  const hasInlineRecipe = !!recipePayload && Object.keys(recipePayload).length > 0

  return {
    id: row.id,
    kind,
    title,
    createdAt: row.createdAt.toISOString(),
    summary: truncate(summary, 220),
    ...(authored && hasInlineRecipe
      ? { authored: true, recipe: recipePayload as JsonRecord }
      : recipeId
        ? { alchmKitchenPath: alchmKitchenPath(recipeId) }
        : {}),
  }
}

export async function resolveAgent(slug: string): Promise<AgentReference> {
  const dbAgent = await prisma.historical_agents.findUnique({
    where: { agentId: slug },
    select: { agentId: true, name: true },
  })

  if (dbAgent) return { slug: dbAgent.agentId, name: dbAgent.name }

  const demoAgent = DEMO_AGENTS.find(agent => agent.id === slug)
  return { slug, name: demoAgent?.name || titleCaseSlug(slug) }
}

/**
 * A single conceptual agent can have feed events stored under more than one
 * agentId form: the seeded DB slug carries a `planetary-` prefix
 * (`planetary-mars-aries-12`), while planetary-degree-feed derives the id from
 * the agent email's local part WITHOUT it (`mars-aries-12`). Querying every
 * known variant ensures a profile surfaces all the events the agent produced,
 * not just the ones whose id happens to match the clicked slug.
 */
export function agentIdVariants(slug: string): string[] {
  const base = (slug || '').trim()
  const lower = base.toLowerCase()
  const variants = new Set<string>([base, lower].filter(Boolean))
  if (lower.startsWith('planetary-')) variants.add(lower.slice('planetary-'.length))
  else if (lower) variants.add(`planetary-${lower}`)
  return [...variants]
}

export interface AgentBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
}

/**
 * Real ESMS token balances for an agent's agentic user
 * (`<agentId>@agentic.alchm.kitchen`). Returns null when the agent hasn't been
 * provisioned yet, or when `token_balances.user_id` is still a UUID column
 * (pre-economy-migration → P2023). The profile renders zeros for null, so this
 * degrades gracefully both before and after the 4a/4b production steps.
 */
export async function getAgentBalances(slug: string): Promise<AgentBalances | null> {
  try {
    const emails = agentIdVariants(slug).map(s => `${s}@agentic.alchm.kitchen`)
    const user = await prisma.users.findFirst({
      where: { email: { in: emails } },
      select: { id: true },
    })
    if (!user) return null
    const bal = await prisma.tokenBalance.findUnique({ where: { userId: user.id } })
    if (!bal) return null
    return {
      spirit: Number(bal.spirit),
      essence: Number(bal.essence),
      matter: Number(bal.matter),
      substance: Number(bal.substance),
    }
  } catch (err: any) {
    if (
      err?.code === 'P2023' ||
      String(err?.message || '')
        .toLowerCase()
        .includes('uuid')
    ) {
      return null // token_balances.user_id still UUID (pre-4a migration) — show zeros
    }
    console.warn('[activity-surfaces] getAgentBalances failed:', err)
    return null
  }
}

export async function getAgentActions(
  slug: string,
  searchParams: URLSearchParams
): Promise<{ agent: AgentReference; actions: AgentAction[]; nextCursor: string | null }> {
  const agent = await resolveAgent(slug)
  const limit = parseLimit(searchParams, 50, 100)
  const cursor = decodeCursor(searchParams.get('cursor'))
  const since = parseDateParam(searchParams.get('since'))
  const until = parseDateParam(searchParams.get('until'))
  const createdAt: { gte?: Date; lte?: Date; lt?: Date } = {}
  if (since) createdAt.gte = since
  if (until) createdAt.lte = until
  if (cursor?.createdAt) {
    const cursorDate = parseDateParam(cursor.createdAt)
    if (cursorDate) createdAt.lt = cursorDate
  }

  const createdAtFilter = Object.keys(createdAt).length ? { createdAt } : {}
  const [eventRows, conversationRows] = await Promise.all([
    prisma.agent_action_events.findMany({
      where: { agentId: { in: agentIdVariants(slug) }, ...createdAtFilter },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
    prisma.agentConversation.findMany({
      where: { agentId: { in: agentIdVariants(slug) }, ...createdAtFilter },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
  ])

  const actionRows: AgentAction[] = eventRows.map(row => {
    const metadata = normalizeMetadata(row.eventType, asRecord(row.metadataPayload))
    return {
      id: row.id,
      type: row.eventType,
      createdAt: row.createdAt.toISOString(),
      metadata,
      links: linksForMetadata(metadata),
    }
  })

  const chatRows: AgentAction[] = conversationRows.map(row => {
    const metadata = conversationMetadata(row)
    return {
      id: row.id,
      type: 'chat',
      createdAt: row.createdAt.toISOString(),
      metadata,
      links: linksForMetadata(metadata),
    }
  })

  const actions = [...actionRows, ...chatRows].sort((a, b) => {
    const delta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return delta || b.id.localeCompare(a.id)
  })
  const page = actions.slice(0, limit)
  const last = page[page.length - 1]
  const hasMore =
    actions.length > limit || eventRows.length > limit || conversationRows.length > limit

  return {
    agent,
    actions: page,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  }
}

export async function getAgentInteractions(
  slug: string,
  searchParams: URLSearchParams
): Promise<{ interactions: AgentInteraction[]; nextCursor: string | null }> {
  const limit = parseLimit(searchParams, 20, 50)
  const cursor = decodeCursor(searchParams.get('cursor'))
  const withFilter = searchParams.get('with')?.trim().toLowerCase()
  const createdAt: { lt?: Date } = {}
  if (cursor?.lastTurnAt) {
    const cursorDate = parseDateParam(cursor.lastTurnAt)
    if (cursorDate) createdAt.lt = cursorDate
  }
  const createdAtFilter = Object.keys(createdAt).length ? { createdAt } : {}
  const variants = agentIdVariants(slug)
  const rows = await prisma.agentConversation.findMany({
    where: { agentId: { in: variants }, ...createdAtFilter },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: Math.max(limit * 8, 50),
  })

  const sessionIds = Array.from(new Set(rows.map(row => row.sessionId)))
  const peerRows = sessionIds.length
    ? await prisma.agentConversation.findMany({
        where: {
          sessionId: { in: sessionIds },
          agentId: { notIn: variants },
        },
        select: {
          agentId: true,
          sessionId: true,
          userId: true,
          agentResponse: true,
          createdAt: true,
        },
      })
    : []

  const peerAgentIds = Array.from(new Set(peerRows.map(row => row.agentId)))
  const peerAgents = peerAgentIds.length
    ? await prisma.historical_agents.findMany({
        where: { agentId: { in: peerAgentIds } },
        select: { agentId: true, name: true },
      })
    : []
  const peerAgentNames = new Map(peerAgents.map(agent => [agent.agentId, agent.name]))

  const bySession = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = bySession.get(row.sessionId) || []
    list.push(row)
    bySession.set(row.sessionId, list)
  }

  const peersBySession = new Map<string, typeof peerRows>()
  for (const row of peerRows) {
    const list = peersBySession.get(row.sessionId) || []
    list.push(row)
    peersBySession.set(row.sessionId, list)
  }

  const interactions = Array.from(bySession.entries())
    .map(([sessionId, sessionRows]): AgentInteraction => {
      const sorted = [...sessionRows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const peers = peersBySession.get(sessionId) || []
      const peer = peers[0]
      const metadata = conversationMetadata(last)
      const targetName = firstString(metadata, 'targetName', 'withAgent', 'partnerName')
      const userId = last.userId || firstString(metadata, 'userId')
      const topic =
        firstString(metadata, 'topic', 'subject', 'summary') || truncate(last.userMessage, 90)

      if (peer) {
        const name = peerAgentNames.get(peer.agentId) || titleCaseSlug(peer.agentId)
        return {
          id: sessionId,
          kind: 'agent_to_agent',
          counterparty: { slug: peer.agentId, name },
          topic,
          messagePreview: truncate(last.agentResponse, 160),
          messageCount: sorted.length + peers.length,
          startedAt: first.createdAt.toISOString(),
          lastTurnAt: last.createdAt.toISOString(),
          chatThread: chatThreadUrl(sessionId),
        }
      }

      return {
        id: sessionId,
        kind: 'agent_to_user',
        counterparty: {
          name: targetName || userId || 'Alchm Kitchen user',
          ...(userId ? { userId } : {}),
        },
        topic,
        messagePreview: truncate(last.agentResponse, 160),
        messageCount: sorted.length,
        startedAt: first.createdAt.toISOString(),
        lastTurnAt: last.createdAt.toISOString(),
        chatThread: chatThreadUrl(sessionId),
      }
    })
    .filter(interaction => {
      if (!withFilter) return true
      return (
        interaction.counterparty.slug?.toLowerCase() === withFilter ||
        interaction.counterparty.userId?.toLowerCase() === withFilter ||
        interaction.counterparty.name.toLowerCase() === withFilter
      )
    })
    .sort((a, b) => {
      const delta = new Date(b.lastTurnAt).getTime() - new Date(a.lastTurnAt).getTime()
      return delta || b.id.localeCompare(a.id)
    })

  const page = interactions.slice(0, limit)
  const last = page[page.length - 1]

  return {
    interactions: page,
    nextCursor:
      interactions.length > limit && last
        ? encodeCursor({ lastTurnAt: last.lastTurnAt, id: last.id })
        : null,
  }
}

export async function getAgentArtifacts(
  slug: string,
  searchParams: URLSearchParams
): Promise<{ artifacts: AgentArtifact[]; nextCursor: string | null }> {
  const limit = parseLimit(searchParams, 20, 50)
  const cursor = decodeCursor(searchParams.get('cursor'))
  const kind = searchParams.get('kind') as AgentArtifact['kind'] | null
  const eventTypes =
    kind === 'recipe'
      ? ['recipe_generation']
      : kind === 'lab_entry'
        ? ['lab_entry']
        : kind === 'insight'
          ? ['insight']
          : [...ARTIFACT_EVENT_TYPES]
  const createdAt: { lt?: Date } = {}
  if (cursor?.createdAt) {
    const cursorDate = parseDateParam(cursor.createdAt)
    if (cursorDate) createdAt.lt = cursorDate
  }
  const createdAtFilter = Object.keys(createdAt).length ? { createdAt } : {}

  const rows = await prisma.agent_action_events.findMany({
    where: {
      agentId: { in: agentIdVariants(slug) },
      eventType: { in: eventTypes },
      ...createdAtFilter,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const artifacts = rows
    .map(artifactFromAction)
    .filter((item): item is AgentArtifact => Boolean(item))
  const page = artifacts.slice(0, limit)
  const last = page[page.length - 1]

  return {
    artifacts: page,
    nextCursor:
      artifacts.length > limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  }
}
