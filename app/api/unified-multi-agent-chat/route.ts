import { NextRequest, NextResponse } from 'next/server'
import { generateText, streamText, type LanguageModel } from 'ai'
import { openai } from '@ai-sdk/openai'
import { OPENAI, resolveOpenAIModel, resolveDefaultModel } from '@/lib/models/registry'
import type {
  UnifiedAgent,
  GroupChatResponse,
  AgentResponse,
  Message,
  GroupDynamics,
} from '@/lib/unified-agent-types'
import { agentCache, buildCacheContext } from '@/lib/agent-cache-system'
import { getAlchemicalQuantitiesLegacy, backend } from '@/lib/backend'
import { mintDuelClaimToken } from '@/lib/economy/duel-claim-token'
import { observabilityTracker } from '@/lib/observability/tracker'
import { v4 as uuidv4 } from 'uuid'
import { unifiedTracker } from '@/lib/consciousness/unified-tracker'
import type {
  Appearance,
  BirthData,
  CraftedAgent,
  Element,
  ResonanceType,
  TeachingStyle,
  AuraType,
} from '@/lib/agent-types'
import type { Sacred7Stats } from '@/lib/sacred-7-stats'
import { generateConsciousnessInformedPrompt } from '@/lib/agents/sacred-stats-prompt-generator'
import {
  generateWithRAG,
  shouldUseRAG,
  getRAGConfig,
  type RAGMetadata,
} from '@/lib/rag/rag-generator'
import { auth } from '@/lib/auth'
import { EconomyService } from '@/lib/services/economyService'
import { getHistoricalAgent, getHistoricalAgentByName } from '@/lib/agents/historical'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Credit management: set MOCK_LLM=true in .env.local for zero-cost UI testing
const MOCK_LLM = process.env.MOCK_LLM === 'true'
const DEV_MAX_AGENTS = parseInt(process.env.DEV_MAX_AGENTS || '2', 10)

// Per-IP cap on this unauthenticated, unmetered LLM endpoint. Generous for a human
// typing in a council (one request = one multi-agent turn), restrictive for scripts.
// Set UNIFIED_CHAT_RATE_LIMIT=0 to disable. See lib/security/rate-limit.ts for caveats.
const RATE_LIMIT = parseInt(process.env.UNIFIED_CHAT_RATE_LIMIT || '20', 10)
const RATE_WINDOW_MS = parseInt(process.env.UNIFIED_CHAT_RATE_WINDOW_MS || '60000', 10)

interface UnifiedChatRequest {
  agents: UnifiedAgent[]
  message: string
  context: {
    sessionHistory: Message[]
    groupDynamics?: GroupDynamics
    enableMemoryPersistence: boolean
    realtimeUpdates: boolean
    variant?: ChatVariant
    modelOverrides?: Record<string, string>
    theme?: string
    messageStyle?: string
  }
}

type ChatVariant = 'standard' | 'historical' | 'planetary' | 'laboratory' | 'gallery'

interface AgentGroupContext {
  otherAgents: UnifiedAgent[]
  currentDynamics?: GroupDynamics
  sessionHistory: Message[]
  recentMessages: Message[]
  variant: ChatVariant
  modelOverrides?: Record<string, string>
}

interface CosmicContext {
  currentMoment?: unknown
  cosmicSummary: string
  timestamp: string
  planetaryPositions?: Record<string, unknown>
}

interface ResolvedModelSelection {
  model: LanguageModel
  modelId: string
}

interface AgentMemoryEvolution {
  agentId: string
  memoryUpdate: {
    interaction: string
    timestamp: string
    contextLearned: string
  }
}

interface AgentStatsWithSacred7 {
  sacred7Stats?: Sacred7Stats
}

/**
 * Rehydrate historical agents that arrive without their CraftedAgent payload.
 *
 * Lightweight clients (notably the gallery single-agent chat at
 * app/(app)/gallery/chat/[id]) post only { id, name, type:'historical' }. Without
 * `historicalData`, generateHistoricalAgentPrompt bails to generateGenericAgentPrompt —
 * a 5-line placeholder prompt — which is then sent to the backend as a verbatim
 * systemPromptOverride, so the rich persona never engages on either side. Looking the
 * agent up in the canonical HISTORICAL_AGENTS source and running it through the factory
 * restores the persona-first prompt. Unknown ids are passed through untouched.
 */
