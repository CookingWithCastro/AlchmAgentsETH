import { describe, it, expect } from 'vitest'
import type { CraftedAgent } from '@/lib/agent-types'
import type { MatchResult, AgentMatchLog } from '@/lib/agents/duel/match-engine'
import {
  roundRobinPairs,
  matchKey,
  seedFromKey,
  updateElo,
  classifyHighlight,
  currentSeasonId,
  nextSeasonId,
  buildLeaguePost,
  runLeagueTick,
} from '@/lib/agents/scrabble-league'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function chartAgent(
  id: string,
  name: string,
  planets: Record<string, { sign: string; degree: number }>,
  monica = 0,
  ascendant = 0
): CraftedAgent {
  return {
    id,
    name,
    title: `${name} the Tester`,
    consciousness: { natalChart: { planets, ascendant }, monicaConstant: monica },
  } as unknown as CraftedAgent
}

const ARIES0 = { sign: 'Aries', degree: 0 }
const marsAgent = chartAgent(
  'aaa-mars',
  'Aaa',
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
const jupiterAgent = chartAgent(
  'bbb-jupiter',
  'Bbb',
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
const neutralAgent = chartAgent(
  'ccc-neutral',
  'Ccc',
  {
    Sun: ARIES0,
    Moon: ARIES0,
    Mercury: ARIES0,
    Venus: ARIES0,
    Mars: ARIES0,
  },
  5,
  100
)

const SMALL_DICT = [
  'AT',
  'TO',
  'IN',
  'IT',
  'AN',
  'AS',
  'OR',
  'ON',
  'NO',
  'SO',
  'CAT',
  'CATS',
  'RATE',
  'RATES',
  'STAR',
  'STARE',
  'TARES',
  'DOG',
  'DOGS',
  'GOD',
  'TONE',
  'NOTE',
  'STONE',
  'EAT',
  'TEA',
  'SEAT',
  'SET',
  'TEN',
  'NET',
  'SENT',
  'REST',
  'SORE',
  'ROSE',
  'CORE',
  'SCORE',
  'TRACE',
  'REACT',
  'CRATE',
  'CARES',
  'RACES',
]

function log(
  agentId: string,
  total: number,
  best: { word: string; score: number } | null
): AgentMatchLog {
  return { agentId, turns: [], total, bestWord: best }
}

function result(winnerId: string | null, a: AgentMatchLog, b: AgentMatchLog): MatchResult {
  const tie = winnerId === null
  return {
    seed: 1,
    rounds: 7,
    a,
    b,
    winnerId,
    loserId: tie ? null : winnerId === a.agentId ? b.agentId : a.agentId,
    tie,
    margin: Math.abs(a.total - b.total),
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('Scrabble League — pairing + season helpers', () => {
  it('round-robin yields every unordered pair once, sorted, no self-pairs', () => {
    const pairs = roundRobinPairs(['c', 'a', 'b'])
    expect(pairs).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ])
    const big = roundRobinPairs(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(big).toHaveLength(10) // C(5,2)
    expect(new Set(big.map(p => p.join('|'))).size).toBe(10) // all distinct
    expect(big.every(([x, y]) => x !== y)).toBe(true)
  })

  it('matchKey is order-independent and season-scoped', () => {
    expect(matchKey('S1', 'x', 'y')).toBe(matchKey('S1', 'y', 'x'))
    expect(matchKey('S1', 'x', 'y')).toBe('scrabble:S1:x__y')
    expect(matchKey('S2', 'x', 'y')).not.toBe(matchKey('S1', 'x', 'y'))
  })

  it('seedFromKey is deterministic and stable', () => {
    expect(seedFromKey('scrabble:S1:a__b')).toBe(seedFromKey('scrabble:S1:a__b'))
    expect(seedFromKey('scrabble:S1:a__b')).not.toBe(seedFromKey('scrabble:S1:a__c'))
    expect(seedFromKey('hello')).toBeGreaterThanOrEqual(0)
  })

  it('currentSeasonId is deterministic; nextSeasonId rolls the round', () => {
    const s = currentSeasonId(new Date('2026-06-08T12:00:00Z'))
    expect(s).toBe(currentSeasonId(new Date('2026-06-08T23:00:00Z')))
    expect(s).toMatch(/^S2026W\d{2}$/)
    expect(nextSeasonId(s)).toBe(`${s}.r2`)
    expect(nextSeasonId(`${s}.r2`)).toBe(`${s}.r3`)
  })
})

describe('Scrabble League — ELO', () => {
  it('winner gains, loser loses, and the exchange is ~zero-sum', () => {
    const { newA, newB } = updateElo(1200, 1200, 1) // a wins
    expect(newA).toBeGreaterThan(1200)
    expect(newB).toBeLessThan(1200)
    expect(Math.abs(newA + newB - 2400)).toBeLessThanOrEqual(1)
  })

  it('a tie between equals barely moves ratings', () => {
    const { newA, newB } = updateElo(1200, 1200, 0.5)
    expect(newA).toBe(1200)
    expect(newB).toBe(1200)
  })

  it('beating a much stronger opponent yields a bigger swing', () => {
    const underdog = updateElo(1000, 1400, 1) // 1000 beats 1400
    expect(underdog.newA - 1000).toBeGreaterThan(updateElo(1200, 1200, 1).newA - 1200)
  })
})

describe('Scrabble League — highlight classification', () => {
  it('flags a 7-letter bingo', () => {
    const r = result('w', log('w', 60, { word: 'JOURNEY', score: 51 }), log('l', 30, null))
    expect(classifyHighlight(r, 'w', 'l', 1200, 1200)).toBe('bingo')
  })

  it('flags an ELO upset', () => {
    const r = result('w', log('w', 20, { word: 'CAT', score: 5 }), log('l', 15, null))
    expect(classifyHighlight(r, 'w', 'l', 1100, 1300)).toBe('upset')
  })

  it('flags a decisive sweep on margin', () => {
    const r = result('w', log('w', 70, { word: 'CAT', score: 5 }), log('l', 20, null))
    expect(classifyHighlight(r, 'w', 'l', 1200, 1200)).toBe('sweep')
  })

  it('a narrow win between equals is not feed-worthy, nor is a tie', () => {
    const narrow = result('w', log('w', 25, { word: 'CAT', score: 5 }), log('l', 20, null))
    expect(classifyHighlight(narrow, 'w', 'l', 1200, 1200)).toBeNull()
    const tied = result(null, log('w', 20, null), log('l', 20, null))
    expect(classifyHighlight(tied, 'w', 'l', 1200, 1200)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Feed post builder
// ---------------------------------------------------------------------------

describe('Scrabble League — voiced feed post', () => {
  const outcome = {
    result: result(
      'aaa-mars',
      log('aaa-mars', 84, { word: 'JOURNEY', score: 51 }),
      log('bbb-jupiter', 61, null)
    ),
    a: marsAgent,
    b: jupiterAgent,
    eloABefore: 1200,
    eloBBefore: 1200,
    eloAAfter: 1216,
    eloBAfter: 1184,
    highlight: 'bingo' as const,
    matchKey: 'scrabble:S1:aaa-mars__bbb-jupiter',
    seasonId: 'S1',
  }

  it('builds a valid word_duel payload from a feed-worthy outcome, using the injected voice', async () => {
    let calledFor = ''
    const voiced = async (id: string) => {
      calledFor = id
      return 'A journey of the mind, and the victory was mine.'
    }
    const post = await buildLeaguePost(outcome, '2026-06-08T12:00:00Z', voiced)
    expect(post).not.toBeNull()
    expect(calledFor).toBe('aaa-mars')
    expect(post!.eventType).toBe('word_duel')
    expect(post!.agentEmail).toBe('aaa-mars@agentic.alchm.kitchen')
    const m = post!.metadataPayload
    expect(m.opponentName).toBe('Bbb')
    expect(m.playedWord).toBe('JOURNEY')
    expect(m.wordScore).toBe(51)
    expect(m.matchResult).toBe('win')
    expect(m.finalScore).toBe('84–61')
    expect(m.highlight).toBe('bingo')
    expect(m.insightContent).toBe('A journey of the mind, and the victory was mine.')
    expect((m.insightContent || '').length).toBeGreaterThanOrEqual(20)
    expect(post!.idempotencyKey).toBe('scrabble:S1:aaa-mars__bbb-jupiter:aaa-mars')
  })

  it('falls back to a non-empty narration when the voice returns nothing', async () => {
    const post = await buildLeaguePost(outcome, '2026-06-08T12:00:00Z', async () => '')
    expect(post!.metadataPayload.insightContent!.trim().length).toBeGreaterThanOrEqual(20)
  })
})

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

describe('Scrabble League — runLeagueTick', () => {
  function baseDeps(capture: { persisted: any[]; pushed: any[] }) {
    return {
      roster: [marsAgent, jupiterAgent, neutralAgent],
      seasonId: 'TEST-S1',
      matchesPerTick: 2,
      rounds: 5,
      words: SMALL_DICT,
      loadPlayedKeys: async () => new Set<string>(),
      loadElo: async () => ({}),
      persistMatch: async (rec: any) => {
        capture.persisted.push(rec)
      },
      generateVoiced: async () => 'A fine contest, settled in my favor with grace.',
      pushActions: async (a: any[]) => {
        capture.pushed.push(...a)
        return { pushedCount: a.length }
      },
      now: new Date('2026-06-08T12:00:00Z'),
    }
  }

  it('plays the batch, persists each match, and reports a clean summary', async () => {
    const cap = { persisted: [] as any[], pushed: [] as any[] }
    const s = await runLeagueTick(baseDeps(cap))
    expect(s.matchesPlayed).toBe(2) // 3 pairs, cap 2
    expect(cap.persisted).toHaveLength(2)
    expect(s.seasonRolledOver).toBe(false)
    expect(s.errors).toEqual([])
    expect(s.seasonId).toBe('TEST-S1')
    for (const rec of cap.persisted) {
      expect(rec.scoreA).toBe(rec.scoreA | 0)
      expect(rec.seasonId).toBe('TEST-S1')
      expect(typeof rec.matchKey).toBe('string')
    }
  })

  it('is deterministic — same inputs, same matches and scores', async () => {
    const c1 = { persisted: [] as any[], pushed: [] as any[] }
    const c2 = { persisted: [] as any[], pushed: [] as any[] }
    await runLeagueTick(baseDeps(c1))
    await runLeagueTick(baseDeps(c2))
    const shape = (r: any) => [r.matchKey, r.scoreA, r.scoreB, r.winnerId]
    expect(c2.persisted.map(shape)).toEqual(c1.persisted.map(shape))
  })

  it('skips already-played pairings (idempotent within a season)', async () => {
    const c1 = { persisted: [] as any[], pushed: [] as any[] }
    await runLeagueTick(baseDeps(c1))
    const playedKeys = new Set<string>(c1.persisted.map(r => r.matchKey))

    const c2 = { persisted: [] as any[], pushed: [] as any[] }
    const s2 = await runLeagueTick({
      ...baseDeps(c2),
      loadPlayedKeys: async (season: string) =>
        season === 'TEST-S1' ? playedKeys : new Set<string>(),
    })
    expect(s2.matchesPlayed).toBe(1) // only the 3rd of 3 pairs remains
    expect(playedKeys.has(c2.persisted[0].matchKey)).toBe(false) // a NEW pairing
    expect(s2.seasonRolledOver).toBe(false)
  })

  it('rolls over to a fresh round-robin when the season is complete', async () => {
    const allKeys = new Set<string>(
      roundRobinPairs([marsAgent.id, jupiterAgent.id, neutralAgent.id]).map(([a, b]) =>
        matchKey('TEST-S1', a, b)
      )
    )
    const cap = { persisted: [] as any[], pushed: [] as any[] }
    const s = await runLeagueTick({
      ...baseDeps(cap),
      matchesPerTick: 10,
      loadPlayedKeys: async (season: string) =>
        season === 'TEST-S1' ? allKeys : new Set<string>(),
    })
    expect(s.seasonRolledOver).toBe(true)
    expect(s.seasonId).toBe('TEST-S1.r2')
    expect(s.matchesPlayed).toBe(3)
  })

  it('any feed posts it pushes are valid word_duel payloads', async () => {
    const cap = { persisted: [] as any[], pushed: [] as any[] }
    await runLeagueTick({ ...baseDeps(cap), matchesPerTick: 3 })
    for (const post of cap.pushed) {
      expect(post.eventType).toBe('word_duel')
      expect(post.agentEmail).toContain('@')
      expect(post.metadataPayload.opponentName).toBeTruthy()
      expect((post.metadataPayload.insightContent || '').length).toBeGreaterThanOrEqual(20)
    }
  })
})
