/**
 * Regenerate the shared cross-runtime golden vectors.
 *
 * Usage:
 *   bun run scripts/generate-kalchm-golden-vectors.ts
 *
 * Every expected value is COMPUTED by the canonical TypeScript engine, never
 * typed by hand — hand-transcribed expectations are how a golden file ends up
 * pinning the bug it was meant to catch. Run this whenever the canonical engine
 * changes on purpose, and read the diff: any moved value is a behaviour change
 * that needs justifying, not a number to wave through.
 *
 * The Python half reads the same file (backend/test_thermodynamics.py), so the
 * two runtimes cannot drift without a test going red.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  KALCHM_EQUILIBRIUM,
  MONICA_EQUILIBRIUM,
  calculateKalchm,
  calculateMonica,
  calculateThermodynamics,
} from '../lib/thermodynamics/kalchm'

const OUT = path.join(process.cwd(), 'test/fixtures/kalchm_golden_vectors.json')

/** Kalchm/Monica cases, chosen for the regimes where runtimes actually diverged. */
const KALCHM_CASES: Array<{
  name: string
  spirit: number
  essence: number
  matter: number
  substance: number
  energy: number
  reactivity: number
}> = [
  {
    name: 'healthy - all axes positive',
    spirit: 0.3,
    essence: 0.6,
    matter: 0.7,
    substance: 0.4,
    energy: -1.5018,
    reactivity: 6.326,
  },
  {
    name: 'healthy - second independent point',
    spirit: 4,
    essence: 3,
    matter: 2,
    substance: 1,
    energy: -2.0403,
    reactivity: 5.32,
  },
  {
    name: 'one zeroed axis (Substance) - 0**0 is exactly 1, no floor needed',
    spirit: 0.3,
    essence: 0.6,
    matter: 0.7,
    substance: 0,
    energy: -1.5018,
    reactivity: 6.326,
  },
  {
    name: 'two zeroed axes (Matter and Substance)',
    spirit: 0.3,
    essence: 0.6,
    matter: 0,
    substance: 0,
    energy: -1.5018,
    reactivity: 6.326,
  },
  {
    name: 'all four axes zero - Kalchm is exactly 1, DEGENERATE, Monica is equilibrium',
    spirit: 0,
    essence: 0,
    matter: 0,
    substance: 0,
    energy: 0,
    reactivity: 0,
  },
  {
    name: 'balanced non-zero axes - Kalchm exactly 1, still DEGENERATE',
    spirit: 1.3,
    essence: 1.3,
    matter: 1.3,
    substance: 1.3,
    energy: -1,
    reactivity: 4,
  },
  {
    name: 'negative Matter - JS yields NaN, Python yields a COMPLEX number; both must clamp to 0',
    spirit: 0.3,
    essence: 0.6,
    matter: -0.5,
    substance: 0.4,
    energy: -1.5018,
    reactivity: 6.326,
  },
  {
    name: 'all four axes negative - clamps to the all-zero degenerate case',
    spirit: -0.5,
    essence: -2,
    matter: -1,
    substance: -0.5,
    energy: -1,
    reactivity: 3,
  },
  {
    name: 'NEAR-degenerate - deliberately NOT special-cased; AAE applies no band',
    spirit: 1,
    essence: 1.00002,
    matter: 1,
    substance: 1,
    energy: 1,
    reactivity: 1,
  },
  {
    name: 'healthy Kalchm with exactly zero reactivity - Monica is ABSENT, not a sentinel',
    spirit: 4,
    essence: 3,
    matter: 2,
    substance: 1,
    energy: -2.0403,
    reactivity: 0,
  },
]

/**
 * Thermodynamic cases. `Earth non-zero` and `Matter = 1, Earth = 0` are the
 * pair that matters: reactivity's correct and lost-parens forms COINCIDE at the
 * second one, so a suite containing only that case passes while the formula is
 * wrong. That is precisely how the defect survived.
 */
const THERMO_CASES: Array<{
  name: string
  spirit: number
  essence: number
  matter: number
  substance: number
  fire: number
  water: number
  air: number
  earth: number
}> = [
  {
    name: 'healthy, Earth non-zero - where the lost-parens reactivity bug shows',
    spirit: 4,
    essence: 3,
    matter: 2,
    substance: 1,
    fire: 2,
    water: 1,
    air: 1.5,
    earth: 0.5,
  },
  {
    name: 'Matter = 1, Earth = 0 - the COINCIDENCE point; correct and buggy forms agree here',
    spirit: 4,
    essence: 3,
    matter: 1,
    substance: 1,
    fire: 2,
    water: 1,
    air: 1.5,
    earth: 0,
  },
  {
    name: 'Matter + Earth = 0 - the zero-denominator convention is load-bearing',
    spirit: 4,
    essence: 3,
    matter: 0,
    substance: 1,
    fire: 2,
    water: 1,
    air: 1.5,
    earth: 0,
  },
  {
    name: 'Essence non-zero - where the missing-Essence entropy bug shows',
    spirit: 2.3350306237,
    essence: 4.8425751978,
    matter: 3.7395648213,
    substance: 1.1769853687,
    fire: 2,
    water: 4,
    air: 2.4,
    earth: 1.6,
  },
  {
    name: 'all axes zero - every denominator falls back to 1',
    spirit: 0,
    essence: 0,
    matter: 0,
    substance: 0,
    fire: 0,
    water: 0,
    air: 0,
    earth: 0,
  },
]

const vectors = KALCHM_CASES.map(c => {
  const kalchm = calculateKalchm(c)
  return {
    ...c,
    expectedKalchm: kalchm,
    // null encodes ABSENT and must round-trip through both JSON parsers as null.
    expectedMonica: calculateMonica({ energy: c.energy, reactivity: c.reactivity, kalchm }),
  }
})

const thermoVectors = THERMO_CASES.map(c => {
  const { heat, entropy, reactivity, gregsEnergy } = calculateThermodynamics(c)
  return {
    ...c,
    expectedHeat: heat,
    expectedEntropy: entropy,
    expectedReactivity: reactivity,
    expectedGregsEnergy: gregsEnergy,
  }
})

const payload = {
  _comment: [
    'SHARED golden vectors for the AAE thermodynamics engine. Read by BOTH runtimes:',
    '  TypeScript  test/thermodynamics/cross-runtime-parity.test.ts',
    '  Python      backend/test_thermodynamics.py',
    '',
    'This file is the contract. There is one engine per runtime, and the only thing',
    'keeping them from drifting apart is that both must reproduce every vector below.',
    '',
    'GENERATED — do not hand-edit. Run: bun run generate:kalchm-vectors',
    'Expected values are computed by the canonical TypeScript implementation',
    '(lib/thermodynamics/kalchm.ts). Hand-transcribing them is how a golden file',
    'ends up pinning the very bug it exists to catch.',
    '',
    'null in expectedMonica means ABSENT, and is never interchangeable with a number.',
    '',
    'AAE applies NO near-equilibrium band: its |ln K| population is a continuum, not',
    'a bimodal gap, so no band is derivable. See the calculateMonica docstring.',
    'AAE floors a zero denominator to 1 (NOT 0.01); the two differ by 100x.',
  ],
  constants: { KALCHM_EQUILIBRIUM, MONICA_EQUILIBRIUM, ZERO_DENOMINATOR_FALLBACK: 1 },
  vectors,
  thermoVectors,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
console.log(
  `✓ wrote ${vectors.length} Kalchm/Monica and ${thermoVectors.length} thermodynamic vectors to ${path.relative(process.cwd(), OUT)}`
)