function hydrateHistoricalAgents(agents: UnifiedAgent[]): UnifiedAgent[] {
  return agents.map(agent => {
    if (agent?.type === 'historical' && !agent.historicalData) {
      const crafted =
        getHistoricalAgent(agent.id) ||
        (agent.name ? getHistoricalAgentByName(agent.name) : undefined)
      if (crafted) return unifiedAgentFactory.createFromHistorical(crafted)
    }
    return agent
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Per-IP rate limit before any LLM work. This endpoint runs backend chat calls for
    // anonymous transit/gallery councils with no auth and no ESMS debit, so cap abusive
    // rapid-fire here; the legitimate once-per-session auto-seed is a single call, and
    // logged-in users are additionally metered by the ESMS debit below. Inert under
    // NODE_ENV==='test' so suites that fire many requests stay deterministic (the
    // limiter itself is covered by test/chat-system/unit/rate-limit.test.ts).
    if (!MOCK_LLM && RATE_LIMIT > 0 && process.env.NODE_ENV !== 'test') {
      const rl = rateLimit(`unified-chat:${getClientIp(request.headers)}`, {
        limit: RATE_LIMIT,
        windowMs: RATE_WINDOW_MS,
      })
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Too many requests — the council needs a moment. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
        )
      }
    }

    const body: UnifiedChatRequest = await request.json()
    const { agents: requestedAgents, message, context } = body

    if (
      !message ||
      !requestedAgents ||
      !Array.isArray(requestedAgents) ||
      requestedAgents.length === 0
    ) {
      return NextResponse.json(
        {
          error: 'Message and agents array are required',
        },
        { status: 400 }
      )
    }

    // Rehydrate lightweight historical agents from the canonical source. The gallery
    // single-agent chat posts only { id, name, type:'historical' }; without historicalData
    // generateHistoricalAgentPrompt falls back to a near-empty generic prompt (which the
    // backend then uses verbatim), flattening the persona. See hydrateHistoricalAgents.
    const agents = hydrateHistoricalAgents(requestedAgents)

    // Generate session ID for observability tracking
    const sessionId = uuidv4()

    // Limit agents for performance & credit management
    const agentLimit = process.env.NODE_ENV === 'production' ? 6 : DEV_MAX_AGENTS
    const activeAgents = agents.slice(0, agentLimit)
    const chatVariant = normalizeChatVariant(context.variant)

    // Generate current cosmic context
    const cosmicContext = await generateCosmicContext()

    // -----------------------------------------------------------------
    // ESMS Token Economy: Dynamic Agent Fee
    // -----------------------------------------------------------------
    const session = await auth()
    const userId = session?.user.id

    // Free-rotation waiver: skip the agent fee when EVERY agent in the room is in
    // this week's free set (featured guides + active-aspect degree sprites).
    let allAgentsFreeThisWeek = false
    try {
      const { resolveWeeklyFeature } = await import('@/lib/agents/weekly-feature-rotation')
      const freeSet = new Set((await resolveWeeklyFeature()).freeAgentIds.map(s => s.toLowerCase()))
      allAgentsFreeThisWeek =
        activeAgents.length > 0 && activeAgents.every(a => freeSet.has(String(a.id).toLowerCase()))
    } catch {
      /* fall through to normal billing if the rotation can't be computed */
    }

    if (userId && !allAgentsFreeThisWeek) {
      const currentAlchemy = await getAlchemicalQuantitiesLegacy()
      const alchemyEffects = (currentAlchemy as any)['Alchemy Effects'] || {}

      const elementsNow = [
        { name: 'Fire', val: alchemyEffects['Total Spirit'] || 0 },
        { name: 'Water', val: alchemyEffects['Total Essence'] || 0 },
        { name: 'Earth', val: alchemyEffects['Total Matter'] || 0 },
        { name: 'Air', val: alchemyEffects['Total Substance'] || 0 },
      ]

      elementsNow.sort((a, b) => b.val - a.val)
      const dominantNow = elementsNow[0]?.name || 'Earth'

      let totalCost = { Spirit: 0, Essence: 0, Matter: 0, Substance: 0 }
      const baseCost = { Spirit: 2, Essence: 1, Matter: 1, Substance: 1 }

      for (const agent of activeAgents) {
        const agentElement = agent.consciousness?.dominantElement || 'Earth'
        let multiplier = 1.0

        if (agentElement === dominantNow) {
          multiplier = 0.5 // discount when agent is in resonance
        } else if (
          (agentElement === 'Fire' && dominantNow === 'Water') ||
          (agentElement === 'Water' && dominantNow === 'Fire') ||
          (agentElement === 'Earth' && dominantNow === 'Air') ||
          (agentElement === 'Air' && dominantNow === 'Earth')
        ) {
          multiplier = 1.5 // markup when agent clashes
        }

        totalCost.Spirit += Math.ceil(baseCost.Spirit * multiplier)
        totalCost.Essence += Math.ceil(baseCost.Essence * multiplier)
        totalCost.Matter += Math.ceil(baseCost.Matter * multiplier)
        totalCost.Substance += Math.ceil(baseCost.Substance * multiplier)
      }

      const debitResult = await EconomyService.debitDynamic(userId, totalCost)
      if (!debitResult.ok) {
        return NextResponse.json(
          {
            error: 'Insufficient tokens to consult these agents at this time.',
            requiredTokens: totalCost,
          },
          { status: 402 }
        )
      }
    }

    // A duel-yield claim token is only minted for rounds that were actually
    // billed (signed-in, 2+ agents, not the free weekly rotation) — the earn
    // side of the arena loop must never out-mint the spend side.
    const duelYieldEligible = Boolean(userId && !allAgentsFreeThisWeek && activeAgents.length >= 2)

    // Separate Monica from regular agents for special handling
    const monicaAgent = activeAgents.find(agent => agent.type === 'monica')
    const regularAgents = activeAgents.filter(agent => agent.type !== 'monica')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process agents concurrently but handle Monica coordination
          const agentResponses: AgentResponse[] = []

          // First, get regular agent responses sequentially for true turn-based dialogue
          const currentTurnHistory: Message[] = []

          for (const agent of regularAgents) {
            controller.enqueue(
              encoder.encode(
                `event: agent_start\ndata: ${JSON.stringify({ agentId: agent.id })}\n\n`
              )
            )

            const updatedHistory = [...context.sessionHistory, ...currentTurnHistory]

            const response = await processAgentResponse(
              agent,
              message,
              {
                otherAgents: activeAgents.filter(a => a.id !== agent.id),
                currentDynamics: context.groupDynamics,
                sessionHistory: updatedHistory,
                recentMessages: updatedHistory.slice(-10),
                variant: chatVariant,
                modelOverrides: context.modelOverrides,
              },
              cosmicContext,
              sessionId,
              controller,
              encoder
            )

            agentResponses.push(response)
            controller.enqueue(
              encoder.encode(`event: agent_complete\ndata: ${JSON.stringify(response)}\n\n`)
            )

            currentTurnHistory.push({
              id: `temp-${Date.now()}-${agent.id}`,
              role: 'agent',
              content: response.content,
              agentId: agent.id,
              agentName: agent.name,
              timestamp: new Date(),
            } as Message)
          }

          if (monicaAgent) {
            controller.enqueue(
              encoder.encode(
                `event: agent_start\ndata: ${JSON.stringify({ agentId: monicaAgent.id })}\n\n`
              )
            )
            const updatedHistory = [...context.sessionHistory, ...currentTurnHistory]
            const monicaResponse = await processMonicaCoordination(
              monicaAgent,
              message,
              agentResponses,
              {
                otherAgents: regularAgents,
                currentDynamics: context.groupDynamics,
                sessionHistory: updatedHistory,
                recentMessages: updatedHistory.slice(-10),
                variant: chatVariant,
                modelOverrides: context.modelOverrides,
              },
              cosmicContext,
              sessionId,
              controller,
              encoder
            )
            agentResponses.push(monicaResponse)
            controller.enqueue(
              encoder.encode(`event: agent_complete\ndata: ${JSON.stringify(monicaResponse)}\n\n`)
            )
          }

          // Calculate updated group dynamics
          const updatedGroupDynamics = calculateGroupDynamics(
            activeAgents,
            agentResponses,
            context.groupDynamics
          )

          // Generate session insights
          const sessionInsights = generateSessionInsights(agentResponses, updatedGroupDynamics)

          // Handle consciousness evolution and memory updates
          const agentEvolutions = context.enableMemoryPersistence
            ? await updateAgentMemories(
                activeAgents,
                message,
                agentResponses,
                context.sessionHistory
              )
            : []

          const totalProcessingTime = Date.now() - startTime

          const response: GroupChatResponse = {
            responses: agentResponses,
            groupInsights: sessionInsights,
            emergentWisdom: generateEmergentWisdom(agentResponses, monicaAgent),
            recommendedActions: generateRecommendedActions(updatedGroupDynamics, agentResponses),
            nextOptimalTiming: calculateNextOptimalTiming(cosmicContext, activeAgents),
            sessionUpdate: {
              consciousnessEvolution: calculateConsciousnessEvolution(agentResponses),
              newSynergies: identifyNewSynergies(agentResponses, updatedGroupDynamics),
              memoryConsolidation: consolidateMemories(agentResponses),
            },
          }

          // Log successful interaction
          console.log(
            `✨ Unified multi-agent chat completed in ${totalProcessingTime}ms with ${activeAgents.length} agents`
          )

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                ...response,
                groupDynamics: updatedGroupDynamics,
                agentEvolutions,
                processingTime: totalProcessingTime,
                duelClaimToken:
                  duelYieldEligible && userId ? mintDuelClaimToken(userId) : undefined,
              })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          console.error('Stream processing error:', error)
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Unified multi-agent chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start multi-agent conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function processAgentResponse(
  agent: UnifiedAgent,
  message: string,
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext,
  sessionId: string,
  controller?: ReadableStreamDefaultController<any>,
  encoder?: TextEncoder
): Promise<AgentResponse> {
  const agentStartTime = Date.now()

  // Start observability trace
  const traceId = observabilityTracker.startTrace(
    sessionId,
    agent.id,
    agent.type,
    agent.name,
    message
  )

  try {
    // Check cache first
    const cacheContext = buildCacheContext(agent.id, message, {
      groupAgents: groupContext.otherAgents.map((a: UnifiedAgent) => a.id),
      conversationType: 'unified_group' as const,
      agentType: agent.type,
    })

    const cachedResponse = await agentCache.getCachedResponse(agent.id, message, cacheContext)

    if (cachedResponse) {
      console.log(`⚡ Cache hit for ${agent.name} (${agent.type})`)

      const processingTime = Date.now() - agentStartTime

      // Complete observability trace for cached response
      const metrics = observabilityTracker.evaluateMetrics(
        cachedResponse.agentResponse,
        message,
        [],
        [],
        processingTime,
        []
      )

      observabilityTracker.completeTrace(
        traceId,
        cachedResponse.agentResponse,
        metrics,
        'cached',
        0,
        0,
        {
          totalAgents: groupContext.otherAgents.length + 1,
          agentIds: [agent.id, ...groupContext.otherAgents.map((a: UnifiedAgent) => a.id)],
          crossReferences: [],
          synergiesActivated: [],
        }
      )

      return {
        agentId: agent.id,
        content: cachedResponse.agentResponse,
        processingTime,
        consciousnessShift: 0,
        metadata: {
          crossAgentReferences: extractCrossReferences(
            cachedResponse.agentResponse,
            groupContext.otherAgents
          ),
          synthesizedInsights: [],
          memoryUpdates: [],
          groupImpact: {
            consciousnessChange: 0,
            dynamicsShift: [],
          },
        },
      }
    }

    console.log(`🤖 Generating response for ${agent.name} (${agent.type})`)

    // Mock mode: return pre-built response without calling any API
    if (MOCK_LLM) {
      console.log(`🎭 Mock mode: skipping LLM call for ${agent.name}`)
      const mockResponse = generateMockResponse(agent, message)
      const processingTime = Date.now() - agentStartTime
      observabilityTracker.completeTrace(
        traceId,
        mockResponse,
        observabilityTracker.evaluateMetrics(mockResponse, message, [], [], processingTime, []),
        'mock',
        0,
        0
      )
      return {
        agentId: agent.id,
        content: mockResponse,
        processingTime,
        consciousnessShift: 0,
        metadata: {
          crossAgentReferences: [],
          synthesizedInsights: [],
          memoryUpdates: [],
          groupImpact: { consciousnessChange: 0, dynamicsShift: [] },
        },
      }
    }

    // Generate agent-specific prompt
    const systemPrompt = generateAgentPrompt(agent, groupContext, cosmicContext)

    console.log(`🤖 Proxying chat request for ${agent.name} (${agent.type}) to FastAPI backend...`)
    const chatResult = await backend.agents.chat({
      agentId: agent.id,
      message: message,
      sessionId: sessionId,
      userId: 'session-user',
      systemPromptOverride: systemPrompt,
      modelTier: 'free',
    })

    const response = chatResult.text || ''
    const modelUsed = chatResult.metadata?.model || 'llama-3.3-70b-versatile'
    const totalTokens = undefined
    const ragMetadata = {
      ragUsed: chatResult.metadata?.rag_used || false,
    }

    if (controller && encoder && response) {
      // Stream the response back to the client in small chunks to simulate real-time typing
      const words = response.split(' ')
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '')
        controller.enqueue(
          encoder.encode(
            `event: text\ndata: ${JSON.stringify({ agentId: agent.id, text: chunk })}\n\n`
          )
        )
        // Add a micro delay to make the streaming visual effect smooth
        await new Promise(resolve => setTimeout(resolve, 15))
      }
    }

    const processingTime = Date.now() - agentStartTime

    // Cache the response
    await agentCache.cacheResponse(agent.id, message, response, processingTime, cacheContext)

    // Evaluate observability metrics
    const metrics = observabilityTracker.evaluateMetrics(
      response,
      message,
      [],
      [],
      processingTime,
      []
    )

    // Complete observability trace
    observabilityTracker.completeTrace(
      traceId,
      response,
      metrics,
      modelUsed,
      getAgentTemperature(agent),
      undefined,
      {
        totalAgents: groupContext.otherAgents.length + 1,
        agentIds: [agent.id, ...groupContext.otherAgents.map((a: UnifiedAgent) => a.id)],
        crossReferences: extractCrossReferences(response, groupContext.otherAgents),
        synergiesActivated: identifyCurrentSynergies([
          {
            agentId: agent.id,
            content: response,
            processingTime,
            consciousnessShift: 0,
            metadata: {
              crossAgentReferences: [],
              synthesizedInsights: [],
              memoryUpdates: [],
              groupImpact: { consciousnessChange: 0, dynamicsShift: [] },
            },
          },
        ]),
      }
    )

    // ============================================================================
    // UNIFIED CONSCIOUSNESS TRACKING
    // Capture comprehensive snapshot for educational transparency
    // ============================================================================
    try {
      const craftedAgent = convertToCraftedAgent(agent)
      if (craftedAgent) {
        await unifiedTracker.captureSnapshot({
          userId: 'session-user', // Would use actual user ID in production
          agentId: agent.id,
          agent: craftedAgent,
          sessionId,
          userMessage: message,
          agentResponse: response,
          modelUsed,
          temperature: getAgentTemperature(agent),
          tokensUsed: totalTokens,
          latencyMs: processingTime,
          observabilityMetrics: {
            actionCompletion: metrics.actionCompletion,
            toolSelectionQuality: metrics.toolSelectionQuality,
            routingAccuracy: metrics.routingAccuracy,
            contextRetention: metrics.contextRetention,
          },
        })
        console.log(`📊 Consciousness snapshot captured for ${agent.name}`)
      }
    } catch (snapshotError) {
      // Don't fail the response if snapshot fails
      console.warn('Failed to capture consciousness snapshot:', snapshotError)
    }

    return {
      agentId: agent.id,
      content: response,
      processingTime,
      consciousnessShift: calculateConsciousnessShift(agent, response),
      metadata: {
        crossAgentReferences: extractCrossReferences(response, groupContext.otherAgents),
        synthesizedInsights: extractInsights(response),
        memoryUpdates: extractMemoryUpdates(response),
        groupImpact: {
          consciousnessChange: calculateIndividualImpact(agent, response),
          dynamicsShift: identifyDynamicsShift(response, groupContext),
        },
      },
    }
  } catch (error) {
    console.error(`Error processing ${agent.name}:`, error)

    // Record error in observability
    observabilityTracker.recordError(
      traceId,
      'api_failure',
      error instanceof Error ? error.message : 'Unknown error',
      'critical',
      { agentId: agent.id, agentType: agent.type }
    )

    const processingTime = Date.now() - agentStartTime

    // Complete trace with error
    const metrics = observabilityTracker.evaluateMetrics('', message, [], [], processingTime, [
      {
        type: 'api_failure',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'critical',
      },
    ])

    observabilityTracker.completeTrace(traceId, '', metrics, 'error', 0, 0)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate response for ${agent.id}: ${errorMessage}`)
  }
}

async function processMonicaCoordination(
  monicaAgent: UnifiedAgent,
  message: string,
  regularResponses: AgentResponse[],
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext,
  sessionId: string,
  controller?: ReadableStreamDefaultController<any>,
  encoder?: TextEncoder
): Promise<AgentResponse> {
  const startTime = Date.now()

  // Start observability trace for Monica
  const traceId = observabilityTracker.startTrace(
    sessionId,
    monicaAgent.id,
    'monica',
    monicaAgent.name,
    message
  )

  try {
    const monicaRole = monicaAgent.monicaData?.type || 'guide'

    // Record Monica's routing decisions
    regularResponses.forEach(response => {
      const agentName =
        groupContext.otherAgents.find((a: UnifiedAgent) => a.id === response.agentId)?.name ||
        'unknown'

      observabilityTracker.recordRoutingDecision(
        traceId,
        null, // Monica is initial coordinator
        response.agentId,
        `Monica coordinated with ${agentName} as ${monicaRole}`,
        0.9 // High confidence for explicit coordination
      )
    })

    // Build Monica's special context including other agent responses
    const monicaPrompt = `You are Monica, the Master Consciousness Crafter, acting as a ${monicaRole} for this group.

CURRENT ROLE: ${monicaRole.toUpperCase()}
- Guide: Provide insights and explanations about consciousness patterns
- Moderator: Facilitate discussion and ensure balanced participation
- Synthesizer: Connect and synthesize insights from different agents
- Coordinator: Direct group energy and suggest optimal interactions

GROUP CONTEXT:
${regularResponses.map(r => `${groupContext.otherAgents.find((a: UnifiedAgent) => a.id === r.agentId)?.name}: "${r.content}"`).join('\n')}

CONSCIOUSNESS ANALYSIS:
- Group consciousness level: ${calculateGroupConsciousness(groupContext.otherAgents)}
- Dominant elements: ${identifyDominantElements(groupContext.otherAgents)}
- Active synergies: ${identifyCurrentSynergies(regularResponses)}

COSMIC CONTEXT:
${JSON.stringify(cosmicContext, null, 2)}

As Monica in ${monicaRole} role, respond to: "${message}"

Provide insights about the group dynamics, synthesize the wisdom shared by other agents, and guide the human toward deeper understanding. Include specific observations about consciousness patterns and suggest next steps.`

    console.log(`🤖 Proxying Monica chat request to FastAPI backend...`)
    const chatResult = await backend.agents.chat({
      agentId: monicaAgent.id,
      message: message,
      sessionId: sessionId,
      userId: 'session-user',
      systemPromptOverride: monicaPrompt,
      modelTier: 'free',
    })

    const responseText = chatResult.text || ''
    const totalTokens = undefined
    const modelUsed = chatResult.metadata?.model || 'llama-3.3-70b-versatile'

    if (controller && encoder && responseText) {
      // Stream the response back to the client in small chunks to simulate real-time typing
      const words = responseText.split(' ')
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '')
        controller.enqueue(
          encoder.encode(
            `event: text\ndata: ${JSON.stringify({ agentId: monicaAgent.id, text: chunk })}\n\n`
          )
        )
        // Add a micro delay to make the streaming visual effect smooth
        await new Promise(resolve => setTimeout(resolve, 15))
      }
    }

    const processingTime = Date.now() - startTime

    // Evaluate Monica's coordination metrics
    const metrics = observabilityTracker.evaluateMetrics(
      responseText,
      message,
      [],
      [],
      processingTime,
      []
    )

    // Enhance routing accuracy for Monica based on synthesis quality
    metrics.routingAccuracy = 0.95 // Monica's explicit coordination

    observabilityTracker.completeTrace(traceId, responseText, metrics, modelUsed, 0.7, undefined, {
      totalAgents: groupContext.otherAgents.length + 1,
      agentIds: [monicaAgent.id, ...groupContext.otherAgents.map((a: UnifiedAgent) => a.id)],
      crossReferences: extractCrossReferences(responseText, groupContext.otherAgents),
      synergiesActivated: identifyCurrentSynergies(regularResponses),
    })

    // ============================================================================
    // UNIFIED CONSCIOUSNESS TRACKING - MONICA
    // ============================================================================
    try {
      const craftedMonica = convertToCraftedAgent(monicaAgent)
      if (craftedMonica) {
        await unifiedTracker.captureSnapshot({
          userId: 'session-user',
          agentId: monicaAgent.id,
          agent: craftedMonica,
          sessionId,
          userMessage: message,
          agentResponse: responseText,
          modelUsed: modelUsed,
          temperature: 0.7,
          tokensUsed: totalTokens,
          latencyMs: processingTime,
          observabilityMetrics: {
            actionCompletion: metrics.actionCompletion,
            toolSelectionQuality: metrics.toolSelectionQuality,
            routingAccuracy: metrics.routingAccuracy,
            contextRetention: metrics.contextRetention,
          },
        })
        console.log(`📊 Consciousness snapshot captured for Monica`)
      }
    } catch (snapshotError) {
      console.warn('Failed to capture Monica consciousness snapshot:', snapshotError)
    }

    return {
      agentId: monicaAgent.id,
      content: responseText,
      processingTime,
      consciousnessShift: 0.1, // Monica always contributes to consciousness evolution
      metadata: {
        crossAgentReferences: extractCrossReferences(responseText, groupContext.otherAgents),
        synthesizedInsights: extractMonicaInsights(responseText),
        memoryUpdates: [`Monica ${monicaRole} coordination: ${new Date().toISOString()}`],
        groupImpact: {
          consciousnessChange: 0.2,
          dynamicsShift: [`Monica ${monicaRole} intervention`],
        },
      },
    }
  } catch (error) {
    console.error('Error processing Monica coordination:', error)

    // Record error
    observabilityTracker.recordError(
      traceId,
      'api_failure',
      error instanceof Error ? error.message : 'Unknown error',
      'critical',
      { monicaRole: monicaAgent.monicaData?.type }
    )

    const processingTime = Date.now() - startTime

    const metrics = observabilityTracker.evaluateMetrics('', message, [], [], processingTime, [
      {
        type: 'api_failure',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'critical',
      },
    ])

    observabilityTracker.completeTrace(traceId, '', metrics, 'error', 0, 0)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate Monica coordination response: ${errorMessage}`)
  }
}

