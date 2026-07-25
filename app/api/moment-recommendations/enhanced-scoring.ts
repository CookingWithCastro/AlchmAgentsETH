/**
 * Enhanced Moment Score Calculation
 *
 * Incorporates multiple factors from kinetics, consciousness metrics, and Monica Constant
 * to provide more accurate agent recommendations based on current cosmic moment.
 */

import { getAgentKineticProfile } from '@/lib/agents/kinetic-profiles'
import { demoCraftedAgents } from '@/lib/demo-agents-data'

export interface EnhancedMomentScore {
  agentId: string
  score: number
  category: 'optimal' | 'enhanced' | 'compatible' | 'challenging' | 'neutral'
  reasoning: string
  powerAlignment: number
  aspectSensitivity: number
  kineticScore: number
  consciousnessScore: number
  mcScore: number | null
  elementalResonance: number
  optimalTopics: string[]
  nextOptimalWindow?: Date
}

export function calculateEnhancedMomentScore(
  agentId: string,
  currentMoment: Date,
  alchemicalData: any,
  selectedAgents: string[] = []
): EnhancedMomentScore | null {
  const agent = demoCraftedAgents.find(a => a.id === agentId)
  if (!agent) return null

  const kineticProfile = getAgentKineticProfile(agentId)
  if (!kineticProfile) return null

  const hour = currentMoment.getHours()
  const planetaryHours = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  const currentPlanetaryHour = planetaryHours[hour % 7]

  // 1. Planetary Alignment Score (25% weight)
  const peakHours = kineticProfile.peak_hours || []
  const powerAlignment = peakHours.includes(currentPlanetaryHour)
    ? 1.0
    : kineticProfile.power_alignment?.includes(currentPlanetaryHour)
      ? 0.8
      : 0.5

  // 2. Kinetic Velocity Score (20% weight) - Average of all velocity components
  const velocities = [
    kineticProfile.v_creative || 0,
    kineticProfile.v_linguistic || 0,
    kineticProfile.v_scientific || 0,
    kineticProfile.v_strategic || 0,
    kineticProfile.v_charismatic || 0,
    kineticProfile.v_inventive || 0,
    kineticProfile.v_social || 0,
    kineticProfile.v_psychological || 0,
    kineticProfile.v_mystical || 0,
    kineticProfile.v_philosophical || 0,
  ]
  const kineticScore = velocities.reduce((a, b) => a + b, 0) / velocities.length

  // 3. Aspect Sensitivity Score (15% weight)
  const aspectSensitivity = kineticProfile.aspect_sensitivity || 0.5

  // 4. Consciousness Metrics Score (20% weight)
  const consciousnessMetrics = agent.consciousness?.metrics || {
    chatQuality: 0.7,
    momentResonance: 0.7,
    alchemicalCoherence: 0.7,
  }
  const consciousnessScore =
    consciousnessMetrics.chatQuality * 0.3 +
    consciousnessMetrics.momentResonance * 0.4 +
    consciousnessMetrics.alchemicalCoherence * 0.3

  // 5. Monica Constant Score (10% weight) - Higher MC = more developed consciousness
  const monicaConstant = agent.consciousness?.monicaConstant
  const mcScore =
    typeof monicaConstant === 'number' && Number.isFinite(monicaConstant)
      ? Math.min(1, monicaConstant / 7)
      : null

  // 6. Elemental Resonance (10% weight) - Match with current alchemical state
  let elementalResonance = 0.5
  if (alchemicalData?.totals) {
    const currentDominantElement = Object.entries(alchemicalData.totals).reduce((a: any, b: any) =>
      alchemicalData.totals[a[0]] > alchemicalData.totals[b[0]] ? a : b
    )[0]

    const agentElements = agent.consciousness?.alchemicalElements || {
      spirit: 0.25,
      essence: 0.25,
      matter: 0.25,
      substance: 0.25,
    }

    const elementMapping: Record<string, keyof typeof agentElements> = {
      spirit: 'spirit',
      essence: 'essence',
      matter: 'matter',
      substance: 'substance',
    }

    const mappedElement =
      elementMapping[currentDominantElement.toLowerCase() as keyof typeof elementMapping]
    elementalResonance = mappedElement ? agentElements[mappedElement] || 0.5 : 0.5
  }

  // Calculate weighted final score
  const weightedComponents = [
    { score: powerAlignment, weight: 0.25 },
    { score: kineticScore, weight: 0.2 },
    { score: aspectSensitivity, weight: 0.15 },
    { score: consciousnessScore, weight: 0.2 },
    ...(mcScore === null ? [] : [{ score: mcScore, weight: 0.1 }]),
    { score: elementalResonance, weight: 0.1 },
  ]
  const baseScore =
    weightedComponents.reduce((total, component) => total + component.score * component.weight, 0) /
    weightedComponents.reduce((total, component) => total + component.weight, 0)

  // Diversity bonus - favor agents with unique momentum types
  const selectedMomentumTypes = selectedAgents
    .map(id => {
      const profile = getAgentKineticProfile(id)
      return profile?.momentum_type
    })
    .filter(Boolean)
  const isUniqueMomentum = !selectedMomentumTypes.includes(kineticProfile.momentum_type)
  const diversityBonus = isUniqueMomentum ? 0.05 : 0

  const finalScore = Math.min(1, baseScore + diversityBonus)

  // Determine recommendation category
  let category: EnhancedMomentScore['category'] = 'neutral'
  const isOptimalTime = peakHours.includes(currentPlanetaryHour)

  if (isOptimalTime && finalScore > 0.8) category = 'optimal'
  else if (finalScore > 0.75) category = 'enhanced'
  else if (finalScore > 0.6) category = 'compatible'
  else if (finalScore < 0.4) category = 'challenging'

  // Generate enhanced reasoning with multiple factors
  const reasoningParts: string[] = []
  reasoningParts.push(`${Math.round(finalScore * 100)}% synergy with current moment`)

  if (isOptimalTime) {
    reasoningParts.push(`peak ${currentPlanetaryHour} hour alignment`)
  }

  if (kineticScore > 0.8) {
    reasoningParts.push(`high kinetic velocity (${Math.round(kineticScore * 100)}%)`)
  }

  if (mcScore !== null && mcScore > 0.7 && typeof monicaConstant === 'number') {
    reasoningParts.push(`elevated consciousness (MC ${monicaConstant.toFixed(1)})`)
  }

  if (elementalResonance > 0.6) {
    reasoningParts.push(`strong elemental resonance`)
  }

  if (isUniqueMomentum) {
    reasoningParts.push(`unique ${kineticProfile.momentum_type} momentum`)
  }

  const reasoning = `${agent.name}: ${reasoningParts.join(', ')}.`

  // Calculate next optimal window
  const nextOptimalWindow = calculateNextOptimalWindow(peakHours, currentMoment)

  // Generate optimal topics based on agent abilities and moment
  const optimalTopics = [...(agent.abilities.wisdomDomains || []).slice(0, 2)]
  if (finalScore > 0.7) {
    optimalTopics.push('Deep Exploration', 'Advanced Concepts')
  } else if (finalScore > 0.5) {
    optimalTopics.push('Practical Wisdom', 'Life Application')
  } else {
    optimalTopics.push('Gentle Guidance', 'Foundational Knowledge')
  }

  return {
    agentId,
    score: finalScore,
    category,
    reasoning,
    powerAlignment,
    aspectSensitivity,
    kineticScore,
    consciousnessScore,
    mcScore,
    elementalResonance,
    optimalTopics,
    nextOptimalWindow: nextOptimalWindow || undefined,
  }
}

function calculateNextOptimalWindow(peakHours: string[], currentMoment: Date): Date | null {
  const hour = currentMoment.getHours()
  const planetaryHours = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

  // Find next peak hour
  for (let i = 1; i <= 24; i++) {
    const nextHour = (hour + i) % 24
    const planetaryHour = planetaryHours[nextHour % 7]
    if (peakHours.includes(planetaryHour)) {
      const nextOptimal = new Date(currentMoment)
      nextOptimal.setHours(nextHour, 0, 0, 0)
      if (nextOptimal <= currentMoment) {
        nextOptimal.setDate(nextOptimal.getDate() + 1)
      }
      return nextOptimal
    }
  }

  return null
}
