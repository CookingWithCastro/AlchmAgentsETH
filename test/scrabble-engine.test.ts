import { describe, it, expect, afterEach } from 'vitest'
import type { CraftedAgent } from '@/lib/agent-types'
import {
  TILE_DISTRIBUTION,
  BAG_TOTAL,
  createTiles,
  makeSeededBag,
  mulberry32,
} from '../lib/agents/duel/tile-bag'
import {
  isValidWord,
  loadWordlist,
  wordlistSize,
  __setWordlistForTests,
  __resetWordlistForTests,
} from '../lib/agents/duel/wordlist-loader'
import { generateCandidates } from '../lib/agents/duel/rack-solver'
import {
  deriveAgentPlayStyle,
  rankCandidatesForAgent,
  chooseAgentWord,
  type AgentPlayStyle,
} from '../lib/agents/duel/agent-word-strategy'
import { playMatch } from '../lib/agents/duel/match-engine'
import { wordScore, canSpell, normalizeRack, type Candidate } from '../lib/agents/duel/word-scoring'
import { PLANETS, type Planet } from '../lib/agents/planetary-traits'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal CraftedAgent carrying just the natal data deriveSacredStats reads. */
function chartAgent(
  id: string,
  planets: Record<string, { sign: string; degree: number }>,
  monica = 0,
  ascendant = 0
): CraftedAgent {
  return {
    id,
    consciousness: { natalChart: { planets, ascendant }, monicaConstant: monica },
  } as unknown as CraftedAgent
}

const ARIES0 = { sign: 'Aries', degree: 0 }
// Mars in late Pisces → marsLongitude ≈ 359 → martialImpetus dominant.
const marsAgent = chartAgent(
  'mars-heavy',
  {
    Sun: ARIES0,
    Moon: ARIES0,
    Mercury: ARIES0,
    Venus: ARIES0,
    Mars: { sign: 'Pisces', degree: 29 },
  },
  0,
  0
)
// High Monica constant → jovianExpansion dominant.
const jupiterAgent = chartAgent(
  'jupiter-heavy',
  {
    Sun: ARIES0,
    Moon: ARIES0,
    Mercury: ARIES0,
    Venus: ARIES0,
    Mars: ARIES0,
  },
  10,
  0
)

const CANDS: Candidate[] = [
  { word: 'ZA', score: wordScore('ZA') }, // short, high-firepower — Mars
  { word: 'JOURNEY', score: wordScore('JOURNEY') }, // 7 letters — Jupiter's reach
  { word: 'MELLOW', score: wordScore('MELLOW') }, // soft/liquid — Moon
  { word: 'QUARTZ', score: wordScore('QUARTZ') }, // max score — Mercury
]

function styleWith(planet: Planet): AgentPlayStyle {
  const weights = {} as Record<Planet, number>
  for (const p of PLANETS) weights[p] = p === planet ? 1 : 0
  return { weights, dominantPlanet: planet }
}

// ---------------------------------------------------------------------------
// tile-bag
// ---------------------------------------------------------------------------

describe('Scrabble — tile bag (98-tile, no blanks, seeded)', () => {
  it('the standard distribution sums to 98', () => {
    const sum = Object.values(TILE_DISTRIBUTION).reduce((s, n) => s + n, 0)
    expect(sum).toBe(98)
    expect(BAG_TOTAL).toBe(98)
    expect(createTiles()).toHaveLength(98)
  })

  it('has the canonical scarce/common letters', () => {
    expect(TILE_DISTRIBUTION.E).toBe(12)
    expect(TILE_DISTRIBUTION.Q).toBe(1)
    expect(TILE_DISTRIBUTION.Z).toBe(1)
    expect(TILE_DISTRIBUTION.A).toBe(9)
  })

  it('mulberry32 is deterministic for a seed', () => {
    const r1 = mulberry32(123)
    const r2 = mulberry32(123)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })

  it('a seeded bag draws the same tiles on replay, and depletes correctly', () => {
    const a = makeSeededBag(42)
    const b = makeSeededBag(42)
    expect(a.draw(7)).toEqual(b.draw(7))
    expect(a.remaining()).toBe(91)
    // draw beyond the bag returns only what is left
    a.draw(95)
    expect(a.remaining()).toBe(0)
    expect(a.draw(7)).toEqual([])
  })

  it('different seeds produce different draws', () => {
    expect(makeSeededBag(1).draw(7).join('')).not.toBe(makeSeededBag(2).draw(7).join(''))
  })
})

