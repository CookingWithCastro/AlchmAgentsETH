import { describe, it, expect } from 'vitest'
import {
  computeReactionCircuit,
  aggregateIngredientsToReaction,
  planToCircuit,
  getDeterministicCircuitReading,
  type CircuitReading,
} from '../lib/recipe-circuit'
import { toBaseVolume } from '../lib/ingredient-catalog'

const ALL_NUMERIC_FIELDS: (keyof CircuitReading)[] = [
  'heat',
  'entropy',
  'reactivity',
  'gregsEnergy',
  'kalchm',
  'monica',
  'charge',
  'emf',
  'voltage',
  'conductance',
  'resistance',
  'current',
  'capacitance',
  'inductance',
  'reactance',
  'impedance',
  'phaseDeg',
  'power',
  'dissipationFactor',
]

describe('computeReactionCircuit', () => {
  it('computes the circuit quantities for a known reaction (matches hand calc)', () => {
    // spirit=2, essence=1, matter=2, substance=1, fire=3, water=1, air=1, earth=1
    const r = getDeterministicCircuitReading(2, 1, 2, 1, 3, 1, 1, 1)

    expect(r.heat).toBeCloseTo(13 / 49, 5) // 0.265306
    expect(r.entropy).toBeCloseTo(0.6, 5)
    expect(r.reactivity).toBeCloseTo(17 / 9, 5) // 1.88889
    expect(r.gregsEnergy).toBeCloseTo(13 / 49 - 0.6 * (17 / 9), 5) // -0.868027

    expect(r.charge).toBe(3) // matter + substance
    expect(r.voltage).toBeCloseTo(r.gregsEnergy / 3, 5)
    expect(r.conductance).toBeCloseTo(17 / 9, 5)
    expect(r.resistance).toBeCloseTo(9 / 17, 5) // 1/reactivity
    // Ohm's law: I = V / R = V × reactivity
    expect(r.current).toBeCloseTo(r.voltage * r.reactivity, 5)
    expect(r.capacitance).toBeCloseTo(3 / r.voltage, 5)
    expect(r.inductance).toBeCloseTo(3.5, 5) // max(1, matter + earth + substance/2)
    expect(r.reactance).toBeCloseTo(0.6 * (17 / 9), 5)
    expect(r.power).toBeCloseTo(r.current * r.voltage, 5)
    expect(r.impedance).toBeCloseTo(
      Math.sqrt(r.resistance * r.resistance + r.reactance * r.reactance),
      5
    )
    // φ ≈ 65° here → reactance dominates → capacitor role
    expect(r.phaseDeg).toBeGreaterThan(45)
    expect(r.role).toBe('capacitor')
  })

  it('computes a finite Monica when ln(kalchm) is defined', () => {
    // spirit=3, essence=2, matter=1, substance=1 → kalchm = (27×4)/(1×1) = 108
    const r = getDeterministicCircuitReading(3, 2, 1, 1, 2, 1, 1, 1)
    expect(r.kalchm).toBeCloseTo(108, 4)
    const expectedMonica = -r.gregsEnergy / (r.reactivity * Math.log(108))
    expect(r.monica).toBeCloseTo(expectedMonica, 5)
    expect(Number.isFinite(r.monica)).toBe(true)
  })

  it('falls back Monica to 0 when ln(kalchm) is undefined (kalchm = 1)', () => {
    // spirit=2, essence=1, matter=2, substance=1 → kalchm = 4/4 = 1 → ln(1)=0 → guarded
    const r = getDeterministicCircuitReading(2, 1, 2, 1, 3, 1, 1, 1)
    expect(r.kalchm).toBeCloseTo(1, 6)
    expect(r.monica).toBe(0)
  })

  it('guards a zero-charge reaction (no Matter/Substance → V=0, I=0)', () => {
    const r = getDeterministicCircuitReading(0, 0, 0, 0, 1, 0, 0, 0)
    expect(r.charge).toBe(0)
    expect(r.voltage).toBe(0)
    expect(r.current).toBe(0)
    expect(r.capacitance).toBe(0)
  })

  it('guards a zero-reactivity reaction as an open circuit (very high R)', () => {
    // matter+earth = 0 → reactivity denominator 0 → reactivity 0 → open circuit
    const r = getDeterministicCircuitReading(0, 0, 0, 0, 1, 0, 0, 0)
    expect(r.reactivity).toBe(0)
    expect(r.resistance).toBeGreaterThan(1e8)
    expect(r.current).toBe(0)
  })

  it('never emits NaN or Infinity across many random reactions', () => {
    for (let i = 0; i < 200; i++) {
      // deterministic pseudo-spread (no Math.random) over a wide range incl. zeros
      const v = (k: number) => ((i * 7 + k * 13) % 11) / 2 // 0 .. 5
      const r = getDeterministicCircuitReading(v(0), v(1), v(2), v(3), v(4), v(5), v(6), v(7))
      for (const field of ALL_NUMERIC_FIELDS) {
        expect(Number.isFinite(r[field] as number), `${field} finite for sample ${i}`).toBe(true)
      }
    }
  })
})

