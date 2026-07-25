/**
 * Sign Vector Runes System
 *
 * Runes that harness and visualize zodiacal sign vector compositions
 * These runes are dynamically generated based on dominant/absent sign patterns
 */

import {
  SignCharacterVector,
  ChartCharacterProfile,
  CharacterVectorCalculator,
} from '@/lib/astrological-character-vectors'
import { AlchemicalCost, RuneEffect, Rune } from './rune-system'
import { averageFiniteMonica } from '@/lib/monica/nullable'

export interface SignVectorRune extends Rune {
  signVector: SignCharacterVector
  dominantSigns: string[]
  absentSigns: string[]
  elementalBalance: {
    fire: number
    earth: number
    air: number
    water: number
  }
  visualPattern: RuneGraphicPattern
  generationType: 'character' | 'moment' | 'comparative' | 'collective'
}

export interface RuneGraphicPattern {
  centerSymbol: string
  ringSegments: ZodiacalSegment[]
  colorScheme: 'fire' | 'earth' | 'air' | 'water' | 'balanced'
  intensityMap: number[] // 12 values for each zodiac sign intensity
}

export interface ZodiacalSegment {
  sign: string
  symbol: string
  percentage: number
  color: string
  glyphPath: string
}

// Zodiac sign data with SVG paths and magical correspondences
const ZODIAC_DATA = {
  aries: {
    symbol: '♈',
    element: 'fire',
    color: '#FF6B6B',
    runicPower: 'initiative',
    glyph: 'M12,2 L16,8 L8,8 Z M12,8 L12,22',
  },
  taurus: {
    symbol: '♉',
    element: 'earth',
    color: '#4ECDC4',
    runicPower: 'stability',
    glyph: 'M12,2 A6,6 0 1,1 12,14 M8,8 L16,8',
  },
  gemini: {
    symbol: '♊',
    element: 'air',
    color: '#45B7D1',
    runicPower: 'communication',
    glyph: 'M6,2 L6,22 M18,2 L18,22 M6,8 L18,8 M6,16 L18,16',
  },
  cancer: {
    symbol: '♋',
    element: 'water',
    color: '#96CEB4',
    runicPower: 'intuition',
    glyph: 'M2,8 A6,6 0 0,1 14,8 A6,6 0 0,1 22,16',
  },
  leo: {
    symbol: '♌',
    element: 'fire',
    color: '#FFEAA7',
    runicPower: 'creativity',
    glyph: 'M12,2 A10,10 0 0,1 12,22 M6,8 A6,6 0 0,1 18,8',
  },
  virgo: {
    symbol: '♍',
    element: 'earth',
    color: '#DDA0DD',
    runicPower: 'precision',
    glyph: 'M6,2 L6,16 A4,4 0 0,0 14,16 L18,20 M12,10 L18,10',
  },
  libra: {
    symbol: '♎',
    element: 'air',
    color: '#98D8C8',
    runicPower: 'balance',
    glyph: 'M4,12 L20,12 M8,8 A4,4 0 0,1 16,8 M8,16 L16,16',
  },
  scorpio: {
    symbol: '♏',
    element: 'water',
    color: '#F7DC6F',
    runicPower: 'transformation',
    glyph: 'M6,2 L6,14 A4,4 0 0,0 14,14 L18,18 L18,10 L22,14',
  },
  sagittarius: {
    symbol: '♐',
    element: 'fire',
    color: '#BB8FCE',
    runicPower: 'expansion',
    glyph: 'M4,20 L20,4 M16,4 L20,4 L20,8 M8,12 L16,12',
  },
  capricorn: {
    symbol: '♑',
    element: 'earth',
    color: '#85C1E9',
    runicPower: 'mastery',
    glyph: 'M6,2 L6,12 A6,6 0 0,0 18,12 L18,18 A4,4 0 0,1 10,18',
  },
  aquarius: {
    symbol: '♒',
    element: 'air',
    color: '#F8C471',
    runicPower: 'innovation',
    glyph: 'M4,8 C8,6 12,10 16,8 C20,6 24,10 28,8 M4,16 C8,14 12,18 16,16 C20,14 24,18 28,16',
  },
  pisces: {
    symbol: '♓',
    element: 'water',
    color: '#82E0AA',
    runicPower: 'transcendence',
    glyph: 'M8,4 A8,8 0 0,1 8,20 M16,4 A8,8 0 0,0 16,20 M8,12 L16,12',
  },
}

