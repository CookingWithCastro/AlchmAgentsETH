/**
 * Natal Sigil Runes System
 *
 * Extends the base rune system to support natal chart sigil generation.
 * Converts astrological aspect geometry and sacred patterns into personalized runic sigils.
 */

import { Rune, AlchemicalCost, RuneEffect } from './rune-system'
import { PatternConfiguration, Aspect, AspectType } from '../astrological-pattern-recognition'

export type SigilStyle = 'nordic' | 'celtic' | 'alchemical' | 'cosmic'
export type SigilType = 'aspect-based' | 'pattern-based' | 'planetary-focused' | 'elemental-harmony'

export interface PowerNode {
  x: number
  y: number
  energy: number
  convergingAspects: string[]
  planetaryInfluences: string[]
}

export interface EnhancedAspectLine extends Aspect {
  coordinates: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  visualWeight: number
  color: string
  runicStroke: string
  energyFlow: 'positive' | 'negative' | 'neutral'
}

export interface RuneGeometry {
  aspectLines: EnhancedAspectLine[]
  centerPoint: { x: number; y: number }
  powerNodes: PowerNode[]
  sacredPatterns: PatternConfiguration[]
  chartBounds: { width: number; height: number }
  dominantElement: string
  elementalBalance: {
    fire: number
    water: number
    air: number
    earth: number
  }
}

export interface NatalSigilRune extends Rune {
  sigilType: SigilType
  sourceGeometry: RuneGeometry
  aspectSignature: string
  visualStyle: SigilStyle
  generatedImageUrl?: string
  svgGeometry?: string
  meditationInstructions: string[]
  personalizedMeaning: string
  activationRitual?: string
}

// Aspect to Rune Stroke Mappings
export const ASPECT_RUNE_MAPPINGS: Record<
  AspectType,
  {
    stroke: string
    color: string
    weight: number
    energy: 'positive' | 'negative' | 'neutral'
  }
> = {
  conjunction: {
    stroke: 'bold-convergence-point',
    color: '#8B4513',
    weight: 3,
    energy: 'neutral',
  },
  opposition: {
    stroke: 'strong-axis-line',
    color: '#FF0000',
    weight: 2.5,
    energy: 'negative',
  },
  trine: {
    stroke: 'triangular-harmony-curve',
    color: '#0000FF',
    weight: 2,
    energy: 'positive',
  },
  square: {
    stroke: 'angular-tension-cross',
    color: '#FF0000',
    weight: 2.5,
    energy: 'negative',
  },
  sextile: {
    stroke: 'opportunity-bridge-arc',
    color: '#00FF00',
    weight: 1.5,
    energy: 'positive',
  },
  quincunx: {
    stroke: 'adjustment-zigzag',
    color: '#800080',
    weight: 1.5,
    energy: 'neutral',
  },
  semisextile: {
    stroke: 'subtle-connection',
    color: '#90EE90',
    weight: 1,
    energy: 'neutral',
  },
  sesquiquadrate: {
    stroke: 'friction-angle',
    color: '#FFA500',
    weight: 1.5,
    energy: 'negative',
  },
  semisquare: {
    stroke: 'minor-tension',
    color: '#FFD700',
    weight: 1,
    energy: 'negative',
  },
  quintile: {
    stroke: 'creative-pentagram',
    color: '#4B0082',
    weight: 1.5,
    energy: 'positive',
  },
  biquintile: {
    stroke: 'double-pentagram',
    color: '#9400D3',
    weight: 1.5,
    energy: 'positive',
  },
}

// Pattern to Sigil Mappings
export const PATTERN_SIGIL_MAPPINGS: Record<
  string,
  {
    baseSymbol: string
    powerMultiplier: number
    requiredAspects: number
    description: string
  }
> = {
  'grand-trine': {
    baseSymbol: '△',
    powerMultiplier: 1.5,
    requiredAspects: 3,
    description: 'Sacred triangle of elemental harmony, flowing divine grace',
  },
  't-square': {
    baseSymbol: '┬',
    powerMultiplier: 1.3,
    requiredAspects: 3,
    description: 'Dynamic cross of transformation, focused evolutionary pressure',
  },
  'grand-cross': {
    baseSymbol: '✠',
    powerMultiplier: 2.0,
    requiredAspects: 6,
    description: 'Perfect balance of four-fold tension, mastery through challenge',
  },
  yod: {
    baseSymbol: '↑',
    powerMultiplier: 1.4,
    requiredAspects: 3,
    description: 'Finger of God pointing to destiny, fated purpose activation',
  },
  stellium: {
    baseSymbol: '✦',
    powerMultiplier: 1.6,
    requiredAspects: 3,
    description: 'Concentrated stellar power, focused manifestation energy',
  },
  'mystic-rectangle': {
    baseSymbol: '▭',
    powerMultiplier: 1.4,
    requiredAspects: 4,
    description: 'Sacred geometry of balanced opposition, practical mysticism',
  },
  kite: {
    baseSymbol: '♢',
    powerMultiplier: 1.7,
    requiredAspects: 5,
    description: 'Soaring consciousness elevation, grand trine with focused direction',
  },
  'grand-sextile': {
    baseSymbol: '✡',
    powerMultiplier: 2.5,
    requiredAspects: 6,
    description: 'Star of David pattern, perfect cosmic harmony',
  },
}