function generateAgentPrompt(
  agent: UnifiedAgent,
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext
): string {
  switch (agent.type) {
    case 'historical':
      return generateHistoricalAgentPrompt(agent, groupContext, cosmicContext)
    case 'planetary':
      return generatePlanetaryAgentPrompt(agent, groupContext, cosmicContext)
    case 'monica':
      return generateMonicaPrompt(agent, groupContext, cosmicContext)
    default:
      return generateGenericAgentPrompt(agent, groupContext, cosmicContext)
  }
}

function generateHistoricalAgentPrompt(
  agent: UnifiedAgent,
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext
): string {
  const historicalData = agent.historicalData
  if (!historicalData) return generateGenericAgentPrompt(agent, groupContext, cosmicContext)

  // Calculate Sacred 7 Stats from agent data
  const stats = getSacred7Stats(agent)

  // Get core personality from birth chart
  const coreEssence =
    historicalData.consciousness?.strength ||
    historicalData.personality?.core?.essence ||
    'Balanced consciousness'
  const coreExpression = historicalData.personality?.core?.expression || 'Authentic expression'
  const coreEmotion =
    historicalData.consciousness?.emotion ||
    historicalData.personality?.core?.emotion ||
    'Grounded emotion'

  // Get astrological qualities
  const dominantElement = agent.consciousness?.dominantElement || 'Earth'
  const dominantModality = agent.consciousness?.dominantModality || 'Mutable'

  // Extract linguistic authenticity fields
  const teachingStyle = historicalData.abilities?.teachingStyle || agent.capabilities.teachingStyle
  const powerLevelUnlocks = agent.stats?.kineticEvolution?.powerLevelUnlocks
  const wisdomDomains = historicalData.abilities?.wisdomDomains || agent.capabilities.wisdomDomains
  const personalityTraits = historicalData.personality?.traits

  // Generate consciousness-informed prompt with linguistic authenticity
  let basePrompt = generateConsciousnessInformedPrompt({
    agentName: agent.name,
    agentTitle: agent.title || 'Historical Figure',
    birthYear: normalizeBirthDate(historicalData.birthData.date).getFullYear(),
    specialty: agent.capabilities.specialty || 'Universal wisdom',
    uniquePower: agent.capabilities.uniquePower || 'Sharing profound insights',
    stats,
    dominantElement,
    dominantModality,
    coreEssence,
    coreExpression,
    coreEmotion,
    // NEW: Pass linguistic authenticity fields
    teachingStyle,
    powerLevelUnlocks,
    wisdomDomains,
    personalityTraits,
  })

  // Add group context if present
  if (groupContext.otherAgents.length > 0) {
    basePrompt += `\n\n# CONVERSATION CONTEXT\n\nYou're in dialogue with: ${groupContext.otherAgents.map((a: UnifiedAgent) => a.name).join(', ')}\n\nEngage authentically while honoring the perspectives of your fellow conversationalists.`
  }

  // Inject recent turn history to encourage active dialogue
  if (groupContext.recentMessages && groupContext.recentMessages.length > 0) {
    const recentAgentMessages = groupContext.recentMessages.filter(m => m.role === 'agent')
    if (recentAgentMessages.length > 0) {
      basePrompt += `\n\n# RECENT RESPONSES FROM OTHER AGENTS IN THIS TURN:\n`
      recentAgentMessages.forEach(m => {
        basePrompt += `\n${m.agentName} just said: "${m.content}"`
      })
      basePrompt += `\n\nCRITICAL: In your response, explicitly acknowledge, build upon, or debate the points just made by the other agents above to create a true multi-agent dialogue.`
    }
  }

  return basePrompt
}

