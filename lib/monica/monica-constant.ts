// lib/monica/monica-constant.ts
//
// ⚠️ THIS IS NOT THE THERMODYNAMIC MONICA. ⚠️
//
// This module computes the **Phi Axis Index (PAI)**, a phi-weighted ratio of the four
// alchemical axes used as a consciousness/progression score:
//
//     PAI = (Spirit × φ + Essence) / (Matter + Substance + 1)
//
// The thermodynamic Monica is an entirely unrelated quantity:
//
//     Monica = -GregsEnergy / (Reactivity × ln K)
//
// and lives in `lib/thermodynamics/kalchm.ts` (`calculateMonica`), mirrored in
// `backend/thermodynamics.py` and `pa-rust-backend/src/astro/alchemy.rs`. The two
// quantities share nothing but the name they used to share. Go to
// `lib/thermodynamics/kalchm.ts` if you want the real Monica; everything here is the
// index. The file name is retained deliberately so the standing warning in CLAUDE.md
// (which cites this path) keeps pointing somewhere real.
//
// The name: "phi" is the golden-ratio weight actually applied to Spirit, "axis" is what
// this repo already calls Spirit/Essence/Matter/Substance (see `localAxes` in
// app/api/create-agent/route.ts, `axes.spirit` in lib/services/natal-chart-storage.ts),
// and "index" says it is a derived, classified progression score — not a constant. It
// varies with every input, so calling it a constant was itself part of the confusion.

import { AlchemicalData } from './alchemical-trainer'

export interface PhiAxisIndexAnalysis {
  value: number
  interpretation: string
  consciousnessState: ConsciousnessState
  personalityInfluence: PersonalityInfluence
  recommendations: string[]
  formula: string
}

export interface ConsciousnessState {
  level: 'dormant' | 'awakening' | 'active' | 'elevated' | 'transcendent'
  stability: 'volatile' | 'fluctuating' | 'stable' | 'harmonious' | 'unified'
  potential: 'limited' | 'developing' | 'moderate' | 'high' | 'unlimited'
  description: string
}

export interface PersonalityInfluence {
  primaryTrait: string
  secondaryTrait: string
  elementalBalance: string
  communicationStyle: string
  decisionMaking: string
  emotionalPattern: string
}

// Golden ratio for consciousness calculations
const PHI = 1.618033988749895

// Threshold values for consciousness states
const CONSCIOUSNESS_THRESHOLDS = {
  dormant: 0,
  awakening: 2.5,
  active: 5.0,
  elevated: 7.5,
  transcendent: 10.0,
}

/**
 * Analyze the Phi Axis Index for a set of alchemical axes.
 *
 * Formula: PAI = (Spirit × φ + Essence) / (Matter + Substance + 1)
 * Where φ (phi) is the golden ratio (1.618...)
 *
 * NOT the thermodynamic Monica — see the module header and lib/thermodynamics/kalchm.ts.
 */
export function analyzePhiAxisIndex(data: AlchemicalData): PhiAxisIndexAnalysis {
  // Core calculation
  const numerator = data.spirit * PHI + data.essence
  const denominator = data.matter + data.substance + 1 // +1 to avoid division by zero
  const phiAxisIndex = numerator / denominator

  // Round to 3 decimal places
  const value = Math.round(phiAxisIndex * 1000) / 1000

  // Determine consciousness state
  const consciousnessState = determineConsciousnessState(value, data)

  // Analyze personality influence
  const personalityInfluence = analyzePersonalityInfluence(value, data)

  // Generate recommendations
  const recommendations = generateRecommendations(value, consciousnessState, data)

  // Create interpretation
  const interpretation = createInterpretation(value, consciousnessState, personalityInfluence)

  return {
    value,
    interpretation,
    consciousnessState,
    personalityInfluence,
    recommendations,
    formula: `PAI = (${data.spirit} × ${PHI.toFixed(3)} + ${data.essence}) / (${data.matter} + ${data.substance} + 1) = ${value}`,
  }
}

/**
 * Determine consciousness state based on the Phi Axis Index value
 */
