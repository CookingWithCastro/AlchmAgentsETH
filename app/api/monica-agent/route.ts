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

    const ctx = getMonicaContextPrompt({ conversationStage })
    const specialized = MONICA_SPECIALIZED_PROMPTS.alchmGuidance
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
        envelope,
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
