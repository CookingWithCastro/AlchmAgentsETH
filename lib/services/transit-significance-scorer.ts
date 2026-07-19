/**
 * Transit Significance Scoring System
 *
 * Calculates personalized significance scores for natal chart transits
 * based on degree-agent mappings, elemental alignments, and consciousness evolution patterns.
 */

import { getDegreeAgents, DegreeAgentMapping } from '../degree-agent-mapping'
import { agentKineticProfiles } from '../agents/kinetic-profiles'
import {
  getExactSunDegreeForDate,
  signDegreeToLongitude,
} from '../enhanced-astronomical-calculator'

export interface TransitSignificanceScores {
  overallScore: number // 0-1 combined score
  elementalAlignmentScore: number // 0-1 same element bonus
  consciousnessImpactScore: number // 0-1 based on agent evolution
  historicalPrecedenceScore: number // 0-1 based on past patterns
  personalRelevanceScore: number // 0-1 based on user profile
}

export interface DetailedTransitSignificance {
  // Transit details
  transitDate: Date
  transitDegree: number
  transitPlanet: string

  // Natal placement
  natalDegree: number
  natalPlanet: string
  natalSign: string
  natalHouse?: number
  aspectType?: string
  aspectOrb?: number

  // Degree-agent mapping
  degreeMapping: DegreeAgentMapping | null
  primaryAgentId: string
  secondaryAgentIds: string[]
  elementalAffinity: string
  degreeSignificance: string

  // Scores
  scores: TransitSignificanceScores
  overallScore: number

  // Elemental alignment
  sameElement: boolean
  complementary: boolean
  reinforcementBonus: number

  // Consciousness themes
  transitThemes: string[]
  consciousnessAmplifiers: string[]
  recommendedActions: string[]
  recommendedQueries: string[]
}

export interface NatalPlacement {
  planet: string
  degree: number
  sign: string
  house?: number
  element: string
}

export interface UserConsciousnessProfile {
  dominantElement: string
  monicaConstant: number
  spiritScore: number
  essenceScore: number
  matterScore: number
  substanceScore: number
  interactionHistory?: {
    agentId: string
    interactionCount: number
    lastInteraction: Date
  }[]
}

/**
 * Calculate detailed transit significance for a natal placement
 */
export function calculateTransitSignificance(
  natalPlacement: NatalPlacement,
  transitDate: Date,
  userProfile?: UserConsciousnessProfile
): DetailedTransitSignificance | null {
  // Get current Sun degree for this date (absolute ecliptic longitude, 0-360)
  const transitDegree = getExactSunDegreeForDate(transitDate)

  // Natal charts store within-sign degrees (0-30); the orb math and the
  // 360-degree agent mapping both need absolute longitude.
  const natalDegree = toAbsoluteNatalDegree(natalPlacement)

  // Calculate orb (angular distance)
  const orb = calculateOrb(natalDegree, transitDegree)

  // Only consider conjunctions within 5 degrees
  if (orb > 5) return null

  // Get degree-agent mapping for the transit degree
  const degreeMapping = getDegreeAgents(transitDegree)

  if (!degreeMapping) return null

  // Calculate all component scores
  const elementalAlignmentScore = calculateElementalAlignmentScore(
    natalPlacement.element,
    degreeMapping.elementalAffinity,
    userProfile?.dominantElement
  )

  const consciousnessImpactScore = calculateConsciousnessImpactScore(
    degreeMapping.primaryAgent,
    userProfile
  )

  const historicalPrecedenceScore = calculateHistoricalPrecedenceScore(
    degreeMapping.significance,
    orb
  )

  const personalRelevanceScore = calculatePersonalRelevanceScore(
    natalPlacement,
    degreeMapping,
    userProfile
  )

  // Calculate overall score (weighted average)
  const overallScore =
    elementalAlignmentScore * 0.25 +
    consciousnessImpactScore * 0.25 +
    historicalPrecedenceScore * 0.3 +
    personalRelevanceScore * 0.2

  const scores: TransitSignificanceScores = {
    overallScore,
    elementalAlignmentScore,
    consciousnessImpactScore,
    historicalPrecedenceScore,
    personalRelevanceScore,
  }

  // Check elemental relationships
  const sameElement = natalPlacement.element === degreeMapping.elementalAffinity
  const complementary = areElementsComplementary(
    natalPlacement.element,
    degreeMapping.elementalAffinity
  )

  // Calculate reinforcement bonus
  const reinforcementBonus = sameElement ? 0.2 : complementary ? 0.1 : 0

  // Generate recommendations
  const recommendedActions = generateRecommendedActions(
    natalPlacement.planet,
    degreeMapping,
    overallScore
  )

  const recommendedQueries = generateRecommendedQueries(
    natalPlacement.planet,
    degreeMapping,
    natalPlacement.sign
  )

  return {
    transitDate,
    transitDegree,
    transitPlanet: 'Sun', // Currently only Sun transits
    natalDegree,
    natalPlanet: natalPlacement.planet,
    natalSign: natalPlacement.sign,
    natalHouse: natalPlacement.house,
    aspectType: 'conjunction',
    aspectOrb: orb,
    degreeMapping,
    primaryAgentId: degreeMapping.primaryAgent,
    secondaryAgentIds: degreeMapping.secondaryAgents,
    elementalAffinity: degreeMapping.elementalAffinity,
    degreeSignificance: degreeMapping.significance,
    scores,
    overallScore,
    sameElement,
    complementary,
    reinforcementBonus,
    transitThemes: degreeMapping.transitThemes,
    consciousnessAmplifiers: degreeMapping.consciousnessAmplifiers,
    recommendedActions,
    recommendedQueries,
  }
}