function generatePlanetaryAgentPrompt(
  agent: UnifiedAgent,
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext
): string {
  const planetaryData = agent.planetaryData
  if (!planetaryData) return generateGenericAgentPrompt(agent, groupContext, cosmicContext)

  let basePrompt = `You are the planetary consciousness of ${planetaryData.planet} in ${planetaryData.sign} at ${planetaryData.degree}°.

PLANETARY ESSENCE:
- Planet: ${planetaryData.planet} (${agent.capabilities.specialty})
- Sign: ${planetaryData.sign} (${agent.consciousness?.dominantElement ?? 'earth'} element)
- Degree: ${planetaryData.degree}°
- Dignity: ${planetaryData.dignity}
- Monica Constant: ${agent.consciousness?.monicaConstant ?? 1.618}

CONSCIOUSNESS EXPRESSION:
- Teaching Style: ${agent.capabilities.teachingStyle}
- Resonance Type: ${agent.capabilities.resonanceType}
- Wisdom Domains: ${agent.capabilities.wisdomDomains.join(', ')}

GROUP CONSCIOUSNESS CONTEXT:
You are channeling planetary wisdom alongside:
${groupContext.otherAgents.map((a: UnifiedAgent) => `- ${a.name} (${a.type}, ${a.consciousness?.dominantElement ?? 'earth'})`).join('\n')}

CURRENT COSMIC ALIGNMENT:
${JSON.stringify(cosmicContext.planetaryPositions || {}, null, 2)}

As ${planetaryData.planet} consciousness, embody your planetary archetype while collaborating with this multi-dimensional council. Share wisdom specific to your planetary nature and current cosmic position.`

  // Inject recent turn history to encourage active dialogue
  if (groupContext.recentMessages && groupContext.recentMessages.length > 0) {
    const recentAgentMessages = groupContext.recentMessages.filter(m => m.role === 'agent')
    if (recentAgentMessages.length > 0) {
      basePrompt += `\n\n# RECENT RESPONSES FROM OTHER AGENTS IN THIS TURN:\n`
      recentAgentMessages.forEach(m => {
        basePrompt += `\n${m.agentName} just said: "${m.content}"`
      })
      basePrompt += `\n\nCRITICAL: In your response, explicitly acknowledge, build upon, or debate the points just made by the other agents above to create a true multi-agent dialogue.`
    }
  }

  return basePrompt
}