// Rune templates based on sign patterns
const RUNE_TEMPLATES = {
  // Single dominant sign runes
  single_dominant: {
    name: 'Dominant {sign} Rune',
    description: 'Harnesses the pure power of {sign} energy for focused manifestation',
    baseSymbol: '◉',
    powerMultiplier: 1.2,
    effects: ['enhancement', 'consciousness'],
  },

  // Elemental emphasis runes
  fire_dominant: {
    name: 'Flame Vector Rune',
    description: 'Channels concentrated fire energy for initiative, creativity, and transformation',
    baseSymbol: '🔥',
    powerMultiplier: 1.5,
    effects: ['enhancement', 'manifestation'],
  },
  earth_dominant: {
    name: 'Foundation Vector Rune',
    description:
      'Grounds consciousness in earth energy for stability, manifestation, and material success',
    baseSymbol: '🌍',
    powerMultiplier: 1.3,
    effects: ['protection', 'manifestation'],
  },
  air_dominant: {
    name: 'Wind Vector Rune',
    description: 'Activates air energy for communication, learning, and mental clarity',
    baseSymbol: '💨',
    powerMultiplier: 1.4,
    effects: ['consciousness', 'divination'],
  },
  water_dominant: {
    name: 'Flow Vector Rune',
    description: 'Channels water energy for intuition, healing, and emotional transformation',
    baseSymbol: '🌊',
    powerMultiplier: 1.6,
    effects: ['consciousness', 'divination'],
  },

  // Special pattern runes
  grand_trine: {
    name: 'Grand Trine Vector Rune',
    description: 'Harnesses harmonic triangular energy for effortless manifestation',
    baseSymbol: '△',
    powerMultiplier: 2.0,
    effects: ['enhancement', 'manifestation'],
  },
  grand_cross: {
    name: 'Cosmic Cross Vector Rune',
    description: 'Transforms tension into spiritual growth through balanced opposition',
    baseSymbol: '✚',
    powerMultiplier: 1.8,
    effects: ['consciousness', 'protection'],
  },
  stellium: {
    name: 'Stellium Focus Rune',
    description:
      'Concentrates multiple planetary energies in a single sign for laser-focused power',
    baseSymbol: '✦',
    powerMultiplier: 2.2,
    effects: ['enhancement', 'manifestation'],
  },

  // Absent sign compensation runes
  missing_element: {
    name: '{element} Compensation Rune',
    description: 'Provides missing {element} energy to balance consciousness signature',
    baseSymbol: '◯',
    powerMultiplier: 1.1,
    effects: ['enhancement', 'consciousness'],
  },
}

/**
 * Generate a sign vector rune based on character profile
 */
