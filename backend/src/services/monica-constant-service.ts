import { logger } from '../utils/logger.js'
import { AlchemicalElements } from './alchemizer-service.js'

const GOLDEN_RATIO = 1.618033988749895

export interface MonicaConstantResult {
  value: number
  components: {
    baseGoldenRatio: number
    elementalBalance: number
    totalWeight: number
    consciousnessLevel: number
  }
  interpretation: string
}

/**
 * Calculates the Monica Constant (MC)
 * MC = φ * (1 + (E/T)) * (1 + (C/10))
 * Where:
 * φ = Golden Ratio (1.618)
 * E = Elemental Balance
 * T = Total Elemental Weight
 * C = Consciousness Level
 */
export function calculateMC(
  alchemicalElements: AlchemicalElements,
  consciousnessLevel: number = 1
): MonicaConstantResult | null {
  try {
    // Extract elemental values
    const { spirit, essence, matter, substance } = alchemicalElements

    // Calculate total elemental weight (T)
    const totalWeight = spirit + essence + matter + substance

    // Calculate elemental balance (E)
    // Balance is higher when elements are more evenly distributed
    const mean = totalWeight / 4
    const variance =
      [spirit, essence, matter, substance].reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      4
    const standardDeviation = Math.sqrt(variance)

    // Convert standard deviation to balance score (0-1, where 1 is perfect balance)
    const maxPossibleStd = 0.5 // Maximum std dev is 0.5 when one element is 1 and others are 0
    const elementalBalance = Math.max(0, 1 - standardDeviation / maxPossibleStd)

    // Apply Monica Constant formula
    const elementalFactor = totalWeight > 0 ? 1 + elementalBalance / totalWeight : 1
    const consciousnessFactor = 1 + consciousnessLevel / 10
    const monicaConstant = GOLDEN_RATIO * elementalFactor * consciousnessFactor
    if (
      !Number.isFinite(monicaConstant) ||
      !Number.isFinite(elementalBalance) ||
      !Number.isFinite(totalWeight)
    ) {
      return null
    }

    // Generate interpretation
    const interpretation = generateInterpretation(
      monicaConstant,
      elementalBalance,
      consciousnessLevel
    )

    return {
      value: Math.round(monicaConstant * 1000) / 1000,
      components: {
        baseGoldenRatio: GOLDEN_RATIO,
        elementalBalance: Math.round(elementalBalance * 1000) / 1000,
        totalWeight: Math.round(totalWeight * 1000) / 1000,
        consciousnessLevel,
      },
      interpretation,
    }
  } catch (error) {
    logger.error('Error calculating Monica Constant:', error)
    return null
  }
}

/**
 * Calculate Monica Constant evolution between two states
 */
export function calculateMCEvolution(
  birthMC: MonicaConstantResult,
  currentMC: MonicaConstantResult
): {
  change: number
  percentageChange: number
  trend: 'ascending' | 'stable' | 'descending'
  momentum: 'accelerating' | 'steady' | 'decelerating'
} {
  const change = currentMC.value - birthMC.value
  const percentageChange = (change / birthMC.value) * 100

  // Determine trend
  let trend: 'ascending' | 'stable' | 'descending'
  if (Math.abs(change) < 0.01) trend = 'stable'
  else if (change > 0) trend = 'ascending'
  else trend = 'descending'

  // Determine momentum based on components
  let momentum: 'accelerating' | 'steady' | 'decelerating'
  const balanceChange = currentMC.components.elementalBalance - birthMC.components.elementalBalance
  const consciousnessChange =
    currentMC.components.consciousnessLevel - birthMC.components.consciousnessLevel

  if (balanceChange > 0.1 || consciousnessChange > 1) momentum = 'accelerating'
  else if (balanceChange < -0.1 || consciousnessChange < -1) momentum = 'decelerating'
  else momentum = 'steady'

  return {
    change: Math.round(change * 1000) / 1000,
    percentageChange: Math.round(percentageChange * 100) / 100,
    trend,
    momentum,
  }
}

function generateInterpretation(mc: number, balance: number, consciousness: number): string {
  let interpretation = ''

  // MC level interpretation
  if (mc > 3.0) {
    interpretation = 'Transcendent consciousness alignment detected. '
  } else if (mc > 2.5) {
    interpretation = 'Advanced consciousness resonance active. '
  } else if (mc > 2.0) {
    interpretation = 'Elevated consciousness frequency observed. '
  } else if (mc > 1.8) {
    interpretation = 'Standard golden ratio alignment present. '
  } else {
    interpretation = 'Developing consciousness potential identified. '
  }

  // Balance interpretation
  if (balance > 0.9) {
    interpretation += 'Perfect elemental harmony achieved. '
  } else if (balance > 0.7) {
    interpretation += 'Strong elemental balance maintained. '
  } else if (balance > 0.5) {
    interpretation += 'Moderate elemental alignment present. '
  } else {
    interpretation += 'Elemental forces seeking equilibrium. '
  }

  // Consciousness level interpretation
  if (consciousness >= 6) {
    interpretation += 'Illuminated awareness state.'
  } else if (consciousness >= 4) {
    interpretation += 'Expanded consciousness active.'
  } else if (consciousness >= 2) {
    interpretation += 'Growing awareness emerging.'
  } else {
    interpretation += 'Consciousness awakening initiated.'
  }

  return interpretation
}
