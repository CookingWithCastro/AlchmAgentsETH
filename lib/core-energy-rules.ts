// Core Greg's Energy System Rules
// Based on Core_Gregs_Energy_System.ipynb and current-moment-chart.ipynb

import { calculateKalchm, calculateMonica } from '@/lib/thermodynamics/kalchm'

export interface AlchemicalProperties {
  spirit: number
  essence: number
  matter: number
  substance: number
}

/**
 * A-Number calculation and categorization utilities
 * A-Number = Total Spirit + Total Essence + Total Matter + Total Substance
 */
export class ANumberCalculator {
  /**
   * Calculate A-Number from alchemical properties
   */
  static calculateANumber(alchemical: AlchemicalProperties): number {
    return alchemical.spirit + alchemical.essence + alchemical.matter + alchemical.substance
  }

  /**
   * Categorize A-Number level for interpretation
   */
  static categorizeANumber(aNumber: number): string {
    if (aNumber >= 3.0) return 'Maximum Power'
    if (aNumber >= 2.5) return 'High Energy'
    if (aNumber >= 2.0) return 'Balanced Energy'
    if (aNumber >= 1.5) return 'Moderate Energy'
    if (aNumber >= 1.0) return 'Focused Energy'
    return 'Subtle Energy'
  }

  /**
   * Get A-Number interpretation for guidance
   */
  static interpretANumber(aNumber: number): string {
    const category = this.categorizeANumber(aNumber)
    switch (category) {
      case 'Maximum Power':
        return 'Maximum spiritual potency - peak transformative energy'
      case 'High Energy':
        return 'Strong transformative power - high effectiveness in all applications'
      case 'Balanced Energy':
        return 'Balanced energetic flow - optimal for both spiritual and practical work'
      case 'Moderate Energy':
        return 'Moderate spiritual influence - steady progress and development'
      case 'Focused Energy':
        return 'Focused directional energy - concentrated power for specific goals'
      case 'Subtle Energy':
        return 'Subtle but precise energy - gentle influence requiring patience'
      default:
        return 'Unclassified energy state'
    }
  }

  /**
   * Get A-Number with full analysis
   */
  static analyzeANumber(alchemical: AlchemicalProperties) {
    const aNumber = this.calculateANumber(alchemical)
    const category = this.categorizeANumber(aNumber)
    const interpretation = this.interpretANumber(aNumber)

    return {
      aNumber,
      category,
      interpretation,
      breakdown: {
        spirit: alchemical.spirit,
        essence: alchemical.essence,
        matter: alchemical.matter,
        substance: alchemical.substance,
      },
    }
  }
}

export interface ElementalProperties {
  fire: number
  water: number
  air: number
  earth: number
}

export interface ThermodynamicMetrics {
  heat: number
  entropy: number
  reactivity: number
  energy: number
}

export interface AdvancedConstants {
  kalchmConstant: number
  monicaConstant: number | null
}

/**
 * CORE THERMODYNAMIC FORMULAS
 * These are the fundamental calculations for Greg's Energy system
 */
export class GregsEnergyCalculator {
  /**
   * Calculate Heat: (Spirit² + Fire²) / (Substance + Essence + Matter + Water + Air + Earth)²
   */
  static calculateHeat(
    spirit: number,
    fire: number,
    substance: number,
    essence: number,
    matter: number,
    water: number,
    air: number,
    earth: number
  ): number {
    const numerator = Math.pow(spirit, 2) + Math.pow(fire, 2)
    const denominator = Math.pow(substance + essence + matter + water + air + earth, 2)

    // Prevent division by zero
    if (denominator === 0) return 0

    return numerator / denominator
  }

  /**
   * Calculate Entropy: (Spirit² + Substance² + Fire² + Air²) / (Essence + Matter + Earth + Water)²
   */
  static calculateEntropy(
    spirit: number,
    substance: number,
    fire: number,
    air: number,
    essence: number,
    matter: number,
    earth: number,
    water: number
  ): number {
    const numerator =
      Math.pow(spirit, 2) + Math.pow(substance, 2) + Math.pow(fire, 2) + Math.pow(air, 2)
    const denominator = Math.pow(essence + matter + earth + water, 2)

    // Prevent division by zero
    if (denominator === 0) return 0

    return numerator / denominator
  }

  /**
   * Calculate Reactivity: (Spirit² + Substance² + Essence² + Fire² + Air² + Water²) / (Matter + Earth)²
   */
  static calculateReactivity(
    spirit: number,
    substance: number,
    essence: number,
    fire: number,
    air: number,
    water: number,
    matter: number,
    earth: number
  ): number {
    const numerator =
      Math.pow(spirit, 2) +
      Math.pow(substance, 2) +
      Math.pow(essence, 2) +
      Math.pow(fire, 2) +
      Math.pow(air, 2) +
      Math.pow(water, 2)
    const denominator = Math.pow(matter + earth, 2)

    // Prevent division by zero
    if (denominator === 0) return 0

    return numerator / denominator
  }