export function generateSignVectorRune(
  chartProfile: ChartCharacterProfile,
  runeType: 'character' | 'moment' | 'comparative' = 'character'
): SignVectorRune {
  const { sign_vectors, dominant_signs, absent_signs, elemental_distribution } = chartProfile

  // Determine rune pattern based on sign distribution
  const pattern = analyzeSignPattern(
    sign_vectors,
    dominant_signs,
    absent_signs,
    elemental_distribution
  )
  const template = selectRuneTemplate(pattern)

  // Calculate costs based on complexity and rarity
  const baseCost = calculateSignVectorRuneCosts(pattern, elemental_distribution)

  // Generate visual pattern
  const visualPattern = generateVisualPattern(sign_vectors, dominant_signs, pattern)

  // Create effects based on sign emphasis
  const effects = generateRuneEffects(
    dominant_signs,
    absent_signs,
    elemental_distribution,
    template
  )

  return {
    id: `sign_vector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: template.name.replace(/{(\w+)}/g, (_, key) => pattern[key] || key),
    symbol: template.baseSymbol,
    element: getDominantElement(elemental_distribution) as any,
    runeType: 'cosmic',
    baseCost,
    currentCost: baseCost,
    effects,
    requirements: {
      minANumber: Math.max(10, dominant_signs.length * 5),
      consciousness_level: pattern.complexity,
    },
    rarity: determineRarity(pattern),
    description: template.description.replace(/{(\w+)}/g, (_, key) => pattern[key] || key),
    craftingTime: Math.max(15, pattern.complexity * 10),
    signVector: sign_vectors,
    dominantSigns: dominant_signs,
    absentSigns: absent_signs,
    elementalBalance: elemental_distribution,
    visualPattern,
    generationType: runeType,
  }
}

/**
 * Analyze sign vector pattern to determine rune characteristics
 */
function analyzeSignPattern(
  signVector: SignCharacterVector,
  dominantSigns: string[],
  absentSigns: string[],
  elementalDist: any
): any {
  const pattern: any = {
    type: 'balanced',
    complexity: 3,
    dominantElement: getDominantElement(elementalDist),
    specialPattern: null,
  }

  // Check for single sign dominance (>40%)
  const maxSign = dominantSigns[0]
  const maxPercentage = signVector[maxSign as keyof SignCharacterVector] as number

  if (maxPercentage > 40) {
    pattern.type = 'single_dominant'
    pattern.sign = maxSign
    pattern.complexity = 2
  }

  // Check for elemental dominance (>60%)
  const maxElement = Object.entries(elementalDist).reduce((a, b) =>
    elementalDist[a[0]] > elementalDist[b[0]] ? a : b
  )

  if ((maxElement[1] as number) > 60) {
    pattern.type = `${maxElement[0]}_dominant`
    pattern.element = maxElement[0]
    pattern.complexity = 3
  }

  // Check for special patterns
  if (dominantSigns.length >= 3) {
    // Check for grand trine (three signs of same element)
    const elements = dominantSigns.map(
      sign => ZODIAC_DATA[sign.toLowerCase() as keyof typeof ZODIAC_DATA]?.element
    )
    const sameElement = elements.every(e => e === elements[0])

    if (sameElement) {
      pattern.specialPattern = 'grand_trine'
      pattern.type = 'grand_trine'
      pattern.complexity = 5
    }
  }

  // Check for stellium (4+ planets in one sign)
  if (maxPercentage > 50) {
    pattern.specialPattern = 'stellium'
    pattern.type = 'stellium'
    pattern.complexity = 4
  }

  // Check for missing elements
  const missingElements = Object.entries(elementalDist)
    .filter(([, value]) => (value as number) < 10)
    .map(([element]) => element)

  if (missingElements.length > 0) {
    pattern.missingElement = missingElements[0]
    if (pattern.type === 'balanced') {
      pattern.type = 'missing_element'
      pattern.element = missingElements[0]
    }
  }

  return pattern
}

/**
 * Select appropriate rune template based on pattern
 */
function selectRuneTemplate(pattern: any) {
  return (
    RUNE_TEMPLATES[pattern.type as keyof typeof RUNE_TEMPLATES] || RUNE_TEMPLATES.single_dominant
  )
}

/**
 * Calculate alchemical costs for sign vector rune
 */
function calculateSignVectorRuneCosts(pattern: any, elementalDist: any): AlchemicalCost {
  const baseCosts = {
    spirit: 8,
    essence: 6,
    matter: 4,
    substance: 5,
  }

  // Adjust costs based on complexity
  const complexityMult = 1 + (pattern.complexity - 1) * 0.3

  // Adjust costs based on dominant element
  const dominantElement = getDominantElement(elementalDist)
  const adjustments = {
    fire: { spirit: 1.2, essence: 0.8, matter: 1.0, substance: 1.0 },
    earth: { spirit: 1.0, essence: 1.0, matter: 1.3, substance: 0.9 },
    air: { spirit: 1.1, essence: 1.0, matter: 0.8, substance: 1.2 },
    water: { spirit: 1.0, essence: 1.3, matter: 0.9, substance: 1.0 },
  }

  const adj = adjustments[dominantElement as keyof typeof adjustments]

  const spirit = Math.ceil(baseCosts.spirit * complexityMult * adj.spirit)
  const essence = Math.ceil(baseCosts.essence * complexityMult * adj.essence)
  const matter = Math.ceil(baseCosts.matter * complexityMult * adj.matter)
  const substance = Math.ceil(baseCosts.substance * complexityMult * adj.substance)

  return {
    spirit,
    essence,
    matter,
    substance,
    totalCost: spirit + essence + matter + substance,
  }
}

/**
 * Generate visual pattern for the rune
 */
function generateVisualPattern(
  signVector: SignCharacterVector,
  dominantSigns: string[],
  pattern: any
): RuneGraphicPattern {
  const ringSegments: ZodiacalSegment[] = Object.entries(ZODIAC_DATA).map(([sign, data]) => ({
    sign,
    symbol: data.symbol,
    percentage: signVector[sign as keyof SignCharacterVector] as number,
    color: data.color,
    glyphPath: data.glyph,
  }))

  const intensityMap = ringSegments.map(seg => seg.percentage)

  // Determine center symbol based on pattern
  const centerSymbol = pattern.specialPattern
    ? RUNE_TEMPLATES[pattern.type as keyof typeof RUNE_TEMPLATES]?.baseSymbol
    : dominantSigns
        .slice(0, 3)
        .map(sign => ZODIAC_DATA[sign.toLowerCase() as keyof typeof ZODIAC_DATA]?.symbol)
        .join('')

  return {
    centerSymbol: centerSymbol || '✦',
    ringSegments,
    colorScheme: pattern.dominantElement || 'balanced',
    intensityMap,
  }
}

/**
 * Generate rune effects based on sign emphasis
 */
function generateRuneEffects(
  dominantSigns: string[],
  absentSigns: string[],
  elementalDist: any,
  template: any
): RuneEffect[] {
  const effects: RuneEffect[] = []

  // Primary effect based on dominant signs
  const primaryPower = Math.min(95, 60 + dominantSigns.length * 8)
  const primaryEffect: RuneEffect = {
    type: template.effects[0] || 'consciousness',
    power: primaryPower,
    duration: 'days',
    description: `Enhances ${dominantSigns.slice(0, 2).join(' and ')} energies for ${primaryPower}% increased effectiveness in related activities`,
  }
  effects.push(primaryEffect)

  // Secondary effect for elemental balance
  if (template.effects[1]) {
    const dominantElement = getDominantElement(elementalDist)
    const secondaryPower = Math.min(80, 45 + elementalDist[dominantElement])
    const secondaryEffect: RuneEffect = {
      type: template.effects[1],
      power: secondaryPower,
      duration: 'hours',
      description: `Channels concentrated ${dominantElement} energy for ${secondaryPower}% enhanced manifestation power`,
    }
    effects.push(secondaryEffect)
  }

  // Compensation effect for absent signs
  if (absentSigns.length > 0) {
    const compensationEffect: RuneEffect = {
      type: 'enhancement',
      power: 30 + absentSigns.length * 5,
      duration: 'hours',
      description: `Provides temporary access to ${absentSigns[0]} energies to balance consciousness signature`,
    }
    effects.push(compensationEffect)
  }

  return effects
}

/**
 * Get dominant element from elemental distribution
 */
function getDominantElement(elementalDist: any): string {
  return Object.entries(elementalDist).reduce((a, b) =>
    elementalDist[a[0]] > elementalDist[b[0]] ? a : b
  )[0]
}

/**
 * Determine rune rarity based on pattern complexity
 */
function determineRarity(
  pattern: any
): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'cosmic' {
  if (pattern.specialPattern) return 'cosmic'
  if (pattern.complexity >= 5) return 'legendary'
  if (pattern.complexity >= 4) return 'epic'
  if (pattern.complexity >= 3) return 'rare'
  if (pattern.complexity >= 2) return 'uncommon'
  return 'common'
}

/**
 * Generate agent character rune from natal chart
 */
export function generateAgentCharacterRune(agentData: any): SignVectorRune {
  const placements = []

  // Extract planetary placements from agent's natal chart
  if (agentData.consciousness?.natalChart) {
    const chart = agentData.consciousness.natalChart
    if (chart.sun) placements.push({ planet: 'sun', sign: chart.sun.sign })
    if (chart.moon) placements.push({ planet: 'moon', sign: chart.moon.sign })
    if (chart.mercury) placements.push({ planet: 'mercury', sign: chart.mercury.sign })
    if (chart.venus) placements.push({ planet: 'venus', sign: chart.venus.sign })
    if (chart.mars) placements.push({ planet: 'mars', sign: chart.mars.sign })
    if (chart.jupiter) placements.push({ planet: 'jupiter', sign: chart.jupiter.sign })
    if (chart.saturn) placements.push({ planet: 'saturn', sign: chart.saturn.sign })
    if (chart.ascendant) placements.push({ planet: 'ascendant', sign: chart.ascendant.sign })
  }

  // Generate character profile
  const chartProfile = CharacterVectorCalculator.generateChartCharacterProfile(placements)

  // Generate the rune
  const rune = generateSignVectorRune(chartProfile, 'character')

  // Enhance with agent-specific properties
  rune.name = `${agentData.name}'s Character Rune`
  rune.description = `Embodies the essential character signature of ${agentData.name}, the ${agentData.title}. ${rune.description}`

  // Adjust power based on Monica Constant
  if (typeof agentData.consciousness?.monicaConstant === 'number') {
    const mcMultiplier = 1 + (agentData.consciousness.monicaConstant - 4) * 0.1
    rune.effects = rune.effects.map(effect => ({
      ...effect,
      power: Math.min(100, Math.round(effect.power * mcMultiplier)),
    }))
  }

  return rune
}

/**
 * Generate collective rune from multiple agents
 */
export function generateCollectiveAgentRune(agents: any[]): SignVectorRune {
  // Combine all agent placements
  const allPlacements: any[] = []

  agents.forEach(agent => {
    if (agent.consciousness?.natalChart) {
      const chart = agent.consciousness.natalChart
      ;['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'ascendant'].forEach(
        planet => {
          if (chart[planet]) {
            allPlacements.push({ planet, sign: chart[planet].sign })
          }
        }
      )
    }
  })

  // Generate combined profile
  const chartProfile = CharacterVectorCalculator.generateChartCharacterProfile(allPlacements)

  // Generate collective rune
  const rune = generateSignVectorRune(chartProfile, 'collective' as any)

  // Customize for collective
  rune.name = `${agents.map(a => a.name).join(' + ')} Collective Rune`
  rune.description = `Channels the combined consciousness signatures of ${agents.length} historical figures: ${agents.map(a => a.name).join(', ')}. ${rune.description}`
  rune.runeType = 'cosmic'
  rune.rarity = agents.length > 3 ? 'cosmic' : 'legendary'

  // Boost power based on agent count and average Monica Constant
  const averageMonica = averageFiniteMonica(
    agents.map(agent => agent.consciousness?.monicaConstant)
  )
  const monicaAdjustment = averageMonica === null ? 0 : (averageMonica - 4) * 0.1
  const collectiveMultiplier = 1 + agents.length * 0.15 + monicaAdjustment

  rune.effects = rune.effects.map(effect => ({
    ...effect,
    power: Math.min(100, Math.round(effect.power * collectiveMultiplier)),
    description: `${
      effect.description
    } Enhanced by the collective wisdom of ${agents.length} consciousness signatures.`,
  }))

  return rune
}

/**
 * Generate a real-time sign vector rune based on current planetary positions
 */
export function generateRealTimeSignVectorRune(
  planetaryPositions: any,
  alchmData?: any
): SignVectorRune {
  // Extract planetary placements from current positions
  const placements = []

  if (planetaryPositions.Sun) placements.push({ planet: 'sun', sign: planetaryPositions.Sun.sign })
  if (planetaryPositions.Moon)
    placements.push({ planet: 'moon', sign: planetaryPositions.Moon.sign })
  if (planetaryPositions.Mercury)
    placements.push({ planet: 'mercury', sign: planetaryPositions.Mercury.sign })
  if (planetaryPositions.Venus)
    placements.push({ planet: 'venus', sign: planetaryPositions.Venus.sign })
  if (planetaryPositions.Mars)
    placements.push({ planet: 'mars', sign: planetaryPositions.Mars.sign })
  if (planetaryPositions.Jupiter)
    placements.push({ planet: 'jupiter', sign: planetaryPositions.Jupiter.sign })
  if (planetaryPositions.Saturn)
    placements.push({ planet: 'saturn', sign: planetaryPositions.Saturn.sign })
  if (planetaryPositions.Uranus)
    placements.push({ planet: 'uranus', sign: planetaryPositions.Uranus.sign })
  if (planetaryPositions.Neptune)
    placements.push({ planet: 'neptune', sign: planetaryPositions.Neptune.sign })
  if (planetaryPositions.Pluto)
    placements.push({ planet: 'pluto', sign: planetaryPositions.Pluto.sign })
  if (planetaryPositions.Ascendant)
    placements.push({ planet: 'ascendant', sign: planetaryPositions.Ascendant.sign })

  // Generate chart profile from current positions
  const chartProfile = CharacterVectorCalculator.generateChartCharacterProfile(placements)

  // Create base rune with current moment type
  const baseRune = generateSignVectorRune(chartProfile, 'moment')

  // Derive dominant element from profile
  const dominantElement = getDominantElement(chartProfile.elemental_distribution)

  // Map base/current costs to UI shape with capitalized keys
  const toUpperCost = (cost: any) => ({
    Spirit: cost?.spirit ?? 0,
    Essence: cost?.essence ?? 0,
    Matter: cost?.matter ?? 0,
    Substance: cost?.substance ?? 0,
  })

  // Establish a base power level heuristically
  const basePowerLevel = Math.min(100, 60 + placements.length)

  // Enhance with real-time alchemical data if available
  if (alchmData && alchmData.quantities) {
    const { Spirit, Essence, Matter, Substance } = alchmData.quantities

    // Adjust costs based on current alchemical conditions
    const costMultiplier = (Spirit + Essence + Matter + Substance) / 100 // Average percentage as multiplier

    return {
      ...baseRune,
      id: `realtime-${Date.now()}`,
      name: `Cosmic Moment Rune: ${dominantElement}`,
      description: `A rune capturing the current cosmic moment with ${placements.length} planetary influences. Generated at ${new Date().toISOString()}.`,
      type: baseRune.runeType,
      cost: (() => {
        const base = toUpperCost(baseRune.currentCost ?? baseRune.baseCost)
        return {
          Spirit: Math.round(base.Spirit * costMultiplier),
          Essence: Math.round(base.Essence * costMultiplier),
          Matter: Math.round(base.Matter * costMultiplier),
          Substance: Math.round(base.Substance * costMultiplier),
        }
      })() as any,
      powerLevel: Math.round(basePowerLevel * (1 + costMultiplier * 0.1)),
      effects: [
        ...baseRune.effects,
        {
          type: 'passive',
          name: 'Real-time Cosmic Alignment',
          description: `Cosmic alignment bonus: ${Math.round(costMultiplier * 100)}%`,
          power: Math.round(costMultiplier * 10),
          duration: 'permanent',
        },
        {
          type: 'active',
          name: 'Planetary Snapshot',
          description: `Generated from ${placements.length} active planetary positions`,
          power: placements.length * 2,
          duration: 'instant',
        },
      ],
      metadata: {
        generationTime: new Date().toISOString(),
        planetarySnapshot: planetaryPositions,
        alchemicalConditions: alchmData?.quantities,
        dominantElement,
        activeInfluences: placements.length,
      },
    }
  }

  // Return enhanced base rune even without alchemical data
  return {
    ...baseRune,
    id: `realtime-${Date.now()}`,
    name: `Cosmic Moment Rune: ${dominantElement}`,
    description: `A rune capturing the current cosmic moment with ${placements.length} planetary influences. Generated at ${new Date().toISOString()}.`,
    type: baseRune.runeType,
    cost: toUpperCost(baseRune.currentCost ?? baseRune.baseCost) as any,
    powerLevel: basePowerLevel,
    metadata: {
      generationTime: new Date().toISOString(),
      planetarySnapshot: planetaryPositions,
      dominantElement,
      activeInfluences: placements.length,
    },
  }
}
