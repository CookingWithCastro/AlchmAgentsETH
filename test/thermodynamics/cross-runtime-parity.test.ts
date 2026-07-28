/**
 * TypeScript half of the cross-runtime thermodynamics contract.
 *
 * Both halves read the SAME file, test/fixtures/kalchm_golden_vectors.json.
 * The Python half is backend/test_thermodynamics.py. Neither transcribes the
 * numbers, so the two runtimes cannot drift apart without one of them going red.
 *
 * Do not "fix" a failure here by editing the fixture. Regenerate it with
 * `bun run generate:kalchm-vectors` only when the engine changed ON PURPOSE,
 * and justify every moved value in review.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KALCHM_EQUILIBRIUM,
  MONICA_EQUILIBRIUM,
  calculateKalchm,
  calculateMonica,
  calculateThermodynamics,
} from '@/lib/thermodynamics/kalchm'

interface KalchmVector {
  name: string
  spirit: number
  essence: number
  matter: number
  substance: number
  energy: number
  reactivity: number
  expectedKalchm: number
  expectedMonica: number | null
}

interface ThermoVector {
  name: string
  spirit: number
  essence: number
  matter: number
  substance: number
  fire: number
  water: number
  air: number
  earth: number
  expectedHeat: number
  expectedEntropy: number
  expectedReactivity: number
  expectedGregsEnergy: number
}

const fixture = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'test/fixtures/kalchm_golden_vectors.json'), 'utf8')
) as {
  constants: Record<string, number>
  vectors: KalchmVector[]
  thermoVectors: ThermoVector[]
}

describe('cross-runtime thermodynamics contract', () => {
  it('pins the constants both runtimes share', () => {
    expect(fixture.constants.KALCHM_EQUILIBRIUM).toBe(KALCHM_EQUILIBRIUM)
    expect(fixture.constants.MONICA_EQUILIBRIUM).toBe(MONICA_EQUILIBRIUM)
    // A zero denominator falls back to 1, NOT to WTEN's 0.01 floor. The two
    // differ by 100x for a non-zero numerator, so this is behaviour, not style.
    expect(fixture.constants.ZERO_DENOMINATOR_FALLBACK).toBe(1)
  })

  it('has vectors to check, so an empty fixture cannot pass silently', () => {
    expect(fixture.vectors.length).toBeGreaterThan(0)
    expect(fixture.thermoVectors.length).toBeGreaterThan(0)
  })

  it.each(fixture.vectors)('Kalchm/Monica: $name', vector => {
    const kalchm = calculateKalchm(vector)
    expect(kalchm).toBe(vector.expectedKalchm)

    const monica = calculateMonica({
      energy: vector.energy,
      reactivity: vector.reactivity,
      kalchm,
    })
    // toBe distinguishes null (ABSENT) from 0 and from any number, which is the
    // whole point of the contract: absence must never read as a value.
    expect(monica).toBe(vector.expectedMonica)
  })

  it.each(fixture.thermoVectors)('thermodynamics: $name', vector => {
    const { heat, entropy, reactivity, gregsEnergy } = calculateThermodynamics(vector)
    expect(heat).toBe(vector.expectedHeat)
    expect(entropy).toBe(vector.expectedEntropy)
    expect(reactivity).toBe(vector.expectedReactivity)
    expect(gregsEnergy).toBe(vector.expectedGregsEnergy)
  })

  it('keeps the two reactivity forms distinguishable', () => {
    // The lost-parens form `num / Matter + Earth^2` equals the canonical
    // `num / (Matter + Earth)^2` ONLY when Earth = 0 and Matter = 1. A suite
    // that tests just that point passes while the formula is wrong, which is
    // exactly how the defect survived. Assert the fixture covers both.
    const coincidence = fixture.thermoVectors.filter(v => v.earth === 0 && v.matter === 1)
    const divergent = fixture.thermoVectors.filter(v => v.earth !== 0 && v.matter !== 0)
    expect(coincidence.length).toBeGreaterThan(0)
    expect(divergent.length).toBeGreaterThan(0)

    for (const v of divergent) {
      const num =
        v.spirit ** 2 + v.substance ** 2 + v.essence ** 2 + v.fire ** 2 + v.air ** 2 + v.water ** 2
      const lostParens = num / v.matter + v.earth ** 2
      expect(v.expectedReactivity).not.toBe(lostParens)
    }
  })

  it('records that no near-equilibrium band is applied', () => {
    // AAE's |ln K| population is a continuum, not a bimodal gap, so no band is
    // derivable and none is applied — the near-singular value is left visible
    // rather than swallowed. Partial charts, the only way to reach it, are
    // rejected at the API boundary instead. If a band is ever added, this test
    // must fail so the decision is made deliberately.
    const nearDegenerate = calculateMonica({
      energy: 1,
      reactivity: 1,
      kalchm: calculateKalchm({ spirit: 1, essence: 1.00002, matter: 1, substance: 1 }),
    })
    expect(nearDegenerate).not.toBe(MONICA_EQUILIBRIUM)
    expect(nearDegenerate).toBeCloseTo(-49999.5, 1)

    // Exact equilibrium still resolves to the shared constant.
    expect(calculateMonica({ energy: 1, reactivity: 1, kalchm: 1 })).toBe(MONICA_EQUILIBRIUM)
  })
})
