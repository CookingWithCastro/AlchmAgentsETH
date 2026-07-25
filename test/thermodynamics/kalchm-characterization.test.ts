import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { deriveKalchm } from '@/components/cosmic-agents/agent-adapter'
import {
  evaluatePerformanceKalchm,
  type PerformanceKalchmResult,
} from '@/lib/agent-performance-optimizer'
import { calculateKalchm as calculateProfileKalchm } from '@/lib/agents/alchemical-profiles'
import { computeKalchm as calculateContextCardKalchm } from '@/lib/context-card/from-natal-chart'
import { AdvancedConstantsCalculator } from '@/lib/core-energy-rules'

interface Case {
  name: string
  axes: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
  exact: number
}

const CASES: Case[] = [
  {
    name: 'healthy',
    axes: { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0.4 },
    exact: 0.949805110713276,
  },
  {
    name: 'one zeroed denominator axis',
    axes: { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0 },
    exact: 0.6583525144933101,
  },
  {
    name: 'two zeroed denominator axes',
    axes: { spirit: 0.3, essence: 0.6, matter: 0, substance: 0 },
    exact: 0.5128934190374708,
  },
  {
    name: 'one negative denominator axis',
    axes: { spirit: 0.3, essence: 0.6, matter: -0.5, substance: 0.4 },
    exact: 0.7399512873857882,
  },
]

function positional({ axes: { spirit, essence, matter, substance } }: Case) {
  return [spirit, essence, matter, substance] as const
}

function performance(caseData: Case): PerformanceKalchmResult {
  return evaluatePerformanceKalchm(caseData.axes)
}

describe('AAE Kalchm call paths after consolidation', () => {
  it('delegates every former implementation to the exact canonical behavior', () => {
    for (const caseData of CASES) {
      const positionalAxes = positional(caseData)
      expect(calculateProfileKalchm(caseData.axes), caseData.name).toBe(caseData.exact)
      expect(performance(caseData).value, caseData.name).toBe(caseData.exact)
      expect(performance(caseData).valid, caseData.name).toBe(true)
      expect(deriveKalchm(caseData.axes), caseData.name).toBe(caseData.exact)
      expect(calculateContextCardKalchm(...positionalAxes), caseData.name).toBe(caseData.exact)
      expect(
        AdvancedConstantsCalculator.calculateKalchmSafe(...positionalAxes),
        caseData.name
      ).toBe(caseData.exact)
    }
  })

  it('keeps a missing UI profile absent instead of fabricating equilibrium', () => {
    expect(deriveKalchm(undefined)).toBeNull()
  })
})
