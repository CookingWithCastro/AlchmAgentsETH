import { describe, expect, it, vi } from 'vitest'

vi.mock('../../backend/src/utils/logger.js', () => ({
  logger: { error: vi.fn() },
}))

import { calculateMC } from '@/backend/src/services/monica-constant-service'
import { userChartToCouncilAgent } from '@/components/cosmic-agents/agent-adapter'
import {
  averageFiniteMonica,
  finiteMonica,
  formatMonica,
  sumFiniteMonica,
} from '@/lib/monica/nullable'

describe('legacy backend Monica absence handling', () => {
  it('returns a computed result for finite inputs', () => {
    const result = calculateMC({
      spirit: 0.4,
      essence: 0.3,
      matter: 0.2,
      substance: 0.1,
    })

    expect(result).not.toBeNull()
    expect(Number.isFinite(result?.value)).toBe(true)
  })

  it('returns null instead of a fabricated phi result for invalid inputs', () => {
    expect(
      calculateMC({
        spirit: Number.NaN,
        essence: 0.3,
        matter: 0.2,
        substance: 0.1,
      })
    ).toBeNull()
  })
})

describe('shared nullable Monica contract', () => {
  it('preserves finite zero and rejects non-finite or non-numeric values', () => {
    expect(finiteMonica(0)).toBe(0)
    expect(finiteMonica(Number.NaN)).toBeNull()
    expect(finiteMonica('1.618')).toBeNull()
  })

  it('aggregates only measured values and keeps an empty population absent', () => {
    expect(averageFiniteMonica([0, 2, null, Number.NaN])).toBe(1)
    expect(sumFiniteMonica([0, 2, null, Number.NaN])).toBe(2)
    expect(averageFiniteMonica([null, Number.NaN])).toBeNull()
    expect(sumFiniteMonica([null, Number.NaN])).toBeNull()
  })

  it('formats absence explicitly', () => {
    expect(formatMonica(null, 2)).toBe('not computed')
    expect(formatMonica(0, 2)).toBe('0.00')
  })
})

describe('council agent thermodynamic absence', () => {
  it('does not invent ESMS, Monica, or Kalchm from planetary positions', () => {
    const agent = userChartToCouncilAgent({
      name: 'Test User',
      positions: [{ planet: 'Sun', sign: 'Aries', degree: 12 }],
    })

    expect(agent?.esms).toBeNull()
    expect(agent?.monicaConstant).toBeNull()
    expect(agent?.kalchm).toBeNull()
  })
})
