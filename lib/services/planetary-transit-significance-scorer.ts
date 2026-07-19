/**
 * Planetary Transit Significance Scoring System (CORRECTED)
 * ===========================================================
 *
 * Calculates personalized significance scores for natal chart transits
 * using PLANETARY AGENTS (Mars in Aries, Venus in Libra, etc.)
 * based on actual astrological principles: dignity, rulership, and elemental harmony.
 */

import {
  getPlanetaryAgentForDegree,
  type PlanetaryAgentConfig,
} from '../degree-planetary-agent-mapping'
import {
  activatePlanetaryAgentForDegree,
  calculateTransitActivation,
  type ActivatedPlanetaryAgent,
} from './planetary-agent-activation'
import {
  getExactPlanetDegreeForDate,
  signDegreeToLongitude,
} from '../enhanced-astronomical-calculator'

export interface PlanetaryTransitSignificanceScores {
  overallScore: number // 0-1 combined score
  dignityScore: number // 0-1 based on planetary dignity
  elementalHarmonyScore: number // 0-1 element compatibility
  aspectQualityScore: number // 0-1 orb tightness
  personalRelevanceScore: number // 0-1 natal planet importance
}

export interface DetailedPlanetaryTransitSignificance {
  // Transit details
  transitDate: Date
  transitDegree: number
  transitingPlanet: string

  // Natal placement
  natalDegree: number
  natalPlanet: string
  natalSign: string
  natalHouse?: number
  aspectType: string
  aspectOrb: number

  // Activated planetary agent at this degree
  activatedAgent: ActivatedPlanetaryAgent

  // Planetary agent configuration
  planetaryAgent: {
    ruler: string // The planet ruling this degree
    sign: string
    dignity: string
    element: string
    modality: string
    consciousnessLevel: string
    powerLevel: number
  }

  // Scores
  scores: PlanetaryTransitSignificanceScores
  overallScore: number

  // Elemental relationships
  elementalHarmony: {
    natalElement: string
    transitElement: string
    harmonic: boolean
    challenging: boolean
    neutral: boolean
  }

  // Astrological interpretation
  interpretation: {
    transitThemes: string[]
    dignityInterpretation: string
    elementalInterpretation: string
    consciousnessThemes: string[]
  }

  // Recommendations
  recommendedActions: string[]
  recommendedQueries: string[]
  consciousnessWork: string[]
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
}

/**
 * Calculate detailed transit significance using planetary agents
 */
export function calculatePlanetaryTransitSignificance(
  natalPlacement: NatalPlacement,
  transitDate: Date,
  userProfile?: UserConsciousnessProfile,
  options: {
    transitingPlanet?: string
    orbTolerance?: number
  } = {}
): DetailedPlanetaryTransitSignificance | null {
  const transitingPlanet = options.transitingPlanet || 'Sun'
  const orbTolerance = options.orbTolerance || 5

  // Get the transiting planet's degree for this date (absolute longitude, 0-360)
  const transitDegree = getExactPlanetDegreeForDate(transitingPlanet, transitDate)

  // Natal charts store within-sign degrees (0-30); orb math and the
  // 360-degree planetary-agent mapping both need absolute longitude.
  const natalDegree = toAbsoluteNatalDegree(natalPlacement)

  // Calculate orb (angular distance)
  const orb = calculateOrb(natalDegree, transitDegree)

  // Only consider conjunctions within orb tolerance
  if (orb > orbTolerance) return null

  // Activate planetary agent at the natal degree
  const activatedAgent = activatePlanetaryAgentForDegree(natalDegree, {
    transitingPlanet,
    natalPlanet: natalPlacement.planet,
    aspectType: 'conjunction',
    orb,
    currentDateTime: transitDate,
  })

  if (!activatedAgent) return null

  const agentConfig = activatedAgent.config

  // Calculate all component scores
  const dignityScore = calculateDignityScore(agentConfig.rulerDignity, agentConfig.powerLevel)

  const elementalHarmonyScore = calculateElementalHarmonyScore(
    natalPlacement.element,
    agentConfig.element,
    userProfile?.dominantElement
  )

  const aspectQualityScore = calculateAspectQualityScore(orb, orbTolerance)

  const personalRelevanceScore = calculatePersonalRelevanceScore(natalPlacement, userProfile)

  // Calculate overall score (weighted average)
  const overallScore =
    dignityScore * 0.35 + // Dignity is most important
    elementalHarmonyScore * 0.25 + // Elemental harmony
    aspectQualityScore * 0.25 + // Tight orbs matter
    personalRelevanceScore * 0.15 // Personal factors

  const scores: PlanetaryTransitSignificanceScores = {
    overallScore,
    dignityScore,
    elementalHarmonyScore,
    aspectQualityScore,
    personalRelevanceScore,
  }

  // Determine elemental relationships
  const elementalHarmony = analyzeElementalHarmony(natalPlacement.element, agentConfig.element)

  // Generate interpretation
  const interpretation = generateInterpretation(
    agentConfig,
    natalPlacement,
    transitingPlanet,
    elementalHarmony
  )

  // Get recommendations from activation service
  const recommendations = activatedAgent.transitInfo
    ? {
        actions: [
          ...agentConfig.themes.slice(0, 2).map(theme => `Engage with ${theme} energy`),
          `Work with ${agentConfig.ruler} in ${agentConfig.sign}`,
          ...getElementalActions(agentConfig.element).slice(0, 2),
        ],
        queries: [
          `${agentConfig.ruler} in ${agentConfig.sign}, what guidance do you have for me?`,
          `How can I best work with this ${(agentConfig as any).dignity || 'powerful'} placement?`,
          `What does ${transitingPlanet} activating my ${natalPlacement.planet} mean?`,
        ],
        consciousnessWork: [
          ...agentConfig.themes.map(theme => `Deepen ${theme} awareness`).slice(0, 2),
          getDignityConsciousnessWork(agentConfig.rulerDignity),
          `Integrate ${agentConfig.element} wisdom`,
        ],
      }
    : { actions: [], queries: [], consciousnessWork: [] }

  return {
    transitDate,
    transitDegree,
    transitingPlanet,
    natalDegree,
    natalPlanet: natalPlacement.planet,
    natalSign: natalPlacement.sign,
    natalHouse: natalPlacement.house,
    aspectType: 'conjunction',
    aspectOrb: orb,
    activatedAgent,
    planetaryAgent: {
      ruler: agentConfig.ruler,
      sign: agentConfig.sign,
      dignity: agentConfig.rulerDignity,
      element: agentConfig.element,
      modality: agentConfig.modality,
      consciousnessLevel: agentConfig.consciousnessLevel,
      powerLevel: agentConfig.powerLevel,
    },
    scores,
    overallScore,
    elementalHarmony,
    interpretation,
    recommendedActions: recommendations.actions,
    recommendedQueries: recommendations.queries,
    consciousnessWork: recommendations.consciousnessWork,
  }
}

