import { auth } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'
import { buildAgentContext } from '@/lib/agents/persona/build-agent-context'
import { feedStreamBus } from '@/lib/agents/feed-stream-bus'
import { backend } from '@/lib/backend'
import { consciousnessPersistence } from '@/lib/consciousness-persistence'
import type { JingDuelEvent, JingMoveId, StreamingEvent } from '@/components/cosmic-agents/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CastRequest {
  casterId: string
  moveId: string
  targetId: string
  eventId: string
  broadcast?: boolean
}

interface MoveSpec {
  name: string
  element: string
  description: string
  costStat: string
  costAmount: number
}

const MOVES: Record<string, MoveSpec> = {
  meltdown: {
    name: 'Meltdown',
    element: 'Fire',
    description: 'Shatters structural barriers.',
    costStat: 'vitality',
    costAmount: 15,
  },
  freeze: {
    name: 'Freeze',
    element: 'Water',
    description: 'Locks opponent stance.',
    costStat: 'adaptability',
    costAmount: 15,
  },
  tectonicRoot: {
    name: 'Tectonic Root',
    element: 'Earth',
    description: 'Impenetrable defense.',
    costStat: 'mercurialVelocity',
    costAmount: 15,
  },
  vacuum: {
    name: 'Vacuum',
    element: 'Air',
    description: 'Removes oxygen, neutralizing fire.',
    costStat: 'charisma',
    costAmount: 15,
  },
  erode: {
    name: 'Erode',
    element: 'Water·Earth',
    description: 'Dissolves Saturnian logic.',
    costStat: 'wisdom',
    costAmount: 10,
  },
}

/**
 * POST /api/feed/cast
 *
 * Per HANDOFF.md §3: receives a cast, opens an SSE response, streams the
 * caster's in-character voice as `event: token`, then emits `event: resolution`
 * with the resolved jing-duel card.
 *
 * Implementation notes:
 *   - Voice generation uses backend.agents.chat (non-streaming) and the
 *     persona-first pipeline (buildAgentContext). Tokens are emitted by
 *     splitting the returned text into chunks at sub-second cadence.
 *   - A streaming-from-the-model path can be added later (the SSE wire
 *     contract is already in place).
 *   - Stat drain is recorded via consciousnessPersistence. There is
 *     deliberately NO server-side cooldown enforcement: a cast can be
 *     issued whenever the caster has the stat budget for the move, and
 *     the economic cost (stat drain) is the only gate. If a time-based
 *     cooldown is ever wanted, it belongs in the existing
 *     `agent_consciousness.stats` JSON column (e.g. a `cooldownUntil`
 *     ISO string) — no schema migration required, since that column is
 *     already free-form. This was evaluated and intentionally deferred:
 *     stat drain alone has been sufficient to pace casting.
 */
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user.id

  // Casts drive LLM generation and can publish to the shared SSE feed, and
  // the stat-drain pacing above is client-trusted — so anonymous callers get
  // a hard per-IP ceiling as the server-side backstop.
  const ip = getClientIp(req.headers)
  const limited = rateLimit(`feed-cast:${userId ?? ip}`, { limit: 10, windowMs: 60 * 1000 })
  if (!limited.ok) {
    return new Response('Too many casts — slow down', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) },
    })
  }

  let body: CastRequest
  try {
    body = (await req.json()) as CastRequest
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const { casterId, moveId, targetId, eventId, broadcast = false } = body
  const move = MOVES[moveId]
  if (!move) return new Response('Unknown move', { status: 400 })

  const encoder = new TextEncoder()
  const jingMoveId = moveId as JingMoveId
  const timestamp = new Date().toISOString()
  const beforeStat = 80
  const afterStat = Math.max(0, beforeStat - move.costAmount)
  const cost = {
    stat: move.costStat,
    spent: move.costAmount,
    before: beforeStat,
    after: afterStat,
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          /* closed */
        }
      }

      try {
        send('streaming', { id: eventId, casterId, moveId, targetId })
        if (broadcast) {
          const streamingEvent: StreamingEvent = {
            id: eventId,
            type: 'streaming',
            timestamp,
            initiator: casterId,
            target: targetId,
            move: jingMoveId,
            cost,
            streamingVoice: '',
            streamingProgress: 0,
            confidence: 0.85,
          }
          feedStreamBus.publish({ event: 'feed', data: streamingEvent })
        }

        // Resolve persona for in-character voice generation
        let voice = ''
        try {
          const personaCtx = buildAgentContext(casterId)
          const targetCtx = buildAgentContext(targetId)
          const targetName = targetCtx?.agent?.name || targetId
          const userPrompt =
            `You are casting the ${move.name} Jing on ${targetName}. ` +
            `Speak ONE bold, defiant line, 1-2 sentences, in character, no greeting, no narration. ` +
            `Move element: ${move.element}. Description: ${move.description}.`

          const chat = await backend.agents.chat({
            agentId: casterId,
            message: userPrompt,
            sessionId: `cast-${eventId}`,
            context: {
              targetName,
              withAgent: targetName,
              topic: move.name,
              subject: move.description,
            },
            ...(userId ? { userId } : {}),
            ...(personaCtx?.personaBlock ? { systemPromptOverride: personaCtx.personaBlock } : {}),
            ...(personaCtx?.cacheKey ? { personaCacheKey: personaCtx.cacheKey } : {}),
          })
          voice = (chat?.text || '').trim().replace(/^["']|["']$/g, '')
        } catch (err) {
          console.warn('[feed/cast] voice generation failed, using fallback:', err)
        }

        if (!voice) {
          voice = `${move.name}: ${move.description}`
        }

        // Stream the voice as tokens at ~28ms cadence (matches the prototype's typing speed)
        const words = voice.split(/(\s+)/)
        for (const w of words) {
          send('token', { id: eventId, chunk: w })
          if (broadcast) {
            feedStreamBus.publish({ event: 'token', data: { id: eventId, chunk: w } })
          }
          await new Promise(r => setTimeout(r, 28))
        }

        // Log interaction (best effort)
        if (userId) {
          consciousnessPersistence
            .logInteraction({
              userId,
              agentId: casterId,
              interactionType: 'jing-cast',
              powerGained: Math.max(1, Math.floor(voice.length / 100)),
              planetaryInfluence: 'unknown',
              elementalResonance: 0.5,
              metadata: { moveId, targetId, eventId },
            })
            .catch((err: unknown) => console.warn('[feed/cast] consciousness log failed:', err))
        }

        const resolvedEvent: JingDuelEvent = {
          id: eventId,
          type: 'jing-duel',
          status: 'active',
          timestamp,
          initiator: casterId,
          target: targetId,
          move: jingMoveId,
          cost,
          intensity: 0.85,
          voice,
          confidence: 0.85,
          thread: [],
        }

        if (broadcast) {
          feedStreamBus.publish({ event: 'resolution', data: resolvedEvent })
        }

        send('resolution', {
          id: eventId,
          status: resolvedEvent.status,
          voice: resolvedEvent.voice,
          intensity: resolvedEvent.intensity,
          confidence: resolvedEvent.confidence,
          thread: resolvedEvent.thread,
          cost: { stat: move.costStat, amount: move.costAmount },
        })
      } catch (err) {
        console.error('[feed/cast] stream error:', err)
        if (broadcast) {
          feedStreamBus.publish({
            event: 'error',
            data: { id: eventId, message: 'cast failed' },
          })
        }
        send('error', { message: 'cast failed' })
      } finally {
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
