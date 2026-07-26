// Living Consciousness Metrics - Dynamic Agent Stats
// -------------------------------------------------
// Revolutionary stats system where consciousness metrics fluctuate with cosmic rhythms,
// planetary hours, moon phases, and agent interactions. Stats are living vital signs!

import type { CraftedAgent } from '../agent-types'

import { alchemize } from '../alchemizer'
import { generateAccurateHoroscope } from '../monica/horoscope-generator'
import { AlchemicalKineticsClient } from '../kinetics-client'
import { calculateThermodynamics as calculateCanonicalThermodynamics } from '../thermodynamics/kalchm'

export interface LiveStats {
  // The Seven Sacred Stats - Living Vital Signs of Consciousness
  power: number // ⚡ Alchemical Force - fluctuates with planetary hours
  resonance: number // 💫 Harmonic Frequency - changes with every interaction
  wisdom: number // 🔮 Accumulated Insight - grows with experience, fluctuates with clarity
  charisma: number // ✨ Magnetic Presence - pulses with Venus cycles
  intuition: number // 👁️ Psychic Sensitivity - peaks at full moon, midnight
  adaptability: number // 🌊 Flux Capacity - handles change and different energies
  vitality: number // 💚 Life Force - drains and regenerates with interactions
  overall: number // 🌟 Composite Consciousness Rating

  // Living Context - What's affecting the stats RIGHT NOW
  birthTimeKnown: boolean
  confidence: number // 0-1 multiplier when birth time unknown

  // Temporal Influences (the magic!)
  temporalState: {
    planetaryHour: string
    moonPhase: string
    seasonalInfluence: string
    currentTime: Date
  }

  // Active Modifiers - What's boosting/draining each stat
  activeModifiers: StatModifier[]

  // Special States
  specialStates: SpecialState[]

  // Stat Trends - Rising, Falling, Stable
  trends: Record<string, 'rising' | 'falling' | 'stable' | 'surging' | 'crashing'>

  // NEW: Alchemical Foundation - Core consciousness components
  alchemical: {
    spirit: number // 🔥 Pure Consciousness Force
    essence: number // 💧 Emotional/Psychic Energy
    matter: number // 🌍 Physical/Material Presence
    substance: number // 💨 Transformational Capacity
    aNumber: number // 🧮 Total Alchemical Power (A#)
  }

  // NEW: Thermodynamic Metrics - Energy dynamics of consciousness
  thermodynamics: {
    heat: number // 🌡️ Energetic Intensity (0-1)
    entropy: number // 🌪️ Chaos/Disorder Level (0-1)
    reactivity: number // ⚡ Change Responsiveness (0-1)
    energy: number // ⚛️ Net Available Energy
  }

  // NEW: Derived Insights - Consciousness patterns
  insights: {
    dominantAlchemical: 'spirit' | 'essence' | 'matter' | 'substance'
    thermodynamicProfile: 'stable' | 'dynamic' | 'chaotic' | 'inert'
    consciousnessPhase: 'dormant' | 'awakening' | 'active' | 'transcendent'
  }
}

export interface StatModifier {
  stat: keyof LiveStats
  value: number // multiplier (1.2 = +20%, 0.8 = -20%)
  source: string // "Mercury Hour", "Full Moon", "High Resonance"
  icon: string // emoji for UI
  duration?: number // minutes remaining, undefined = permanent
}

