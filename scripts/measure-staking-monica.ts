/**
 * Read-only comparison of the staking Monica mappings.
 *
 * Prints aggregate statistics only. It never prints chart/user identifiers and
 * performs no writes. The database population is the one named by staking's own
 * NatalAffinity contract: user_natal_charts.
 *
 * Usage: bun run scripts/measure-staking-monica.ts
 */
import { createHash } from 'node:crypto'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'

config({ path: '.env.local' })
config()

interface PopulationValue {
  value: number
  signature?: string
}

function quantile(sorted: number[], probability: number): number | null {
  if (sorted.length === 0) return null
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function summarize(label: string, population: PopulationValue[]) {
  const values = population
    .map(row => row.value)
    .filter((value): value is number => Number.isFinite(value))
    .sort((a, b) => a - b)
  if (values.length === 0) return { label, basis: 'ABSENT', count: 0 }

  const extremum = values.reduce((best, value) => (Math.abs(value) > Math.abs(best) ? value : best))
  const scale = Math.abs(extremum) / 2
  const current = values.map(value => Math.max(0, Math.min(1, value)) * 0.5)
  const proposed =
    scale === 0 ? values.map(() => 0) : values.map(value => Math.tanh(value / scale) * 0.5)
  const extremumRows = population.filter(row => row.value === extremum)
  const signatureCounts = new Map<string, number>()
  for (const row of population) {
    if (!row.signature) continue
    signatureCounts.set(row.signature, (signatureCounts.get(row.signature) ?? 0) + 1)
  }

  return {
    label,
    basis: 'MEASURED',
    count: values.length,
    raw: {
      min: values[0],
      q1: quantile(values, 0.25),
      median: quantile(values, 0.5),
      q3: quantile(values, 0.75),
      max: values[values.length - 1],
      negativeCount: values.filter(value => value < 0).length,
      zeroCount: values.filter(value => value === 0).length,
      aboveOneCount: values.filter(value => value > 1).length,
    },
    currentClampContribution: {
      min: Math.min(...current),
      max: Math.max(...current),
      pinnedBottomCount: values.filter(value => value <= 0).length,
      pinnedTopCount: values.filter(value => value >= 1).length,
    },
    proposedTanhContribution: {
      scaleBasis: 'DERIVED as abs(extremum) / 2; requires extremum provenance approval',
      scale,
      min: Math.min(...proposed),
      max: Math.max(...proposed),
    },
    extremumAudit: {
      value: extremum,
      rowsWithSameValue: extremumRows.length,
      duplicateChartSignatureCount: Math.max(
        0,
        ...extremumRows.map(row =>
          row.signature ? (signatureCounts.get(row.signature) ?? 1) - 1 : 0
        )
      ),
    },
  }
}

const repositoryPopulation: PopulationValue[] = HISTORICAL_AGENTS.map(agent => ({
  value: agent.consciousness.monicaConstant,
  signature: createHash('sha256')
    .update(JSON.stringify(agent.consciousness.natalChart))
    .digest('hex'),
}))

const output: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  repositoryHistoricalAgents: summarize('repository historical agents', repositoryPopulation),
  stakingWiring: {
    basis: 'MEASURED from app/(app)/pentacles/pentacles-client.tsx',
    sendsMonicaConstant: false,
    note: 'The current Pentacles UI constructs NatalAffinity with dominantElement only.',
  },
}

const prisma = new PrismaClient()
try {
  const charts = await prisma.user_natal_charts.findMany({
    select: {
      monicaConstant: true,
      birthDate: true,
      planets: true,
    },
  })
  const databasePopulation: PopulationValue[] = charts.map(chart => ({
    value: chart.monicaConstant,
    signature: createHash('sha256')
      .update(`${chart.birthDate.toISOString()}|${JSON.stringify(chart.planets)}`)
      .digest('hex'),
  }))
  output.userNatalCharts = summarize('user_natal_charts', databasePopulation)
} catch (error) {
  output.userNatalCharts = {
    basis: 'ABSENT',
    count: null,
    reason: error instanceof Error ? error.message.split('\n')[0] : 'database query failed',
  }
} finally {
  await prisma.$disconnect()
}

console.log(JSON.stringify(output, null, 2))
