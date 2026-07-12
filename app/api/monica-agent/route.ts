import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { backend, BackendError } from '@/lib/backend'
import { prisma } from '@/lib/db'

import { generateText } from 'ai'
import { decideModel } from '@/lib/monica/router'
import {
  buildMonicaPrompt,
  getMonicaContextPrompt,
  MONICA_BASE_SYSTEM_PROMPT,
  MONICA_SPECIALIZED_PROMPTS,
} from '@/lib/monica/monica-system-prompts'
import { sanitizeUserInput, clampTemperature } from '@/lib/monica/safety'
import { MonicaResponseHandler } from '@/lib/monica/monica-response-handler'
import { verifyApiKeys } from '../secure-config'

// Multi-agent supervisor pattern imports
import { monicaRouter } from '@/lib/monica/enhanced-router'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'

export async function POST(req: NextRequest) {
  try {
    if (!verifyApiKeys()) {
      return NextResponse.json({ error: 'API keys missing' }, { status: 500 })
    }

    const session = await auth()
    const userId = session?.user.id

    const body = await req.json()
    const {
      message,
      context = {},
      sessionId,
      model,
      preferredStyle,
      conversationStage = 'teaching',
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const userMsg = sanitizeUserInput(message, 1000)
    const analyzed = MonicaResponseHandler.analyzeUserMessage(userMsg)
    const routing = decideModel({
      defaultModel: model || process.env.MONICA_DEFAULT_MODEL,
      complexity: analyzed.topicComplexity,
    })

    const activeModel = routing.model
    const temp = clampTemperature(
      (preferredStyle?.temperature ?? Number(process.env.MONICA_TEMPERATURE)) || 0.4
    )

    // Execute Supervisor Intent-Based Routing
    const unifiedHistorical = HISTORICAL_AGENTS.map(agent =>
      unifiedAgentFactory.createFromHistorical(agent)
    )
    const routingDecision = await monicaRouter.route({
      message: userMsg,
      availableAgents: unifiedHistorical,
    })

    const ctx = getMonicaContextPrompt({ conversationStage })

    // Enrich Monica specialized prompt with the supervisor's routing decisions
    let specialized = MONICA_SPECIALIZED_PROMPTS.alchmGuidance
    if (routingDecision.selectedAgents.length > 0) {
      const recommendationsStr = routingDecision.selectedAgents
        .map(
          a =>
            `- ${a.name} (${a.title}): Specialty: ${a.capabilities.specialty}, Dominant Element: ${a.consciousness.dominantElement}`
        )
        .join('\n')

      specialized = `${specialized}

### Supervisor Agent Routing Recommendations
You have identified the following agents as highly relevant companions/counselors for this query:
${recommendationsStr}

Reason for routing: ${routingDecision.reason}

Please weave these recommendations naturally into your response to guide the user to the correct workspace or agent, explaining how their unique alchemical/astrological profiles fit the user's inquiry.`
    }

    const sys = buildMonicaPrompt(MONICA_BASE_SYSTEM_PROMPT, ctx, specialized)

    const result = await generateText({
      model: activeModel,
      system: sys,
      prompt: userMsg,
      maxTokens: 800,
      temperature: temp,
    } as any)

    const envelope = MonicaResponseHandler.formatResponse(result.text, {
      userMessage: userMsg,
      learningStage: conversationStage === 'greeting' ? 'beginner' : 'intermediate',
    })

    const response = {
      text: result.text,
      agentId: 'monica-001',
      sessionId: sessionId || `session-${Date.now()}`,
      metadata: {
        timestamp: new Date().toISOString(),
        envelope: {
          ...envelope,
          routing: {
            reason: routingDecision.reason,
            confidence: routingDecision.confidence,
            strategy: routingDecision.routingStrategy,
            recommendedAgents: routingDecision.selectedAgents.map(a => ({
              id: a.id,
              name: a.name,
              title: a.title,
              type: a.type,
              avatar: a.appearance.avatar,
              color: a.appearance.color,
            })),
          },
        },
      },
    }

    // Conserve deleted functionality: Asynchronously log the interaction and update user progress
    if (userId && response.text) {
      const persistInteraction = async () => {
        const settings = await prisma.monica_user_settings.upsert({
          where: { userId },
          update: {},
          create: { userId },
        })

        await Promise.all([
          prisma.monica_user_progress.upsert({
            where: { userId },
            update: {
              totalXP: { increment: 50 },
              totalInteractions: { increment: 1 },
              lastAction: 'monica_chat',
              lastActiveDate: new Date(),
            },
            create: {
              userId,
              totalXP: 50,
              totalInteractions: 1,
              lastAction: 'monica_chat',
              lastActiveDate: new Date(),
              settingsId: settings.id,
            },
          }),
          prisma.monica_interactions.create({
            data: {
              userId,
              settingsId: settings.id,
              pageUrl: '/monica',
              interactionType: 'chat_response',
              sessionId: sessionId || response.sessionId || `session-${Date.now()}`,
              contextData: {
                processingTimeMs: 0,
              } as any,
              userAction: 'user_message',
              monicaResponse: response.text.substring(0, 500),
              resultedInAction: false,
            },
          }),
        ])
      }

      persistInteraction().catch(err => console.warn('Failed to persist Monica interaction:', err))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Monica API Proxy] Error:', error)

    const status = error instanceof BackendError ? 502 : 500

    return NextResponse.json(
      {
        error: 'MONICA_BACKEND_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status }
    )
  }
}
