// Planetary Rules Index
// Complete system for astrological analysis and energy calculation

// Core energy calculation system
export * from './core-energy-rules'

// Astrological chart analysis
export * from './astrological-chart-rules'

// Food recommendations based on energy states
export * from './food-recommendation-rules'

// Daily tracking and pattern recognition
export * from './daily-tracking-rules'

// Import all classes for easy access
import {
  GregsEnergyCalculator,
  PlanetaryInfluenceCalculator,
  AdvancedConstantsCalculator,
} from './core-energy-rules'
import {
  CriticalDegreeAnalyzer,
  ChartTypeAnalyzer,
  ModalityAnalyzer,
  ElementalAnalyzer,
  AspectAnalyzer,
  ComprehensiveChartAnalyzer,
  PlanetaryPositionAnalyzer,
} from './astrological-chart-rules'
import {
  KalchmFoodAnalyzer,
  PlanetaryMealTiming,
  SeasonalFoodAdjustments,
  FOOD_PROFILES,
} from './food-recommendation-rules'
import {
  DailyEnergyTracker,
  RisingSignPrecisionTracker,
  PatternRecognitionSystem,
} from './daily-tracking-rules'

/**
 * PLANETARY RULES SYSTEM
 * Main orchestrator for all astrological calculations and analysis
 */
export class PlanetaryRulesSystem {
  // Core calculators
  static readonly energyCalculator = GregsEnergyCalculator
  static readonly planetaryInfluence = PlanetaryInfluenceCalculator
  static readonly planetaryHours = PlanetaryInfluenceCalculator

  // Chart analyzers
  static readonly criticalDegrees = CriticalDegreeAnalyzer
  static readonly chartType = ChartTypeAnalyzer
  static readonly modality = ModalityAnalyzer
  static readonly elemental = ElementalAnalyzer
  static readonly aspects = AspectAnalyzer
  static readonly chartAnalyzer = ComprehensiveChartAnalyzer
  static readonly planetaryPositions = PlanetaryPositionAnalyzer

  // Food recommendation system
  static readonly foodAnalyzer = KalchmFoodAnalyzer
  static readonly mealTiming = PlanetaryMealTiming
  static readonly seasonalFood = SeasonalFoodAdjustments
  static readonly foodProfiles = FOOD_PROFILES

  // Daily tracking system
  static readonly dailyTracker = DailyEnergyTracker
  static readonly precisionTracker = RisingSignPrecisionTracker
  static readonly patternRecognition = PatternRecognitionSystem

