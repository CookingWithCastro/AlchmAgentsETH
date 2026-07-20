/**
 * Jing Arena brain — the in-character move-picker for Pentacles' Jing duels.
 *
 * Given the player's OPENING move, the agent answers with the move that BEATS it
 * (so `JingMove::resolve(opening, agent_move)` credits the agent), plus a one-line
 * voice in the planet's temperament. The route at app/api/agents/jing/route.ts is a
 * thin wrapper.
 *
 * SERVER-ONLY. This module pulls in the model SDKs and the persona builder (which
 * hashes with `node:crypto`), so importing it from a client component breaks the
 * webpack browser build with `UnhandledSchemeError: node:crypto`. The counter graph,
 * move list, and type guards live in ./jing-rules — import from there in components.
 */

import { generateText } from 'ai'
import { gatewayGroq, gatewayGoogle, gatewayOpenAI, isGatewayEnabled } from '@/lib/models/gateway'
import { GROQ } from '@/lib/models/registry'
import { buildAgentContext } from '../persona/build-agent-context'
import {
  MOVE_ELEMENT,
  VOICE,
  WINNING_COUNTER,
  type JingMoveName,
  type JingResult,
  type Planet,
} from './jing-rules'

// Re-exported so existing importers (api routes, tests) keep their import path.
export {
  JING_MOVES,
  WINNING_COUNTER,
  isJingMove,
  isPlanet,
  type JingMoveName,
  type JingResult,
  type Planet,
} from './jing-rules'

/**
 * Main move generator. Calculates winning response, then tries to customize the
 * voice using LLM channeling if agentId is provided.
 */
export async function chooseJingMove(
  planet: Planet,
  opening: JingMoveName,
  agentId?: string
): Promise<JingResult> {
  const move = WINNING_COUNTER[opening]
  const defaultVoice = VOICE[planet](opening, move)

  if (agentId) {
    const voice = await generateJingVoice(agentId, planet, opening, move, defaultVoice)
    return { move, voice, element: MOVE_ELEMENT[move], source: 'counter' }
  }

  return { move, voice: defaultVoice, element: MOVE_ELEMENT[move], source: 'counter' }
}

async function generateJingVoice(
  agentId: string,
  planet: Planet,
  opening: JingMoveName,
  move: JingMoveName,
  fallback: string
): Promise<string> {
  const ctx = buildAgentContext(agentId)
  if (!ctx) return fallback

  const prompt = `You are playing a game of Jing Arena (elemental clashes).
Your planet/sphere: ${planet}
Channeled historical figure: ${ctx.agent.name}
Opponent's opening move: ${opening}
Your winning counter move: ${move}

Draft a single, brief, in-character sentence from ${ctx.agent.name} reacting to their ${opening} and casting your ${move} to defeat it.
Stay fully in character. Never mention Scrabble, dictionaries, or that you are an AI. Do NOT output any intro, quotes, or conversational filler — just the single sentence.`

  // Try Groq
  if (isGatewayEnabled || process.env.GROQ_API_KEY) {
    try {
      const model = isGatewayEnabled ? `groq/${GROQ.LLAMA_70B}` : GROQ.LLAMA_70B
      const { text } = await generateText({
        model: gatewayGroq(model) as any,
        system: ctx.personaBlock,
        prompt: prompt,
        maxOutputTokens: 100,
      })
      const trimmed = (text || '').trim().replace(/^["']|["']$/g, '')
      if (trimmed) return trimmed
    } catch (err) {
      console.warn(`[jing-move] failed to generate voice via Groq:`, err)
    }
  }

  // Fallback 1: Gemini
  if (isGatewayEnabled || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const model = isGatewayEnabled ? 'google/gemini-2.0-flash' : 'gemini-2.0-flash'
      const { text } = await generateText({
        model: gatewayGoogle(model) as any,
        system: ctx.personaBlock,
        prompt: prompt,
        maxOutputTokens: 100,
      })
      const trimmed = (text || '').trim().replace(/^["']|["']$/g, '')
      if (trimmed) return trimmed
    } catch (err) {
      console.warn(`[jing-move] failed to generate voice via Gemini:`, err)
    }
  }

  // Fallback 2: OpenAI
  if (isGatewayEnabled || process.env.OPENAI_API_KEY) {
    try {
      const model = isGatewayEnabled ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'
      const { text } = await generateText({
        model: gatewayOpenAI(model) as any,
        system: ctx.personaBlock,
        prompt: prompt,
        maxOutputTokens: 100,
      })
      const trimmed = (text || '').trim().replace(/^["']|["']$/g, '')
      if (trimmed) return trimmed
    } catch (err) {
      console.warn(`[jing-move] failed to generate voice via OpenAI:`, err)
    }
  }

  return fallback
}
