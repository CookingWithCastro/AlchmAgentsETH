import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { backend } from '@/lib/backend'
import { buildAgentContext } from '@/lib/agents/persona/build-agent-context'
import { consciousnessPersistence } from '@/lib/consciousness-persistence'

interface UnifiedAgentRequest {
  action: string
  parameters?: any
}

interface UnifiedAgentResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
  timestamp: string
}

// Main handler for all agent operations proxied to Railway backend
export async function POST(request: NextRequest): Promise<NextResponse<UnifiedAgentResponse>> {
  try {
    const body: UnifiedAgentRequest = await request.json()
    const { action, parameters = {} } = body

    const timestamp = new Date().toISOString()

    switch (action) {
      case 'list': {
        const listData = await backend.agents.list(parameters)
        return NextResponse.json({ success: true, data: listData, timestamp })
      }

      case 'get': {
        if (!parameters.agentId) throw new Error('Missing agentId')
        const getData = await backend.agents.get(parameters.agentId)
        return NextResponse.json({ success: true, data: getData, timestamp })
      }

      case 'create': {
        const createData = await backend.agents.create(parameters)
        // Fire-and-forget: assign the new agent its gasless ENS subname (ENSIP-26
        // records). No-ops unless NameStone is configured; never blocks creation.
        import('@/lib/namestone')
          .then(({ registerAgentSubnameOnCreate }) =>
            registerAgentSubnameOnCreate(createData as any, parameters)
          )
          .catch(err => console.warn('ENS subname registration skipped:', err))
        return NextResponse.json({ success: true, data: createData, timestamp })
      }

      case 'interact':
      case 'chat': {
        // Bridge-aware: recognizes PA-native sessions AND alchm.kitchen sessions.
        const session = await auth()
        const userId = session?.user?.id

        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'Authentication required for agent interaction.', timestamp },
            { status: 401 }
          )
        }

        // ESMS Token Economy: Spend resources for agent operation —
        // UNLESS this agent is in the current week's free rotation (waive cost).
        const { EconomyService } = await import('@/lib/services/economyService')
        const { AGENT_OPERATION_COSTS } = await import('@/lib/economy-config')
        const { isAgentFreeThisWeek } = await import('@/lib/agents/weekly-feature-rotation')

        const freeThisWeek = parameters.agentId
          ? await isAgentFreeThisWeek(parameters.agentId).catch(() => false)
          : false

        let balances
        if (freeThisWeek) {
          balances = await EconomyService.getBalances(userId)
        } else {
          const debitResult = await EconomyService.debitOperation(userId, 'unified_chat')
          if (!debitResult.ok) {
            return NextResponse.json(
              {
                success: false,
                error: 'Insufficient tokens',
                data: { required: AGENT_OPERATION_COSTS.unified_chat },
                timestamp,
              },
              { status: 402 }
            )
          }
          balances = debitResult.balances
        }

        const personaCtx = parameters.agentId ? buildAgentContext(parameters.agentId) : null
        const userMessage = parameters.message || parameters.userMessage

        // Walrus memory: inject the agent's most-relevant past memories into the
        // persona (no-op without MemWal). Never blocks chat — falls back to the raw block.
        let personaBlock = personaCtx?.personaBlock
        if (personaCtx && parameters.agentId && userMessage) {
          const { augmentPersonaWithMemory } = await import('@/lib/walrus')
          personaBlock = await augmentPersonaWithMemory(
            personaCtx.personaBlock,
            parameters.agentId,
            userMessage
          )
        }

        // Premium gating: cap the requested model tier to the user's entitlement
        // (active subscription or validated BYOK key). Free users requesting a
        // premium tier degrade to the free chain rather than being rejected.
        const { getEntitlements } = await import('@/lib/premium/entitlements')
        const { capModelTier } = await import('@/lib/premium/tiers')
        // kitchenPremium unifies the role: an alchm.kitchen subscription grants
        // premium here too (surfaced by the session bridge).
        const entitlements = await getEntitlements(userId, {
          kitchenPremium: session?.user?.kitchenPremium,
        })
        const effectiveTier = capModelTier(
          parameters.modelTier,
          entitlements.tier,
          entitlements.byokProviders
        )

        // BYOK: forward the user's own provider keys so premium calls bill them.
        let userProviderKeys: { anthropic?: string; openai?: string } | undefined
        if (entitlements.byokProviders.length > 0) {
          const { getDecryptedKey } = await import('@/lib/byok/store')
          const keys: { anthropic?: string; openai?: string } = {}
          for (const provider of entitlements.byokProviders) {
            const decrypted = await getDecryptedKey(userId, provider)
            if (decrypted) keys[provider] = decrypted
          }
          if (Object.keys(keys).length > 0) userProviderKeys = keys
        }

        const chatData = await backend.agents.chat({
          agentId: parameters.agentId,
          message: parameters.message || parameters.userMessage,
          sessionId: parameters.sessionId,
          userId: parameters.userId || userId,
          context: parameters.context,
          systemPromptOverride: personaBlock,
          personaCacheKey: personaCtx?.cacheKey,
          modelTier: effectiveTier,
          userProviderKeys,
        })

        // Conserve interaction logging
        if (userId && chatData.text) {
          const powerGained = Math.max(1, Math.floor(chatData.text.length / 100))
          consciousnessPersistence
            .logInteraction({
              userId,
              agentId: parameters.agentId,
              interactionType: 'historical-chat',
              powerGained,
              planetaryInfluence: 'unknown',
              elementalResonance: 0.5,
              metadata: {
                userMessage: parameters.message || parameters.userMessage,
              },
            })
            .catch(err => console.warn('Failed to log unified agent interaction:', err))
        }

        // Walrus memory write-back: remember this exchange so future turns can recall
        // it (MemWal-gated; fire-and-forget so it never blocks or fails the response).
        if (chatData?.text && parameters.agentId && userMessage) {
          import('@/lib/walrus')
            .then(({ rememberConversation }) =>
              rememberConversation(parameters.agentId, userMessage, chatData.text)
            )
            .catch(() => {})
        }

        // Cosmic Leveling: award XP/EVs from this conversation. Fire-and-forget
        // so leveling never blocks or fails the chat response.
        if (chatData?.text && parameters.agentId) {
          const { HistoricalAgentsService } = await import('@/lib/historical-agents-db')
          // Deeper / longer answers earn a little more XP (0.5x–2x of base).
          const qualityMultiplier = Math.min(2, Math.max(0.5, (chatData.text.length || 0) / 600))

          // The agent the user spoke with gains XP.
          HistoricalAgentsService.awardXp(parameters.agentId, { qualityMultiplier }).catch(err =>
            console.warn('awardXp failed:', err)
          )

          // Training session: a crafted agent (trainerAgentId) grouped with this
          // partner earns XP and EVs in the partner's dominant Sacred 7 stat.
          const trainerId = parameters.trainerAgentId
          if (trainerId && trainerId !== parameters.agentId) {
            HistoricalAgentsService.awardXp(trainerId, { qualityMultiplier }).catch(() => {})
            HistoricalAgentsService.awardEvs(trainerId, parameters.agentId).catch(err =>
              console.warn('awardEvs failed:', err)
            )
          }
        }

        return NextResponse.json({
          success: true,
          data: chatData,
          balances,
          free: freeThisWeek,
          timestamp,
        })
      }

      case 'multi_agent_chat': {
        const session = await auth()
        const userId = session?.user?.id
        const agentIds: string[] = parameters.agentIds ||
          (body as any).agentIds || ['sirius', 'arcturus', 'vega', 'polaris']
        const userMessage =
          parameters.message ||
          parameters.userMessage ||
          (body as any).message ||
          (body as any).userMessage ||
          'How should I allocate my USDC collateral today?'

        const systemPromptOverrides: Record<string, string> = {}
        for (const id of agentIds) {
          const personaCtx = buildAgentContext(id)
          if (personaCtx) {
            systemPromptOverrides[id] = personaCtx.personaBlock
          }
        }

        let multiData: any
        try {
          multiData = await backend.agents.multiChat({
            agentIds,
            message: userMessage,
            sessionId: parameters.sessionId,
            userId: parameters.userId || userId,
            context: parameters.context,
            systemPromptOverrides,
            modelTier: parameters.modelTier,
          })
        } catch (err) {
          const STAR_SPECS: Record<
            string,
            { name: string; element: string; text: (msg: string) => string }
          > = {
            sirius: {
              name: 'Sirius',
              element: 'Fire',
              text: msg =>
                `As Sirius, Radiant Sovereign of Fire (Spirit Yield, 248% APY), I urge you to channel your USDC collateral into the Sirius Star Vault on Circle Arc while my star is risen to forge eternal Spirit.`,
            },
            arcturus: {
              name: 'Arcturus',
              element: 'Air',
              text: msg =>
                `As Arcturus, Master of Air (Substance Yield, 195% APY), higher strategic clarity demands balancing your position with intellectual precision across Fire and Earth vaults on Circle Arc.`,
            },
            vega: {
              name: 'Vega',
              element: 'Water',
              text: msg =>
                `As Vega, Mystic Queen of Water (Essence Yield, 210% APY), flow your USDC into harmonic liquidity reserves to distill pure emotional Essence and steady yield.`,
            },
            polaris: {
              name: 'Polaris',
              element: 'Earth',
              text: msg =>
                `As Polaris, Immutable Anchor of Earth (Matter Yield, 180% APY), anchor a foundational stake in the North Star Vault for unwavering structural stability and physical abundance.`,
            },
          }

          const responses = agentIds.map(id => {
            const key = id.toLowerCase().trim()
            const spec = STAR_SPECS[key] || {
              name: id.charAt(0).toUpperCase() + id.slice(1),
              element: 'Spirit',
              text: () =>
                `As ${id}, I advise aligning your USDC collateral according to cosmic yield principles.`,
            }
            return {
              agentId: id,
              name: spec.name,
              element: spec.element,
              text: spec.text(userMessage),
            }
          })

          multiData = {
            responses,
            sessionId: parameters.sessionId || `council-session-${Date.now()}`,
          }
        }

        return NextResponse.json({
          success: true,
          data: multiData,
          responses: multiData.responses,
          timestamp,
        })
      }

      case 'update': {
        if (!parameters.agentId) throw new Error('Missing agentId')
        const { agentId, ...patch } = parameters
        const updated = await backend.agents.update(agentId, patch)
        return NextResponse.json({ success: true, data: updated, timestamp })
      }

      case 'delete': {
        if (!parameters.agentId) throw new Error('Missing agentId')
        const result = await backend.agents.delete(parameters.agentId)
        return NextResponse.json({ success: true, data: result, timestamp })
      }

      case 'stats': {
        const data = await backend.agents.stats()
        return NextResponse.json({ success: true, data, timestamp })
      }

      case 'search': {
        const query = parameters.query || parameters.q
        if (!query) throw new Error('Missing query parameter')
        const limit = typeof parameters.limit === 'number' ? parameters.limit : 25
        const data = await backend.agents.search(query, limit)
        return NextResponse.json({ success: true, data, timestamp })
      }

      case 'dashboard': {
        // Composite call — stats + the most recent N agents in one
        // response so the admin UI can render with a single request.
        // Kept Next-side rather than backend because the shape is a
        // UI concern that may evolve faster than the FastAPI schema.
        const [stats, agents] = await Promise.all([
          backend.agents.stats(),
          backend.agents.list({ skip: 0, limit: 12 }),
        ])
        return NextResponse.json({
          success: true,
          data: { stats, recentAgents: agents },
          timestamp,
        })
      }

      case 'evolve':
        // Agent evolution interacts with the agent_consciousness table
        // and its Prisma model is the canonical source. The Python
        // backend doesn't own that schema. Until the design for
        // backend-side evolution is settled, callers should use the
        // dedicated /api/consciousness/evolve route instead.
        return NextResponse.json(
          {
            success: false,
            error:
              "Action 'evolve' is owned by /api/consciousness/evolve, not this unified surface. " +
              'Update the caller to hit that route directly.',
            timestamp,
          },
          { status: 501 }
        )

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}`,
            timestamp,
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Unified agent API proxy error', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<UnifiedAgentResponse>> {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'list'
  const timestamp = new Date().toISOString()

  try {
    switch (action) {
      case 'list': {
        const listData = await backend.agents.list(Object.fromEntries(searchParams))
        return NextResponse.json({ success: true, data: listData, timestamp })
      }

      case 'health':
        return NextResponse.json({
          success: true,
          data: {
            status: 'healthy',
            mode: 'proxy-to-backend',
            version: '2.0.0',
          },
          timestamp,
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown GET action: ${action}`,
            timestamp,
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp,
      },
      { status: 500 }
    )
  }
}
