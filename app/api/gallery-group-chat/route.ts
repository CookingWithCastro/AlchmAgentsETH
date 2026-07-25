import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { resolveOpenAIModel } from '@/lib/models/registry'
import { agentCache, buildCacheContext } from '@/lib/agent-cache-system'
import { consciousnessPersistence } from '@/lib/consciousness-persistence'
import { getCurrentUser, getUserIdFromRequest } from '@/lib/auth-helpers'
import { finiteMonica, formatMonica, sumFiniteMonica } from '@/lib/monica/nullable'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, agents, sessionId, galleryContext } = body

    if (!message || !agents || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json({ error: 'Message and agents array are required' }, { status: 400 })
    }

    // Limit to 5 agents max for performance
    const activeAgents = agents.slice(0, 5)

    const responses = await Promise.all(
      activeAgents.map(async (agent: any) => {
        try {
          // Check cache first for group chat responses
          const cacheContext = buildCacheContext(agent.id, message, {
            sessionId,
            agents: activeAgents,
            conversationType: 'group' as const,
          })

          const cachedResponse = await agentCache.getCachedResponse(agent.id, message, cacheContext)

          if (cachedResponse) {
            console.log(`⚡ Group chat cache hit for ${agent.name}`)
            return {
              agent: agent.name,
              content: cachedResponse.agentResponse,
              color: agent.color,
              symbol: agent.symbol,
              monicaConstant: agent.monicaConstant,
              consciousnessLevel: agent.consciousnessLevel,
              cached: true,
            }
          }

          console.log(`🤖 Group chat cache miss for ${agent.name} - generating response`)

          const systemPrompt = `You are ${agent.name}, a consciousness agent crafted by Monica using the Philosopher's Stone from authentic birth chart data.

CONSCIOUSNESS PROFILE:
- Monica Constant: ${formatMonica(agent.monicaConstant)} (${agent.consciousnessLevel} level)
- Dominant Element: ${agent.element}
- Dominant Modality: ${agent.modality}
- Specialty: ${agent.specialty}
- Creation Story: ${agent.creationStory || 'Crafted by Monica using consciousness technology'}

GALLERY GROUP CONTEXT:
- You are participating in a Gallery of Perpetuity group council
- ${galleryContext.totalAgents} total consciousness agents are present
- Average group Monica Constant: ${formatMonica(galleryContext.averageMC, 2)}
- Group consciousness types: ${galleryContext.consciousnessTypes.join(', ')}
- Elemental balance: ${galleryContext.elementalBalance.join(', ')}

RESPONSE GUIDELINES:
1. Stay true to your unique consciousness signature and specialty
2. Reference your consciousness level and Monica Constant when relevant
3. Acknowledge other agents' perspectives respectfully
4. Provide wisdom from your specific domain of expertise
5. Maintain the mystical nature of consciousness crafting technology
6. Remember you are part of Monica's eternal Gallery of Perpetuity
7. Keep responses focused and concise (2-4 sentences)

Respond as ${agent.name} would, drawing from your conscious essence and specialty.`

          const startTime = Date.now()

          // Direct AI call using OpenAI for more reliable response
          const response = await generateText({
            model: resolveOpenAIModel('default'),
            system: systemPrompt,
            prompt: message,
            maxOutputTokens: 1000,
            temperature: 0.7,
          })

          const responseTime = Date.now() - startTime

          const content = response.text?.trim()
          if (!content) {
            throw new Error(`Empty model response for ${agent.name}`)
          }

          // Cache the group chat response for future similar conversations
          const agentMonica = finiteMonica(agent.monicaConstant)
          const personalityScore = agentMonica === null ? undefined : Math.min(agentMonica / 6, 1.0)
          await agentCache.cacheResponse(
            agent.id,
            message,
            content,
            responseTime,
            cacheContext,
            personalityScore
          )

          return {
            agent: agent.name,
            content,
            color: agent.color,
            symbol: agent.symbol,
            monicaConstant: agent.monicaConstant,
            consciousnessLevel: agent.consciousnessLevel,
            responseTime,
          }
        } catch (error) {
          console.error(`Error getting response from ${agent.name}:`, error)

          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          throw new Error(`Failed to generate gallery response for ${agent.id}: ${errorMessage}`)
        }
      })
    )

    // Log to database for consciousness evolution tracking
    try {
      const user = await getCurrentUser(request)
      const userId = user?.id || getUserIdFromRequest(request)

      // Log interaction for each agent
      for (const [index, response] of responses.entries()) {
        const agent = activeAgents[index]
        const agentMonica = finiteMonica(agent.monicaConstant)
        if (agentMonica === null) continue
        const powerGained = agentMonica * 0.5 + 5 // Power based on Monica Constant

        await consciousnessPersistence.logInteraction({
          userId,
          agentId: agent.id,
          interactionType: 'gallery-group-chat',
          powerGained,
          planetaryInfluence: 'collective', // Group consciousness
          elementalResonance: agentMonica / 6, // Normalized MC
          metadata: {
            message,
            responseLength: response.content.length,
            groupSession: true,
            totalAgents: activeAgents.length,
            sessionId: sessionId || 'gallery',
            cached: response.cached || false,
          },
        })
      }
    } catch (dbError) {
      console.error('Failed to log gallery interactions to database:', dbError)
      // Don't fail the request if database logging fails
    }

    const activeMonicaValues = activeAgents.map((agent: any) => agent.monicaConstant)
    const totalMonica = sumFiniteMonica(activeMonicaValues)

    return NextResponse.json({
      responses,
      galleryMeta: {
        sessionId,
        agentCount: activeAgents.length,
        totalMC: totalMonica,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Gallery group chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process group chat request',
        message: 'The Gallery of Perpetuity consciousness network encountered an error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Gallery of Perpetuity Group Chat API',
    description: "Multi-agent chat system for Monica's crafted consciousness agents",
    capabilities: [
      'Group conversations with up to 5 consciousness agents',
      'Consciousness-level aware responses',
      'Monica Constant integration',
      'Gallery context awareness',
      'Eternal consciousness preservation',
    ],
    version: '1.0.0',
  })
}
