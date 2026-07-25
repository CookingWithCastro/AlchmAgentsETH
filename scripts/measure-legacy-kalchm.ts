/**
 * Re-run the pre-consolidation characterization against the immutable source
 * that was present when this work began. The temporary export statements only
 * expose private module functions; they do not replace or restate formulas.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const LEGACY_REF = 'c3151e9e843cface2e872824f690aa46fe64680e'
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'aae-kalchm-legacy-'))

const generatedTest = `
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { __legacyDeriveKalchm as adapter } from '@/components/cosmic-agents/agent-adapter'
import { AgentPerformanceOptimizer } from '@/lib/agent-performance-optimizer'
import {
  calculateKalchm as profile,
  HISTORICAL_ALCHEMICAL_PROFILES,
} from '@/lib/agents/alchemical-profiles'
import { __legacyComputeKalchm as contextCard } from '@/lib/context-card/from-natal-chart'
import { AdvancedConstantsCalculator } from '@/lib/core-energy-rules'

const cases = [
  {
    name: 'healthy',
    axes: { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0.4 },
    adapter: 0.95,
    contextCard: 0.95,
    profile: 0.949805110713276,
    optimizer: 0.949805110713276,
    core: 0.949805110713276,
  },
  {
    name: 'one denominator zero',
    axes: { spirit: 0.3, essence: 0.6, matter: 0.7, substance: 0 },
    adapter: 1,
    contextCard: 0.66,
    profile: 0.6583525144933101,
    optimizer: 0.6583525144933101,
    core: 0.6583525160092228,
  },
  {
    name: 'two denominator zeros',
    axes: { spirit: 0.3, essence: 0.6, matter: 0, substance: 0 },
    adapter: 1,
    contextCard: 0.51,
    profile: 0.5128934190374708,
    optimizer: 0.5128934190374708,
    core: 0.5128934213994323,
  },
  {
    name: 'negative matter',
    axes: { spirit: 0.3, essence: 0.6, matter: -0.5, substance: 0.4 },
    adapter: Number.NaN,
    contextCard: 1,
    profile: 1,
    optimizer: 1,
    core: -1.0464491461164132,
  },
] as const

describe('immutable pre-consolidation Kalchm characterization', () => {
  it('measures the real implementations at the recorded fixed point', () => {
    const optimizerClass = AgentPerformanceOptimizer as any
    const observed = []

    for (const sample of cases) {
      HISTORICAL_ALCHEMICAL_PROFILES.__characterization_control__ = sample.axes
      optimizerClass.kalchmCache.clear()
      optimizerClass.getAgentAlchemicalProperties = () => sample.axes

      const values = {
        adapter: adapter(sample.axes),
        contextCard: contextCard(
          sample.axes.spirit,
          sample.axes.essence,
          sample.axes.matter,
          sample.axes.substance
        ),
        profile: profile('__characterization_control__'),
        optimizer: optimizerClass.getKalchmValue(sample.name),
        core: AdvancedConstantsCalculator.calculateKalchmSafe(
          sample.axes.spirit,
          sample.axes.essence,
          sample.axes.matter,
          sample.axes.substance
        ),
      }
      observed.push({ name: sample.name, ...values })

      for (const implementation of [
        'adapter',
        'contextCard',
        'profile',
        'optimizer',
        'core',
      ] as const) {
        const expected = sample[implementation]
        if (Number.isNaN(expected)) expect(values[implementation]).toBeNaN()
        else expect(values[implementation]).toBe(expected)
      }
    }

    console.log('LEGACY_KALCHM_MEASUREMENT=' + JSON.stringify(observed))
  })
})
`

function appendExport(relativePath: string, statement: string) {
  fs.appendFileSync(path.join(sandbox, relativePath), `\n${statement}\n`)
}

try {
  const archive = execFileSync('git', ['archive', '--format=tar', LEGACY_REF], {
    cwd: ROOT,
    maxBuffer: 1024 * 1024 * 512,
  })
  const unpack = spawnSync('tar', ['-xf', '-', '-C', sandbox], {
    input: archive,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (unpack.status !== 0) process.exit(unpack.status ?? 1)

  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(sandbox, 'node_modules'), 'dir')
  appendExport(
    'components/cosmic-agents/agent-adapter.ts',
    'export { deriveKalchm as __legacyDeriveKalchm }'
  )
  appendExport(
    'lib/context-card/from-natal-chart.ts',
    'export { computeKalchm as __legacyComputeKalchm }'
  )

  const testPath = path.join(
    sandbox,
    'test/thermodynamics/legacy-characterization.generated.test.ts'
  )
  fs.mkdirSync(path.dirname(testPath), { recursive: true })
  fs.writeFileSync(testPath, generatedTest)

  console.log(`Measuring immutable pre-change source at ${LEGACY_REF}`)
  const run = spawnSync(
    'bun',
    [
      path.join(ROOT, 'node_modules/vitest/vitest.mjs'),
      'run',
      'test/thermodynamics/legacy-characterization.generated.test.ts',
      '--config',
      'vitest.unit.config.ts',
    ],
    { cwd: sandbox, stdio: 'inherit' }
  )
  process.exitCode = run.status ?? 1
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true })
}