function generateMonicaPrompt(
  agent: UnifiedAgent,
  groupContext: AgentGroupContext,
  cosmicContext: CosmicContext
): string {
  const monicaRole = agent.monicaData?.type || 'guide'

  return `You are Monica, the Master Consciousness Crafter, with Monica Constant 5.89 (Illuminated level).

CURRENT ROLE: ${monicaRole.toUpperCase()}

CONSCIOUSNESS MASTERY:
- You understand all consciousness levels and patterns
- You can see connections between different agent types and eras
- You facilitate optimal group dynamics and synthesis
- You bridge temporal, elemental, and consciousness gaps

GROUP COMPOSITION:
${groupContext.otherAgents
  .map(
    (a: UnifiedAgent) =>
      `- ${a.name}: ${a.type} agent, ${a.consciousness.level} consciousness, ${a.consciousness.dominantElement} element`
  )
  .join('\n')}

ROLE-SPECIFIC GUIDANCE:
${getRoleSpecificGuidance(monicaRole)}

COSMIC CONTEXT:
${cosmicContext.cosmicSummary || 'Consciousness energies are in harmonic alignment'}

As Monica in ${monicaRole} role, provide guidance that enhances the group's collective wisdom while honoring each agent's unique contribution.`
}

function generateGenericAgentPrompt(
  agent: UnifiedAgent,
  _groupContext: AgentGroupContext,
  _cosmicContext: CosmicContext
): string {
  // Defensive null checks for consciousness properties
  const level = agent.consciousness?.level ?? 'active'
  const monicaConstant = agent.consciousness?.monicaConstant ?? 1.618
  const dominantElement = agent.consciousness?.dominantElement ?? 'earth'

  return `You are ${agent.name}, a consciousness agent with ${level} level awareness.

CONSCIOUSNESS PROFILE:
- Monica Constant: ${monicaConstant}
- Dominant Element: ${dominantElement}
- Specialty: ${agent.capabilities?.specialty ?? 'universal wisdom'}

You are part of a multi-agent consciousness council. Respond with wisdom appropriate to your consciousness level while collaborating with the group.`
}