  /**
   * COMPLETE ANALYSIS PIPELINE
   * Performs full analysis of current astrological moment
   */
  static performCompleteAnalysis(
    birthInfo: {
      year: number
      month: number
      day: number
      hour: number
      minute: number
      latitude: number
      longitude: number
    },
    currentChart: any // From alchemizer or API
  ): {
    energyAnalysis: any
    chartAnalysis: any
    foodRecommendations: any
    dailyGuidance: any
    alerts: string[]
  } {
    try {
      // Extract core values from chart
      const alchemicalValues = {
        spirit: currentChart.alchemy_effects?.spirit || 0,
        essence: currentChart.alchemy_effects?.essence || 0,
        matter: currentChart.alchemy_effects?.matter || 0,
        substance: currentChart.alchemy_effects?.substance || 0,
      }

      const elementalValues = {
        fire: currentChart.elements?.Fire || 0,
        water: currentChart.elements?.Water || 0,
        air: currentChart.elements?.Air || 0,
        earth: currentChart.elements?.Earth || 0,
      }

      // Calculate thermodynamics
      const thermodynamics = this.energyCalculator.analyzeThermodynamics(
        alchemicalValues,
        elementalValues
      )

      // Calculate advanced constants
      const constants = {
        kalchmConstant: AdvancedConstantsCalculator.calculateKalchmSafe(
          alchemicalValues.spirit,
          alchemicalValues.essence,
          alchemicalValues.matter,
          alchemicalValues.substance
        ),
        monicaConstant: AdvancedConstantsCalculator.calculateMonicaConstant(
          thermodynamics.energy,
          thermodynamics.reactivity,
          AdvancedConstantsCalculator.calculateKalchmSafe(
            alchemicalValues.spirit,
            alchemicalValues.essence,
            alchemicalValues.matter,
            alchemicalValues.substance
          )
        ),
      }

      // Energy analysis
      const energyAnalysis = {
        alchemical: alchemicalValues,
        elemental: elementalValues,
        thermodynamics,
        constants,
        planetaryInfluence: PlanetaryInfluenceCalculator.getCurrentPlanetaryHour(new Date()),
        currentHour: this.planetaryHours.getCurrentPlanetaryHour(new Date()),
      }

      // Chart analysis
      const chartData = {
        timestamp: new Date().toISOString(),
        sunSign: currentChart.sun_sign || 'Unknown',
        sunDegree: currentChart.sun_degree || 0,
        chartRuler: currentChart.chart_ruler || 'Unknown',
        dominantElement: currentChart.dominant_element || 'Unknown',
        dominantModality: currentChart.dominant_modality || 'Unknown',
        chartType: this.chartType.determineChartType(birthInfo.hour, birthInfo.minute),
        alchemyEffects: {
          spirit: alchemicalValues.spirit,
          essence: alchemicalValues.essence,
          matter: alchemicalValues.matter,
          substance: alchemicalValues.substance,
          dayEssence: currentChart.alchemy_effects?.day_essence || 0,
          nightEssence: currentChart.alchemy_effects?.night_essence || 0,
          totalPower: Object.values(alchemicalValues).reduce((sum, val) => sum + val, 0),
        },
        elements: {
          Air: elementalValues.air,
          Fire: elementalValues.fire,
          Water: elementalValues.water,
          Earth: elementalValues.earth,
        },
        modalities: currentChart.modalities || { Cardinal: 0, Fixed: 0, Mutable: 0 },
        chartMetrics: thermodynamics,
        kalchmConstant: constants.kalchmConstant,
        monicaConstant: constants.monicaConstant ?? undefined,
      }

      const chartAnalysis = this.chartAnalyzer.analyzeChart(chartData)

      // Food recommendations
      const foodRecommendations = this.foodAnalyzer.analyzeFoodNeeds(
        alchemicalValues,
        elementalValues,
        thermodynamics,
        constants
      )

      // Daily guidance
      const currentState = this.dailyTracker.analyzeCurrentState()
      const dailyInsights = this.dailyTracker.generateDailyInsights(new Date())

      const dailyGuidance = {
        currentState,
        dailyInsights,
        optimalTiming: this.mealTiming.getOptimalMealTiming(energyAnalysis.currentHour.planet),
      }

      // Collect alerts
      const alerts: string[] = [...chartAnalysis.cautionAreas, ...currentState.alerts]

      // Add system-level alerts
      if (Math.abs(thermodynamics.energy) > 0.5) {
        alerts.push('EXTREME energy state detected - proceed with caution')
      }

      if (
        constants.kalchmConstant < -2 ||
        (constants.monicaConstant !== null && constants.monicaConstant < -2)
      ) {
        alerts.push('Advanced constants showing extreme values - verify calculations')
      }

      return {
        energyAnalysis,
        chartAnalysis,
        foodRecommendations,
        dailyGuidance,
        alerts,
      }
    } catch (error) {
      return {
        energyAnalysis: null,
        chartAnalysis: null,
        foodRecommendations: null,
        dailyGuidance: null,
        alerts: [`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  /**
   * VALIDATION SYSTEM
   * Ensures all calculations follow the core principles
   */
  static validateCalculations(results: any): {
    isValid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []
    let isValid = true

    // Validate core energy formulas
    if (results.energyAnalysis?.thermodynamics) {
      const { heat, entropy, reactivity, energy } = results.energyAnalysis.thermodynamics

      // Check for impossible values
      if (heat < 0) {
        errors.push('Heat cannot be negative - check calculation')
        isValid = false
      }

      if (entropy < 0) {
        errors.push('Entropy cannot be negative - check calculation')
        isValid = false
      }

      if (reactivity < 0) {
        errors.push('Reactivity cannot be negative - check calculation')
        isValid = false
      }

      // Check Greg's Energy formula: Heat - (Entropy × Reactivity)
      const expectedGregsEnergy = heat - entropy * reactivity
      const diff = Math.abs(energy - expectedGregsEnergy)
      if (diff > 0.001) {
        errors.push(
          `Greg's Energy calculation mismatch: expected ${expectedGregsEnergy}, got ${energy}`
        )
        isValid = false
      }
    }

    // Validate elemental logic - no opposing elements
    if (results.foodRecommendations) {
      const { reasoning } = results.foodRecommendations

      // Check for incorrect elemental opposition language
      const opposingTerms = [
        'opposing',
        'opposite',
        'balance fire with water',
        'balance earth with air',
      ]
      opposingTerms.forEach(term => {
        if (reasoning.toLowerCase().includes(term)) {
          warnings.push(
            `Elemental logic warning: found "${term}" - elements should not be treated as opposing`
          )
        }
      })
    }

    // Validate alchemizer core functionality
    if (results.chartAnalysis?.sunSign && !results.chartAnalysis.chartRuler) {
      warnings.push('Chart ruler missing - may affect accuracy')
    }

    // Validate constant calculations
    if (results.energyAnalysis?.constants) {
      const { kalchmConstant, monicaConstant } = results.energyAnalysis.constants

      if (isNaN(kalchmConstant) || !isFinite(kalchmConstant)) {
        errors.push('Kalchm constant calculation failed')
        isValid = false
      }

      if (
        monicaConstant === null ||
        Number.isNaN(monicaConstant) ||
        !Number.isFinite(monicaConstant)
      ) {
        errors.push('Monica constant calculation failed')
        isValid = false
      }
    }

    return { isValid, warnings, errors }
  }

