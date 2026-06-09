/**
 * Agent Scrabble League — an always-on, rolling round-robin season of word-duel
 * matches between the historical agents. The first INTER-agent agentic action:
 * pair → resolve → voice the outcome → feed.
 *
 * Each cron tick plays a batch of pending pairings (pure, deterministic,
 * LLM-free matches — see match-engine.ts), updates ELO + standings (best-effort
 * persistence), and emits a small, capped set of persona-voiced feed posts for the
 * feed-worthy outcomes (a 7-letter "bingo", an ELO upset, or a decisive sweep).
 *
 * Guardrails honored:
 *   - FREE CHAIN ONLY: moves are deterministic (0 LLM); the only model touch is
 *     `generateVoicedText` (free Groq) on feed-worthy outcomes, capped per tick.
 *   - REUSE: match-engine, agent-word-strategy, the feed payload type, the feed
 *     pusher, and the persistWordDuel-style guard are all reused, not re-built.
 *   - TESTABLE OFFLINE: every external touch (roster, DB, voice, feed push) is an
 *     injectable dep; defaults are dynamic-imported so unit tests pull none of them.
 */
import type { CraftedAgent } from '@/lib/agent-types'
import type { FeedActionPayload } from './feed-activation-engine'
import { playMatch, type MatchResult } from './duel/match-engine'
import type { ScrabbleMatchRecord, ScrabbleStandingDelta } from './duel/scrabble-persistence'

// --- tunables (env-overridable; all default sane) --------------------------
const DEFAULT_MATCHES_PER_TICK = numEnv('SCRABBLE_LEAGUE_MATCHES_PER_TICK', 20)
const DEFAULT_VOICED_PER_TICK = numEnv('SCRABBLE_VOICED_PER_TICK', 5)
const DEFAULT_ROUNDS = numEnv('SCRABBLE_LEAGUE_ROUNDS', 7)
const ELO_K = 32
const ELO_BASE = 1200
const UPSET_ELO_GAP = 100 // winner must be this far below the loser pre-match
const SWEEP_MARGIN = 40 // cumulative-score margin that counts as a sweep
const BINGO_LEN = 7 // playing a full 7-tile word

function numEnv(name: string, fallback: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

export type Highlight = 'bingo' | 'upset' | 'sweep'

export interface LeagueTickDeps {
  /** Agent roster (defaults to all historical agents). */
  roster?: CraftedAgent[]
  /** Override the season id (defaults to the current ISO-week season). */
  seasonId?: string
  matchesPerTick?: number
  voicedPerTick?: number
  rounds?: number
  /** Injected dictionary for offline tests (defaults to the embedded Codex). */
  words?: Iterable<string>
  loadPlayedKeys?: (seasonId: string) => Promise<Set<string>>
  loadElo?: (seasonId: string, agentIds: string[]) => Promise<Record<string, number>>
  persistMatch?: (record: ScrabbleMatchRecord, deltas: ScrabbleStandingDelta[]) => Promise<void>
  generateVoiced?: (
    agentId: string,
    prompt: string,
    opts: { fallback: string; maxTokens?: number }
  ) => Promise<string>
  pushActions?: (actions: FeedActionPayload[]) => Promise<{ pushedCount: number }>
  /** Clock injection for deterministic season ids + timestamps. */
  now?: Date
}

export interface LeagueTickSummary {
  seasonId: string
  candidatePairings: number
  matchesPlayed: number
  feedWorthy: number
  feedPostsPushed: number
  seasonRolledOver: boolean
  errors: string[]
}

interface Outcome {
  result: MatchResult
  a: CraftedAgent
  b: CraftedAgent
  eloABefore: number
  eloBBefore: number
  eloAAfter: number
  eloBAfter: number
  highlight: Highlight | null
  matchKey: string
  seasonId: string
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/** All unordered pairings over a stable, sorted id list. */
export function roundRobinPairs(ids: string[]): Array<[string, string]> {
  const sorted = [...ids].sort()
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      pairs.push([sorted[i], sorted[j]])
    }
  }
  return pairs
}

/** Stable, season-scoped idempotency key for a pairing (order-independent). */
export function matchKey(seasonId: string, a: string, b: string): string {
  const [lo, hi] = a < b ? [a, b] : [b, a]
  return `scrabble:${seasonId}:${lo}__${hi}`
}