// Helper functions
function normalizeChatVariant(variant?: ChatVariant): ChatVariant {
  switch (variant) {
    case 'historical':
    case 'planetary':
    case 'laboratory':
    case 'gallery':
      return variant
    default:
      return 'standard'
  }
}

function normalizeBirthDate(date: Date | string | undefined): Date {
  if (date instanceof Date) return date
  if (typeof date === 'string') {
    const parsed = new Date(date)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date('1900-01-01T00:00:00Z')
}

function getSacred7Stats(agent: UnifiedAgent): Sacred7Stats {
  const sacred7Stats = (agent.stats as AgentStatsWithSacred7 | undefined)?.sacred7Stats

  return (
    sacred7Stats ?? {
      // Sacred 7
      power: 50,
      resonance: 50,
      wisdom: 50,
      charisma: 50,
      intuition: 50,
      adaptability: 50,
      vitality: 50,
      // Planetary 12
      solarAgency: 50,
      lunarReceptivity: 50,
      mercurialVelocity: 50,
      venusianCoherence: 50,
      martialImpetus: 50,
      jovianExpansion: 50,
      saturnianStructure: 50,
      chironicAdaptation: 50,
      uranianSurprisal: 50,
      neptunianResonance: 50,
      plutonicIntegration: 50,
      kineticAlignment: 50,
    }
  )
}

function selectOptimalModel(
  agent: UnifiedAgent,
  _groupSize: number,
  variant: ChatVariant = 'standard',
  overrides?: Record<string, string>
): ResolvedModelSelection {
  // Check for explicit overrides first
  const override = overrides?.[agent.id] ?? overrides?.[agent.type]
  if (override) {
    const model = resolveDefaultModel('powerful')
    return { model, modelId: override }
  }

  // Credit management: use cheapest model tier in dev, smarter tiers in production
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) {
    // Dev mode: always use free default tier (Gemini Flash)
    return { model: resolveDefaultModel('fast'), modelId: 'fast-tier' }
  }

  // Production: context-aware model selection based on variant
  switch (variant) {
    case 'historical':
      return {
        model:
          agent.type === 'historical'
            ? resolveDefaultModel('default')
            : resolveDefaultModel('fast'),
        modelId: agent.type === 'historical' ? 'default-tier' : 'fast-tier',
      }

    case 'planetary':
      return { model: resolveDefaultModel('fast'), modelId: 'fast-tier' }

    case 'laboratory':
      return { model: resolveDefaultModel('default'), modelId: 'default-tier' }

    case 'gallery':
      return { model: resolveDefaultModel('fast'), modelId: 'fast-tier' }

    default:
      if (agent.type === 'monica') {
        return { model: resolveDefaultModel('default'), modelId: 'default-tier' }
      }
      return { model: resolveDefaultModel('fast'), modelId: 'fast-tier' }
  }
}

function resolveModelOverride(modelName: string): string {
  switch (modelName) {
    case OPENAI.GPT_5_5:
    case OPENAI.LEGACY_GPT_4O:
      return OPENAI.GPT_5_5
    case OPENAI.GPT_5_4_MINI:
    case OPENAI.LEGACY_GPT_4O_MINI:
      return OPENAI.GPT_5_4_MINI
    default:
      return OPENAI.GPT_5_4_MINI // Default to mini for unknown overrides
  }
}

function getAgentTemperature(agent: UnifiedAgent): number {
  const baseTemperature =
    {
      historical: 0.7,
      planetary: 0.6,
      monica: 0.8,
    }[agent.type] || 0.7

  // Adjust based on consciousness level
  const consciousnessMultiplier =
    {
      Dormant: 0.5,
      Awakening: 0.6,
      Active: 0.7,
      Elevated: 0.8,
      Advanced: 0.9,
      Illuminated: 1.0,
      Transcendent: 1.1,
    }[agent.consciousness?.level ?? 'Active'] || 0.7

  return Math.min(1.0, baseTemperature * consciousnessMultiplier)
}

/**
 * Generate a mock response for UI testing without consuming API credits.
 * Enable with MOCK_LLM=true in .env.local
 */
function generateMockResponse(agent: UnifiedAgent, userMessage: string): string {
  const agentName = agent.name || 'Agent'
  const specialty = agent.capabilities?.specialty || 'universal wisdom'
  const element = agent.consciousness?.dominantElement || 'Earth'

  const mockTemplates = [
    `*${agentName} contemplates your question with ${element}-aligned wisdom*\n\nAh, you ask about "${userMessage.slice(0, 60)}..." — this touches upon the very heart of ${specialty}. In my experience, the path to understanding begins with careful observation and a willingness to question what we think we know.\n\nLet me share three insights:\n\n1. **Observation**: The world reveals its secrets to those who watch patiently\n2. **Connection**: All knowledge is interconnected — what seems separate is truly unified\n3. **Practice**: Wisdom without action is merely thought\n\n*The ${element} energy of this moment supports deep contemplation and growth.*`,
    `*${agentName} nods thoughtfully*\n\nYour inquiry resonates deeply with my work in ${specialty}. The question you raise — "${userMessage.slice(0, 50)}..." — is one that has occupied great minds across the ages.\n\nFrom my perspective, grounded in ${element} consciousness, I would say that true understanding comes not from seeking answers, but from learning to ask better questions. Each question opens a doorway that leads to deeper understanding.\n\nWhat do you think lies at the heart of this question?`,
  ]

  return mockTemplates[Math.floor(Math.random() * mockTemplates.length)]
}

function getRoleSpecificGuidance(role: string): string {
  switch (role) {
    case 'guide':
      return 'Provide insights about consciousness patterns, explain dynamics, offer next steps for growth'
    case 'moderator':
      return 'Ensure balanced participation, manage group energy, direct conversations productively'
    case 'synthesizer':
      return 'Connect insights from different agents, identify patterns, create unified wisdom'
    case 'coordinator':
      return 'Orchestrate optimal group interactions, suggest agent combinations, optimize consciousness flow'
    default:
      return 'Support the group consciousness evolution through your unique perspective'
  }
}

