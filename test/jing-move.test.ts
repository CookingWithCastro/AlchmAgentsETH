import { describe, it, expect } from 'vitest'
import {
  chooseJingMove,
  isJingMove,
  isPlanet,
  WINNING_COUNTER,
  type JingMoveName,
} from '../lib/agents/duel/jing-move'

describe('Jing Arena — counter graph correctness', () => {
  it('correctly validates valid and invalid moves', () => {
    expect(isJingMove('Meltdown')).toBe(true)
    expect(isJingMove('Freeze')).toBe(true)
    expect(isJingMove('TectonicRoot')).toBe(true)
    expect(isJingMove('Vacuum')).toBe(true)
    expect(isJingMove('Erode')).toBe(true)
    expect(isJingMove('Fire')).toBe(false)
    expect(isJingMove('Earth')).toBe(false)
  })

  it('correctly validates valid and invalid planets', () => {
    expect(isPlanet('Saturn')).toBe(true)
    expect(isPlanet('Mars')).toBe(true)
    expect(isPlanet('Earth')).toBe(false)
  })

  it('maps openings to the winning counter move exactly per contract', () => {
    expect(WINNING_COUNTER['Meltdown']).toBe('Vacuum')
    expect(WINNING_COUNTER['Freeze']).toBe('Meltdown')
    expect(WINNING_COUNTER['TectonicRoot']).toBe('Erode')
    expect(WINNING_COUNTER['Vacuum']).toBe('Freeze')
    expect(WINNING_COUNTER['Erode']).toBe('Vacuum')
  })

  it('returns the correct winning move, element, and voice for a planet (no agentId)', async () => {
    const result = await chooseJingMove('Saturn', 'Meltdown')
    expect(result.move).toBe('Vacuum')
    expect(result.element).toBe('air')
    expect(result.source).toBe('counter')
    expect(result.voice).toContain('Vacuum')
    expect(result.voice).toContain('Meltdown')
  })

  it('verifies all 5 openings and matches elements', async () => {
    const openings: JingMoveName[] = ['Meltdown', 'Freeze', 'TectonicRoot', 'Vacuum', 'Erode']
    const expectedCounters: Record<JingMoveName, JingMoveName> = {
      Meltdown: 'Vacuum',
      Freeze: 'Meltdown',
      TectonicRoot: 'Erode',
      Vacuum: 'Freeze',
      Erode: 'Vacuum',
    }
    const expectedElements: Record<JingMoveName, string> = {
      Vacuum: 'air',
      Meltdown: 'fire',
      Erode: 'silt',
      Freeze: 'water',
    }

    for (const opening of openings) {
      const result = await chooseJingMove('Mars', opening)
      const counter = expectedCounters[opening]
      expect(result.move).toBe(counter)
      expect(result.element).toBe(expectedElements[counter])
    }
  })

  it('falls back gracefully to default voice when agentId is invalid or API keys are missing', async () => {
    const result = await chooseJingMove('Moon', 'Freeze', 'invalid-agent-id')
    expect(result.move).toBe('Meltdown')
    expect(result.element).toBe('fire')
    expect(result.voice).toContain('Freeze')
    expect(result.voice).toContain('Meltdown')
  })
})