  /**
   * SYSTEM HEALTH CHECK
   * Verifies all components are working correctly
   */
  static performSystemHealthCheck(): {
    status: 'Healthy' | 'Warning' | 'Error'
    componentStatus: Record<string, 'OK' | 'Warning' | 'Error'>
    recommendations: string[]
  } {
    const componentStatus: Record<string, 'OK' | 'Warning' | 'Error'> = {}
    const recommendations: string[] = []

    // Test core energy calculator
    try {
      const testAlchemical = { spirit: 1, essence: 1, matter: 1, substance: 1 }
      const testElemental = { fire: 1, water: 1, air: 1, earth: 1 }
      const result = this.energyCalculator.analyzeThermodynamics(testAlchemical, testElemental)

      if (result.energy !== undefined && isFinite(result.energy)) {
        componentStatus['Energy Calculator'] = 'OK'
      } else {
        componentStatus['Energy Calculator'] = 'Error'
        recommendations.push('Fix energy calculation core formulas')
      }
    } catch (error) {
      componentStatus['Energy Calculator'] = 'Error'
      recommendations.push('Energy calculator throwing exceptions')
    }

    // Test chart analyzer
    try {
      const testChart = {
        timestamp: new Date().toISOString(),
        sunSign: 'Test',
        sunDegree: 15,
        chartRuler: 'Test',
        dominantElement: 'Air',
        dominantModality: 'Cardinal',
        chartType: 'Diurnal' as const,
        alchemyEffects: {
          spirit: 0,
          essence: 0,
          matter: 0,
          substance: 0,
          dayEssence: 0,
          nightEssence: 0,
          totalPower: 0,
        },
        elements: { Air: 0, Fire: 0, Water: 0, Earth: 0 },
        modalities: { Cardinal: 0, Fixed: 0, Mutable: 0 },
        chartMetrics: { heat: 0, entropy: 0, reactivity: 0, energy: 0 },
      }

      const analysis = this.chartAnalyzer.analyzeChart(testChart)
      if (analysis.overallAssessment) {
        componentStatus['Chart Analyzer'] = 'OK'
      } else {
        componentStatus['Chart Analyzer'] = 'Warning'
        recommendations.push('Chart analyzer may have issues')
      }
    } catch (error) {
      componentStatus['Chart Analyzer'] = 'Error'
      recommendations.push('Chart analyzer failing')
    }

    // Test food analyzer
    try {
      const testResult = this.foodAnalyzer.analyzeFoodNeeds(
        { spirit: 0, essence: 0, matter: 0, substance: 0 },
        { fire: 0, water: 0, air: 0, earth: 0 },
        { heat: 0, entropy: 0, reactivity: 0, energy: 0 },
        { kalchmConstant: 0, monicaConstant: 0 }
      )

      if (testResult.primaryFoods && testResult.reasoning) {
        componentStatus['Food Analyzer'] = 'OK'
      } else {
        componentStatus['Food Analyzer'] = 'Warning'
        recommendations.push('Food analyzer may need attention')
      }
    } catch (error) {
      componentStatus['Food Analyzer'] = 'Error'
      recommendations.push('Food analyzer system error')
    }

    // Determine overall status
    const hasErrors = Object.values(componentStatus).includes('Error')
    const hasWarnings = Object.values(componentStatus).includes('Warning')

    let status: 'Healthy' | 'Warning' | 'Error'
    if (hasErrors) {
      status = 'Error'
    } else if (hasWarnings) {
      status = 'Warning'
    } else {
      status = 'Healthy'
    }

    if (status === 'Healthy') {
      recommendations.push('All systems operational')
    }

    return {
      status,
      componentStatus,
      recommendations,
    }
  }
}

// Export the main system for easy access
export default PlanetaryRulesSystem