  /**
   * Calculate Greg's Energy: Heat - (Entropy × Reactivity)
   */
  static calculateEnergy(heat: number, entropy: number, reactivity: number): number {
    return heat - entropy * reactivity
  }

  /**
   * Complete thermodynamic analysis
   */
  static analyzeThermodynamics(
    alchemical: AlchemicalProperties,
    elemental: ElementalProperties
  ): ThermodynamicMetrics {
    const { spirit, essence, matter, substance } = alchemical
    const { fire, water, air, earth } = elemental

    const heat = this.calculateHeat(spirit, fire, substance, essence, matter, water, air, earth)
    const entropy = this.calculateEntropy(
      spirit,
      substance,
      fire,
      air,
      essence,
      matter,
      earth,
      water
    )
    const reactivity = this.calculateReactivity(
      spirit,
      substance,
      essence,
      fire,
      air,
      water,
      matter,
      earth
    )
    const energy = this.calculateEnergy(heat, entropy, reactivity)

    return { heat, entropy, reactivity, energy }
  }
}

/**
 * ADVANCED CONSTANTS CALCULATOR
 * Kalchm and Monica constant calculations with negative value handling
 */
export class AdvancedConstantsCalculator {
  /**
   * Calculate K_alchm with handling for negative values
   * K_alchm = (Spirit^Spirit × Essence^Essence) / (Matter^Matter × Substance^Substance)
   */
  static calculateKalchmSafe(
    spirit: number,
    essence: number,
    matter: number,
    substance: number
  ): number {
    return calculateKalchm({ spirit, essence, matter, substance })
  }

  /**
   * Calculate Monica Constant: M = -Greg's Energy / (Reactivity × ln(K_alchm))
   */
  static calculateMonicaConstant(
    energy: number,
    reactivity: number,
    kalchmConstant: number
  ): number | null {
    return calculateMonica({
      energy,
      reactivity,
      kalchm: kalchmConstant,
    })
  }

  /**
   * Calculate both advanced constants
   */
  static calculateAdvancedConstants(
    alchemical: AlchemicalProperties,
    thermodynamics: ThermodynamicMetrics
  ): AdvancedConstants {
    const kalchmConstant = this.calculateKalchmSafe(
      alchemical.spirit,
      alchemical.essence,
      alchemical.matter,
      alchemical.substance
    )

    const monicaConstant = this.calculateMonicaConstant(
      thermodynamics.energy,
      thermodynamics.reactivity,
      kalchmConstant
    )

    return { kalchmConstant, monicaConstant }
  }
}

/**
 * PLANETARY INFLUENCE SYSTEM
 * Based on traditional astrological correspondences
 */
export const PLANETARY_MODIFIERS = {
  Sun: {
    Fire: 0.3,
    Water: -0.1,
    Air: 0.1,
    Earth: -0.1,
    Spirit: 0.2,
    Essence: 0,
    Matter: -0.1,
    Substance: 0,
  },
  Moon: {
    Fire: -0.1,
    Water: 0.3,
    Air: 0,
    Earth: 0.1,
    Spirit: 0,
    Essence: 0.2,
    Matter: 0.1,
    Substance: 0,
  },
  Mars: {
    Fire: 0.4,
    Water: -0.2,
    Air: -0.1,
    Earth: 0,
    Spirit: 0.3,
    Essence: -0.1,
    Matter: 0.2,
    Substance: -0.1,
  },
  Mercury: {
    Fire: 0.1,
    Water: 0.1,
    Air: 0.3,
    Earth: -0.1,
    Spirit: 0.1,
    Essence: 0.2,
    Matter: 0,
    Substance: 0.1,
  },
  Jupiter: {
    Fire: 0.2,
    Water: 0.2,
    Air: 0.1,
    Earth: 0.3,
    Spirit: 0.2,
    Essence: 0.1,
    Matter: 0.1,
    Substance: 0.2,
  },
  Venus: {
    Fire: -0.1,
    Water: 0.2,
    Air: 0.2,
    Earth: 0.1,
    Spirit: 0.1,
    Essence: 0.3,
    Matter: -0.1,
    Substance: 0.1,
  },
  Saturn: {
    Fire: -0.2,
    Water: -0.1,
    Air: -0.2,
    Earth: 0.4,
    Spirit: -0.1,
    Essence: -0.1,
    Matter: 0.3,
    Substance: 0.2,
  },
} as const

