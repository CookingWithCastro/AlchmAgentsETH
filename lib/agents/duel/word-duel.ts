/**
 * Word Duel "brain" — given a planet, a rack, and the legal candidate words,
 * choose the word that planet would play, in character, with a one-line
 * rationale in its voice.
 *
 * This replaces Pentacles' deterministic greedy opponent (`best_word`) at the
 * documented `agent_letters` seam, while honoring three project decisions:
 *   - FREE CHAIN: the move runs on Groq (Llama-70B for the sharper planets,
 *     8B-instant for the rest) — no Anthropic credits. The "always valid"
 *     guarantee comes from the persona-greedy fallback, not from chaining
 *     providers, so a missing/erroring provider still returns a legal move.
 *   - THIN BRAIN: the caller owns the 172k-word dictionary + solver and sends
 *     the candidates; we never read a wordlist from disk. (No fs, no bundling
 *     risk, jsdom-safe tests.)
 *   - PERSONA-CANONICAL: temperament + ranking come from the shared planetary
 *     traits (see planet-strategy.ts), so each planet plays differently.
 *
 * The model call is injectable (`deps.generateMove`) so tests run offline.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { gatewayGroq, isGatewayEnabled } from '@/lib/models/gateway'
import { GROQ } from '@/lib/models/registry'
import { type Planet } from '../planetary-traits'
import {
  canSpell,
  normalizeRack,
  rackToString,
  wordScore,
  type Candidate,
  type Rack,
} from './word-scoring'
import { planetStrategy, rankCandidates, type PlanetStrategy } from './planet-strategy'

export type { Planet } from '../planetary-traits'
export type { Rack, Candidate } from './word-scoring'

export interface DuelContext {
  round?: number
  /** World Ascendant degree (0..359). */
  seasonDegree?: number
  /** The human's played word this exchange. */
  playerWord?: string
  playerScore?: number
}

/** The contract Pentacles consumes. */
export interface AgentMove {
  /** UPPERCASE, A–Z only, >= 2 letters. Empty string only when yielding. */
  word: string
  /** One in-character sentence. */
  rationale: string
  /** Scrabble score (length-multiplied), computed by our shared scorer. */
  score: number
}

export interface WordDuelResult extends AgentMove {
  /** How the move was produced. */
  source: 'model' | 'fallback' | 'yield'
  provider?: string
  model?: string
  latencyMs: number
}

export interface WordDuelInput {
  planet: Planet
  rack: Rack
  /** Legal candidate words from the caller's solver (string or {word,score}). */
  candidates: Array<Candidate | string>
  context?: DuelContext
}

export interface GenerateMoveArgs {
  planet: Planet
  strategy: PlanetStrategy
  rackString: string
  context?: DuelContext
  /** Persona-ranked candidate menu shown to the model. */
  candidates: Candidate[]
  modelId: string
}

export type GenerateMoveFn = (
  args: GenerateMoveArgs
) => Promise<{ word: string; rationale: string } | null>

export interface ChooseWordMoveDeps {
  /** Override the model call (tests inject a fake; default uses the free chain). */
  generateMove?: GenerateMoveFn
  /** Override the race deadline (ms). */
  timeoutMs?: number
}

/** How many persona-ranked candidates we present to the model. */
const MENU_SIZE = 15
const DEFAULT_TIMEOUT_MS = 2500
const MAX_OUTPUT_TOKENS = 160

const MoveSchema = z.object({
  word: z
    .string()
    .describe('Exactly one word, copied verbatim from the candidate list, in UPPERCASE.'),
  rationale: z.string().describe('One in-character sentence explaining the choice.'),
})

/**
 * Choose a Word of Power for a planetary agent. Always resolves to a valid
 * move (or a yield when no legal word exists) — it never throws.
 */
