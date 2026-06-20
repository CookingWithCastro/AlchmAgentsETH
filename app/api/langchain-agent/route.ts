import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAgentRouter } from '@/lib/langchain'

interface LangChainAgentRequest {
  query: string
  agentId?: string
  sessionId?: string
  model?: 'openai' | 'anthropic' | 'groq'
  temperature?: number
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      )
    }

    const body: LangChainAgentRequest = await request.json()
    const { query, agentId = 'orchestrator', sessionId, model = 'openai', temperature = 0.7 } = body

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing query parameter.' },
        { status: 400 }
      )
    }

    // Spend token economy resources for tool-calling agent operations
    const { EconomyService } = await import('@/lib/services/economyService')
    const { AGENT_OPERATION_COSTS } = await import('@/lib/economy-config')
    const { isAgentFreeThisWeek } = await import('@/lib/agents/weekly-feature-rotation')

    const freeThisWeek =
      agentId !== 'orchestrator' ? await isAgentFreeThisWeek(agentId).catch(() => false) : false

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
          },
          { status: 402 }
        )
      }
      balances = debitResult.balances
    }

    // Initialize the AgentRouter with the user request options
    const router = await getAgentRouter({
      model,
      temperature,
      sessionId,
      agentId,
      enableMemory: true,
    })

    // Execute the agent query
    const result = await router.execute(query)

    // Log the transaction telemetry to Galileo logger if available
    try {
      const { logAgentConversation, createConversationContext } =
        await import('@/lib/galileo-agent-logger')
      const conversationContext = createConversationContext(agentId, 'LangChain', 'AgentRouter')
      await logAgentConversation(
        {
          sessionId: sessionId || conversationContext.sessionId,
          userMessage: query,
          agentResponse: result.output || result.error || 'No response',
          planet: agentId,
          sign: 'LangChain',
          degree: 'ReAct',
          elementalInfo: {
            signElement: 'tools',
            planetElement: 'react',
            elementalAffinity: 1.0,
            isDiurnal: true,
          },
          processingTimeMs: result.metadata?.duration || 0,
          agentType: 'planetary',
        },
        conversationContext
      )
    } catch (logError) {
      console.warn('Galileo logging skipped in langchain-agent route:', logError)
    }

    return NextResponse.json({
      success: !result.error,
      data: {
        output: result.output,
        toolCalls: result.toolCalls,
        intermediateSteps: result.intermediateSteps,
        metadata: result.metadata,
      },
      balances,
      free: freeThisWeek,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('LangChain Agent Router Route Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