export const PLANETARY_HOURS = {
  Sunday: ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'],
  Monday: ['Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury'],
  Tuesday: ['Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter'],
  Wednesday: ['Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus'],
  Thursday: ['Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn'],
  Friday: ['Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun'],
  Saturday: ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'],
} as const

export class PlanetaryInfluenceCalculator {
  static getCurrentPlanetaryHour(date: Date = new Date()) {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ] as const
    const dayName = dayNames[date.getDay()]
    const hour = date.getHours()

    // Each planetary hour covers ~3.4 regular hours (24/7)
    const planetaryHourIndex = Math.floor(hour / 3.4)
    const planet = PLANETARY_HOURS[dayName][planetaryHourIndex % 7]

    return {
      planet,
      dayName,
      hour,
      planetaryHourIndex,
    }
  }

  static applyPlanetaryInfluence(
    baseAlchemical: AlchemicalProperties,
    baseElemental: ElementalProperties,
    influencingPlanet: keyof typeof PLANETARY_MODIFIERS
  ) {
    const modifiers = PLANETARY_MODIFIERS[influencingPlanet]

    return {
      alchemical: {
        spirit: baseAlchemical.spirit * (1 + (modifiers.Spirit || 0)),
        essence: baseAlchemical.essence * (1 + (modifiers.Essence || 0)),
        matter: baseAlchemical.matter * (1 + (modifiers.Matter || 0)),
        substance: baseAlchemical.substance * (1 + (modifiers.Substance || 0)),
      },
      elemental: {
        fire: baseElemental.fire * (1 + (modifiers.Fire || 0)),
        water: baseElemental.water * (1 + (modifiers.Water || 0)),
        air: baseElemental.air * (1 + (modifiers.Air || 0)),
        earth: baseElemental.earth * (1 + (modifiers.Earth || 0)),
      },
    }
  }
}

/**
 * ENERGY STATE CLASSIFICATION
 */
export class EnergyStateAnalyzer {
  static classifyEnergyState(energy: number): string {
    if (energy > 0.1) return 'High Energy - Transformative'
    if (energy > 0.0) return 'Positive Energy - Active'
    if (energy > -0.1) return 'Neutral Energy - Balanced'
    if (energy > -0.2) return 'Low Energy - Passive'
    return 'Depleted Energy - Restorative'
  }

  static interpretThermodynamics(metrics: ThermodynamicMetrics): string[] {
    const { heat, entropy, reactivity, energy } = metrics
    const interpretation: string[] = []

    // Heat interpretation
    if (heat > 0.1) interpretation.push('High heat indicates strong transformative potential')
    else if (heat < 0.05) interpretation.push('Low heat suggests need for activation')

    // Entropy interpretation
    if (entropy > 0.1) interpretation.push('High entropy indicates system disorder')
    else if (entropy < 0.05) interpretation.push('Low entropy suggests stable organization')

    // Reactivity interpretation
    if (reactivity > 0.1) interpretation.push('High reactivity shows potential for change')
    else if (reactivity < 0.05) interpretation.push('Low reactivity indicates stability')

    // Overall energy interpretation
    if (energy > 0) {
      interpretation.push("Positive Greg's Energy - system has available energy for work")
    } else {
      interpretation.push("Negative Greg's Energy - system requires energy input")
    }

    return interpretation
  }
}

/**
 * COMPLETE ANALYSIS FUNCTION
 * Integrates all systems for comprehensive energy analysis
 */
export function performCompleteEnergyAnalysis(
  baseAlchemical: AlchemicalProperties,
  baseElemental: ElementalProperties,
  date: Date = new Date()
) {
  // Get current planetary influence
  const planetaryHour = PlanetaryInfluenceCalculator.getCurrentPlanetaryHour(date)

  // Apply planetary modifiers
  const influencedProperties = PlanetaryInfluenceCalculator.applyPlanetaryInfluence(
    baseAlchemical,
    baseElemental,
    planetaryHour.planet as keyof typeof PLANETARY_MODIFIERS
  )

  // Calculate thermodynamic metrics
  const thermodynamics = GregsEnergyCalculator.analyzeThermodynamics(
    influencedProperties.alchemical,
    influencedProperties.elemental
  )

  // Calculate advanced constants
  const advancedConstants = AdvancedConstantsCalculator.calculateAdvancedConstants(
    influencedProperties.alchemical,
    thermodynamics
  )

  // Generate interpretation
  const energyState = EnergyStateAnalyzer.classifyEnergyState(thermodynamics.energy)
  const interpretation = EnergyStateAnalyzer.interpretThermodynamics(thermodynamics)

  return {
    timestamp: date.toISOString(),
    planetaryInfluence: planetaryHour,
    originalProperties: { alchemical: baseAlchemical, elemental: baseElemental },
    influencedProperties,
    thermodynamics,
    advancedConstants,
    energyState,
    interpretation,
  }
}