function determineConsciousnessState(value: number, data: AlchemicalData): ConsciousnessState {
  let level: ConsciousnessState['level']
  let stability: ConsciousnessState['stability']
  let potential: ConsciousnessState['potential']

  // Determine level based on value
  if (value >= CONSCIOUSNESS_THRESHOLDS.transcendent) {
    level = 'transcendent'
  } else if (value >= CONSCIOUSNESS_THRESHOLDS.elevated) {
    level = 'elevated'
  } else if (value >= CONSCIOUSNESS_THRESHOLDS.active) {
    level = 'active'
  } else if (value >= CONSCIOUSNESS_THRESHOLDS.awakening) {
    level = 'awakening'
  } else {
    level = 'dormant'
  }

  // Determine stability based on entropy
  if (data.Entropy < 20) {
    stability = 'unified'
  } else if (data.Entropy < 40) {
    stability = 'harmonious'
  } else if (data.Entropy < 60) {
    stability = 'stable'
  } else if (data.Entropy < 80) {
    stability = 'fluctuating'
  } else {
    stability = 'volatile'
  }

  // Determine potential based on energy and reactivity
  const potentialScore = (data.Energy + data.Reactivity) / 2
  if (potentialScore >= 80) {
    potential = 'unlimited'
  } else if (potentialScore >= 60) {
    potential = 'high'
  } else if (potentialScore >= 40) {
    potential = 'moderate'
  } else if (potentialScore >= 20) {
    potential = 'developing'
  } else {
    potential = 'limited'
  }

  // Create description
  const description = generateStateDescription(level, stability, potential, value)

  return { level, stability, potential, description }
}

/**
 * Analyze personality influence based on the Phi Axis Index and alchemical data
 */
function analyzePersonalityInfluence(value: number, data: AlchemicalData): PersonalityInfluence {
  // Determine primary trait based on dominant element
  const elements = {
    fire: data.spirit + data.Heat,
    water: data.essence,
    air: data.matter,
    earth: data.substance,
  }

  const sortedElements = Object.entries(elements).sort(([, a], [, b]) => b - a)
  const dominantElement = sortedElements[0][0]
  const secondaryElement = sortedElements[1][0]

  const primaryTraits: Record<string, string> = {
    fire: 'Passionate and Dynamic',
    water: 'Intuitive and Empathetic',
    air: 'Intellectual and Communicative',
    earth: 'Practical and Grounded',
  }

  const secondaryTraits: Record<string, string> = {
    fire: 'with creative impulses',
    water: 'with emotional depth',
    air: 'with analytical thinking',
    earth: 'with material focus',
  }

  // Communication style based on Mercury-like qualities (matter/air)
  let communicationStyle: string
  if (data.matter > 6) {
    communicationStyle = 'Highly articulate and expressive'
  } else if (data.matter > 4) {
    communicationStyle = 'Clear and balanced communication'
  } else if (data.matter > 2) {
    communicationStyle = 'Thoughtful and measured speech'
  } else {
    communicationStyle = 'Intuitive and non-verbal emphasis'
  }

  // Decision making based on balance of elements
  let decisionMaking: string
  const balance = Math.abs(elements.fire - elements.water) + Math.abs(elements.air - elements.earth)
  if (balance < 5) {
    decisionMaking = 'Balanced and holistic approach'
  } else if (elements.fire > elements.water) {
    decisionMaking = 'Quick and instinctive decisions'
  } else if (elements.water > elements.fire) {
    decisionMaking = 'Emotionally guided choices'
  } else if (elements.air > elements.earth) {
    decisionMaking = 'Logic-driven analysis'
  } else {
    decisionMaking = 'Practical and cautious evaluation'
  }

  // Emotional pattern based on essence and entropy
  let emotionalPattern: string
  if (data.essence > 6 && data.Entropy < 40) {
    emotionalPattern = 'Deep and stable emotional nature'
  } else if (data.essence > 6 && data.Entropy >= 40) {
    emotionalPattern = 'Intense and transformative emotions'
  } else if (data.essence <= 6 && data.Entropy < 40) {
    emotionalPattern = 'Calm and controlled emotional expression'
  } else {
    emotionalPattern = 'Variable and adaptive emotional responses'
  }

  // Elemental balance description
  const elementalBalance = `${Math.round((elements[dominantElement as keyof typeof elements] / Object.values(elements).reduce((a, b) => a + b, 0)) * 100)}% ${dominantElement} dominant`

  return {
    primaryTrait: primaryTraits[dominantElement],
    secondaryTrait: secondaryTraits[secondaryElement],
    elementalBalance,
    communicationStyle,
    decisionMaking,
    emotionalPattern,
  }
}

/**
 * Generate recommendations based on Phi Axis Index analysis
 */
