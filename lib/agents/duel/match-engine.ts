/**
 * Scrabble match engine — two historical agents play a fixed-rounds match, fully
 * deterministic from a single integer seed.
 *
 * Track-independent (no board): each round, an agent draws a fresh 7-tile rack from
 * its own seeded bag, the rack-solver enumerates the legal words, and the agent
 * plays the top word its persona ranks (`agent-word-strategy`). Highest cumulative
 * score after N rounds wins; equal totals tie.
 *
 * ZERO LLM calls — the persona ranking IS the character (the deterministic
 * top-candidate path, the same idea as `chooseWordMove`'s fallback, but agent-keyed
 * rather than planet-keyed). A whole match is pure functions: free and instant.
 */
import type { CraftedAgent } from '@/lib/agent-types'
import { generateCandidates, type SolveOptions } from './rack-solver'
import { makeSeededBag } from './tile-bag'
import { chooseAgentWord, deriveAgentPlayStyle, type AgentPlayStyle } from './agent-word-strategy'

export interface MatchTurn {
  round: number
  rack: string
  /** The played word, or '' when the agent passes (no legal word in the rack). */
  word: string
  score: number
  candidateCount: number
}

export interface AgentMatchLog {
  agentId: string
  turns: MatchTurn[]
  total: number
  /** Best single word of the match (highest-scoring play), if any. */
  bestWord: { word: string; score: number } | null
}

export interface MatchResult {
  seed: number
  rounds: number
  a: AgentMatchLog
  b: AgentMatchLog
  /** agentId of the winner, or null on a tie. */
  winnerId: string | null
  loserId: string | null
  tie: boolean
  /** Winning margin (>= 0; 0 on a tie). */
  margin: number
}

export interface PlayMatchOptions {
  /** Fixed number of rounds each agent plays (default 7). */
  rounds?: number
  /** Tiles drawn per rack each round (default 7). */
  rackSize?: number
  /** Injected dictionary for offline tests (defaults to the embedded Codex). */
  words?: Iterable<string>
  /** Candidate cap passed to the solver. */
  solveCap?: number
}

const DEFAULT_ROUNDS = 7
const DEFAULT_RACK_SIZE = 7
// Hard ceilings — a match is synchronous (the solver scans the whole codex each
// turn), so an env-driven `rounds`/`rackSize` must never be able to wedge the
// worker. SCRABBLE_LEAGUE_ROUNDS=10000 would otherwise run 20k solver passes.
const MAX_ROUNDS = 20
const MAX_RACK_SIZE = 12

function clampInt(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.min(Math.max(Math.floor(value), lo), hi)
}

/**
 * Play a deterministic match between two agents. Re-running with the same agents,
 * seed, and options yields a byte-identical result.
 */
export function playMatch(
  agentA: CraftedAgent,
  agentB: CraftedAgent,
  seed: number,
  opts: PlayMatchOptions = {}
): MatchResult {
  const rounds = clampInt(opts.rounds ?? DEFAULT_ROUNDS, 1, MAX_ROUNDS)
  const rackSize = clampInt(opts.rackSize ?? DEFAULT_RACK_SIZE, 1, MAX_RACK_SIZE)
  const solveOpts: SolveOptions = {
    cap: opts.solveCap ?? 150,
    ...(opts.words ? { words: opts.words } : {}),
  }

  // Each agent draws from its OWN seeded bag, offset from the match seed so the two
  // racks differ while staying reproducible from the single seed.
  const bagA = makeSeededBag((seed ^ 0x9e3779b9) >>> 0)
  const bagB = makeSeededBag((seed + 0x7f4a7c15) >>> 0)
  const styleA = deriveAgentPlayStyle(agentA)
  const styleB = deriveAgentPlayStyle(agentB)

  const logA = freshLog(agentA.id)
  const logB = freshLog(agentB.id)

  for (let round = 1; round <= rounds; round++) {
    playTurn(agentA, styleA, bagA, round, rackSize, solveOpts, logA)
    playTurn(agentB, styleB, bagB, round, rackSize, solveOpts, logB)
  }

  const tie = logA.total === logB.total
  let winnerId: string | null = null
  let loserId: string | null = null
  if (!tie) {
    const aWins = logA.total > logB.total
    winnerId = aWins ? logA.agentId : logB.agentId
    loserId = aWins ? logB.agentId : logA.agentId
  }
  return {
    seed,
    rounds,
    a: logA,
    b: logB,
    winnerId,
    loserId,
    tie,
    margin: Math.abs(logA.total - logB.total),
  }
}

function freshLog(agentId: string): AgentMatchLog {
  return { agentId, turns: [], total: 0, bestWord: null }
}

function playTurn(
  agent: CraftedAgent,
  style: AgentPlayStyle,
  bag: ReturnType<typeof makeSeededBag>,
  round: number,
  rackSize: number,
  solveOpts: SolveOptions,
  log: AgentMatchLog
): void {
  // Fresh full rack each round (board-less word race; previous tiles are not kept).
  const rack = bag.draw(rackSize)
  const rackStr = rack.join('')
  const candidates = generateCandidates(rackStr, solveOpts)
  const pick = chooseAgentWord(agent, candidates, style)
  const word = pick?.word ?? ''
  const score = pick?.score ?? 0
  log.turns.push({ round, rack: rackStr, word, score, candidateCount: candidates.length })
  log.total += score
  if (word && (!log.bestWord || score > log.bestWord.score)) {
    log.bestWord = { word, score }
  }
}