// Style-specific visual parameters
export const SIGIL_STYLE_PARAMS: Record<
  SigilStyle,
  {
    texture: string
    lineStyle: string
    colorScheme: string[]
    fontFamily: string
    backgroundElements: string[]
    prompt_modifier: string
  }
> = {
  nordic: {
    texture: 'stone-carved',
    lineStyle: 'angular-straight',
    colorScheme: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6'],
    fontFamily: 'runic',
    backgroundElements: ['runes', 'yggdrasil', 'valknut'],
    prompt_modifier: 'Ancient Nordic rune carved in weathered stone, angular Futhark strokes',
  },
  celtic: {
    texture: 'illuminated-manuscript',
    lineStyle: 'flowing-curves',
    colorScheme: ['#27AE60', '#F39C12', '#8E44AD', '#2980B9'],
    fontFamily: 'celtic-uncial',
    backgroundElements: ['knotwork', 'spirals', 'trinity-knots'],
    prompt_modifier: 'Intricate Celtic knotwork with flowing spirals, illuminated manuscript style',
  },
  alchemical: {
    texture: 'metallic-etched',
    lineStyle: 'geometric-precise',
    colorScheme: ['#FFD700', '#C0C0C0', '#B87333', '#E5E7EB'],
    fontFamily: 'hermetic',
    backgroundElements: ['sacred-geometry', 'planetary-symbols', 'ouroboros'],
    prompt_modifier: 'Precise alchemical diagram with hermetic symbols, gold and silver inlay',
  },
  cosmic: {
    texture: 'holographic-ethereal',
    lineStyle: 'energy-flows',
    colorScheme: ['#6B46C1', '#2563EB', '#EC4899', '#10B981'],
    fontFamily: 'cosmic-light',
    backgroundElements: ['stars', 'nebula', 'galaxies', 'auroras'],
    prompt_modifier: 'Ethereal cosmic sigil floating in stellar space, holographic energy patterns',
  },
}

/**
 * Generate a unique aspect signature for a set of aspect lines
 */