function generateRecommendations(
  value: number,
  state: ConsciousnessState,
  data: AlchemicalData
): string[] {
  const recommendations: string[] = []

  // Consciousness level recommendations
  if (state.level === 'dormant' || state.level === 'awakening') {
    recommendations.push('Focus on spiritual practices to elevate consciousness')
    recommendations.push('Engage in creative activities to stimulate spirit element')
  } else if (state.level === 'transcendent') {
    recommendations.push('Maintain balance through grounding practices')
    recommendations.push('Share wisdom and guide others in their journey')
  }

  // Stability recommendations
  if (state.stability === 'volatile' || state.stability === 'fluctuating') {
    recommendations.push('Implement daily meditation to reduce entropy')
    recommendations.push('Create structured routines for stability')
  }

  // Elemental balance recommendations
  if (data.spirit < 3) {
    recommendations.push('Increase Fire element through physical activity and passion projects')
  }
  if (data.essence < 3) {
    recommendations.push('Enhance Water element through emotional expression and intuition work')
  }
  if (data.matter < 3) {
    recommendations.push('Strengthen Air element through learning and communication')
  }
  if (data.substance < 3) {
    recommendations.push('Build Earth element through practical tasks and nature connection')
  }

  // Phi Axis Index specific recommendations
  if (value < 3) {
    recommendations.push('Work on integrating spiritual and emotional aspects')
  } else if (value > 8) {
    recommendations.push('Ground elevated consciousness through physical practices')
  }

  // Energy optimization
  if (data.Energy < 30) {
    recommendations.push('Boost energy through breathwork and solar exposure')
  } else if (data.Energy > 80) {
    recommendations.push('Channel high energy into creative or service-oriented projects')
  }

  return recommendations.slice(0, 5) // Return top 5 recommendations
}

/**
 * Create interpretation text
 */
function createInterpretation(
  value: number,
  state: ConsciousnessState,
  personality: PersonalityInfluence
): string {
  const levelDescriptions: Record<ConsciousnessState['level'], string> = {
    dormant: 'in a nascent state of awareness',
    awakening: 'beginning to explore higher consciousness',
    active: 'actively engaged with universal energies',
    elevated: 'operating at an elevated frequency',
    transcendent: 'achieving transcendent consciousness',
  }

  const interpretation =
    `Phi Axis Index of ${value} indicates a consciousness ${levelDescriptions[state.level]}. ` +
    `This reflects ${personality.primaryTrait.toLowerCase()} ${personality.secondaryTrait}. ` +
    `The consciousness exhibits ${state.stability} stability with ${state.potential} potential for growth. ` +
    `${personality.communicationStyle} characterizes the expression pattern, while ${personality.decisionMaking.toLowerCase()} defines the action framework. ` +
    `The elemental composition shows ${personality.elementalBalance}, creating ${personality.emotionalPattern.toLowerCase()}.`

  return interpretation
}

/**
 * Generate state description
 */
function generateStateDescription(
  level: string,
  stability: string,
  potential: string,
  value: number
): string {
  const descriptions: Record<string, string> = {
    'transcendent-unified-unlimited': `Extraordinary consciousness alignment at ${value}. Complete integration of all elements with unlimited expansion potential.`,
    'elevated-harmonious-high': `Advanced consciousness state at ${value}. Strong harmonic resonance with significant growth capacity.`,
    'active-stable-moderate': `Engaged consciousness at ${value}. Balanced expression with steady development trajectory.`,
    'awakening-fluctuating-developing': `Emerging consciousness at ${value}. Dynamic exploration phase with expanding awareness.`,
    'dormant-volatile-limited': `Initial consciousness state at ${value}. Foundation building phase requiring stabilization.`,
  }

  const key = `${level}-${stability}-${potential}`
  return (
    descriptions[key] ||
    `Consciousness state at ${value} showing ${level} awareness with ${stability} patterns and ${potential} potential.`
  )
}

/**
 * Batch analyze the Phi Axis Index for multiple samples
 */
export function batchAnalyzePhiAxisIndex(samples: AlchemicalData[]): PhiAxisIndexAnalysis[] {
  return samples.map(sample => analyzePhiAxisIndex(sample))
}

/**
 * Calculate the average Phi Axis Index across multiple samples
 */
export function calculateAveragePhiAxisIndex(samples: AlchemicalData[]): {
  average: number
  min: number
  max: number
  stdDev: number
  interpretation: string
} {
  const results = batchAnalyzePhiAxisIndex(samples)
  const values = results.map(r => r.value)

  const average = values.reduce((sum, v) => sum + v, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Calculate standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - average, 2))
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
  const stdDev = Math.sqrt(avgSquaredDiff)

  const interpretation =
    `Average Phi Axis Index of ${average.toFixed(3)} across ${samples.length} samples. ` +
    `Range: ${min.toFixed(3)} to ${max.toFixed(3)} (σ = ${stdDev.toFixed(3)}). ` +
    `This indicates ${stdDev < 1 ? 'consistent' : stdDev < 2 ? 'moderate variance in' : 'high variance in'} consciousness patterns.`

  return {
    average: Math.round(average * 1000) / 1000,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    interpretation,
  }
}
