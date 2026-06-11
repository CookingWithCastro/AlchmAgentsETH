import type { CraftedAgent } from '@/lib/agent-types'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { playMatch, type MatchResult, type MatchTurn } from './match-engine'

export interface ScrabbleArenaAgent {
  id: string
  name: string
  title: string
  specialization: string | null
}

export interface ScrabbleArenaPlayer extends ScrabbleArenaAgent {
  total: number
  bestWord: { word: string; score: number } | null
  turns: MatchTurn[]
}

export interface ScrabbleArenaMatch {
  id: string | null
  source: 'simulation' | 'league'
  seasonId: string | null
  seed: number
  rounds: number
  winnerId: string | null
  loserId: string | null
  tie: boolean
  margin: number
  highlight: string | null
  createdAt: string
  a: ScrabbleArenaPlayer
  b: ScrabbleArenaPlayer
}

export interface StoredScrabbleArenaMatch {
  id: string
  seasonId: string
  agentAId: string
  agentBId: string
  winnerId: string | null
  loserId: string | null
  tie: boolean
  scoreA: number
  scoreB: number
  margin: number
  rounds: number
  seedUsed: number
  highlight: string | null
  turns: unknown
  createdAt: Date | string
}

export function listScrabbleArenaAgents(
  agents: CraftedAgent[] = HISTORICAL_AGENTS
): ScrabbleArenaAgent[] {
  const unique = new Map<string, ScrabbleArenaAgent>()
  for (const agent of agents) {
    if (!agent?.id || unique.has(agent.id)) continue
    unique.set(agent.id, summarizeAgent(agent))
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function simulateScrabbleArenaMatch(input: {
  agentAId: string
  agentBId: string
  rounds?: number
  seed?: number
  agents?: CraftedAgent[]
  now?: Date
}): ScrabbleArenaMatch {
  const agents = input.agents ?? HISTORICAL_AGENTS
  const agentA = agents.find(agent => agent.id === input.agentAId)
  const agentB = agents.find(agent => agent.id === input.agentBId)

  if (!agentA || !agentB) throw new Error('Both Scrabble agents must exist in the arena roster.')
  if (agentA.id === agentB.id) throw new Error('Choose two different agents for the match.')

  const seed = normalizeSeed(input.seed)
  const result = playMatch(agentA, agentB, seed, { rounds: input.rounds })
  return resultToArenaMatch(result, agentA, agentB, {
    source: 'simulation',
    createdAt: input.now ?? new Date(),
  })
}

export function storedScrabbleMatchToArenaMatch(
  row: StoredScrabbleArenaMatch,
  agents: CraftedAgent[] = HISTORICAL_AGENTS
): ScrabbleArenaMatch {
  const agentA = agents.find(agent => agent.id === row.agentAId)
  const agentB = agents.find(agent => agent.id === row.agentBId)
  const turns = normalizeStoredTurns(row.turns)

  return {
    id: row.id,
    source: 'league',
    seasonId: row.seasonId,
    seed: row.seedUsed,
    rounds: row.rounds,
    winnerId: row.winnerId,
    loserId: row.loserId,
    tie: row.tie,
    margin: row.margin,
    highlight: row.highlight,
    createdAt: toIsoString(row.createdAt),
    a: {
      ...summarizeAgent(agentA, row.agentAId),
      total: row.scoreA,
      turns: turns.a,
      bestWord: bestWord(turns.a),
    },
    b: {
      ...summarizeAgent(agentB, row.agentBId),
      total: row.scoreB,
      turns: turns.b,
      bestWord: bestWord(turns.b),
    },
  }
}

function resultToArenaMatch(
  result: MatchResult,
  agentA: CraftedAgent,
  agentB: CraftedAgent,
  meta: { source: 'simulation'; createdAt: Date }
): ScrabbleArenaMatch {
  return {
    id: null,
    source: meta.source,
    seasonId: null,
    seed: result.seed,
    rounds: result.rounds,
    winnerId: result.winnerId,
    loserId: result.loserId,
    tie: result.tie,
    margin: result.margin,
    highlight: null,
    createdAt: meta.createdAt.toISOString(),
    a: { ...summarizeAgent(agentA), ...result.a },
    b: { ...summarizeAgent(agentB), ...result.b },
  }
}

function summarizeAgent(agent: CraftedAgent | undefined, fallbackId?: string): ScrabbleArenaAgent {
  const id = agent?.id || fallbackId || 'unknown-agent'
  return {
    id,
    name: agent?.name || id,
    title: agent?.title || 'Historical Agent',
    specialization: agent?.specialization || null,
  }
}

function normalizeSeed(seed?: number): number {
  if (Number.isFinite(seed)) return Math.abs(Math.floor(seed!)) & 0x7fffffff
  return Math.floor(Math.random() * 0x7fffffff)
}

function normalizeStoredTurns(value: unknown): { a: MatchTurn[]; b: MatchTurn[] } {
  if (!isRecord(value)) return { a: [], b: [] }
  return {
    a: normalizeTurnList(value.a),
    b: normalizeTurnList(value.b),
  }
}

function normalizeTurnList(value: unknown): MatchTurn[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((turn, index) => {
    if (!isRecord(turn)) return []
    return [
      {
        round: finiteNumber(turn.round, index + 1),
        rack: typeof turn.rack === 'string' ? turn.rack : '',
        word: typeof turn.word === 'string' ? turn.word : '',
        score: finiteNumber(turn.score, 0),
        candidateCount: finiteNumber(turn.candidateCount, 0),
      },
    ]
  })
}

function bestWord(turns: MatchTurn[]): { word: string; score: number } | null {
  let best: { word: string; score: number } | null = null
  for (const turn of turns) {
    if (turn.word && (!best || turn.score > best.score)) {
      best = { word: turn.word, score: turn.score }
    }
  }
  return best
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}