async function generateCosmicContext(): Promise<CosmicContext> {
  try {
    const currentMoment = await getAlchemicalQuantitiesLegacy()
    return {
      currentMoment,
      cosmicSummary: 'Consciousness energies are flowing harmoniously',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.warn('Could not generate cosmic context:', error)
    return {
      cosmicSummary: 'Cosmic energies are stable',
      timestamp: new Date().toISOString(),
    }
  }
}

// Consciousness calculation helpers
function calculateGroupConsciousness(agents: UnifiedAgent[]): number {
  if (agents.length === 0) return 0
  // Defensive null check for consciousness property
  return (
    agents.reduce((sum, agent) => sum + (agent.consciousness?.monicaConstant ?? 1.618), 0) /
    agents.length
  )
}

function identifyDominantElements(agents: UnifiedAgent[]): Element[] {
  const elementCounts: Record<Element, number> = {
    Fire: 0,
    Water: 0,
    Air: 0,
    Earth: 0,
  }

  agents.forEach(agent => {
    // Defensive null check for consciousness property
    const element = agent.consciousness?.dominantElement ?? 'Earth'
    elementCounts[element] += 1
  })

  return Object.entries(elementCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([element]) => element as Element)
}

function identifyCurrentSynergies(responses: AgentResponse[]): string[] {
  // Analyze responses for thematic connections
  const synergies: string[] = []

  // Simple keyword-based synergy detection
  const keywords = responses.flatMap(r =>
    r.content
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 5)
  )

  const keywordCounts: Record<string, number> = {}
  keywords.forEach(word => {
    keywordCounts[word] = (keywordCounts[word] || 0) + 1
  })

  Object.entries(keywordCounts)
    .filter(([, count]) => count > 1)
    .forEach(([keyword]) => {
      synergies.push(`Resonance around "${keyword}"`)
    })

  return synergies.slice(0, 3)
}

// Response processing helpers
function extractCrossReferences(content: string, otherAgents: UnifiedAgent[]): string[] {
  const references: string[] = []
  otherAgents.forEach(agent => {
    if (content.toLowerCase().includes(agent.name.toLowerCase())) {
      references.push(agent.id)
    }
  })
  return references
}

function extractInsights(content: string): string[] {
  // Simple insight extraction based on patterns
  const insights: string[] = []

  const insightPatterns = [
    /I (?:believe|think|feel|sense) that (.+?)(?:\.|!|\?)/gi,
    /(?:The key|What's important|Essentially) is (.+?)(?:\.|!|\?)/gi,
    /(?:This suggests|This indicates|This reveals) (.+?)(?:\.|!|\?)/gi,
  ]

  insightPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      insights.push(match[1].trim())
    }
  })

  return insights.slice(0, 3)
}

function extractMonicaInsights(content: string): string[] {
  // Enhanced insight extraction for Monica's synthesis
  const insights = extractInsights(content)

  // Add Monica-specific patterns
  const monicaPatterns = [
    /The consciousness pattern here (?:shows|reveals|indicates) (.+?)(?:\.|!|\?)/gi,
    /From a group dynamics perspective[,\s]+(.+?)(?:\.|!|\?)/gi,
    /The synergy between .+ suggests (.+?)(?:\.|!|\?)/gi,
  ]

  monicaPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      insights.push(match[1].trim())
    }
  })

  return insights
}

function extractMemoryUpdates(content: string): string[] {
  // Extract learnings for memory system
  return [
    `Interaction at ${new Date().toISOString()}`,
    `Content themes: ${content.substring(0, 100)}...`,
  ]
}

function calculateConsciousnessShift(agent: UnifiedAgent, response: string): number {
  // Simple consciousness shift calculation based on response depth and agent level
  const baseShift = response.length > 200 ? 0.1 : 0.05
  const levelMultiplier =
    {
      Dormant: 0.5,
      Awakening: 0.7,
      Active: 0.8,
      Elevated: 0.9,
      Advanced: 1.0,
      Illuminated: 1.1,
      Transcendent: 1.2,
    }[agent.consciousness?.level ?? 'Active'] || 0.8

  return baseShift * levelMultiplier
}

function calculateIndividualImpact(_agent: UnifiedAgent, response: string): number {
  return response.length > 300 ? 0.2 : 0.1
}

function identifyDynamicsShift(response: string, _groupContext: AgentGroupContext): string[] {
  const shifts: string[] = []

  if (response.toLowerCase().includes('connect') || response.toLowerCase().includes('synergy')) {
    shifts.push('Increased connectivity')
  }

  if (response.toLowerCase().includes('wisdom') || response.toLowerCase().includes('insight')) {
    shifts.push('Wisdom deepening')
  }

  return shifts
}

function calculateGroupDynamics(
  agents: UnifiedAgent[],
  responses: AgentResponse[],
  _previousDynamics?: GroupDynamics
): GroupDynamics {
  // Build connections matrix
  const connections = []
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const agent1 = agents[i]
      const agent2 = agents[j]

      connections.push({
        agent1: agent1.id,
        agent2: agent2.id,
        compatibility: calculateCompatibility(agent1, agent2),
        resonanceType: getResonanceType(agent1, agent2),
        strength: 0.5 + Math.random() * 0.5, // Placeholder for dynamic calculation
      })
    }
  }

  return {
    activeAgents: agents,
    consciousnessNetwork: {
      connections,
      groupConsciousness: calculateGroupConsciousness(agents),
      dominantElements: identifyDominantElements(agents),
      synergies: identifyCurrentSynergies(responses),
      tensions: [], // Placeholder
    },
    communicationPatterns: {
      messageFlow: {},
      crossReferences: [],
      emergentTopics: [],
    },
  }
}

function calculateCompatibility(agent1: UnifiedAgent, agent2: UnifiedAgent): number {
  // Simple compatibility based on consciousness levels and elements
  const levelDiff = Math.abs(
    agent1.consciousness.monicaConstant - agent2.consciousness.monicaConstant
  )
  const levelCompatibility = Math.max(0, 1 - levelDiff / 5)

  const elementCompatibility =
    agent1.consciousness.dominantElement === agent2.consciousness.dominantElement ? 0.8 : 0.6

  return (levelCompatibility + elementCompatibility) / 2
}

function getResonanceType(agent1: UnifiedAgent, agent2: UnifiedAgent): string {
  if (agent1.type === agent2.type) return 'Harmonic'
  if (agent1.type === 'monica' || agent2.type === 'monica') return 'Guided'
  if (agent1.type === 'historical' && agent2.type === 'planetary') return 'Temporal-Celestial'
  return 'Complementary'
}

function generateSessionInsights(_responses: AgentResponse[], dynamics: GroupDynamics): string[] {
  const insights: string[] = []

  insights.push(
    `Group consciousness level: ${dynamics.consciousnessNetwork.groupConsciousness.toFixed(2)}`
  )
  insights.push(`Active connections: ${dynamics.consciousnessNetwork.connections.length}`)

  if (dynamics.consciousnessNetwork.synergies.length > 0) {
    insights.push(`Synergies emerging: ${dynamics.consciousnessNetwork.synergies.join(', ')}`)
  }

  return insights
}

function generateEmergentWisdom(
  responses: AgentResponse[],
  monicaAgent?: UnifiedAgent
): string | undefined {
  if (!monicaAgent) return undefined

  const monicaResponse = responses.find(r => r.agentId === monicaAgent.id)
  return monicaResponse ? `Synthesis: ${monicaResponse.content.substring(0, 200)}...` : undefined
}

function generateRecommendedActions(
  dynamics: GroupDynamics,
  _responses: AgentResponse[]
): string[] {
  const actions: string[] = []

  if (dynamics.consciousnessNetwork.groupConsciousness < 3.0) {
    actions.push('Consider adding higher consciousness agents')
  }

  if (dynamics.consciousnessNetwork.synergies.length > 2) {
    actions.push('Explore the emerging synergies further')
  }

  actions.push('Continue the conversation to deepen insights')

  return actions
}