/**
 * Calculate orb between two degrees (accounting for circular zodiac)
 */
function calculateOrb(degree1: number, degree2: number): number {
  const diff = Math.abs(degree1 - degree2)
  return Math.min(diff, 360 - diff)
}

/**
 * Natal placements may carry a within-sign degree (0-30, the stored chart
 * format) or an absolute longitude (0-360). Degrees >= 30 are unambiguously
 * absolute; below 30 the sign disambiguates (absolute < 30 is always Aries,
 * for which the conversion is the identity).
 */
function toAbsoluteNatalDegree(placement: NatalPlacement): number {
  if (placement.degree >= 30) return placement.degree % 360
  return signDegreeToLongitude(placement.sign, placement.degree) ?? placement.degree
}

/**
 * Calculate elemental alignment score
 */
function calculateElementalAlignmentScore(
  natalElement: string,
  transitElement: string,
  userDominantElement?: string
): number {
  let score = 0.5 // Base score

  // Same element bonus
  if (natalElement === transitElement) {
    score += 0.3
  }

  // Complementary elements bonus
  if (areElementsComplementary(natalElement, transitElement)) {
    score += 0.15
  }

  // User's dominant element alignment
  if (userDominantElement) {
    if (userDominantElement === transitElement) {
      score += 0.1
    }
    if (userDominantElement === natalElement) {
      score += 0.05
    }
  }

  return Math.min(score, 1.0)
}

/**
 * Calculate consciousness impact score based on agent evolution rates
 */
function calculateConsciousnessImpactScore(
  agentId: string,
  userProfile?: UserConsciousnessProfile
): number {
  const agentProfile = agentKineticProfiles[agentId]

  if (!agentProfile) return 0.5

  // Base score from agent's evolution rate
  let score = Math.min(agentProfile.evolutionRate / 1.5, 1.0)

  // Bonus if user has interacted with this agent before
  if (userProfile?.interactionHistory) {
    const interaction = userProfile.interactionHistory.find(i => i.agentId === agentId)
    if (interaction) {
      const interactionBonus = Math.min(interaction.interactionCount / 20, 0.2)
      score += interactionBonus
    }
  }

  return Math.min(score, 1.0)
}

/**
 * Calculate historical precedence score based on degree significance
 */
