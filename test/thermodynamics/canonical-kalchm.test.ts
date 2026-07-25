import { describe, expect, it } from 'vitest'
import { calculateKalchm, calculateMonica, MONICA_EQUILIBRIUM } from '@/lib/thermodynamics/kalchm'

describe('canonical Kalchm', () => {
  it.each([
    ['healthy axes', { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0.4 }, 0.949805110713276],
    [
      'one zeroed denominator axis',
      { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0 },
      0.6583525144933101,
    ],
    [
      'two zeroed denominator axes',
      { spirit: 0.3, essence: 0.6, matter: 0, substance: 0 },
      0.5128934190374708,
    ],
    [
      'one negative denominator axis',
      { spirit: 0.3, essence: 0.6, matter: -0.5, substance: 0.4 },
      0.7399512873857882,
    ],
    ['all zero axes', { spirit: 0, essence: 0, matter: 0, substance: 0 }, 1],
  ])('returns the exact defined value for %s', (_name, axes, expected) => {
    expect(calculateKalchm(axes)).toBe(expected)
  })

  it('keeps the totality contract for non-finite input', () => {
    expect(
      calculateKalchm({
        spirit: Number.NaN,
        essence: Number.POSITIVE_INFINITY,
        matter: 1,
        substance: 1,
      })
    ).toBe(1)
  })
})

describe('canonical thermodynamic Monica constant', () => {
  it('evaluates the thermodynamic formula without clamping its sign', () => {
    expect(
      calculateMonica({
        energy: 2,
        reactivity: 0.5,
        kalchm: Math.E,
      })
    ).toBe(-4)
  })

  it.each([
    ['zero reactivity', { energy: 2, reactivity: 0, kalchm: Math.E }],
    ['non-positive Kalchm', { energy: 2, reactivity: 0.5, kalchm: 0 }],
    ['non-finite input', { energy: Number.NaN, reactivity: 0.5, kalchm: Math.E }],
  ])('keeps malformed %s input absent', (_name, input) => {
    expect(calculateMonica(input)).toBeNull()
  })

  it('returns the equilibrium constant only for exact Kalchm equilibrium', () => {
    expect(calculateMonica({ energy: 2, reactivity: 0.5, kalchm: 1 })).toBe(MONICA_EQUILIBRIUM)
  })
})