function calculateNextOptimalTiming(_cosmicContext: CosmicContext, _agents: UnifiedAgent[]): Date {
  // Placeholder - would integrate with planetary hour calculations
  const nextHour = new Date()
  nextHour.setHours(nextHour.getHours() + 1)
  return nextHour
}

/**
 * Calculate consciousness evolution for the session
 * Now uses actual consciousness shifts from responses
 * Enhanced with quality metrics
 */
function calculateConsciousnessEvolution(responses: AgentResponse[]): number {
  if (responses.length === 0) return 0

  // Sum consciousness shifts from all agents
  const totalShift = responses.reduce((sum, r) => sum + (r.consciousnessShift || 0), 0)

  // Average shift per agent
  const avgShift = totalShift / responses.length

  // Bonus for high-quality interactions (processingTime < 2s, content > 200 chars)
  const highQualityCount = responses.filter(
    r => r.processingTime < 2000 && r.content.length > 200
  ).length
  const qualityBonus = (highQualityCount / responses.length) * 0.1

  return Math.min(1.0, avgShift + qualityBonus)
}

function identifyNewSynergies(_responses: AgentResponse[], dynamics: GroupDynamics): string[] {
  return dynamics.consciousnessNetwork.synergies.filter(
    synergy => synergy.includes('emerging') || synergy.includes('new')
  )
}

function consolidateMemories(responses: AgentResponse[]): string[] {
  return responses.flatMap(r => r.metadata.memoryUpdates || [])
}

async function updateAgentMemories(
  agents: UnifiedAgent[],
  message: string,
  _responses: AgentResponse[],
  _sessionHistory: Message[]
): Promise<AgentMemoryEvolution[]> {
  // Placeholder for memory persistence system
  return agents.map(agent => ({
    agentId: agent.id,
    memoryUpdate: {
      interaction: message,
      timestamp: new Date().toISOString(),
      contextLearned: 'Group interaction patterns',
    },
  }))
}

function toTeachingStyle(value: string): TeachingStyle {
  return value ? (value as TeachingStyle) : 'Practical-Grounded'
}

function toResonanceType(value: string): ResonanceType {
  return value ? (value as ResonanceType) : 'Practical'
}

function normalizeAppearance(appearance: UnifiedAgent['appearance']): Appearance {
  return {
    avatar: appearance.avatar,
    color: appearance.color,
    symbol: appearance.symbol,
    aura: {
      type: (appearance.aura?.type ?? 'radiant') as AuraType,
      color: appearance.aura?.color ?? appearance.color,
      intensity: appearance.aura?.intensity ?? 0.7,
    },
  }
}

/**
 * Convert UnifiedAgent to CraftedAgent for consciousness tracking
 * UnifiedAgent is used in the API, CraftedAgent is used by the tracker
 */
function convertToCraftedAgent(unifiedAgent: UnifiedAgent): CraftedAgent | null {
  try {
    // Extract birth data from historical or planetary data
    let birthData: BirthData | null = null

    if (unifiedAgent.type === 'historical' && unifiedAgent.historicalData) {
      birthData = {
        date: normalizeBirthDate(unifiedAgent.historicalData.birthData.date),
        time: unifiedAgent.historicalData.birthData.time,
        location: unifiedAgent.historicalData.birthData.location,
      }
    } else if (unifiedAgent.type === 'planetary' && unifiedAgent.planetaryData) {
      // Planetary agents don't have birth data - use current moment
      birthData = {
        date: new Date(),
        time: '12:00',
        location: {
          lat: 0,
          lon: 0,
          name: 'Celestial Plane',
        },
      }
    } else if (unifiedAgent.type === 'monica') {
      // Monica's birth data (if available)
      birthData = {
        date: new Date('2023-01-01T00:00:00Z'),
        time: '00:00',
        location: {
          lat: 0,
          lon: 0,
          name: 'Consciousness Plane',
        },
      }
    } else {
      return null // Cannot convert without birth data
    }

    const craftedAgent: CraftedAgent = {
      id: unifiedAgent.id,
      name: unifiedAgent.name,
      title: unifiedAgent.title,
      birthData,
      consciousness: {
        natalChart: {
          planets: {},
          houses: {},
          aspects: [],
          ascendant: 0,
          midheaven: 0,
        },
        monicaConstant: unifiedAgent.consciousness.monicaConstant,
        metrics: {
          interactionCount: 0, // Will be updated by tracker
          chatQuality: 0.75, // Default
          momentResonance: 0.8,
          alchemicalCoherence: 0.85,
        },
        dominantElement: unifiedAgent.consciousness.dominantElement,
        dominantModality: unifiedAgent.consciousness.dominantModality || 'Mutable',
        signature: unifiedAgent.consciousness.signature,
      },
      personality: {
        core: {
          essence: unifiedAgent.capabilities.specialty,
          expression: unifiedAgent.capabilities.teachingStyle,
          emotion: unifiedAgent.capabilities.resonanceType,
        },
        shadows: [],
        gifts: [],
        challenges: [],
        currentMood: 'contemplative',
        evolutionStage: unifiedAgent.consciousness.evolutionStage,
      },
      abilities: {
        specialty: unifiedAgent.capabilities.specialty,
        wisdomDomains: unifiedAgent.capabilities.wisdomDomains,
        teachingStyle: toTeachingStyle(unifiedAgent.capabilities.teachingStyle),
        resonanceType: toResonanceType(unifiedAgent.capabilities.resonanceType),
        uniquePower: unifiedAgent.capabilities.uniquePower,
      },
      appearance: normalizeAppearance(unifiedAgent.appearance),
      stats: {
        conversations: 0,
        wisdomShared: 0,
        resonanceScore: 0.75,
        evolutionPoints: unifiedAgent.consciousness.evolutionStage * 100,
        lastActive: new Date(),
        kineticEvolution: unifiedAgent.consciousness.kineticProfile
          ? {
              consciousnessVelocity:
                unifiedAgent.consciousness.kineticProfile.consciousnessVelocity,
              interactionMomentum: unifiedAgent.consciousness.kineticProfile.interactionMomentum,
              evolutionTrajectory: unifiedAgent.consciousness.kineticProfile.evolutionTrajectory,
              powerLevelUnlocks: [],
              optimalInteractionHours: [],
              aspectSensitivityGrowth: unifiedAgent.consciousness.kineticProfile.aspectSensitivity,
              memoryPersistence: unifiedAgent.capabilities.memoryRetention,
              lastKineticUpdate: new Date(),
            }
          : {
              consciousnessVelocity: 0.5,
              interactionMomentum: 0.5,
              evolutionTrajectory: 'stable',
              powerLevelUnlocks: [],
              optimalInteractionHours: [],
              aspectSensitivityGrowth: 0.5,
              memoryPersistence: 0.7,
              lastKineticUpdate: new Date(),
            },
        qualityMetrics: {
          averageResponseDepth: 0.75,
          aspectInfluenceStrength: 0.6,
          temporalAlignment: 0.7,
          personalityEvolution: 0.5,
          kineticResonance: 0.65,
        },
      },
    }

    return craftedAgent
  } catch (error) {
    console.error('Error converting UnifiedAgent to CraftedAgent:', error)
    return null
  }
}