describe('aggregateIngredientsToReaction', () => {
  it('weights each ingredient by its volume', () => {
    // water catalog entry: elemental water=1.0/cup, essence=0.4/cup; everything else ~0
    const reaction = aggregateIngredientsToReaction([
      { ingredient: 'water', quantity: 2, unit: 'cup' },
    ])
    expect(reaction.elemental.water).toBeCloseTo(2.0, 3)
    expect(reaction.elemental.fire).toBeCloseTo(0, 6)
    expect(reaction.alchemical.essence).toBeCloseTo(0.8, 3)
  })

  it('scales tablespoons relative to cups (16 tbsp ≈ 1 cup)', () => {
    expect(toBaseVolume(16, 'tbsp')).toBeCloseTo(1, 2)
    expect(toBaseVolume(3, 'cup')).toBeCloseTo(3, 6)
    const oneCup = aggregateIngredientsToReaction([
      { ingredient: 'stock', quantity: 1, unit: 'cup' },
    ])
    const sixteenTbsp = aggregateIngredientsToReaction([
      { ingredient: 'stock', quantity: 16, unit: 'tbsp' },
    ])
    expect(sixteenTbsp.elemental.water).toBeCloseTo(oneCup.elemental.water, 2)
  })

  it('falls back to a neutral generic profile for unknown ingredients', () => {
    const reaction = aggregateIngredientsToReaction([
      { ingredient: 'pixie dust 9000', quantity: 1, unit: 'cup' },
    ])
    // generic = A(0.2,0.2,0.3,0.3) / E(0.25 each)
    expect(reaction.elemental.fire).toBeCloseTo(0.25, 3)
    expect(reaction.alchemical.matter).toBeCloseTo(0.3, 3)
  })

  it('ignores zero/negative quantities', () => {
    const reaction = aggregateIngredientsToReaction([
      { ingredient: 'water', quantity: 0, unit: 'cup' },
      { ingredient: 'beef', quantity: -5, unit: 'cup' },
    ])
    expect(reaction.elemental.water).toBe(0)
    expect(reaction.alchemical.matter).toBe(0)
  })
})

describe('planToCircuit', () => {
  it('wires stages into a series circuit and assigns source + load roles', () => {
    const { perStage, series } = planToCircuit([
      {
        name: 'Sear',
        ingredients: [
          { ingredient: 'olive oil', quantity: 0.25, unit: 'cup' },
          { ingredient: 'beef', quantity: 4, unit: 'cup' },
          { ingredient: 'onion', quantity: 2, unit: 'cup' },
        ],
      },
      {
        name: 'Braise',
        ingredients: [
          { ingredient: 'stock', quantity: 6, unit: 'cup' },
          { ingredient: 'tomato', quantity: 3, unit: 'cup' },
          { ingredient: 'carrot', quantity: 2, unit: 'cup' },
        ],
      },
    ])

    expect(perStage).toHaveLength(2)
    expect(perStage[0].name).toBe('Sear')
    const roles = perStage.map(s => s.role)
    expect(roles).toContain('source')
    expect(roles).toContain('load')

    expect(series.stageCount).toBe(2)
    expect(Number.isFinite(series.seriesCurrent)).toBe(true)
    expect(Number.isFinite(series.totalImpedance)).toBe(true)
    expect(Number.isFinite(series.netKalchm)).toBe(true)
    expect(series.totalCharge).toBeCloseTo(perStage[0].charge + perStage[1].charge, 6)
    expect(series.totalResistance).toBeGreaterThan(0)
  })

  it('handles an empty plan without throwing', () => {
    const { perStage, series } = planToCircuit([])
    expect(perStage).toHaveLength(0)
    expect(series.stageCount).toBe(0)
    expect(series.seriesCurrent).toBe(0)
    expect(series.netKalchm).toBe(1)
  })
})