export async function chooseWordMove(
  input: WordDuelInput,
  deps: ChooseWordMoveDeps = {}
): Promise<WordDuelResult> {
  const start = Date.now()
  const planet = input.planet
  const strategy = planetStrategy(planet)
  const rackCounts = normalizeRack(input.rack)
  const rackString = rackToString(input.rack)

  // Trust but verify: re-validate every candidate is spellable from the rack
  // and re-score it with our shared scorer (so `score` agrees with Pentacles).
  const legal = normalizeCandidates(input.candidates, rackCounts)
  if (legal.length === 0) {
    return {
      word: '',
      rationale: `${planet} finds no Word of Power in this rack, and yields the turn.`,
      score: 0,
      source: 'yield',
      latencyMs: Date.now() - start,
    }
  }

  const ranked = rankCandidates(planet, legal)
  const top = ranked[0]
  const menu = ranked.slice(0, MENU_SIZE)
  const legalWords = new Set(legal.map(c => c.word))
  const modelId = strategy.sharp ? GROQ.LLAMA_70B : GROQ.LLAMA_8B
  const generate = deps.generateMove ?? groqGenerateMove
  const timeoutMs =
    deps.timeoutMs ?? (Number(process.env.WORD_DUEL_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS)

  try {
    const result = await withTimeout(
      generate({ planet, strategy, rackString, context: input.context, candidates: menu, modelId }),
      timeoutMs
    )
    if (result) {
      const word = (result.word || '').trim().toUpperCase()
      if (word.length >= 2 && legalWords.has(word) && canSpell(word, rackCounts)) {
        return {
          word,
          rationale: cleanRationale(result.rationale, planet, word),
          score: wordScore(word),
          source: 'model',
          provider: 'groq',
          model: modelId,
          latencyMs: Date.now() - start,
        }
      }
    }
  } catch {
    // Timeout or provider error — fall through to the persona-greedy fallback.
  }

  return {
    word: top.word,
    rationale: `${planet} trusts the instinct of the spheres and plays ${top.word}.`,
    score: top.score,
    source: 'fallback',
    provider: 'groq',
    model: modelId,
    latencyMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCandidates(
  candidates: Array<Candidate | string> | undefined,
  rackCounts: number[]
): Candidate[] {
  const seen = new Set<string>()
  const out: Candidate[] = []
  for (const c of candidates ?? []) {
    const raw = typeof c === 'string' ? c : c?.word
    if (typeof raw !== 'string') continue
    const word = raw.trim().toUpperCase()
    if (word.length < 2 || !/^[A-Z]+$/.test(word)) continue
    if (seen.has(word)) continue
    if (!canSpell(word, rackCounts)) continue
    seen.add(word)
    out.push({ word, score: wordScore(word) })
  }
  return out
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('word-duel:timeout')), ms)
    promise.then(
      value => {
        clearTimeout(id)
        resolve(value)
      },
      err => {
        clearTimeout(id)
        reject(err)
      }
    )
  })
}

function cleanRationale(rationale: string | undefined, planet: Planet, word: string): string {
  const trimmed = (rationale || '').replace(/\s+/g, ' ').trim()
  if (trimmed) return trimmed
  return `${planet} lays down ${word} with quiet intent.`
}

function formatContext(ctx: DuelContext): string {
  const parts: string[] = []
  if (typeof ctx.round === 'number') parts.push(`round ${ctx.round}`)
  if (typeof ctx.seasonDegree === 'number') {
    parts.push(`the Ascendant stands at ${Math.round(ctx.seasonDegree)}°`)
  }
  if (ctx.playerWord) {
    const scoreNote = typeof ctx.playerScore === 'number' ? ` for ${ctx.playerScore}` : ''
    parts.push(`your opponent has cast "${ctx.playerWord.toUpperCase()}"${scoreNote}`)
  }
  return parts.join(', ') || 'a fresh duel begins'
}

function buildSystemPrompt(s: PlanetStrategy): string {
  return [
    `You are ${s.planet}, one of the ten planetary spheres, dueling with Words of Power in the Lettered Arcana.`,
    `Temperament: ${s.voice}`,
    `Duel directive: ${s.directive}`,
    '',
    'Rules:',
    '1. Choose exactly ONE word, copied verbatim from the candidate list you are given.',
    '2. Reply with that word in UPPERCASE and a single in-character sentence of rationale.',
    '3. Stay fully in character. Never mention letters, point values, Scrabble, dictionaries, racks, or that you are an AI.',
  ].join('\n')
}

function buildUserPrompt(args: GenerateMoveArgs): string {
  const lines = [`Your rack of letters: ${args.rackString}`]
  if (args.context) lines.push(`Context — ${formatContext(args.context)}.`)
  lines.push(
    '',
    'Your Words of Power (all already legal), ordered as they best suit your nature:',
    args.candidates.map(c => `- ${c.word}`).join('\n'),
    '',
    'Choose the one word that most embodies your nature, and give your one-sentence rationale.'
  )
  return lines.join('\n')
}

/**
 * Default model call — Groq via the free chain. Returns null when no provider
 * is configured (so the caller falls back). May throw on provider/timeout
 * errors, which chooseWordMove catches.
 */
const groqGenerateMove: GenerateMoveFn = async args => {
  if (!isGatewayEnabled && !process.env.GROQ_API_KEY) return null

  const gatewayId = isGatewayEnabled ? `groq/${args.modelId}` : args.modelId
  const { object } = await generateObject({
    model: gatewayGroq(gatewayId) as any,
    schema: MoveSchema,
    system: buildSystemPrompt(args.strategy),
    prompt: buildUserPrompt(args),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  })
  return { word: object.word, rationale: object.rationale }
}
