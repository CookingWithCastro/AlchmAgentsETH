import { describe, it, expect } from 'vitest'
import {
  wordScore,
  baseScore,
  lengthMultiplier,
  normalizeRack,
  canSpell,
  rackToString,
  type Candidate,
} from '../lib/agents/duel/word-scoring'
import { rankCandidates, planetStrategy } from '../lib/agents/duel/planet-strategy'
import { chooseWordMove, type GenerateMoveFn } from '../lib/agents/duel/word-duel'

// A rack rich enough to spell every test candidate individually (LL for MELLOW).
const RICH_RACK: Record<string, number> = {
  Z: 1,
  A: 1,
  Q: 1,
  U: 1,
  R: 1,
  T: 1,
  J: 1,
  O: 1,
  N: 1,
  E: 1,
  Y: 1,
  S: 1,
  M: 1,
  L: 2,
  W: 1,
}

const CANDIDATES: Candidate[] = [
  { word: 'ZA', score: wordScore('ZA') }, // 2 letters, raw 11 — Mars' short strike
  { word: 'QUARTZ', score: wordScore('QUARTZ') }, // score 60 — Mercury's max
  { word: 'JOURNEYS', score: wordScore('JOURNEYS') }, // 8 letters — Jupiter's reach
  { word: 'MELLOW', score: wordScore('MELLOW') }, // soft/liquid — Moon's flow
]

// Build an injected model call that always picks a given word.
const picks =
  (word: string, rationale = 'In character.'): GenerateMoveFn =>
  async () => ({
    word,
    rationale,
  })

describe('Word Duel — scoring parity (matches Pentacles / scrabblebot)', () => {
  it('scores CAT = 5, STAR = 6, SPELL = 14', () => {
    expect(wordScore('CAT')).toBe(5)
    expect(wordScore('STAR')).toBe(6)
    expect(wordScore('SPELL')).toBe(14)
  })

  it('is case-insensitive and composes base × length multiplier', () => {
    expect(baseScore('quartz')).toBe(24)
    expect(lengthMultiplier(6)).toBe(2.5)
    expect(wordScore('quartz')).toBe(60)
    expect(wordScore('JOURNEYS')).toBe(54)
  })
})

describe('Word Duel — rack normalization & spellability', () => {
  it('normalizes a rack string into A–Z counts', () => {
    const counts = normalizeRack('SPELLAR')
    expect(counts['S'.charCodeAt(0) - 65]).toBe(1)
    expect(counts['L'.charCodeAt(0) - 65]).toBe(2)
  })

  it('normalizes a {letter:count} rack map', () => {
    const counts = normalizeRack({ S: 1, P: 1, E: 1, L: 2, A: 1, R: 1 })
    expect(counts['L'.charCodeAt(0) - 65]).toBe(2)
  })

  it('validates spellability against the rack', () => {
    const counts = normalizeRack('SPELLAR')
    expect(canSpell('SPELL', counts)).toBe(true)
    expect(canSpell('APPLE', counts)).toBe(false) // needs two P's
  })

  it('renders a rack back to a flat uppercase string', () => {
    expect(rackToString({ A: 2, B: 1 })).toBe('AAB')
    expect(rackToString('a b!c')).toBe('ABC')
  })
})

describe('Word Duel — persona-driven candidate ranking', () => {
  it('Mars favors the short, high-firepower strike', () => {
    expect(rankCandidates('Mars', CANDIDATES)[0].word).toBe('ZA')
  })

  it('Jupiter reaches for the longest word', () => {
    expect(rankCandidates('Jupiter', CANDIDATES)[0].word).toBe('JOURNEYS')
  })

  it('Mercury maximizes raw score', () => {
    expect(rankCandidates('Mercury', CANDIDATES)[0].word).toBe('QUARTZ')
  })

  it('does not mutate the input array', () => {
    const before = CANDIDATES.map(c => c.word)
    rankCandidates('Mars', CANDIDATES)
    expect(CANDIDATES.map(c => c.word)).toEqual(before)
  })

  it('maps each sharp planet to the stronger free model and the right Sacred dimension', () => {
    expect(planetStrategy('Mercury').sharp).toBe(true)
    expect(planetStrategy('Jupiter').sharp).toBe(true)
    expect(planetStrategy('Saturn').sharp).toBe(true)
    expect(planetStrategy('Mars').sharp).toBe(false)
    expect(planetStrategy('Mars').dominantDimension).toBe('martialImpetus')
    expect(planetStrategy('Jupiter').dominantDimension).toBe('jovianExpansion')
  })
})

describe('Word Duel — chooseWordMove orchestration', () => {
  it('returns the model pick when it is a valid, spellable candidate', async () => {
    const move = await chooseWordMove(
      { planet: 'Mercury', rack: RICH_RACK, candidates: CANDIDATES },
      { generateMove: picks('QUARTZ', 'I seize the brightest path.') }
    )
    expect(move.word).toBe('QUARTZ')
    expect(move.score).toBe(60) // recomputed by our scorer
    expect(move.source).toBe('model')
    expect(move.rationale).toBe('I seize the brightest path.')
  })

  it('falls back to the persona-top candidate when the model picks an illegal word', async () => {
    const move = await chooseWordMove(
      { planet: 'Mars', rack: RICH_RACK, candidates: CANDIDATES },
      { generateMove: picks('ZEBRA') } // not in candidates
    )
    expect(move.source).toBe('fallback')
    expect(move.word).toBe('ZA') // Mars' persona-top
  })

  it('falls back when the model call throws', async () => {
    const move = await chooseWordMove(
      { planet: 'Jupiter', rack: RICH_RACK, candidates: CANDIDATES },
      {
        generateMove: async () => {
          throw new Error('provider down')
        },
      }
    )
    expect(move.source).toBe('fallback')
    expect(move.word).toBe('JOURNEYS') // Jupiter's persona-top
  })

  it('falls back when the model call exceeds the deadline', async () => {
    const move = await chooseWordMove(
      { planet: 'Sun', rack: RICH_RACK, candidates: CANDIDATES },
      { generateMove: () => new Promise(() => {}), timeoutMs: 20 } // never resolves
    )
    expect(move.source).toBe('fallback')
    expect(move.word).toBe('QUARTZ') // Sun favors the high-value word
  })

  it('filters out candidates the rack cannot spell, then plays a legal one', async () => {
    const move = await chooseWordMove(
      { planet: 'Mars', rack: 'ZA', candidates: ['ZA', 'QUARTZ'] },
      { generateMove: picks('QUARTZ') } // QUARTZ is unspellable from rack "ZA"
    )
    expect(move.word).toBe('ZA')
    expect(move.source).toBe('fallback')
  })

  it('yields when there are no legal candidates', async () => {
    const move = await chooseWordMove(
      { planet: 'Neptune', rack: 'ABC', candidates: [] },
      { generateMove: picks('ANYTHING') }
    )
    expect(move.word).toBe('')
    expect(move.score).toBe(0)
    expect(move.source).toBe('yield')
  })
})