export function generateAspectSignature(aspectLines: EnhancedAspectLine[]): string {
  const aspectCounts = aspectLines.reduce(
    (acc, line) => {
      acc[line.type] = (acc[line.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(aspectCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type}:${count}`)
    .join('-')
}

/**
 * Calculate sigil power based on geometry and patterns
 */
export function calculateSigilPower(geometry: RuneGeometry): number {
  let basePower = 50

  // Add power for aspect lines
  basePower += geometry.aspectLines.length * 2

  // Add power for power nodes
  basePower += geometry.powerNodes.reduce((sum, node) => sum + node.energy, 0)

  // Multiply by pattern strength
  const strongestPattern = geometry.sacredPatterns.sort((a, b) => b.strength - a.strength)[0]

  if (strongestPattern) {
    const patternMultiplier = PATTERN_SIGIL_MAPPINGS[strongestPattern.type]?.powerMultiplier || 1
    basePower *= patternMultiplier
  }

  return Math.min(100, Math.round(basePower))
}

/**
 * Calculate alchemical costs for sigil generation
 */
export function calculateSigilCosts(geometry: RuneGeometry, style: SigilStyle): AlchemicalCost {
  const complexity = geometry.aspectLines.length + geometry.powerNodes.length
  const patternBonus = geometry.sacredPatterns.length > 0 ? 0.8 : 1.0

  // Base costs vary by style
  const styleCosts: Record<SigilStyle, AlchemicalCost> = {
    nordic: { spirit: 5, essence: 3, matter: 8, substance: 4, totalCost: 20 },
    celtic: { spirit: 6, essence: 7, matter: 3, substance: 4, totalCost: 20 },
    alchemical: { spirit: 4, essence: 4, matter: 6, substance: 6, totalCost: 20 },
    cosmic: { spirit: 10, essence: 8, matter: 1, substance: 1, totalCost: 20 },
  }

  const base = styleCosts[style]
  const complexityMultiplier = 1 + complexity * 0.05

  return {
    spirit: Math.ceil(base.spirit * complexityMultiplier * patternBonus),
    essence: Math.ceil(base.essence * complexityMultiplier * patternBonus),
    matter: Math.ceil(base.matter * complexityMultiplier * patternBonus),
    substance: Math.ceil(base.substance * complexityMultiplier * patternBonus),
    totalCost: Math.ceil(base.totalCost * complexityMultiplier * patternBonus),
  }
}

/**
 * Generate sigil effects based on patterns and aspects
 */
export function generateSigilEffects(geometry: RuneGeometry, sigilType: SigilType): RuneEffect[] {
  const effects: RuneEffect[] = []
  const power = calculateSigilPower(geometry)

  // Base effect based on sigil type
  switch (sigilType) {
    case 'aspect-based':
      effects.push({
        type: 'enhancement',
        power,
        duration: 'days',
        description: `Harmonizes your energy with your natal aspect patterns for ${Math.ceil(power / 20)} days`,
      })
      break
    case 'pattern-based': {
      const pattern = geometry.sacredPatterns[0]
      if (pattern) {
        effects.push({
          type: 'consciousness',
          power: Math.round(power * 1.2),
          duration: 'days',
          description: `Activates your ${pattern.type} consciousness pattern for profound insights`,
        })
      }
      break
    }
    case 'planetary-focused':
      effects.push({
        type: 'manifestation',
        power,
        duration: 'hours',
        description: `Channels planetary energies directly into your intentions for ${power / 10} hours`,
      })
      break
    case 'elemental-harmony':
      effects.push({
        type: 'enhancement',
        power: Math.round(power * 0.8),
        duration: 'permanent',
        description: `Permanently balances your elemental nature according to your chart`,
      })
      break
  }

  // Add bonus effects for power nodes
  if (geometry.powerNodes.length >= 3) {
    effects.push({
      type: 'divination',
      power: geometry.powerNodes.length * 10,
      duration: 'instant',
      description: 'Power node convergence grants instant clarity on life path',
    })
  }

  return effects
}

/**
 * Generate personalized meditation instructions based on the sigil
 */
export function generateMeditationInstructions(
  geometry: RuneGeometry,
  style: SigilStyle
): string[] {
  const instructions: string[] = []

  // Style-specific preparation
  switch (style) {
    case 'nordic':
      instructions.push('Light a candle and place the sigil before you on stone or wood')
      instructions.push('Breathe deeply and imagine yourself in an ancient Nordic forest')
      break
    case 'celtic':
      instructions.push('Create a sacred circle and place the sigil at the center')
      instructions.push('Invoke the four directions and elemental guardians')
      break
    case 'alchemical':
      instructions.push('Arrange the sigil within a triangle of manifestation')
      instructions.push('Prepare your mind as a vessel for transformation')
      break
    case 'cosmic':
      instructions.push('Gaze at the sigil under starlight or visualize cosmic space')
      instructions.push('Allow your consciousness to expand beyond earthly boundaries')
      break
  }

  // Pattern-specific focus
  if (geometry.sacredPatterns.length > 0) {
    const pattern = geometry.sacredPatterns[0]
    instructions.push(`Focus on the ${pattern.type} energy pattern within the sigil`)
    instructions.push(`Feel the ${pattern.element || 'cosmic'} element flowing through the design`)
  }

  // Aspect line tracing
  instructions.push('Trace each line of the sigil with your inner eye')
  instructions.push(
    `Notice the ${geometry.aspectLines.length} energy pathways connecting celestial points`
  )

  // Power node activation
  if (geometry.powerNodes.length > 0) {
    instructions.push(`Breathe energy into the ${geometry.powerNodes.length} power nodes`)
    instructions.push('Feel them pulse with your heartbeat, activating the sigil')
  }

  // Integration
  instructions.push('Allow the sigil pattern to merge with your energy field')
  instructions.push('Carry its essence with you as you return to normal awareness')

  return instructions
}

/**
 * Generate activation ritual for the sigil
 */
export function generateActivationRitual(
  sigilType: SigilType,
  style: SigilStyle,
  dominantElement: string
): string {
  const rituals: Record<SigilStyle, Record<string, string>> = {
    nordic: {
      fire: 'Pass the sigil through sacred flame three times while chanting the elder runes',
      water: 'Anoint the sigil with water from a natural spring under the full moon',
      air: 'Hang the sigil in the wind for one full day and night',
      earth: 'Bury the sigil in fertile soil for three days before unearthing',
    },
    celtic: {
      fire: 'Dance clockwise around the sigil with a torch at each quarter',
      water: 'Float the sigil in a cauldron of blessed water with herbs',
      air: 'Whisper your intentions to the sigil at dawn and dusk',
      earth: 'Place the sigil beneath an ancient oak or sacred stone',
    },
    alchemical: {
      fire: 'Heat the sigil gently while performing the Lesser Banishing Ritual',
      water: 'Dissolve symbolic salt in water and sprinkle on the sigil',
      air: 'Burn incense of mercury and waft the smoke over the sigil',
      earth: 'Cover the sigil with crystallized salt for one lunar cycle',
    },
    cosmic: {
      fire: 'Visualize stellar fire entering the sigil from distant stars',
      water: 'Channel the cosmic ocean of consciousness into the pattern',
      air: 'Breathe the void between stars into the sigil spaces',
      earth: "Ground the sigil energy through your root chakra to Earth's core",
    },
  }

  return (
    rituals[style][dominantElement.toLowerCase()] ||
    'Hold the sigil to your heart and speak your true intention aloud three times'
  )
}

/**
 * Create a complete NatalSigilRune from geometry and style
 */
export function createNatalSigilRune(
  geometry: RuneGeometry,
  style: SigilStyle,
  sigilType: SigilType,
  imageUrl?: string
): NatalSigilRune {
  const aspectSignature = generateAspectSignature(geometry.aspectLines)
  const power = calculateSigilPower(geometry)
  const costs = calculateSigilCosts(geometry, style)
  const effects = generateSigilEffects(geometry, sigilType)
  const pattern = geometry.sacredPatterns[0]

  return {
    id: `natal-sigil-${sigilType}-${Date.now()}`,
    name: `${style.charAt(0).toUpperCase() + style.slice(1)} Natal Sigil`,
    symbol: pattern ? PATTERN_SIGIL_MAPPINGS[pattern.type]?.baseSymbol || '✧' : '✧',
    element: mapDominantElementToRuneElement(geometry.dominantElement),
    runeType: 'cosmic',
    sigilType,
    sourceGeometry: geometry,
    aspectSignature,
    visualStyle: style,
    generatedImageUrl: imageUrl,
    baseCost: costs,
    currentCost: costs,
    effects,
    requirements: {
      minANumber: Math.round(power / 5),
      consciousness_level: Math.ceil(power / 20),
    },
    rarity: calculateRarity(power),
    description: `Personalized ${style} sigil channeling your unique natal chart geometry`,
    personalizedMeaning: generatePersonalizedMeaning(geometry, pattern),
    craftingTime: Math.ceil(15 + power / 10),
    cooldown: power > 80 ? 24 : undefined,
    meditationInstructions: generateMeditationInstructions(geometry, style),
    activationRitual: generateActivationRitual(sigilType, style, geometry.dominantElement),
    powerLevel: power,
  }
}

/**
 * Map dominant element to rune element type
 */
function mapDominantElementToRuneElement(
  element: string
): 'fire' | 'earth' | 'air' | 'water' | 'spirit' {
  const mapping: Record<string, 'fire' | 'earth' | 'air' | 'water' | 'spirit'> = {
    Fire: 'fire',
    Earth: 'earth',
    Air: 'air',
    Water: 'water',
    Unknown: 'spirit',
  }
  return mapping[element] || 'spirit'
}

/**
 * Calculate rarity based on power level
 */
function calculateRarity(power: number): Rune['rarity'] {
  if (power >= 90) return 'cosmic'
  if (power >= 75) return 'legendary'
  if (power >= 60) return 'epic'
  if (power >= 45) return 'rare'
  if (power >= 30) return 'uncommon'
  return 'common'
}

/**
 * Generate personalized meaning based on chart patterns
 */
function generatePersonalizedMeaning(
  geometry: RuneGeometry,
  pattern?: PatternConfiguration
): string {
  if (pattern) {
    return (
      `Your ${pattern.type} pattern reveals ${pattern.interpretation}. ` +
      `This sigil crystallizes that cosmic signature into a tool for consciousness evolution.`
    )
  }

  const aspectCount = geometry.aspectLines.length
  const nodeCount = geometry.powerNodes.length

  return (
    `This sigil encodes ${aspectCount} celestial connections and ${nodeCount} power convergence points ` +
    `from your natal chart, creating a unique key to unlock your highest potential.`
  )
}
