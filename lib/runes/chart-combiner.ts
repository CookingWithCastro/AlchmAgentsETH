/**
 * Chart Combination Engine
 *
 * Analyzes and combines multiple astrological charts to create
 * unified consciousness signatures for multi-chart rune minting.
 */

import { BirthChart, ChartCombination, ChartComplexity } from './multi-chart-runes'
import { generateAlchmForBirthInfo } from '../alchemizer'
import { generateAlchmForCurrentMoment } from '../alchemizer'
import { calculateAllPlanets } from '../enhanced-astronomical-calculator'

export interface ChartAnalysisResult {
  elementalCompatibility: number // 0-100
  modalCompatibility: number // 0-100 (Cardinal, Fixed, Mutable)
  planetaryHarmony: number // 0-100
  overallSynergy: number // 0-100
  dominantThemes: string[]
  challenges: string[]
  strengths: string[]
}

/**
 * Analyze birth info and generate chart signature
 */
export async function analyzeChart(
  name: string,
  birthDate: string,
  birthTime?: string,
  birthLocation?: string
): Promise<BirthChart> {
  try {
    // Generate alchemical signature using existing system
    const birthInfo = {
      birthDate,
      birthTime: birthTime || '12:00',
      birthLocation: birthLocation || 'New York, NY',
    }

    const alchmData = await generateAlchmForBirthInfo(birthInfo)

    // Extract alchemical quantities
    const spirit = alchmData?.['Alchemy Effects']?.['Total Spirit'] || 0
    const essence = alchmData?.['Alchemy Effects']?.['Total Essence'] || 0
    const matter = alchmData?.['Alchemy Effects']?.['Total Matter'] || 0
    const substance = alchmData?.['Alchemy Effects']?.['Total Substance'] || 0
    const aNumber = spirit + essence + matter + substance

    // Calculate elemental balance
    const fire = (alchmData?.['Fire'] || 0) * 100
    const earth = (alchmData?.['Earth'] || 0) * 100
    const air = (alchmData?.['Air'] || 0) * 100
    const water = (alchmData?.['Water'] || 0) * 100

    return {
      id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      birthDate,
      birthTime,
      birthLocation,
      alchmSignature: {
        spirit: Math.round(spirit * 100) / 100,
        essence: Math.round(essence * 100) / 100,
        matter: Math.round(matter * 100) / 100,
        substance: Math.round(substance * 100) / 100,
        aNumber: Math.round(aNumber * 100) / 100,
      },
      elementalBalance: {
        fire: Math.round(fire * 100) / 100,
        earth: Math.round(earth * 100) / 100,
        air: Math.round(air * 100) / 100,
        water: Math.round(water * 100) / 100,
      },
    }
  } catch (error) {
    console.error('Error analyzing chart:', error)

    // Fallback to basic chart structure
    return {
      id: `fallback_chart_${Date.now()}`,
      name,
      birthDate,
      birthTime,
      birthLocation,
      alchmSignature: {
        spirit: 5,
        essence: 5,
        matter: 5,
        substance: 5,
        aNumber: 20,
      },
      elementalBalance: {
        fire: 25,
        earth: 25,
        air: 25,
        water: 25,
      },
    }
  }
}

/**
 * Combine multiple charts into a unified consciousness signature
 */
