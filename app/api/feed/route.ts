import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { feedStreamBus } from '@/lib/agents/feed-stream-bus'
import { normalizeDbActionToFeedEvent } from '@/lib/agents/feed-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 30

/**
 * GET /api/feed?since=<iso>&before=<iso>
 *
 * Returns chronological events from the database (agent_action_events).
 *
 * Query params:
 *   `since`  — ISO timestamp; only return events newer than this (SSE catch-up)
 *   `before` — ISO timestamp; only return events older than this (cursor pagination)
 *
 * Response: { events, cursor, hasMore }
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  const before = url.searchParams.get('before')

  const whereClause: any = {
    status: { in: ['executed', 'posted'] },
  }

  if (since) {
    whereClause.evaluatedAt = { ...(whereClause.evaluatedAt || {}), gt: new Date(since) }
  }
  if (before) {
    whereClause.evaluatedAt = { ...(whereClause.evaluatedAt || {}), lt: new Date(before) }
  }

  let dbEvents: any[] = []
  try {
    dbEvents = await prisma.agent_action_events.findMany({
      where: whereClause,
      orderBy: { evaluatedAt: 'desc' },
      take: PAGE_SIZE + 1, // fetch one extra to detect hasMore
    })
  } catch (err) {
    // A DB failure here must surface as a hard error, not an empty feed.
    // An empty 200 is indistinguishable from "no activity yet" and masked a
    // total Prisma outage in June 2026 — return 503 so the SSE catch-up loop
    // and monitoring see the fault instead of a silently-empty timeline.
    console.error('[feed/GET] failed to query agent_action_events:', err)
    return NextResponse.json(
      { error: 'feed_unavailable', events: [], cursor: null, hasMore: false },
      { status: 503 }
    )
  }

  const hasMore = dbEvents.length > PAGE_SIZE
  if (hasMore) dbEvents = dbEvents.slice(0, PAGE_SIZE)

  const events = dbEvents.map(normalizeDbActionToFeedEvent)
  const oldest = events[events.length - 1]

  return NextResponse.json({
    events,
    cursor: oldest?.timestamp || null,
    hasMore,
  })
}

/**
 * POST /api/feed
 *
 * SECURE Webhook ingestion endpoint. Validates internally using internal secret
 * and persists the pushed action to `agent_action_events` table before
 * broadcasting it over SSE to live clients.
 */
export async function POST(req: Request) {
  try {
    const expected = process.env.INTERNAL_API_SECRET
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (expected && token !== expected) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { agentEmail, eventType, metadataPayload } = body

    if (!agentEmail || !eventType) {
      return new Response('Missing agentEmail or eventType', { status: 400 })
    }

    const metadata = (metadataPayload || {}) as Record<string, any>
    const timestamp = metadata.timestamp || new Date().toISOString()
    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      metadata.idempotencyKey ||
      `wten:feed:${agentEmail}:${eventType}:${new Date(timestamp).getTime()}`

    const agentId = agentEmail.split('@')[0]
    const triggerType = metadata.triggerType || 'webhook_push'
    const triggerSummary =
      metadata.transitTrigger ||
      metadata.triggerSummary ||
      metadata.internalTrigger ||
      'Manual Push'
    const score = Number(metadata.internalConfidence || metadata.score || 0.85)

    const eventRow = await prisma.agent_action_events.upsert({
      where: { idempotencyKey },
      create: {
        agentId,
        agentEmail,
        eventType,
        triggerType,
        triggerSummary,
        metadataPayload: metadata,
        score,
        idempotencyKey,
        status: 'posted',
        evaluatedAt: new Date(timestamp),
        postedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        status: 'posted',
        postedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    const normalizedEvent = normalizeDbActionToFeedEvent(eventRow)
    feedStreamBus.publish({ event: 'feed', data: normalizedEvent })

    // Cognitive Loop: Non-blocking background RAG memory ingestion
    if (
      process.env.USE_RAG_GENERATION === 'true' &&
      (eventType === 'made_it' || eventType === 'made-it' || eventType === 'transmutation')
    ) {
      Promise.resolve().then(async () => {
        try {
          console.log(
            `[RAG Ingestion] Starting background ingestion for eventType=${eventType}, agentId=${agentId}`
          )

          // 1. Query agent details from Postgres
          const dbAgent = await prisma.historical_agents.findUnique({
            where: { agentId },
          })
          const nameVal = dbAgent?.name || metadata.agentName || agentId
          const eraVal = dbAgent?.historicalEra || metadata.era || 'Unknown'
          const specialtyVal = dbAgent?.specialty || metadata.specialty || ''
          const consciousnessLevelVal =
            dbAgent?.consciousnessLevel || metadata.consciousnessLevel || 'Unknown'

          // 2. Synthesize narrative content
          let contentText = ''
          if (eventType === 'made_it' || eventType === 'made-it') {
            const recipeName = metadata.recipeName || 'Alchemical Recipe'
            const review =
              metadata.review || metadata.message || 'Successfully prepared the cosmic recipe!'
            contentText = `Activity Log (Made It): The agent ${nameVal} prepared the recipe "${recipeName}" on alchm.kitchen. Review/Notes: ${review}`
          } else if (eventType === 'transmutation') {
            const dishName = metadata.dishName || 'Transmuted Cosmic Elixir'
            const description =
              metadata.description || metadata.message || 'Transmuted a new creation.'
            contentText = `Activity Log (Transmutation): The agent ${nameVal} transmuted "${dishName}" in the lab. Description/Notes: ${description}`
          }

          if (contentText) {
            // 3. Generate query embedding (which handles caching and OpenAI API calls)
            const { generateQueryEmbedding } = await import('@/lib/llamaindex/embeddings-service')
            const embedding = await generateQueryEmbedding(contentText)

            // 4. Retrieve ChromaDB collection and save document
            const { getOrCreateCollection, addDocuments } =
              await import('@/lib/llamaindex/vector-store')
            const collection = await getOrCreateCollection('historical_agents')

            const docId = `feed-event-${idempotencyKey}`
            const docMetadata = {
              agentId,
              agentName: nameVal,
              era: eraVal,
              chunkIndex: 0,
              totalChunks: 1,
              source: `feed_${eventType}`,
              specialty: specialtyVal,
              consciousnessLevel: consciousnessLevelVal,
              timestamp: new Date(timestamp).toISOString(),
            }

            await addDocuments(collection, [contentText], [embedding], [docMetadata], [docId])
            console.log(
              `[RAG Ingestion] Successfully completed background ingestion for ID: ${docId}`
            )
          }
        } catch (err) {
          console.warn(`[RAG Ingestion] Failed gracefully during feed RAG ingestion:`, err)
        }
      })
    }

    return NextResponse.json({ success: true, event: normalizedEvent })
  } catch (error: any) {
    console.error('[feed/POST] failed to ingest feed event:', error)
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