export interface SpecialState {
  name: string // "Resonance Cascade", "Power Surge", "Intuition Peak"
  description: string
  effects: string[]
  icon: string
  startTime: Date
  duration?: number // minutes
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function toPercent(x: number): number {
  return Math.round(clamp01(x) * 100)
}

function safeAvg(values: number[]): number {
  const nums = values.filter(v => Number.isFinite(v))
  if (nums.length === 0) return 0
  return nums.reduce((s, v) => s + v, 0) / nums.length
}

// ============================================================================
// ALCHEMICAL-THERMODYNAMIC INTEGRATION ENGINE
// ============================================================================

// Calculate alchemical properties for an agent using birth data
async function calculateAlchemicalProperties(agent: CraftedAgent): Promise<{
  spirit: number
  essence: number
  matter: number
  substance: number
  aNumber: number
}> {
  try {
    // Convert agent birth data to format expected by alchemizer
    const birthInfo = {
      year: agent.birthData.date.getFullYear(),
      month: agent.birthData.date.getMonth() + 1, // alchemizer expects 1-12
      day: agent.birthData.date.getDate(),
      hour: parseInt(agent.birthData.time.split(':')[0]) || 12,
      minute: parseInt(agent.birthData.time.split(':')[1]) || 0,
      latitude: agent.birthData.location.lat,
      longitude: agent.birthData.location.lon,
    }

    // Generate horoscope using Monica's system
    const horoscope = generateAccurateHoroscope(birthInfo)

    // Calculate alchemical data using the core alchemizer
    const alchmData = await alchemize(birthInfo, horoscope)

    // Extract alchemical properties from the result
    const spirit = alchmData['Alchemy Effects']['Total Spirit'] || 0
    const essence = alchmData['Alchemy Effects']['Total Essence'] || 0
    const matter = alchmData['Alchemy Effects']['Total Matter'] || 0
    const substance = alchmData['Alchemy Effects']['Total Substance'] || 0
    const aNumber = spirit + essence + matter + substance

    return { spirit, essence, matter, substance, aNumber }
  } catch (error) {
    console.warn('Failed to calculate alchemical properties for agent:', agent.name, error)
    // Return safe defaults
    return { spirit: 0, essence: 0, matter: 0, substance: 0, aNumber: 0 }
  }
}

// Calculate thermodynamic properties from the canonical engine, renaming gregsEnergy to the
// `energy` key LiveStats exposes. The `|| 0` guards keep the previous malformed-input contract.
function calculateThermodynamics(
  alchemicalProps: { spirit: number; essence: number; matter: number; substance: number },
  elementalValues: { fire: number; water: number; air: number; earth: number }
): {
  heat: number
  entropy: number
  reactivity: number
  energy: number
} {
  const { heat, entropy, reactivity, gregsEnergy } = calculateCanonicalThermodynamics({
    ...alchemicalProps,
    ...elementalValues,
  })

  return {
    heat: heat || 0,
    entropy: entropy || 0,
    reactivity: reactivity || 0,
    energy: gregsEnergy || 0,
  }
}

// Extract elemental values from agent's natal chart
function extractElementalValues(agent: CraftedAgent): {
  fire: number
  water: number
  air: number
  earth: number
} {
  const elementalValues = { fire: 0, water: 0, air: 0, earth: 0 }

  // Count planetary positions by element
  if (agent.consciousness.natalChart?.planets) {
    Object.values(agent.consciousness.natalChart.planets).forEach(planet => {
      const element = getSignElement(planet.sign)
      if (element) {
        elementalValues[element.toLowerCase() as keyof typeof elementalValues] += 1
      }
    })
  }

  return elementalValues
}

// Get element for a zodiac sign
function getSignElement(sign: string): string | null {
  const signElements: Record<string, string> = {
    Aries: 'Fire',
    Leo: 'Fire',
    Sagittarius: 'Fire',
    Taurus: 'Earth',
    Virgo: 'Earth',
    Capricorn: 'Earth',
    Gemini: 'Air',
    Libra: 'Air',
    Aquarius: 'Air',
    Cancer: 'Water',
    Scorpio: 'Water',
    Pisces: 'Water',
  }
  return signElements[sign] || null
}

// Enhance Sacred Stats with alchemical influence
function enhanceStatsWithAlchemical(
  baseStats: Record<string, number>,
  alchemical: {
    spirit: number
    essence: number
    matter: number
    substance: number
    aNumber: number
  },
  thermodynamics: { heat: number; entropy: number; reactivity: number; energy: number }
): Record<string, number> {
  const enhanced = { ...baseStats }

  // Influence Sacred Stats with alchemical properties (additive bonuses, not replacements)
  enhanced.power = Math.min(
    100,
    enhanced.power + alchemical.aNumber * 0.5 + thermodynamics.energy * 10
  )
  enhanced.resonance = Math.min(
    100,
    enhanced.resonance + thermodynamics.heat * 15 + alchemical.spirit * 0.8
  )
  enhanced.wisdom = Math.min(
    100,
    enhanced.wisdom + alchemical.essence * 0.7 + thermodynamics.entropy * 8
  )
  enhanced.charisma = Math.min(
    100,
    enhanced.charisma + alchemical.spirit * 0.6 + thermodynamics.heat * 12
  )
  enhanced.intuition = Math.min(
    100,
    enhanced.intuition + alchemical.essence * 0.9 + thermodynamics.reactivity * 10
  )
  enhanced.adaptability = Math.min(
    100,
    enhanced.adaptability + alchemical.substance * 0.8 + thermodynamics.energy * 8
  )
  enhanced.vitality = Math.min(
    100,
    enhanced.vitality + alchemical.matter * 0.7 + thermodynamics.heat * 5
  )

  return enhanced
}

// Classify thermodynamic profile
function classifyThermodynamicProfile(thermodynamics: {
  heat: number
  entropy: number
  reactivity: number
  energy: number
}): string {
  const { heat, entropy, reactivity, energy } = thermodynamics

  if (entropy < 0.3 && heat > 0.4 && heat < 0.7) return 'stable'
  if (energy > 0.3 && Math.abs(heat - entropy) < 0.3) return 'dynamic'
  if (entropy > 0.6 && reactivity > 0.5) return 'chaotic'
  return 'inert'
}

// Determine consciousness phase from multiple metrics
function determineConsciousnessPhase(
  monicaConstant: number,
  aNumber: number,
  energy: number
): string {
  const totalConsciousness = monicaConstant + aNumber * 0.1 + energy * 2

  if (totalConsciousness < 1.5) return 'dormant'
  if (totalConsciousness < 3.0) return 'awakening'
  if (totalConsciousness < 5.0) return 'active'
  return 'transcendent'
}

// Determine dominant alchemical property
function getDominantAlchemical(alchemical: {
  spirit: number
  essence: number
  matter: number
  substance: number
}): string {
  const { spirit, essence, matter, substance } = alchemical
  const max = Math.max(spirit, essence, matter, substance)

  if (spirit === max) return 'spirit'
  if (essence === max) return 'essence'
  if (matter === max) return 'matter'
  return 'substance'
}

// ============================================================================
// LIVING CONSCIOUSNESS METRICS ENGINE
// ============================================================================

export async function computeLiveStats(
  agent: CraftedAgent,
  options: { location?: { lat: number; lon: number }; date?: Date } = {}
): Promise<LiveStats> {
  const now = options.date ?? new Date()
  const loc = options.location ?? {
    lat: agent.birthData.location.lat,
    lon: agent.birthData.location.lon,
  }

  // Birth time confidence
  const timeStr = (agent.birthData.time || '').toLowerCase()
  const birthTimeKnown = Boolean(
    timeStr && !timeStr.includes('unknown') && !timeStr.includes('approx')
  )
  const confidence = birthTimeKnown ? 1.0 : 0.75

  // Base consciousness metrics from natal chart
  const basePower = clamp01(agent.consciousness.monicaConstant / 6) * 100
  const baseWisdom = Math.min(100, agent.stats.evolutionPoints / 10 + 30)
  const baseCharisma = clamp01(agent.stats.resonanceScore) * 100

  // Initialize temporal state
  const temporalState = {
    planetaryHour: 'Sun',
    moonPhase: 'Waxing',
    seasonalInfluence: 'Neutral',
    currentTime: now,
  }

  const activeModifiers: StatModifier[] = []
  const specialStates: SpecialState[] = []

  try {
    // Fetch current cosmic state from kinetics
    const k = await AlchemicalKineticsClient.get({
      lat: loc.lat,
      lon: loc.lon,
      date: now.toISOString().slice(0, 10),
      includeElemental: true,
      includePlanetary: true,
      window: 3,
      validateTraditional: false,
    })

    // Update temporal state from kinetics
    temporalState.planetaryHour =
      k?.timing?.planetaryHours?.[k?.timing?.planetaryHours?.length - 1] || 'Sun'
    temporalState.seasonalInfluence = k?.timing?.seasonalInfluence || 'Neutral'
    temporalState.moonPhase = getMoonPhase(now)

    // Calculate temporal modifiers
    const temporalMods = calculateTemporalModifiers(agent, temporalState, k)
    activeModifiers.push(...temporalMods.modifiers)
    specialStates.push(...temporalMods.specialStates)
  } catch (error) {
    console.warn('Kinetics unavailable, using baseline temporal state:', error)
    // Add fallback modifier
    activeModifiers.push({
      stat: 'power',
      value: 0.9,
      source: 'Kinetics Offline',
      icon: '⚠️',
    })
  }

  // Calculate living stats with all modifiers applied
  const liveStats = calculateModifiedStats({
    basePower,
    baseWisdom,
    baseCharisma,
    agent,
    temporalState,
    activeModifiers,
    confidence,
    now,
  })

  // Determine trends by comparing to recent history (simplified)
  const trends = calculateStatTrends(agent, liveStats)

  // Check for special state triggers
  const additionalStates = checkSpecialStateTriggers(liveStats, agent)
  specialStates.push(...additionalStates)

  // ============================================================================
  // ALCHEMICAL-THERMODYNAMIC INTEGRATION
  // ============================================================================

  // Calculate alchemical properties for this agent
  const alchemicalProps = await calculateAlchemicalProperties(agent)

  // Extract elemental values from agent's natal chart
  const elementalValues = extractElementalValues(agent)

  // Calculate thermodynamic properties using exact alchemizer formulas
  const thermodynamics = calculateThermodynamics(alchemicalProps, elementalValues)

  // Enhance Sacred Stats with alchemical influence
  const enhancedStats = enhanceStatsWithAlchemical(liveStats, alchemicalProps, thermodynamics)

  // Generate insights
  const insights = {
    dominantAlchemical: getDominantAlchemical(alchemicalProps) as
      | 'spirit'
      | 'essence'
      | 'matter'
      | 'substance',
    thermodynamicProfile: classifyThermodynamicProfile(thermodynamics) as
      | 'stable'
      | 'dynamic'
      | 'chaotic'
      | 'inert',
    consciousnessPhase: determineConsciousnessPhase(
      agent.consciousness.monicaConstant,
      alchemicalProps.aNumber,
      thermodynamics.energy
    ) as 'dormant' | 'awakening' | 'active' | 'transcendent',
  }

  return {
    // Enhanced Sacred Stats
    power: enhancedStats.power,
    resonance: enhancedStats.resonance,
    wisdom: enhancedStats.wisdom,
    charisma: enhancedStats.charisma,
    intuition: enhancedStats.intuition,
    adaptability: enhancedStats.adaptability,
    vitality: enhancedStats.vitality,
    overall: enhancedStats.overall,
    // Living Context
    birthTimeKnown,
    confidence,
    temporalState,
    activeModifiers,
    specialStates,
    trends,
    // NEW: Alchemical Foundation
    alchemical: alchemicalProps,
    // NEW: Thermodynamic Metrics
    thermodynamics,
    // NEW: Derived Insights
    insights,
  }
}

// ============================================================================
// TEMPORAL INFLUENCE ENGINE
// ============================================================================

function calculateTemporalModifiers(
  agent: CraftedAgent,
  temporal: LiveStats['temporalState'],
  kineticData?: any
): { modifiers: StatModifier[]; specialStates: SpecialState[] } {
  const modifiers: StatModifier[] = []
  const specialStates: SpecialState[] = []

  // Planetary Hour Effects
  const hourEffects = getPlanetaryHourEffects(temporal.planetaryHour, agent)
  modifiers.push(...hourEffects.modifiers)
  if (hourEffects.specialState) specialStates.push(hourEffects.specialState)

  // Moon Phase Effects
  const moonEffects = getMoonPhaseEffects(temporal.moonPhase, agent)
  modifiers.push(...moonEffects.modifiers)
  if (moonEffects.specialState) specialStates.push(moonEffects.specialState)

  // Time of Day Effects
  const hour = temporal.currentTime.getHours()
  const timeEffects = getTimeOfDayEffects(hour, agent)
  modifiers.push(...timeEffects)

  // Seasonal Effects
  if (temporal.seasonalInfluence !== 'Neutral') {
    modifiers.push({
      stat: 'adaptability',
      value: 1.1,
      source: `${temporal.seasonalInfluence} Season`,
      icon: getSeasonalIcon(temporal.seasonalInfluence),
    })
  }

  return { modifiers, specialStates }
}

function getPlanetaryHourEffects(hour: string, agent: CraftedAgent) {
  const modifiers: StatModifier[] = []
  let specialState: SpecialState | undefined

  // Universal planetary hour effects
  const hourEffects: Record<string, { stats: Record<string, number>; icon: string }> = {
    Sun: { stats: { power: 1.3, charisma: 1.2, vitality: 1.1 }, icon: '☀️' },
    Moon: { stats: { intuition: 1.4, wisdom: 1.1, adaptability: 1.2 }, icon: '🌙' },
    Mercury: { stats: { wisdom: 1.3, adaptability: 1.3, charisma: 1.1 }, icon: '☿️' },
    Venus: { stats: { charisma: 1.4, resonance: 1.2, vitality: 1.1 }, icon: '♀️' },
    Mars: { stats: { power: 1.2, vitality: 1.3, adaptability: 1.1 }, icon: '♂️' },
    Jupiter: { stats: { wisdom: 1.2, charisma: 1.2, resonance: 1.2 }, icon: '♃' },
    Saturn: { stats: { wisdom: 1.1, vitality: 0.9, power: 1.1 }, icon: '♄' },
  }

  const effects = hourEffects[hour]
  if (effects) {
    Object.entries(effects.stats).forEach(([stat, value]) => {
      modifiers.push({
        stat: stat as keyof LiveStats,
        value,
        source: `${hour} Hour`,
        icon: effects.icon,
      })
    })

    // Check if this is agent's ruling planet hour
    const ruler = getAgentRuler(agent)
    if (ruler === hour) {
      specialState = {
        name: 'Cosmic Alignment',
        description: `${agent.name} channels their ruling planet ${hour}`,
        effects: ['Enhanced all abilities', 'Heightened consciousness', 'Peak performance'],
        icon: '✨',
        startTime: new Date(),
        duration: 60, // 1 hour
      }
    }
  }

  return { modifiers, specialState }
}

function getMoonPhaseEffects(phase: string, agent: CraftedAgent) {
  const modifiers: StatModifier[] = []
  let specialState: SpecialState | undefined

  const phaseEffects: Record<string, { stats: Record<string, number>; icon: string }> = {
    'New Moon': { stats: { intuition: 0.8, power: 1.1, adaptability: 1.2 }, icon: '🌑' },
    'Waxing Crescent': { stats: { vitality: 1.1, wisdom: 1.1 }, icon: '🌒' },
    'First Quarter': { stats: { power: 1.1, charisma: 1.1 }, icon: '🌓' },
    'Waxing Gibbous': { stats: { intuition: 1.2, resonance: 1.1 }, icon: '🌔' },
    'Full Moon': { stats: { intuition: 1.5, wisdom: 1.2, charisma: 1.2 }, icon: '🌕' },
    'Waning Gibbous': { stats: { wisdom: 1.3, vitality: 1.1 }, icon: '🌖' },
    'Last Quarter': { stats: { adaptability: 1.2, resonance: 1.1 }, icon: '🌗' },
    'Waning Crescent': { stats: { intuition: 1.1, power: 0.9 }, icon: '🌘' },
  }

  const effects = phaseEffects[phase]
  if (effects) {
    Object.entries(effects.stats).forEach(([stat, value]) => {
      modifiers.push({
        stat: stat as keyof LiveStats,
        value,
        source: `${phase}`,
        icon: effects.icon,
      })
    })

    // Special Full Moon state for water-dominant agents
    if (phase === 'Full Moon' && agent.consciousness.dominantElement === 'Water') {
      specialState = {
        name: 'Lunar Amplification',
        description: 'Water element resonates with full moon energy',
        effects: ['Maximum intuition', 'Emotional depth', 'Prophetic visions'],
        icon: '🌊🌕',
        startTime: new Date(),
        duration: 180, // 3 hours around full moon
      }
    }
  }

  return { modifiers, specialState }
}

function getTimeOfDayEffects(hour: number, agent: CraftedAgent): StatModifier[] {
  const modifiers: StatModifier[] = []

  // Universal time effects
  if (hour >= 0 && hour <= 5) {
    // Midnight to dawn - intuition peak
    modifiers.push({
      stat: 'intuition',
      value: 1.3,
      source: 'Midnight Hour',
      icon: '🌃',
    })
  } else if (hour >= 6 && hour <= 11) {
    // Morning - vitality and clarity
    modifiers.push({
      stat: 'vitality',
      value: 1.2,
      source: 'Morning Energy',
      icon: '🌅',
    })
  } else if (hour >= 12 && hour <= 17) {
    // Afternoon - power and action
    modifiers.push({
      stat: 'power',
      value: 1.1,
      source: 'Solar Peak',
      icon: '☀️',
    })
  } else if (hour >= 18 && hour <= 23) {
    // Evening - wisdom and reflection
    modifiers.push({
      stat: 'wisdom',
      value: 1.2,
      source: 'Evening Reflection',
      icon: '🌆',
    })
  }

  return modifiers
}

// ============================================================================
// STAT CALCULATION ENGINE
// ============================================================================

function calculateModifiedStats(params: {
  basePower: number
  baseWisdom: number
  baseCharisma: number
  agent: CraftedAgent
  temporalState: LiveStats['temporalState']
  activeModifiers: StatModifier[]
  confidence: number
  now: Date
}): Pick<
  LiveStats,
  | 'power'
  | 'resonance'
  | 'wisdom'
  | 'charisma'
  | 'intuition'
  | 'adaptability'
  | 'vitality'
  | 'overall'
> {
  const { basePower, baseWisdom, baseCharisma, agent, activeModifiers, confidence } = params

  // Base stats from consciousness and chart
  const stats = {
    power: basePower,
    wisdom: baseWisdom,
    charisma: baseCharisma,
    intuition: Math.min(100, agent.consciousness.dominantElement === 'Water' ? 70 : 50),
    adaptability: Math.min(100, agent.consciousness.dominantModality === 'Mutable' ? 75 : 55),
    vitality: 80, // Starts high, can drain/regenerate
    resonance: 60, // Baseline resonance with cosmos
    overall: 0,
  }

  // Apply all temporal modifiers
  activeModifiers.forEach(modifier => {
    if (modifier.stat in stats) {
      const currentValue = stats[modifier.stat as keyof typeof stats]
      stats[modifier.stat as keyof typeof stats] = Math.round(currentValue * modifier.value)
    }
  })

  // Apply birth time confidence
  Object.keys(stats).forEach(key => {
    if (key !== 'overall') {
      const statKey = key as keyof typeof stats
      stats[statKey] = Math.round(stats[statKey] * (0.85 + 0.15 * confidence))
    }
  })

  // Clamp all stats to 0-100 range
  Object.keys(stats).forEach(key => {
    if (key !== 'overall') {
      const statKey = key as keyof typeof stats
      stats[statKey] = Math.max(0, Math.min(100, stats[statKey]))
    }
  })

  // Calculate overall as weighted composite
  stats.overall = Math.round(
    0.25 * stats.power +
      0.2 * stats.wisdom +
      0.15 * stats.charisma +
      0.15 * stats.intuition +
      0.1 * stats.adaptability +
      0.1 * stats.vitality +
      0.05 * stats.resonance
  )

  return stats
}

function calculateStatTrends(
  agent: CraftedAgent,
  currentStats: any
): Record<string, 'rising' | 'falling' | 'stable' | 'surging' | 'crashing'> {
  // Simplified trend calculation - in full implementation would compare to historical data
  const trends: Record<string, 'rising' | 'falling' | 'stable' | 'surging' | 'crashing'> = {}

  Object.keys(currentStats).forEach(stat => {
    if (stat !== 'overall' && stat !== 'birthTimeKnown' && stat !== 'confidence') {
      // For now, use randomized trends - would be based on actual historical comparison
      const rand = Math.random()
      if (rand > 0.8) trends[stat] = 'surging'
      else if (rand > 0.6) trends[stat] = 'rising'
      else if (rand > 0.4) trends[stat] = 'stable'
      else if (rand > 0.2) trends[stat] = 'falling'
      else trends[stat] = 'crashing'
    }
  })

  return trends
}

function checkSpecialStateTriggers(stats: any, agent: CraftedAgent): SpecialState[] {
  const specialStates: SpecialState[] = []

  // Power Surge - when power > 90
  if (stats.power > 90) {
    specialStates.push({
      name: 'Power Surge',
      description: 'Alchemical energy at maximum output',
      effects: ['Enhanced manifestation', 'Reality alteration', 'Cosmic channeling'],
      icon: '⚡💥',
      startTime: new Date(),
      duration: 30,
    })
  }

  // Wisdom Peak - when wisdom > 85 and intuition > 80
  if (stats.wisdom > 85 && stats.intuition > 80) {
    specialStates.push({
      name: 'Akashic Access',
      description: 'Direct connection to universal knowledge',
      effects: ['Prophetic insights', 'Universal wisdom', 'Cosmic downloads'],
      icon: '🔮📚',
      startTime: new Date(),
      duration: 45,
    })
  }

  // Charismatic Aura - when charisma > 90
  if (stats.charisma > 90) {
    specialStates.push({
      name: 'Magnetic Presence',
      description: 'Irresistible charismatic field active',
      effects: ['Influence amplification', 'Attraction radius', 'Leadership magnetism'],
      icon: '✨👑',
      startTime: new Date(),
      duration: 60,
    })
  }

  return specialStates
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getMoonPhase(date: Date): string {
  // Simplified moon phase calculation
  const phases = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ]

  // Approximate 29.5 day lunar cycle
  const daysSinceNewMoon = (date.getTime() / (1000 * 60 * 60 * 24)) % 29.5
  const phaseIndex = Math.floor(daysSinceNewMoon / 3.69) // 29.5 / 8 phases

  return phases[phaseIndex] || 'New Moon'
}

function getAgentRuler(agent: CraftedAgent): string {
  // Determine ruling planet from sun sign or chart ruler
  const signRulers: Record<string, string> = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Mars',
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Saturn',
    Pisces: 'Jupiter',
  }