/**
 * Calculate transit significances for date range
 */
export function calculatePlanetaryTransitsForDateRange(
  natalPlacements: NatalPlacement[],
  startDate: Date,
  endDate: Date,
  userProfile?: UserConsciousnessProfile,
  options: {
    transitingPlanet?: string
    significanceThreshold?: number
    orbTolerance?: number
  } = {}
): DetailedPlanetaryTransitSignificance[] {
  const significances: DetailedPlanetaryTransitSignificance[] = []
  const significanceThreshold = options.significanceThreshold || 0.5

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    // Calculate transits for each natal placement
    for (const placement of natalPlacements) {
      const significance = calculatePlanetaryTransitSignificance(
        placement,
        currentDate,
        userProfile,
        options
      )

      if (significance && significance.overallScore >= significanceThreshold) {
        significances.push(significance)
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Sort by overall score (highest first)
  return significances.sort((a, b) => b.overallScore - a.overallScore)
}

// Scoring Functions

function calculateDignityScore(dignity: string, powerLevel: number): number {
  // Dignity is the primary factor
  const dignityScores = {
    domicile: 1.0, // Strongest
    exaltation: 0.95, // Very strong
    peregrine: 0.5, // Neutral
    detriment: 0.3, // Weak
    fall: 0.2, // Weakest
  }

  const baseScore = dignityScores[dignity as keyof typeof dignityScores] || 0.5

  // Combine with power level
  return baseScore * 0.7 + powerLevel * 0.3
}

function calculateElementalHarmonyScore(
  natalElement: string,
  transitElement: string,
  userDominantElement?: string
): number {
  let score = 0.5 // Base

  // Same element = strong harmony
  if (natalElement === transitElement) {
    score += 0.3
  }

  // Complementary elements
  if (areElementsHarmonious(natalElement, transitElement)) {
    score += 0.2
  }

  // User's dominant element alignment
  if (userDominantElement) {
    if (userDominantElement === transitElement) {
      score += 0.1
    }
  }

  return Math.min(score, 1.0)
}

function calculateAspectQualityScore(orb: number, tolerance: number): number {
  // Exact aspects are most powerful
  // Score decreases as orb widens
  return Math.max(0, (tolerance - orb) / tolerance)
}

function calculatePersonalRelevanceScore(
  natalPlacement: NatalPlacement,
  userProfile?: UserConsciousnessProfile
): number {
  let score = 0.5 // Base

  // Luminaries are always personally significant
  if (natalPlacement.planet === 'Sun' || natalPlacement.planet === 'Moon') {
    score += 0.3
  }

  // Personal planets
  if (['Mercury', 'Venus', 'Mars'].includes(natalPlacement.planet)) {
    score += 0.15
  }

  // Angular houses (1, 4, 7, 10)
  if (natalPlacement.house && [1, 4, 7, 10].includes(natalPlacement.house)) {
    score += 0.1
  }

  // Monica Constant indicates sensitivity
  if (userProfile) {
    const mcBonus = Math.min(userProfile.monicaConstant / 5, 0.15)
    score += mcBonus
  }

  return Math.min(score, 1.0)
}

// Helper Functions

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

function areElementsHarmonious(element1: string, element2: string): boolean {
  const harmoniousPairs = [
    ['Fire', 'Air'], // Stimulate each other
    ['Water', 'Earth'], // Nurture each other
  ]

  return harmoniousPairs.some(
    pair =>
      (pair[0] === element1 && pair[1] === element2) ||
      (pair[0] === element2 && pair[1] === element1)
  )
}

function analyzeElementalHarmony(
  natalElement: string,
  transitElement: string
): {
  natalElement: string
  transitElement: string
  harmonic: boolean
  challenging: boolean
  neutral: boolean
} {
  const harmonic =
    natalElement === transitElement || areElementsHarmonious(natalElement, transitElement)

  const challenging =
    (natalElement === 'Fire' && transitElement === 'Water') ||
    (natalElement === 'Water' && transitElement === 'Fire') ||
    (natalElement === 'Air' && transitElement === 'Earth') ||
    (natalElement === 'Earth' && transitElement === 'Air')

  return {
    natalElement,
    transitElement,
    harmonic,
    challenging,
    neutral: !harmonic && !challenging,
  }
}

function generateInterpretation(
  agentConfig: PlanetaryAgentConfig,
  natalPlacement: NatalPlacement,
  transitingPlanet: string,
  elementalHarmony: any
): {
  transitThemes: string[]
  dignityInterpretation: string
  elementalInterpretation: string
  consciousnessThemes: string[]
} {
  // Dignity interpretation
  const dignityInterps = {
    domicile: `${agentConfig.ruler} is in its home sign (${agentConfig.sign}), expressing its purest and most powerful form.`,
    exaltation: `${agentConfig.ruler} is exalted in ${agentConfig.sign}, reaching its highest expression and potential.`,
    peregrine: `${agentConfig.ruler} is in neutral territory in ${agentConfig.sign}, expressing moderately.`,
    detriment: `${agentConfig.ruler} is in challenging territory in ${agentConfig.sign}, requiring extra effort to express well.`,
    fall: `${agentConfig.ruler} is in its fall in ${agentConfig.sign}, facing maximum difficulty but offering profound lessons.`,
  }

  // Elemental interpretation
  let elementalInterp = ''
  if (elementalHarmony.harmonic) {
    elementalInterp = `The ${elementalHarmony.natalElement} and ${elementalHarmony.transitElement} energies work harmoniously together, creating supportive conditions for growth.`
  } else if (elementalHarmony.challenging) {
    elementalInterp = `The ${elementalHarmony.natalElement} and ${elementalHarmony.transitElement} energies are in tension, creating dynamic challenges that can lead to breakthroughs.`
  } else {
    elementalInterp = `The ${elementalHarmony.natalElement} and ${elementalHarmony.transitElement} energies are neutral to each other.`
  }

  return {
    transitThemes: agentConfig.themes,
    dignityInterpretation: dignityInterps[agentConfig.rulerDignity as keyof typeof dignityInterps],
    elementalInterpretation: elementalInterp,
    consciousnessThemes: [
      `${agentConfig.modality} ${agentConfig.element} activation`,
      `Consciousness level: ${agentConfig.consciousnessLevel}`,
      ...agentConfig.themes.slice(0, 2),
    ],
  }
}

function getElementalActions(element: string): string[] {
  const actions = {
    Fire: ['Take bold action', 'Express creativity', 'Lead with passion'],
    Water: ['Trust your intuition', 'Process emotions', 'Nurture connections'],
    Air: ['Communicate clearly', 'Seek new perspectives', 'Connect socially'],
    Earth: ['Build tangible results', 'Ground yourself', 'Focus on practical matters'],
  }
  return actions[element as keyof typeof actions] || []
}

function getDignityConsciousnessWork(dignity: string): string {
  const work = {
    domicile: 'Maximize natural strengths and authentic expression',
    exaltation: 'Reach for highest potential and breakthrough consciousness',
    peregrine: 'Develop versatility and balanced expression',
    detriment: 'Transform challenges into wisdom and strength',
    fall: 'Find hidden gifts in difficulty and embrace deep lessons',
  }
  return work[dignity as keyof typeof work] || 'Work with the energy available'
}