// ---------------------------------------------------------------------------
// wordlist-loader (real embedded codex)
// ---------------------------------------------------------------------------

describe('Scrabble — wordlist loader (embedded codex)', () => {
  afterEach(() => __resetWordlistForTests())

  it('loads a non-trivial codex of recognizable 2–7 letter words', () => {
    const set = loadWordlist()
    expect(set.size).toBeGreaterThan(3000)
    expect(wordlistSize()).toBe(set.size)
    for (const w of ['CAT', 'HARMONY', 'JOURNEY', 'BELIEVE']) {
      expect(isValidWord(w)).toBe(true)
    }
    // every entry is uppercase A–Z and within the playable length window
    for (const w of set) {
      expect(w).toMatch(/^[A-Z]{2,7}$/)
    }
  })

  it('is case-insensitive and rejects non-words', () => {
    expect(isValidWord('cat')).toBe(true)
    expect(isValidWord('ZZZZQQ')).toBe(false)
    expect(isValidWord('')).toBe(false)
  })

  it('test hook replaces the dictionary, reset restores it', () => {
    __setWordlistForTests(['FOO', 'bar'])
    expect(isValidWord('FOO')).toBe(true)
    expect(isValidWord('BAR')).toBe(true)
    expect(isValidWord('CAT')).toBe(false)
    __resetWordlistForTests()
    expect(isValidWord('CAT')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// rack-solver (injected dictionary — offline)
// ---------------------------------------------------------------------------

describe('Scrabble — rack solver', () => {
  const DICT = ['CAT', 'ACT', 'CART', 'CARS', 'STAR', 'RATS', 'AT', 'CASTRATE', 'DOG']

  it('returns only words spellable from the rack, best-scoring first', () => {
    const cands = generateCandidates('CARST', { words: DICT })
    const words = cands.map(c => c.word)
    expect(words).toContain('CART')
    expect(words).toContain('STAR')
    expect(words).toContain('CAT')
    expect(words).not.toContain('DOG') // unspellable from CARST
    expect(words).not.toContain('CASTRATE') // > 7 letters, never a candidate
    // sorted by score desc
    for (let i = 1; i < cands.length; i++) {
      expect(cands[i - 1].score).toBeGreaterThanOrEqual(cands[i].score)
    }
  })

  it('every candidate is genuinely spellable and correctly scored', () => {
    const counts = normalizeRack('CARST')
    for (const c of generateCandidates('CARST', { words: DICT })) {
      expect(canSpell(c.word, counts)).toBe(true)
      expect(c.score).toBe(wordScore(c.word))
    }
  })

  it('respects the cap', () => {
    expect(generateCandidates('CARST', { words: DICT, cap: 2 })).toHaveLength(2)
  })

  it('returns [] when nothing is spellable', () => {
    expect(generateCandidates('XZ', { words: DICT })).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// agent-word-strategy (the Sacred-7 blend)
// ---------------------------------------------------------------------------

describe('Scrabble — agent word strategy (Sacred-7 blend)', () => {
  it('derives the right dominant planet from a chart', () => {
    expect(deriveAgentPlayStyle(marsAgent).dominantPlanet).toBe('Mars')
    expect(deriveAgentPlayStyle(jupiterAgent).dominantPlanet).toBe('Jupiter')
  })

  it('weights are non-negative and sum to ~1', () => {
    const { weights } = deriveAgentPlayStyle(marsAgent)
    const total = PLANETS.reduce((s, p) => s + weights[p], 0)
    expect(total).toBeCloseTo(1, 5)
    for (const p of PLANETS) expect(weights[p]).toBeGreaterThanOrEqual(0)
  })

  it('a pure-Mars style takes the short strike; a pure-Jupiter style reaches long', () => {
    expect(rankCandidatesForAgent(marsAgent, CANDS, styleWith('Mars'))[0].word).toBe('ZA')
    expect(rankCandidatesForAgent(jupiterAgent, CANDS, styleWith('Jupiter'))[0].word).toBe(
      'JOURNEY'
    )
  })

  it('Mars-heavy and Jupiter-heavy agents pick measurably different words from one rack', () => {
    const marsPick = chooseAgentWord(marsAgent, CANDS)
    const jupiterPick = chooseAgentWord(jupiterAgent, CANDS)
    expect(marsPick).not.toBeNull()
    expect(jupiterPick).not.toBeNull()
    expect(marsPick!.word).not.toBe(jupiterPick!.word)
  })

  it('does not mutate the input array and is deterministic', () => {
    const before = CANDS.map(c => c.word)
    const first = rankCandidatesForAgent(marsAgent, CANDS).map(c => c.word)
    const second = rankCandidatesForAgent(marsAgent, CANDS).map(c => c.word)
    expect(CANDS.map(c => c.word)).toEqual(before)
    expect(first).toEqual(second)
  })

  it('handles an empty candidate list', () => {
    expect(rankCandidatesForAgent(marsAgent, [])).toEqual([])
    expect(chooseAgentWord(marsAgent, [])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// match-engine (deterministic, real codex)
// ---------------------------------------------------------------------------

describe('Scrabble — match engine', () => {
  it('a seeded match is fully reproducible', () => {
    const m1 = playMatch(marsAgent, jupiterAgent, 777, { rounds: 5 })
    const m2 = playMatch(marsAgent, jupiterAgent, 777, { rounds: 5 })
    expect(m2).toEqual(m1)
  })

  it('ends with a legal winner (or a tie) and consistent totals', () => {
    const m = playMatch(marsAgent, jupiterAgent, 2026, { rounds: 7 })
    // winner bookkeeping is internally consistent
    if (m.tie) {
      expect(m.winnerId).toBeNull()
      expect(m.a.total).toBe(m.b.total)
      expect(m.margin).toBe(0)
    } else {
      expect([m.a.agentId, m.b.agentId]).toContain(m.winnerId)
      expect(m.winnerId).not.toBe(m.loserId)
      const hi = Math.max(m.a.total, m.b.total)
      const lo = Math.min(m.a.total, m.b.total)
      expect(m.margin).toBe(hi - lo)
    }
    // totals equal the sum of per-turn scores
    for (const log of [m.a, m.b]) {
      expect(log.total).toBe(log.turns.reduce((s, t) => s + t.score, 0))
      expect(log.turns).toHaveLength(7)
    }
  })

  it('passes every round (no word, no score, tie) when nothing is spellable', () => {
    // 'ZZZZZZZ' needs seven Z's; the bag has one — so no rack can ever spell it.
    const m = playMatch(marsAgent, jupiterAgent, 5, { rounds: 4, words: ['ZZZZZZZ'] })
    for (const lg of [m.a, m.b]) {
      expect(lg.total).toBe(0)
      expect(lg.bestWord).toBeNull()
      for (const t of lg.turns) {
        expect(t.word).toBe('')
        expect(t.score).toBe(0)
      }
    }
    expect(m.tie).toBe(true)
    expect(m.winnerId).toBeNull()
  })

  it('clamps an out-of-range rounds value instead of running unbounded', () => {
    const m = playMatch(marsAgent, jupiterAgent, 1, { rounds: 100000 })
    expect(m.a.turns.length).toBeLessThanOrEqual(20) // MAX_ROUNDS
    expect(m.a.turns).toHaveLength(m.b.turns.length)
  })

  it('every played word is a legal, spellable move from its rack', () => {
    const m = playMatch(marsAgent, jupiterAgent, 99, { rounds: 7 })
    for (const log of [m.a, m.b]) {
      for (const turn of log.turns) {
        if (turn.word === '') {
          expect(turn.score).toBe(0)
          continue
        }
        expect(isValidWord(turn.word)).toBe(true)
        expect(canSpell(turn.word, normalizeRack(turn.rack))).toBe(true)
        expect(turn.score).toBe(wordScore(turn.word))
      }
    }
  })
})