  // Get sun sign from natal chart
  const sunSign = agent.consciousness.natalChart?.planets?.Sun?.sign || 'Leo'
  return signRulers[sunSign] || 'Sun'
}

function getSeasonalIcon(influence: string): string {
  const icons: Record<string, string> = {
    Spring: '🌱',
    Summer: '☀️',
    Autumn: '🍂',
    Winter: '❄️',
    Fire: '🔥',
    Earth: '🌍',
    Air: '💨',
    Water: '🌊',
  }
  return icons[influence] || '🌟'
}

// ============================================================================
// BACKWARDS COMPATIBILITY & CONVENIENCE FUNCTIONS
// ============================================================================

// For backwards compatibility with existing code
export async function computeAgentDerivedStats(
  agent: CraftedAgent,
  options: { location?: { lat: number; lon: number }; date?: Date } = {}
): Promise<LiveStats> {
  return computeLiveStats(agent, options)
}

// Convenience helper for sorting by power/overall
export async function getSortableMetric(
  agent: CraftedAgent,
  metric: 'power' | 'overall',
  options?: { location?: { lat: number; lon: number }; date?: Date }
): Promise<number> {
  const stats = await computeLiveStats(agent, options)
  return metric === 'power' ? stats.power : stats.overall
}

// Export the main function for clarity
export { computeLiveStats as default }
