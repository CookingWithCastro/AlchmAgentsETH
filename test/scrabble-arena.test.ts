import { describe, expect, it } from 'vitest'
import { SOCRATES, WILLIAM_SHAKESPEARE } from '@/lib/agents/historical'
import {
  listScrabbleArenaAgents,
  simulateScrabbleArenaMatch,
  storedScrabbleMatchToArenaMatch,
} from '@/lib/agents/duel/scrabble-arena'

const agents = [SOCRATES, WILLIAM_SHAKESPEARE]

describe('Scrabble arena', () => {
  it('lists each available agent once in name order', () => {
    const roster = listScrabbleArenaAgents([WILLIAM_SHAKESPEARE, SOCRATES, SOCRATES])
    expect(roster.map(agent => agent.id)).toEqual(['socrates', WILLIAM_SHAKESPEARE.id])
    expect(roster[0]).toMatchObject({ name: 'Socrates', title: 'The Original Questioner' })
  })

  it('simulates a deterministic exhibition with replayable rounds', () => {
    const input = {
      agentAId: SOCRATES.id,
      agentBId: WILLIAM_SHAKESPEARE.id,
      rounds: 3,
      seed: 4242,
      agents,
      now: new Date('2026-06-11T12:00:00.000Z'),
    }
    const first = simulateScrabbleArenaMatch(input)
    const second = simulateScrabbleArenaMatch(input)

    expect(second).toEqual(first)
    expect(first.source).toBe('simulation')
    expect(first.a.turns).toHaveLength(3)
    expect(first.b.turns).toHaveLength(3)
    expect(first.a.total).toBe(first.a.turns.reduce((sum, turn) => sum + turn.score, 0))
  })

  it('rejects a self-match', () => {
    expect(() =>
      simulateScrabbleArenaMatch({
        agentAId: SOCRATES.id,
        agentBId: SOCRATES.id,
        agents,
      })
    ).toThrow('Choose two different agents')
  })

  it('normalizes a stored league match into the desktop replay shape', () => {
    const replay = storedScrabbleMatchToArenaMatch(
      {
        id: 'match-1',
        seasonId: 'S2026W24',
        agentAId: SOCRATES.id,
        agentBId: WILLIAM_SHAKESPEARE.id,
        winnerId: SOCRATES.id,
        loserId: WILLIAM_SHAKESPEARE.id,
        tie: false,
        scoreA: 15,
        scoreB: 8,
        margin: 7,
        rounds: 1,
        seedUsed: 99,
        highlight: 'upset',
        turns: {
          a: [{ round: 1, rack: 'TESTING', word: 'TEST', score: 15, candidateCount: 4 }],
          b: [{ round: 1, rack: 'WORDSXY', word: 'WORD', score: 8, candidateCount: 2 }],
        },
        createdAt: new Date('2026-06-11T12:00:00.000Z'),
      },
      agents
    )

    expect(replay.source).toBe('league')
    expect(replay.a.bestWord).toEqual({ word: 'TEST', score: 15 })
    expect(replay.b.turns[0]?.rack).toBe('WORDSXY')
    expect(replay.createdAt).toBe('2026-06-11T12:00:00.000Z')
  })
})
