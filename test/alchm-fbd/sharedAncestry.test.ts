import { describe, expect, test } from 'vitest'
import {
  PLANETARY_SECTARIAN_ESMS,
  PLANETARY_SECTARIAN_ELEMENTS,
} from '@/lib/alchm-fbd/planetaryAlchemyMapping'
import { planetInfo as localPlanets } from '@/lib/planets'

/**
 * Drift tripwire between this repo's own `lib/planets/*.ts` data and the
 * vendored FBD engine's tables.
 *
 * The two share an ancestor: every planet file here carries an `Alchemy` block
 * and a Diurnal/Nocturnal Element pair that currently match the engine exactly.
 * That agreement is load-bearing — it is the reason the FBD cards and the rest
 * of this app describe the same sky. Nothing enforces it at runtime, so the day
 * someone edits a planet file (or the vendored engine is re-synced from
 * upstream), this test goes red instead of the two silently diverging.
 *
 * If this fails, do NOT "fix" it by editing whichever side is convenient.
 * Decide which is authoritative first — per the port's ruling, the engine's
 * ESMS axioms win, because the free-body diagram is only meaningful under them
 * (ESMS from planet identity × sect, never derived from elements).
 */

const TEN_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const

type PlanetRecord = {
  Alchemy?: { Spirit: number; Essence: number; Matter: number; Substance: number }
  'Diurnal Element'?: string
  'Nocturnal Element'?: string
}

const local = localPlanets as unknown as Record<string, PlanetRecord>

describe('shared ancestry: lib/planets vs vendored FBD engine', () => {
  test.each(TEN_PLANETS)('%s — Alchemy block matches the engine ESMS table', name => {
    const mine = local[name]?.Alchemy
    const engine = PLANETARY_SECTARIAN_ESMS[name as keyof typeof PLANETARY_SECTARIAN_ESMS]
    expect(mine, `lib/planets/${name.toLowerCase()}.ts has no Alchemy block`).toBeDefined()
    expect(engine, `engine has no sect ESMS entry for ${name}`).toBeDefined()

    // The two encode the same fact differently, and the relationship is
    // elementwise MAX, not equality and not sum:
    //
    //   local `Alchemy`  = which axes this planet can contribute to at all
    //   engine diurnal/nocturnal = which one it actually contributes per sect
    //
    // e.g. Moon local {Essence:1, Matter:1} = max(diurnal {Essence:1},
    // nocturnal {Matter:1}). Sum would be wrong for the Sun, which is
    // {Spirit:1} in BOTH sects — summing would claim Spirit:2.
    const axes = ['Spirit', 'Essence', 'Matter', 'Substance'] as const
    const expected = Object.fromEntries(
      axes.map(axis => [
        axis,
        Math.max(
          engine.diurnal[axis as keyof typeof engine.diurnal],
          engine.nocturnal[axis as keyof typeof engine.nocturnal]
        ),
      ])
    )
    expect(mine, `${name}: local Alchemy should equal elementwise max(diurnal, nocturnal)`).toEqual(
      expected
    )
  })

  test.each(TEN_PLANETS)('%s — sect elements match the engine', name => {
    const mine = local[name]
    const engine = PLANETARY_SECTARIAN_ELEMENTS[name as keyof typeof PLANETARY_SECTARIAN_ELEMENTS]
    expect(engine, `engine has no sect element entry for ${name}`).toBeDefined()
    expect(mine?.['Diurnal Element'], `${name} diurnal element`).toBe(engine.diurnal)
    expect(mine?.['Nocturnal Element'], `${name} nocturnal element`).toBe(engine.nocturnal)
  })

  test('the engine keeps its Ascendant grounding entry', () => {
    // Only PLANETARY_SECTARIAN_ESMS carries Ascendant, and only it feeds the
    // FBD path. Its near-duplicate sibling table does not. Losing this entry
    // compiles cleanly and silently drops the day chart's Matter/Substance
    // floor — the failure has no other detector.
    expect(PLANETARY_SECTARIAN_ESMS).toHaveProperty('Ascendant')
  })
})