export async function combineCharts(
  charts: BirthChart[],
  relationshipType?: string
): Promise<ChartCombination> {
  const complexity = getChartComplexity(charts.length)

  // Add current moment as the base chart
  const currentAlchm = await generateAlchmForCurrentMoment()
  const currentChart: BirthChart = {
    id: 'current_moment',
    name: 'Current Cosmic Moment',
    birthDate: new Date().toISOString(),
    alchmSignature: {
      spirit: currentAlchm?.['Alchemy Effects']?.['Total Spirit'] || 5,
      essence: currentAlchm?.['Alchemy Effects']?.['Total Essence'] || 5,
      matter: currentAlchm?.['Alchemy Effects']?.['Total Matter'] || 5,
      substance: currentAlchm?.['Alchemy Effects']?.['Total Substance'] || 5,
      aNumber:
        (currentAlchm?.['Alchemy Effects']?.['Total Spirit'] || 5) +
        (currentAlchm?.['Alchemy Effects']?.['Total Essence'] || 5) +
        (currentAlchm?.['Alchemy Effects']?.['Total Matter'] || 5) +
        (currentAlchm?.['Alchemy Effects']?.['Total Substance'] || 5),
    },
    elementalBalance: {
      fire: (currentAlchm?.['Fire'] || 0.25) * 100,
      earth: (currentAlchm?.['Earth'] || 0.25) * 100,
      air: (currentAlchm?.['Air'] || 0.25) * 100,
      water: (currentAlchm?.['Water'] || 0.25) * 100,
    },
  }

  const allCharts = [currentChart, ...charts]

  // Calculate combined signature
  const totalSpirit = allCharts.reduce((sum, chart) => sum + (chart.alchmSignature?.spirit || 0), 0)
  const totalEssence = allCharts.reduce(
    (sum, chart) => sum + (chart.alchmSignature?.essence || 0),
    0
  )
  const totalMatter = allCharts.reduce((sum, chart) => sum + (chart.alchmSignature?.matter || 0), 0)
  const totalSubstance = allCharts.reduce(
    (sum, chart) => sum + (chart.alchmSignature?.substance || 0),
    0
  )
  const totalANumber = totalSpirit + totalEssence + totalMatter + totalSubstance

  // Calculate elemental compatibility
  const synergy = calculateSynergy(allCharts)
  const harmonicResonance = calculateHarmonicResonance(allCharts, synergy)
  const dominantElement = getDominantElement(allCharts)

  return {
    id: `combination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    charts: allCharts,
    complexity,
    synergy,
    combinedSignature: {
      spirit: Math.round(totalSpirit * 100) / 100,
      essence: Math.round(totalEssence * 100) / 100,
      matter: Math.round(totalMatter * 100) / 100,
      substance: Math.round(totalSubstance * 100) / 100,
      totalANumber: Math.round(totalANumber * 100) / 100,
      averageANumber: Math.round((totalANumber / allCharts.length) * 100) / 100,
    },
    dominantElement,
    harmonicResonance,
    relationship: relationshipType
      ? {
          type: relationshipType as any,
          dynamics: generateRelationshipDynamics(allCharts, synergy),
        }
      : undefined,
  }
}

/**
 * Determine chart complexity based on number of charts
 */
function getChartComplexity(chartCount: number): ChartComplexity {
  if (chartCount === 0) return 'solo'
  if (chartCount === 1) return 'dual'
  if (chartCount === 2) return 'trinity'
  return 'collective'
}

/**
 * Calculate synergy between charts (compatibility score)
 */
function calculateSynergy(charts: BirthChart[]): number {
  if (charts.length < 2) return 100

  let totalCompatibility = 0
  let comparisons = 0

  // Compare each chart with every other chart
  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      const chart1 = charts[i]
      const chart2 = charts[j]

      if (
        !chart1.elementalBalance ||
        !chart2.elementalBalance ||
        !chart1.alchmSignature ||
        !chart2.alchmSignature
      )
        continue

      // Elemental compatibility
      const elementalCompat = calculateElementalCompatibility(
        chart1.elementalBalance,
        chart2.elementalBalance
      )

      // Alchemical signature compatibility
      const alchemicalCompat = calculateAlchemicalCompatibility(
        chart1.alchmSignature,
        chart2.alchmSignature
      )

      // Combined compatibility
      const compatibility = (elementalCompat + alchemicalCompat) / 2
      totalCompatibility += compatibility
      comparisons++
    }
  }

  return comparisons > 0 ? Math.round(totalCompatibility / comparisons) : 100
}

/**
 * Calculate elemental compatibility between two elemental balances
 */
function calculateElementalCompatibility(
  balance1: { fire: number; earth: number; air: number; water: number },
  balance2: { fire: number; earth: number; air: number; water: number }
): number {
  // Calculate elemental harmony (similar elements = good, opposing = tension)
  let harmony = 0

  // Same element compatibility (multiplicative)
  harmony += (balance1.fire * balance2.fire) / 10000 // Scale down
  harmony += (balance1.earth * balance2.earth) / 10000
  harmony += (balance1.air * balance2.air) / 10000
  harmony += (balance1.water * balance2.water) / 10000

  // Complementary element compatibility
  harmony += (balance1.fire * balance2.air) / 20000 // Fire-Air synergy
  harmony += (balance1.earth * balance2.water) / 20000 // Earth-Water synergy
  harmony += (balance1.air * balance2.fire) / 20000 // Air-Fire synergy
  harmony += (balance1.water * balance2.earth) / 20000 // Water-Earth synergy

  // Traditional oppositions create tension (but not necessarily bad)
  harmony += (balance1.fire * balance2.water) / 30000 // Fire-Water tension
  harmony += (balance1.earth * balance2.air) / 30000 // Earth-Air tension

  return Math.min(Math.round(harmony * 100), 100)
}

/**
 * Calculate alchemical signature compatibility
 */
function calculateAlchemicalCompatibility(
  sig1: { spirit: number; essence: number; matter: number; substance: number },
  sig2: { spirit: number; essence: number; matter: number; substance: number }
): number {
  // Calculate balance similarity
  const total1 = sig1.spirit + sig1.essence + sig1.matter + sig1.substance
  const total2 = sig2.spirit + sig2.essence + sig2.matter + sig2.substance

  if (total1 === 0 || total2 === 0) return 50 // Neutral compatibility

  const norm1 = {
    spirit: sig1.spirit / total1,
    essence: sig1.essence / total1,
    matter: sig1.matter / total1,
    substance: sig1.substance / total1,
  }

  const norm2 = {
    spirit: sig2.spirit / total2,
    essence: sig2.essence / total2,
    matter: sig2.matter / total2,
    substance: sig2.substance / total2,
  }

  // Calculate cosine similarity
  const dotProduct =
    norm1.spirit * norm2.spirit +
    norm1.essence * norm2.essence +
    norm1.matter * norm2.matter +
    norm1.substance * norm2.substance

  const magnitude1 = Math.sqrt(
    norm1.spirit ** 2 + norm1.essence ** 2 + norm1.matter ** 2 + norm1.substance ** 2
  )

  const magnitude2 = Math.sqrt(
    norm2.spirit ** 2 + norm2.essence ** 2 + norm2.matter ** 2 + norm2.substance ** 2
  )

  if (magnitude1 === 0 || magnitude2 === 0) return 50

  const cosineSimilarity = dotProduct / (magnitude1 * magnitude2)

  // Convert to 0-100 scale (cosine similarity is -1 to 1)
  return Math.round(((cosineSimilarity + 1) / 2) * 100)
}

/**
 * Calculate harmonic resonance multiplier
 */
function calculateHarmonicResonance(charts: BirthChart[], synergy: number): number {
  const baseResonance = 1.0
  const synergyBonus = (synergy / 100) * 0.5 // Up to 0.5x bonus
  const chartCountBonus = Math.min(charts.length * 0.2, 1.0) // Up to 1.0x bonus

  return Math.round((baseResonance + synergyBonus + chartCountBonus) * 100) / 100
}

/**
 * Determine dominant element from combined charts
 */
function getDominantElement(charts: BirthChart[]): 'fire' | 'earth' | 'air' | 'water' | 'spirit' {
  const totals = { fire: 0, earth: 0, air: 0, water: 0 }
  let validCharts = 0

  charts.forEach(chart => {
    if (chart.elementalBalance) {
      totals.fire += chart.elementalBalance.fire
      totals.earth += chart.elementalBalance.earth
      totals.air += chart.elementalBalance.air
      totals.water += chart.elementalBalance.water
      validCharts++
    }
  })

  if (validCharts === 0) return 'spirit'

  // Find highest average
  const averages = {
    fire: totals.fire / validCharts,
    earth: totals.earth / validCharts,
    air: totals.air / validCharts,
    water: totals.water / validCharts,
  }

  const maxElement = Object.entries(averages).reduce(
    (max, [element, value]) => (value > max.value ? { element: element as any, value } : max),
    { element: 'spirit' as any, value: 0 }
  )

  // If elements are very balanced, return spirit
  const elementRange = Math.max(...Object.values(averages)) - Math.min(...Object.values(averages))
  if (elementRange < 10) return 'spirit'

  return maxElement.element
}

/**
 * Generate relationship dynamics based on chart analysis
 */
function generateRelationshipDynamics(charts: BirthChart[], synergy: number): string[] {
  const dynamics: string[] = []

  if (synergy > 80) {
    dynamics.push('Exceptional harmony and mutual understanding')
    dynamics.push('Natural flow of communication and energy')
    dynamics.push('Shared values and complementary strengths')
  } else if (synergy > 60) {
    dynamics.push('Strong compatibility with minor adjustments needed')
    dynamics.push('Good communication with occasional misunderstandings')
    dynamics.push('Complementary qualities that support growth')
  } else if (synergy > 40) {
    dynamics.push('Moderate compatibility requiring conscious effort')
    dynamics.push('Different approaches that can create learning opportunities')
    dynamics.push('Need for patience and understanding differences')
  } else {
    dynamics.push('Challenging compatibility requiring significant work')
    dynamics.push('Major differences in values and approaches')
    dynamics.push('Potential for growth through overcoming obstacles')
  }

  // Add element-specific dynamics
  const dominantElement = getDominantElement(charts)
  switch (dominantElement) {
    case 'fire':
      dynamics.push('Dynamic, passionate, and action-oriented connection')
      break
    case 'earth':
      dynamics.push('Stable, practical, and grounding influence')
      break
    case 'air':
      dynamics.push('Intellectual, communicative, and mentally stimulating')
      break
    case 'water':
      dynamics.push('Emotional, intuitive, and deeply empathetic bond')
      break
    case 'spirit':
      dynamics.push('Transcendent, spiritual, and consciousness-expanding union')
      break
  }

  return dynamics
}

/**
 * Analyze charts for detailed compatibility report
 */
export function analyzeChartCompatibility(chartCombination: ChartCombination): ChartAnalysisResult {
  const charts = chartCombination.charts
  const synergy = chartCombination.synergy

  // Calculate specific compatibility metrics — all derived from real chart
  // data (elemental balances + ephemeris planet positions), never constants.
  const elementalCompatibility = calculateElementalCompatibilityScore(charts)
  const modalCompatibility = calculateModalCompatibilityScore(charts)
  const planetaryHarmony = calculatePlanetaryHarmonyScore(charts)

  // Generate themes, challenges, and strengths
  const dominantThemes = generateDominantThemes(chartCombination)
  const challenges = generateChallenges(chartCombination)
  const strengths = generateStrengths(chartCombination)

  return {
    elementalCompatibility,
    modalCompatibility,
    planetaryHarmony,
    overallSynergy: synergy,
    dominantThemes,
    challenges,
    strengths,
  }
}

function calculateElementalCompatibilityScore(charts: BirthChart[]): number {
  const balances = charts
    .map(c => c.elementalBalance)
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
  if (balances.length < 2) return 100

  let total = 0
  let pairs = 0
  for (let i = 0; i < balances.length; i++) {
    for (let j = i + 1; j < balances.length; j++) {
      total += calculateElementalCompatibility(balances[i], balances[j])
      pairs++
    }
  }
  return pairs > 0 ? Math.round(total / pairs) : 100
}

// ---------------------------------------------------------------------------
// Ephemeris-derived metrics (modality + synastry aspects)
// ---------------------------------------------------------------------------

/** Absolute planet longitudes for a chart's birth moment (location-independent). */
function chartPlanetLongitudes(chart: BirthChart): number[] | null {
  const date = new Date(chart.birthDate)
  if (Number.isNaN(date.getTime())) return null
  const [h, m] = (chart.birthTime ?? '12:00').split(':').map(Number)
  const { planets } = calculateAllPlanets({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: Number.isFinite(h) ? h : 12,
    minute: Number.isFinite(m) ? m : 0,
    latitude: 0,
    longitude: 0,
  })
  return Object.values(planets).map(p => p.longitude)
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/** Normalized [cardinal, fixed, mutable] weights from planet longitudes. */
function modalityDistribution(longitudes: number[]): [number, number, number] {
  const counts: [number, number, number] = [0, 0, 0]
  for (const lon of longitudes) {
    const signIndex = Math.floor((((lon % 360) + 360) % 360) / 30)
    counts[signIndex % 3]++ // signs cycle cardinal → fixed → mutable
  }
  const total = counts[0] + counts[1] + counts[2]
  return total > 0 ? [counts[0] / total, counts[1] / total, counts[2] / total] : counts
}

/**
 * Modal compatibility: how much the charts' cardinal/fixed/mutable emphasis
 * overlaps (shared modality reads as mutual understanding of pace and style).
 * Overlap 0..1 is mapped onto 40..95 — even fully disjoint modal styles are
 * complementary rather than incompatible in traditional synastry.
 */
function calculateModalCompatibilityScore(charts: BirthChart[]): number {
  const dists = charts
    .map(chartPlanetLongitudes)
    .filter((l): l is number[] => Boolean(l))
    .map(modalityDistribution)
  if (dists.length < 2) return 100

  let overlapTotal = 0
  let pairs = 0
  for (let i = 0; i < dists.length; i++) {
    for (let j = i + 1; j < dists.length; j++) {
      overlapTotal +=
        Math.min(dists[i][0], dists[j][0]) +
        Math.min(dists[i][1], dists[j][1]) +
        Math.min(dists[i][2], dists[j][2])
      pairs++
    }
  }
  return Math.round(40 + (overlapTotal / pairs) * 55)
}

const SYNASTRY_ASPECTS = [
  { angle: 0, orb: 8, weight: 1.0 }, // conjunction — strong blend
  { angle: 60, orb: 4, weight: 1.0 }, // sextile — harmonious
  { angle: 120, orb: 6, weight: 1.0 }, // trine — harmonious
  { angle: 90, orb: 6, weight: 0.35 }, // square — friction (still growthful)
  { angle: 180, orb: 8, weight: 0.35 }, // opposition — polarity
] as const

/**
 * Planetary harmony: real cross-chart synastry — every planet of one chart
 * aspected against every planet of the other, scored by the harmonious share
 * of the aspects found. No aspects at all reads as neutral (50).
 */
function calculatePlanetaryHarmonyScore(charts: BirthChart[]): number {
  const sets = charts.map(chartPlanetLongitudes).filter((l): l is number[] => Boolean(l))
  if (sets.length < 2) return 100

  let weighted = 0
  let aspectCount = 0
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      for (const lonA of sets[i]) {
        for (const lonB of sets[j]) {
          const sep = angularSeparation(lonA, lonB)
          const hit = SYNASTRY_ASPECTS.find(a => Math.abs(sep - a.angle) <= a.orb)
          if (hit) {
            weighted += hit.weight
            aspectCount++
          }
        }
      }
    }
  }
  if (aspectCount === 0) return 50
  return Math.round((weighted / aspectCount) * 100)
}

function generateDominantThemes(combination: ChartCombination): string[] {
  const themes: string[] = []
  const element = combination.dominantElement

  switch (element) {
    case 'fire':
      themes.push('Creative expression and inspiration')
      themes.push('Leadership and pioneering spirit')
      break
    case 'earth':
      themes.push('Practical manifestation and stability')
      themes.push('Material world mastery')
      break
    case 'air':
      themes.push('Communication and intellectual exchange')
      themes.push('Social connection and networking')
      break
    case 'water':
      themes.push('Emotional depth and intuitive understanding')
      themes.push('Spiritual and psychic development')
      break
    case 'spirit':
      themes.push('Consciousness expansion and enlightenment')
      themes.push('Universal connection and transcendence')
      break
  }

  return themes
}

function generateChallenges(combination: ChartCombination): string[] {
  const challenges: string[] = []

  if (combination.synergy < 50) {
    challenges.push('Significant personality and value differences')
    challenges.push('Communication barriers requiring patience')
  }

  if (combination.harmonicResonance < 1.5) {
    challenges.push('Lower energetic amplification between charts')
  }

  return challenges
}

function generateStrengths(combination: ChartCombination): string[] {
  const strengths: string[] = []

  if (combination.synergy > 70) {
    strengths.push('Natural understanding and compatibility')
    strengths.push('Mutual support and encouragement')
  }

  if (combination.harmonicResonance > 2.0) {
    strengths.push('Powerful energetic amplification together')
  }

  strengths.push(`Strong ${combination.dominantElement} element foundation`)

  return strengths
}