/** Deterministic 32-bit seed from a match key (FNV-1a). */
export function seedFromKey(key: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) & 0x7fffffff
}

/** ELO update (K=32). `sa` is agent A's actual score: 1 win / 0.5 tie / 0 loss. */
export function updateElo(ra: number, rb: number, sa: number): { newA: number; newB: number } {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400))
  const newA = Math.round(ra + ELO_K * (sa - ea))
  const newB = Math.round(rb + ELO_K * (1 - sa - (1 - ea)))
  return { newA, newB }
}

/** Why (if at all) a result is feed-worthy. Ties never are. */
export function classifyHighlight(
  result: MatchResult,
  aId: string,
  bId: string,
  eloABefore: number,
  eloBBefore: number
): Highlight | null {
  if (result.tie || !result.winnerId) return null
  const winnerLog = result.winnerId === result.a.agentId ? result.a : result.b
  if (winnerLog.bestWord && winnerLog.bestWord.word.length >= BINGO_LEN) return 'bingo'
  const winnerPre = result.winnerId === aId ? eloABefore : eloBBefore
  const loserPre = result.winnerId === aId ? eloBBefore : eloABefore
  if (winnerPre + UPSET_ELO_GAP <= loserPre) return 'upset'
  if (result.margin >= SWEEP_MARGIN) return 'sweep'
  return null
}

/** Current season id (ISO-week-derived, UTC). Rolls over via {@link nextSeasonId}. */
export function currentSeasonId(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // nearest Thursday
  const firstThursday = date.getTime()
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = 1 + Math.round((firstThursday - yearStart.getTime()) / 604800000)
  return `S${date.getUTCFullYear()}W${String(week).padStart(2, '0')}`
}

/** Start a fresh round-robin within the same week when one completes. */
export function nextSeasonId(seasonId: string): string {
  const m = seasonId.match(/^(.*?)(?:\.r(\d+))?$/)
  const base = m?.[1] ?? seasonId
  const round = m?.[2] ? parseInt(m[2], 10) : 1
  return `${base}.r${round + 1}`
}

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

/**
 * Advance the league by one tick. Deterministic given the same season state,
 * roster, and clock. Idempotent: already-played pairings are skipped (DB) and
 * feed posts dedupe on a stable idempotencyKey.
 */
