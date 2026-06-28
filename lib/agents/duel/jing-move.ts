/**
 * Jing Arena brain — the in-character move-picker for Pentacles' Jing duels.
 *
 * Pentacles' Jing metagame has FIVE moves (note: more than lib/agents/jing-system.ts's
 * four — it adds Erode, the Water·Earth compound) on a fixed counter graph that
 * mirrors the SpacetimeDB server (`JingMove::countered_by` in server/src/types.rs)
 * and the Pentacles feeder's local `COUNTER_OF` (feeder/jing-service.ts):
 *
 *     Meltdown ← Vacuum     Freeze ← Meltdown     TectonicRoot ← Erode
 *     Vacuum   ← Freeze     Erode  ← Vacuum
 *
 * Given the player's OPENING move, the agent answers with the move that BEATS it
 * (so `JingMove::resolve(opening, agent_move)` credits the agent), plus a one-line
 * voice in the planet's temperament. Pure + dependency-free so it unit-tests
 * headlessly; the route at app/api/agents/jing/route.ts is a thin wrapper.
 */

import { generateText } from 'ai'
import { gatewayGroq, gatewayGoogle, gatewayOpenAI, isGatewayEnabled } from '@/lib/models/gateway'
import { GROQ } from '@/lib/models/registry'
import { buildAgentContext } from '../persona/build-agent-context'

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

const PLANETS: readonly Planet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const
export function isPlanet(v: unknown): v is Planet {
  return typeof v === 'string' && PLANETS.includes(v as Planet)
}

export type JingMoveName = 'Meltdown' | 'Freeze' | 'TectonicRoot' | 'Vacuum' | 'Erode'
export const JING_MOVES: readonly JingMoveName[] = [
  'Meltdown',
  'Freeze',
  'TectonicRoot',
  'Vacuum',
  'Erode',
] as const
export function isJingMove(v: unknown): v is JingMoveName {
  return typeof v === 'string' && JING_MOVES.includes(v as JingMoveName)
}

export interface JingResult {
  move: JingMoveName
  voice: string
  element: 'fire' | 'water' | 'earth' | 'air' | 'silt'
  source: 'counter' | 'fallback'
}

/** Winning countered_by mapping from SpacetimeDB server. */
export const WINNING_COUNTER: Record<JingMoveName, JingMoveName> = {
  Meltdown: 'Vacuum', // Meltdown -> Vacuum
  Freeze: 'Meltdown', // Freeze -> Meltdown
  TectonicRoot: 'Erode', // TectonicRoot -> Erode
  Vacuum: 'Freeze', // Vacuum -> Freeze
  Erode: 'Vacuum', // Erode -> Vacuum
} as const

const MOVE_ELEMENT: Record<JingMoveName, 'fire' | 'water' | 'earth' | 'air' | 'silt'> = {
  Meltdown: 'fire',
  Freeze: 'water',
  TectonicRoot: 'earth',
  Vacuum: 'air',
  Erode: 'silt',
}

const VOICE: Record<Planet, (op: JingMoveName, mv: JingMoveName) => string> = {
  Sun: (op, mv) => `Behold the solar crown. Your ${op} is eclipsed by the brilliance of my ${mv}.`,
  Moon: (op, mv) =>
    `The tides shift in reflection. Your ${op} dissolves under the pull of my ${mv}.`,
  Mercury: (op, mv) =>
    `Presto! Before you can even formulate ${op}, my swift ${mv} cancels the script.`,
  Venus: (op, mv) =>
    `Harmony demands equilibrium. Let your harsh ${op} be softened and met by my ${mv}.`,
  Mars: (op, mv) => `Victory through offense! I smash your ${op} with a direct strike of ${mv}!`,
  Jupiter: (op, mv) =>
    `By the thunder of the heavens! Let your transient ${op} bow to the absolute authority of my ${mv}.`,
  Saturn: (op, mv) => `Patience undoes haste. Your ${op} erodes; my ${mv} endures.`,
  Uranus: (op, mv) =>
    `An unexpected revolution. Your traditional ${op} is scattered by the wild shock of my ${mv}.`,
  Neptune: (op, mv) =>
    `Into the deep abyss. Your structured ${op} is dissolved and lost in the dream of my ${mv}.`,
  Pluto: (op, mv) =>
    `Inevitability itself. Out of the ashes of your ${op}, my ${mv} rises to claim the end.`,
} as const

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