function calculateHistoricalPrecedenceScore(significance: string, orb: number): number {
  // Base score from significance level
  const significanceScores = {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4,
  }

  const baseScore = significanceScores[significance as keyof typeof significanceScores] || 0.5

  // Reduce score based on orb (exact aspects are stronger)
  const orbPenalty = orb / 5 // 0-1 range
  const finalScore = baseScore * (1 - orbPenalty * 0.3)

  return finalScore
}

/**
 * Calculate personal relevance score
 */
function calculatePersonalRelevanceScore(
  natalPlacement: NatalPlacement,
  degreeMapping: DegreeAgentMapping,
  userProfile?: UserConsciousnessProfile
): number {
  let score = 0.6 // Base score

  // Luminaries (Sun/Moon) are always personally relevant
  if (natalPlacement.planet === 'Sun' || natalPlacement.planet === 'Moon') {
    score += 0.2
  }

  // Personal planets (Mercury, Venus, Mars) are moderately relevant
  if (['Mercury', 'Venus', 'Mars'].includes(natalPlacement.planet)) {
    score += 0.1
  }

  // Angle transits (if house is 1, 4, 7, or 10) are highly relevant
  if (natalPlacement.house && [1, 4, 7, 10].includes(natalPlacement.house)) {
    score += 0.15
  }

  // User's Monica Constant alignment
  if (userProfile) {
    // Higher MC = more sensitive to consciousness transits
    const mcBonus = Math.min(userProfile.monicaConstant / 3, 0.1)
    score += mcBonus
  }

  return Math.min(score, 1.0)
}

/**
 * Check if elements are complementary
 */
function areElementsComplementary(element1: string, element2: string): boolean {
  const complementaryPairs = [
    ['Fire', 'Air'],
    ['Water', 'Earth'],
  ]

  return complementaryPairs.some(
    pair =>
      (pair[0] === element1 && pair[1] === element2) ||
      (pair[0] === element2 && pair[1] === element1)
  )
}

/**
 * Generate recommended actions based on transit
 */
function generateRecommendedActions(
  natalPlanet: string,
  degreeMapping: DegreeAgentMapping,
  significanceScore: number
): string[] {
  const actions: string[] = []

  // High significance transits get more specific recommendations
  if (significanceScore > 0.7) {
    actions.push(`Consult with ${degreeMapping.primaryAgent} for breakthrough insights`)
    actions.push(`Focus on ${degreeMapping.transitThemes[0]} during this powerful transit`)
  }

  // Planet-specific recommendations
  const planetActions: Record<string, string[]> = {
    Sun: ['Express your authentic self', 'Take leadership initiatives', 'Focus on personal goals'],
    Moon: ['Honor emotional needs', 'Nurture relationships', 'Trust intuition'],
    Mercury: ['Communicate your ideas', 'Learn something new', 'Journal insights'],
    Venus: ['Cultivate beauty and harmony', 'Deepen connections', 'Explore creative expression'],
    Mars: ['Take decisive action', 'Channel energy productively', 'Assert boundaries'],
    Jupiter: ['Expand your horizons', 'Explore new philosophies', 'Share your wisdom'],
    Saturn: ['Build lasting structures', 'Honor commitments', 'Master discipline'],
  }

  actions.push(...(planetActions[natalPlanet] || []).slice(0, 2))

  // Add consciousness amplifiers
  actions.push(...degreeMapping.consciousnessAmplifiers.map(amp => `Practice ${amp}`))

  return actions.slice(0, 5)
}

/**
 * Generate recommended queries for agent consultation
 */
function generateRecommendedQueries(
  natalPlanet: string,
  degreeMapping: DegreeAgentMapping,
  natalSign: string
): string[] {
  return [
    `How can I best work with ${natalPlanet} in ${natalSign} energy during this transit?`,
    `${degreeMapping.primaryAgent}, what consciousness breakthrough is possible now?`,
    `Show me the deeper meaning of ${degreeMapping.transitThemes[0]} in my life`,
    `How can I integrate ${degreeMapping.consciousnessAmplifiers[0]} with my ${natalPlanet} expression?`,
  ]
}