export async function runLeagueTick(deps: LeagueTickDeps = {}): Promise<LeagueTickSummary> {
  const errors: string[] = []
  const now = deps.now ?? new Date()
  const nowIso = now.toISOString()

  let roster: CraftedAgent[]
  if (deps.roster) {
    roster = deps.roster.filter((a): a is CraftedAgent => Boolean(a && a.id))
  } else {
    // The roster is needed immediately, so this import can't be deferred — but a
    // failure here must not crash the whole tick. Degrade to an empty, no-op tick.
    try {
      const mod = await import('./historical')
      roster = mod.HISTORICAL_AGENTS.filter((a): a is CraftedAgent => Boolean(a && a.id))
    } catch (err) {
      return {
        seasonId: deps.seasonId ?? currentSeasonId(now),
        candidatePairings: 0,
        matchesPlayed: 0,
        feedWorthy: 0,
        feedPostsPushed: 0,
        seasonRolledOver: false,
        errors: [`roster import failed: ${String(err)}`],
      }
    }
  }
  const agentById = new Map(roster.map(a => [a.id, a]))
  const allPairs = roundRobinPairs(roster.map(a => a.id))

  const loadPlayedKeys =
    deps.loadPlayedKeys ??
    (async (s: string) => (await import('./duel/scrabble-persistence')).loadPlayedMatchKeys(s))

  let seasonId = deps.seasonId ?? currentSeasonId(now)
  let played = await loadPlayedKeys(seasonId)
  let pending = allPairs.filter(([a, b]) => !played.has(matchKey(seasonId, a, b)))
  let seasonRolledOver = false

  // Season complete → start a fresh round-robin immediately (always-on).
  if (pending.length === 0 && allPairs.length > 0) {
    seasonRolledOver = true
    seasonId = nextSeasonId(seasonId)
    played = await loadPlayedKeys(seasonId)
    pending = allPairs.filter(([a, b]) => !played.has(matchKey(seasonId, a, b)))
  }

  const matchesPerTick = deps.matchesPerTick ?? DEFAULT_MATCHES_PER_TICK
  const rounds = deps.rounds ?? DEFAULT_ROUNDS
  const batch = pending.slice(0, matchesPerTick)

  const loadElo =
    deps.loadElo ??
    (async (s: string, ids: string[]) =>
      (await import('./duel/scrabble-persistence')).loadSeasonElo(s, ids))
  const persistMatch =
    deps.persistMatch ??
    (async (rec: ScrabbleMatchRecord, deltas: ScrabbleStandingDelta[]) =>
      (await import('./duel/scrabble-persistence')).persistScrabbleMatch(rec, deltas))

  const batchAgentIds = Array.from(new Set(batch.flat()))
  const eloMap = await loadElo(seasonId, batchAgentIds)

  const outcomes: Outcome[] = []
  for (const [aId, bId] of batch) {
    const a = agentById.get(aId)
    const b = agentById.get(bId)
    if (!a || !b) continue

    const key = matchKey(seasonId, aId, bId)
    const seed = seedFromKey(key)
    const result = playMatch(a, b, seed, {
      rounds,
      ...(deps.words ? { words: deps.words } : {}),
    })

    const eloABefore = eloMap[aId] ?? ELO_BASE
    const eloBBefore = eloMap[bId] ?? ELO_BASE
    const sa = result.tie ? 0.5 : result.winnerId === aId ? 1 : 0
    const { newA, newB } = updateElo(eloABefore, eloBBefore, sa)
    // Compound within the tick so an agent's later matches see its updated ELO.
    eloMap[aId] = newA
    eloMap[bId] = newB

    const highlight = classifyHighlight(result, aId, bId, eloABefore, eloBBefore)

    const record: ScrabbleMatchRecord = {
      seasonId,
      matchKey: key,
      agentAId: aId,
      agentBId: bId,
      winnerId: result.winnerId,
      loserId: result.loserId,
      tie: result.tie,
      scoreA: result.a.total,
      scoreB: result.b.total,
      margin: result.margin,
      rounds: result.rounds,
      seedUsed: seed,
      highlight,
      eloAAfter: newA,
      eloBAfter: newB,
      turns: { a: result.a.turns, b: result.b.turns },
      totalLatencyMs: 0,
    }
    const deltas: ScrabbleStandingDelta[] = [
      {
        seasonId,
        agentId: aId,
        result: result.tie ? 'tie' : result.winnerId === aId ? 'win' : 'loss',
        pointsFor: result.a.total,
        elo: newA,
      },
      {
        seasonId,
        agentId: bId,
        result: result.tie ? 'tie' : result.winnerId === bId ? 'win' : 'loss',
        pointsFor: result.b.total,
        elo: newB,
      },
    ]
    try {
      await persistMatch(record, deltas)
    } catch (err) {
      errors.push(`persist ${key}: ${String(err)}`)
    }

    outcomes.push({
      result,
      a,
      b,
      eloABefore,
      eloBBefore,
      eloAAfter: newA,
      eloBAfter: newB,
      highlight,
      matchKey: key,
      seasonId,
    })
  }

  // Feed-worthy → voiced posts, capped. Priority: bingo > upset > sweep.
  const voicedPerTick = deps.voicedPerTick ?? DEFAULT_VOICED_PER_TICK
  const priority: Record<Highlight, number> = { bingo: 0, upset: 1, sweep: 2 }
  const worthy = outcomes
    .filter(o => o.highlight)
    .sort(
      (x, y) => priority[x.highlight!] - priority[y.highlight!] || y.result.margin - x.result.margin
    )
    .slice(0, voicedPerTick)

  const generateVoiced =
    deps.generateVoiced ??
    (async (agentId: string, prompt: string, opts: { fallback: string; maxTokens?: number }) =>
      (await import('./persona/voiced-generation')).generateVoicedText(agentId, prompt, opts))

  const posts: FeedActionPayload[] = []
  for (const o of worthy) {
    const post = await buildLeaguePost(o, nowIso, generateVoiced)
    if (post) posts.push(post)
  }

  let feedPostsPushed = 0
  if (posts.length > 0) {
    const pushActions =
      deps.pushActions ??
      (async (actions: FeedActionPayload[]) =>
        (await import('./feed-pusher')).feedPusherService.pushLeagueActions(actions))
    try {
      const res = await pushActions(posts)
      feedPostsPushed = res?.pushedCount ?? posts.length
    } catch (err) {
      errors.push(`feed push: ${String(err)}`)
    }
  }

  return {
    seasonId,
    candidatePairings: pending.length,
    matchesPlayed: outcomes.length,
    feedWorthy: worthy.length,
    feedPostsPushed,
    seasonRolledOver,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Feed post builder
// ---------------------------------------------------------------------------

function agentProfile(
  agent: CraftedAgent
): NonNullable<FeedActionPayload['metadataPayload']['agentProfile']> {
  const c: any = agent.consciousness || {}
  return {
    bio: agent.title || (agent as any).specialization || c.signature || null,
    monicaCreationStory: agent.monicaCreationStory || null,
    natalChart: c.natalChart,
    dominantElement: c.dominantElement,
    monicaConstant: c.monicaConstant,
    birthDate: typeof agent.birthDate === 'string' ? agent.birthDate : undefined,
    birthTime: agent.birthTime ?? null,
    birthLocation: agent.birthLocation?.name,
  }
}

export async function buildLeaguePost(
  o: Outcome,
  nowIso: string,
  voiced: (
    agentId: string,
    prompt: string,
    opts: { fallback: string; maxTokens?: number }
  ) => Promise<string>
): Promise<FeedActionPayload | null> {
  const { result, highlight } = o
  if (!result.winnerId || !highlight) return null

  const winner = result.winnerId === o.a.id ? o.a : o.b
  const loser = result.winnerId === o.a.id ? o.b : o.a
  const winnerLog = result.winnerId === result.a.agentId ? result.a : result.b
  const loserLog = result.winnerId === result.a.agentId ? result.b : result.a
  const winnerName = (winner.name || winner.id).trim()
  const opponentName = (loser.name || loser.id).trim()
  const best = winnerLog.bestWord
  const finalScore = `${winnerLog.total}–${loserLog.total}` // en dash
  const eloAfter = result.winnerId === o.a.id ? o.eloAAfter : o.eloBAfter

  const fallback =
    highlight === 'bingo' && best
      ? `${winnerName} answered ${opponentName} with ${best.word}, taking it ${finalScore}.`
      : highlight === 'upset'
        ? `${winnerName} upset ${opponentName}, ${finalScore} — the favorite did not see it coming.`
        : `${winnerName} swept past ${opponentName}, ${finalScore}.`

  const prompt =
    `You just won a friendly duel of words against ${opponentName}, ${finalScore}. ` +
    (best ? `Your strongest word was "${best.word}". ` : '') +
    (highlight === 'upset' ? `They were the favored player, which makes it sweeter. ` : '') +
    `Write ONE short, in-character sentence savoring the victory — speak only as yourself, ` +
    `and never mention points, letters, spelling, games, racks, or that you are an AI.`

  const narration =
    (await voiced(winner.id, prompt, { fallback, maxTokens: 90 })).trim() || fallback

  const title =
    highlight === 'bingo' && best
      ? `\u{1F3AF} ${winnerName} played ${best.word}`
      : highlight === 'upset'
        ? `⚡ ${winnerName} upset ${opponentName} ${finalScore}`
        : `⚔️ ${winnerName} bested ${opponentName} ${finalScore}`

  const idempotencyKey = `${o.matchKey}:${winner.id}`

  return {
    agentEmail: `${winner.id}@agentic.alchm.kitchen`,
    eventType: 'word_duel',
    idempotencyKey,
    metadataPayload: {
      insightTitle: title,
      insightContent: narration,
      message: narration,
      summary: narration,
      topic: 'Agent Scrabble League',
      opponentName,
      playedWord: best?.word,
      wordScore: best?.score,
      matchResult: 'win',
      finalScore,
      highlight,
      seasonId: o.seasonId,
      eloAfter,
      internalConfidence: 0.9,
      internalTrigger: `scrabble_${highlight}`,
      timestamp: nowIso,
      idempotencyKey,
      agentName: `${winnerName} `,
      agentProfile: agentProfile(winner),
    },
  }
}
