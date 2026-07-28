// lib/monica/alchemical-trainer.ts
import { alchemize } from '@/lib/alchemizer'
import { PlanetaryHourCalculator } from '@/lib/planetary-hour'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { generateProfessionalHoroscope, validateBirthInfo } from './horoscope-generator'
import { calculateAveragePhiAxisIndex } from './monica-constant'
import { planetaryPositionSyncService } from '@/lib/services/planetary-position-sync'

// Types for alchemical training
export interface AlchemicalSample {
  birthInfo: BirthInfo
  alchmData: AlchemicalData
  planetaryHour?: {
    planet: string
    hourNumber: number
    isDaytime: boolean
  }
  timestamp: Date
}

export interface BirthInfo {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  latitude: number
  longitude: number
}

export interface AlchemicalData {
  spirit: number
  essence: number
  matter: number
  substance: number
  Heat: number
  Entropy: number
  Reactivity: number
  Energy: number
  [key: string]: any
}

export interface TrainingResult {
  samples: AlchemicalSample[]
  statistics: {
    averages: Record<string, number>
    stdDeviation: Record<string, number>
    correlations: Record<string, number>
    quartiles: Record<string, { q1: number; median: number; q3: number }>
  }
  patterns: {
    dominantElement: string
    peakHours: Record<string, number>
    criticalDegrees: number[]
  }
  insights: string[]
  /**
   * Aggregate Phi Axis Index across the sampled moments — a phi-weighted ratio of the
   * alchemical axes. NOT the thermodynamic Monica (see lib/thermodynamics/kalchm.ts).
   */
  phiAxisIndex?: {
    average: number
    min: number
    max: number
    stdDev: number
    interpretation: string
  }
  metadata: {
    numSamples: number
    dateRange: { start: Date; end: Date }
    locations: Array<{ latitude: number; longitude: number }>
    errors?: string[]
  }
}

export interface SynchronizedAlchemicalData extends AlchemicalData {
  sync_metadata?: {
    synchronized: boolean
    authoritative_source: string
    corrections_applied: number
    sync_timestamp: string
  }
}

// Generate random birth data with realistic distributions
function generateRandomBirthData(): BirthInfo {
  // Dynamic year range
  const currentYear = new Date().getFullYear()
  const yearWeight = Math.random()
  const year =
    yearWeight < 0.7
      ? Math.floor(Math.random() * 30) + (currentYear - 30) // 70% chance: recent 30 years
      : Math.floor(Math.random() * 70) + (currentYear - 100) // 30% chance: older

  const month = Math.floor(Math.random() * 12) + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.floor(Math.random() * daysInMonth) + 1

  // Natural birth time distribution (peaks at 2-8 AM)
  const hourRandom = Math.random()
  let hour: number
  if (hourRandom < 0.4) {
    hour = Math.floor(Math.random() * 6) + 2 // 40% chance: 2-8 AM
  } else if (hourRandom < 0.7) {
    hour = Math.floor(Math.random() * 6) + 8 // 30% chance: 8 AM - 2 PM
  } else {
    hour = Math.floor(Math.random() * 10) + 14 // 30% chance: 2 PM - midnight
  }

  const minute = Math.floor(Math.random() * 60)

  // Popular global locations with weighted selection
  const locations = [
    { latitude: 40.7128, longitude: -74.006, weight: 0.15 }, // New York
    { latitude: 51.5074, longitude: -0.1278, weight: 0.1 }, // London
    { latitude: 35.6762, longitude: 139.6503, weight: 0.1 }, // Tokyo
    { latitude: 34.0522, longitude: -118.2437, weight: 0.1 }, // Los Angeles
    { latitude: 48.8566, longitude: 2.3522, weight: 0.08 }, // Paris
    { latitude: 37.7749, longitude: -122.4194, weight: 0.08 }, // San Francisco
    { latitude: -33.8688, longitude: 151.2093, weight: 0.07 }, // Sydney
    { latitude: 19.4326, longitude: -99.1332, weight: 0.07 }, // Mexico City
    { latitude: 28.6139, longitude: 77.209, weight: 0.07 }, // New Delhi
    { latitude: -23.5505, longitude: -46.6333, weight: 0.06 }, // São Paulo
    { latitude: 52.52, longitude: 13.405, weight: 0.06 }, // Berlin
    { latitude: 55.7558, longitude: 37.6173, weight: 0.06 }, // Moscow
  ]

  const randomLocation = Math.random()
  let cumulativeWeight = 0
  let selectedLocation = locations[0]

  for (const loc of locations) {
    cumulativeWeight += loc.weight
    if (randomLocation < cumulativeWeight) {
      selectedLocation = loc
      break
    }
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    latitude: selectedLocation.latitude + (Math.random() - 0.5) * 0.1, // Small variation
    longitude: selectedLocation.longitude + (Math.random() - 0.5) * 0.1,
  }
}

// Main training function with enhanced analysis
export async function trainOnAlchemicalValues(numSamples: number = 15): Promise<TrainingResult> {
  const samples: AlchemicalSample[] = []
  const planetaryCalculator = new PlanetaryHourCalculator()
  const errors: string[] = []

  // Validate and limit sample size
  const maxSamples = 1000
  const validatedSamples = Math.min(Math.max(1, numSamples), maxSamples)
  if (numSamples > maxSamples) {
    errors.push(`Sample size limited to ${maxSamples} (requested: ${numSamples})`)
  }

  // Generate samples
  for (let i = 0; i < validatedSamples; i++) {
    const birthInfo = generateRandomBirthData()

    // Validate birth info
    const validation = validateBirthInfo(birthInfo)
    if (!validation.valid) {
      errors.push(`Sample ${i}: ${validation.errors.join(', ')}`)
      continue
    }

    const horoscope = generateProfessionalHoroscope(birthInfo, {
      useLegacyFallback: false,
      includeAccuracyMetadata: true,
    })

    // Set planetary hour calculator location
    planetaryCalculator.setCoordinates(birthInfo.latitude, birthInfo.longitude)
    const birthDate = new Date(
      birthInfo.year,
      birthInfo.month - 1,
      birthInfo.day,
      birthInfo.hour,
      birthInfo.minute
    )
    const planetaryHour = planetaryCalculator.getPlanetaryHour(birthDate)

    try {
      const alchmData = alchemize(birthInfo, horoscope)

      samples.push({
        birthInfo,
        alchmData: {
          spirit: alchmData['Alchemy Effects']?.['Total Spirit'] || 0,
          essence: alchmData['Alchemy Effects']?.['Total Essence'] || 0,
          matter: alchmData['Alchemy Effects']?.['Total Matter'] || 0,
          substance: alchmData['Alchemy Effects']?.['Total Substance'] || 0,
          Heat: alchmData['Heat'] || 0,
          Entropy: alchmData['Entropy'] || 0,
          Reactivity: alchmData['Reactivity'] || 0,
          Energy: alchmData['Energy'] || 0,
        },
        planetaryHour,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error(`Error processing sample ${i}:`, error)
      errors.push(`Sample ${i}: Failed to calculate alchemical data`)
    }
  }

  // Calculate statistics
  const statistics = calculateStatistics(samples)
  const patterns = identifyPatterns(samples)

  // Calculate the aggregate Phi Axis Index
  let phiAxisIndexAnalysis
  if (samples.length > 0) {
    phiAxisIndexAnalysis = calculateAveragePhiAxisIndex(samples.map(s => s.alchmData))
  }

  const insights = generateInsights(samples, statistics, patterns)

  // Add the Phi Axis Index insight if available
  if (phiAxisIndexAnalysis && phiAxisIndexAnalysis.average > 0) {
    insights.unshift(`Phi Axis Index Analysis: ${phiAxisIndexAnalysis.interpretation}`)
  }

  return {
    samples,
    statistics,
    patterns,
    insights,
    phiAxisIndex: phiAxisIndexAnalysis,
    metadata: {
      numSamples: validatedSamples,
      dateRange:
        samples.length > 0
          ? {
              start: new Date(Math.min(...samples.map(s => s.birthInfo.year)), 0, 1),
              end: new Date(Math.max(...samples.map(s => s.birthInfo.year)), 11, 31),
            }
          : {
              start: new Date(),
              end: new Date(),
            },
      locations: [
        ...new Set(
          samples.map(s => ({
            latitude: Math.round(s.birthInfo.latitude * 100) / 100,
            longitude: Math.round(s.birthInfo.longitude * 100) / 100,
          }))
        ),
      ],
      errors: errors.length > 0 ? errors : undefined,
    },
  }
}

// Calculate today's hourly alchemical values
export async function todayHourlyAlchemize(
  location = { latitude: 37.7749, longitude: -122.4194 },
  useBatchAPI = false
): Promise<any> {
  if (useBatchAPI) {
    try {
      const today = new Date()
      const startTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0
      ).toISOString()
      const endTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59
      ).toISOString()

      // Use centralized kinetics client
      const { AlchemicalKineticsClient } = await import('../kinetics-client')
      const response = await AlchemicalKineticsClient.put({
        lat: location.latitude,
        lon: location.longitude,
        'start-time': startTime,
        'end-time': endTime,
        'time-interval': 60,
        exportFormat: 'json',
      })
      if (!response.ok) throw new Error('Batch API failed')
      const { data } = await response.json()

      // The batch alchemy API returns ESMS scores but no planetary
      // hour. That's fine — the planetary ruler is a pure function of
      // timestamp + location, so we compute it client-side from each
      // row's Timestamp rather than asking the batch endpoint to
      // bundle it. Same PlanetaryHourCalculator the fallback path uses.
      const batchHourCalculator = new PlanetaryHourCalculator(location.latitude, location.longitude)

      // Transform batch data to match original samples format
      const samples = data.map((row: any) => {
        const rowDate = new Date(row.Timestamp)
        const planetaryHour = batchHourCalculator.getPlanetaryHour(rowDate)
        return {
          hour: rowDate.getHours(),
          spirit: row.Total_Spirit,
          essence: row.Total_Essence,
          matter: row.Total_Matter,
          substance: row.Total_Substance,
          heat: row.Heat,
          entropy: row.Entropy,
          planetaryRuler: planetaryHour.planet,
          isDaytime: planetaryHour.isDaytime,
        }
      })

      // Proceed with analysis...
      // (copy the analysis code here)

      return { samples /* add analysis */ }
    } catch (error) {
      console.error('Batch API failed, falling back to original:', error)
      // Fall back to original implementation
    }
  }

  // Original implementation as fallback
  const today = new Date()
  const samples: any[] = []
  const planetaryCalculator = new PlanetaryHourCalculator(location.latitude, location.longitude)

  for (let hour = 0; hour < 24; hour++) {
    const birthInfo = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      hour,
      minute: 0,
      latitude: location.latitude,
      longitude: location.longitude,
    }

    const horoscope = generateProfessionalHoroscope(birthInfo, {
      useLegacyFallback: false,
      includeAccuracyMetadata: true,
    })
    const hourDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0)
    const planetaryHour = planetaryCalculator.getPlanetaryHour(hourDate)

    try {
      const alchmData = alchemize(birthInfo, horoscope)
      samples.push({
        hour,
        spirit: alchmData['Alchemy Effects']?.['Total Spirit'] || 0,
        essence: alchmData['Alchemy Effects']?.['Total Essence'] || 0,
        matter: alchmData['Alchemy Effects']?.['Total Matter'] || 0,
        substance: alchmData['Alchemy Effects']?.['Total Substance'] || 0,
        heat: alchmData['Heat'] || 0,
        entropy: alchmData['Entropy'] || 0,
        planetaryRuler: planetaryHour.planet,
        isDaytime: planetaryHour.isDaytime,
      })
    } catch (error) {
      console.error(`Error processing hour ${hour}:`, error)
    }
  }

  // Analysis
  const averages = {
    spirit: samples.reduce((sum, s) => sum + s.spirit, 0) / 24,
    essence: samples.reduce((sum, s) => sum + s.essence, 0) / 24,
    matter: samples.reduce((sum, s) => sum + s.matter, 0) / 24,
    substance: samples.reduce((sum, s) => sum + s.substance, 0) / 24,
    heat: samples.reduce((sum, s) => sum + s.heat, 0) / 24,
    entropy: samples.reduce((sum, s) => sum + s.entropy, 0) / 24,
  }

  // Find peak hours
  const peakSpirit = samples.reduce((max, s, i) => (s.spirit > samples[max].spirit ? i : max), 0)
  const peakEssence = samples.reduce((max, s, i) => (s.essence > samples[max].essence ? i : max), 0)
  const peakEnergy = samples.reduce(
    (max, s, i) => (s.heat + s.spirit > samples[max].heat + samples[max].spirit ? i : max),
    0
  )

  return {
    samples,
    averages,
    peaks: {
      spirit: {
        hour: peakSpirit,
        value: samples[peakSpirit].spirit,
        ruler: samples[peakSpirit].planetaryRuler,
      },
      essence: {
        hour: peakEssence,
        value: samples[peakEssence].essence,
        ruler: samples[peakEssence].planetaryRuler,
      },
      energy: {
        hour: peakEnergy,
        value: samples[peakEnergy].heat + samples[peakEnergy].spirit,
        ruler: samples[peakEnergy].planetaryRuler,
      },
    },
    insights: [
      `Today's Spirit peaks at ${peakSpirit}:00 under ${samples[peakSpirit].planetaryRuler}'s rule`,
      `Essence is strongest at ${peakEssence}:00 with ${samples[peakEssence].planetaryRuler} governing`,
      `Maximum energy occurs at ${peakEnergy}:00 during ${samples[peakEnergy].planetaryRuler}'s hour`,
      `Average entropy today is ${averages.entropy.toFixed(2)}, suggesting ${averages.entropy > 50 ? 'high volatility' : 'stable conditions'}`,
    ],
  }
}

// Statistical calculation functions
function calculateStatistics(samples: AlchemicalSample[]): any {
  const keys = [
    'spirit',
    'essence',
    'matter',
    'substance',
    'Heat',
    'Entropy',
    'Reactivity',
    'Energy',
  ]
  const statistics: any = {
    averages: {},
    stdDeviation: {},
    correlations: {},
    quartiles: {},
  }

  // Handle empty samples
  if (samples.length === 0) {
    keys.forEach(key => {
      statistics.averages[key] = 0
      statistics.stdDeviation[key] = 0
      statistics.quartiles[key] = { q1: 0, median: 0, q3: 0 }
    })
    statistics.correlations = {
      spirit_heat: 0,
      essence_entropy: 0,
      matter_substance: 0,
    }
    return statistics
  }

  // Calculate averages and standard deviations
  keys.forEach(key => {
    const values = samples.map(s => s.alchmData[key]).filter(v => !isNaN(v))
    statistics.averages[key] = mean(values)
    statistics.stdDeviation[key] = standardDeviation(values)
    statistics.quartiles[key] = calculateQuartiles(values)
  })

  // Calculate key correlations
  statistics.correlations['spirit_heat'] = pearsonCorrelation(
    samples.map(s => s.alchmData.spirit),
    samples.map(s => s.alchmData.Heat)
  )
  statistics.correlations['essence_entropy'] = pearsonCorrelation(
    samples.map(s => s.alchmData.essence),
    samples.map(s => s.alchmData.Entropy)
  )
  statistics.correlations['matter_substance'] = pearsonCorrelation(
    samples.map(s => s.alchmData.matter),
    samples.map(s => s.alchmData.substance)
  )

  return statistics
}

// Pattern identification
function identifyPatterns(samples: AlchemicalSample[]): any {
  // Handle empty samples
  if (samples.length === 0) {
    return {
      dominantElement: 'balanced',
      peakHours: { spirit: 0, essence: 0, matter: 0, substance: 0 },
      criticalDegrees: [0, 15, 29],
    }
  }

  // Identify dominant element based on highest average
  const elementAverages = {
    fire: mean(samples.map(s => s.alchmData.spirit + s.alchmData.Heat)),
    water: mean(samples.map(s => s.alchmData.essence)),
    earth: mean(samples.map(s => s.alchmData.substance)),
    air: mean(samples.map(s => s.alchmData.matter)),
  }

  const dominantElement =
    Object.entries(elementAverages)
      .filter(([, value]) => !isNaN(value))
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'balanced'

  // Find peak hours for each component
  const hourlyAverages: Record<number, Record<string, number>> = {}
  for (let h = 0; h < 24; h++) {
    const hourSamples = samples.filter(s => s.birthInfo.hour === h)
    if (hourSamples.length > 0) {
      hourlyAverages[h] = {
        spirit: mean(hourSamples.map(s => s.alchmData.spirit)),
        essence: mean(hourSamples.map(s => s.alchmData.essence)),
        matter: mean(hourSamples.map(s => s.alchmData.matter)),
        substance: mean(hourSamples.map(s => s.alchmData.substance)),
      }
    }
  }

  const peakHours: Record<string, number> = {}
  ;['spirit', 'essence', 'matter', 'substance'].forEach(key => {
    let maxHour = 0
    let maxValue = 0
    Object.entries(hourlyAverages).forEach(([hour, values]) => {
      if (values[key] > maxValue) {
        maxValue = values[key]
        maxHour = parseInt(hour)
      }
    })
    peakHours[key] = maxHour
  })

  // Identify critical degrees (simplified)
  const criticalDegrees = [0, 15, 29] // Traditional critical degrees

  return {
    dominantElement,
    peakHours,
    criticalDegrees,
  }
}

// Generate insights
function generateInsights(samples: AlchemicalSample[], statistics: any, patterns: any): string[] {
  const insights: string[] = []

  // Basic statistics insights
  insights.push(
    `Average entropy across ${samples.length} samples: ${statistics.averages.Entropy?.toFixed(2) || 'N/A'}`
  )
  insights.push(
    `Dominant element is ${patterns.dominantElement} indicating ${getElementalInsight(patterns.dominantElement)}`
  )

  // Correlation insights
  if (Math.abs(statistics.correlations.spirit_heat) > 0.7) {
    insights.push(
      `Strong correlation (${statistics.correlations.spirit_heat.toFixed(2)}) between Spirit and Heat suggests unified consciousness patterns`
    )
  }

  // Temporal insights
  insights.push(`Peak Spirit hour: ${patterns.peakHours.spirit}:00 - optimal for intention setting`)
  insights.push(`Peak Essence hour: ${patterns.peakHours.essence}:00 - best for emotional work`)

  // Volatility insights
  if (statistics.stdDeviation.Entropy > statistics.averages.Entropy * 0.5) {
    insights.push(
      `High entropy variability (σ=${statistics.stdDeviation.Entropy?.toFixed(2) || 'N/A'}) indicates diverse consciousness states`
    )
  }

  // Planetary hour insights
  const planetaryHourCounts: Record<string, number> = {}
  samples.forEach(s => {
    if (s.planetaryHour) {
      planetaryHourCounts[s.planetaryHour.planet] =
        (planetaryHourCounts[s.planetaryHour.planet] || 0) + 1
    }
  })
  const dominantPlanet = Object.entries(planetaryHourCounts).sort(([, a], [, b]) => b - a)[0]
  if (dominantPlanet) {
    insights.push(
      `${dominantPlanet[0]} appears most frequently in samples, suggesting ${getPlanetaryInsight(dominantPlanet[0])}`
    )
  }

  return insights
}

// Helper functions
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const avg = mean(values)
  const squareDiffs = values.map(v => Math.pow(v - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

function calculateQuartiles(values: number[]): { q1: number; median: number; q3: number } {
  if (values.length === 0) return { q1: 0, median: 0, q3: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  return {
    q1: sorted[Math.floor(n * 0.25)] || 0,
    median: sorted[Math.floor(n * 0.5)] || 0,
    q3: sorted[Math.floor(n * 0.75)] || 0,
  }
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length === 0 || y.length === 0) return 0
  const n = x.length
  const meanX = mean(x)
  const meanY = mean(y)

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY
    numerator += diffX * diffY
    denomX += diffX * diffX
    denomY += diffY * diffY
  }

  const denominator = Math.sqrt(denomX * denomY)
  return denominator === 0 ? 0 : numerator / denominator
}

function getElementalInsight(element: string): string {
  const insights: Record<string, string> = {
    fire: 'high energy and transformative potential',
    water: 'emotional depth and intuitive flow',
    earth: 'grounded stability and material manifestation',
    air: 'intellectual clarity and communication',
  }
  return insights[element] || 'balanced elemental expression'
}

function getPlanetaryInsight(planet: string): string {
  const insights: Record<string, string> = {
    Sun: 'solar consciousness and vital force alignment',
    Moon: 'lunar receptivity and emotional attunement',
    Mercury: 'mercurial adaptability and mental agility',
    Venus: 'venusian harmony and aesthetic sensitivity',
    Mars: 'martial drive and assertive energy',
    Jupiter: 'jovian expansion and wisdom seeking',
    Saturn: 'saturnine discipline and structural integrity',
  }
  return insights[planet] || 'planetary influence'
}

// Advanced training with retrograde analysis
export async function trainWithRetrogrades(numSamples: number = 20): Promise<any> {
  const currentPositions = getCurrentPlanetaryPositions()
  const samples = await trainOnAlchemicalValues(numSamples)

  // Analyze impact of current retrogrades
  const retrogradeAnalysis = {
    currentRetrogrades: identifyRetrogrades(currentPositions),
    impact: calculateRetrogradeImpact(samples),
    recommendations: generateRetrogradeRecommendations(currentPositions),
  }

  return {
    ...samples,
    retrogradeAnalysis,
  }
}

function identifyRetrogrades(positions: any): string[] {
  const retrogrades: string[] = []

  if (!positions || typeof positions !== 'object') {
    return retrogrades
  }

  // Check each planet for retrograde status
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

  planets.forEach(planet => {
    const planetData = positions[planet] || positions[planet.toLowerCase()]

    if (planetData) {
      // Check if retrograde flag is explicitly set
      if (planetData.retrograde === true) {
        retrogrades.push(planet)
      }
      // Also check for 'R' indicator in various formats
      else if (typeof planetData.direction === 'string' && planetData.direction.includes('R')) {
        retrogrades.push(planet)
      }
      // Check motion indicator
      else if (planetData.motion && planetData.motion < 0) {
        retrogrades.push(planet)
      }
    }
  })

  return retrogrades
}

function calculateRetrogradeImpact(_samples: any): any {
  // Calculate how retrogrades affect alchemical values
  // Currently returns static modifiers, will be enhanced with actual sample analysis
  return {
    entropyModifier: 1.15, // Retrogrades increase entropy by 15%
    essenceModifier: 1.08, // Slight increase in essence during retrogrades
  }
}

function generateRetrogradeRecommendations(_positions: any): string[] {
  // Generate recommendations based on current planetary positions
  // Will be enhanced to provide position-specific guidance
  return [
    'Current planetary configuration suggests introspective work',
    'Enhanced essence values indicate favorable conditions for emotional processing',
    'Consider reducing external initiatives during retrograde periods',
  ]
}

function formatAlchemicalData(alchmData: Record<string, any>): AlchemicalData {
  return {
    spirit: alchmData['Alchemy Effects']?.['Total Spirit'] || 0,
    essence: alchmData['Alchemy Effects']?.['Total Essence'] || 0,
    matter: alchmData['Alchemy Effects']?.['Total Matter'] || 0,
    substance: alchmData['Alchemy Effects']?.['Total Substance'] || 0,
    Heat: alchmData['Heat'] || 0,
    Entropy: alchmData['Entropy'] || 0,
    Reactivity: alchmData['Reactivity'] || 0,
    Energy: alchmData['Energy'] || 0,
  }
}

/**
 * Generate alchemical data using cross-backend synchronized planetary positions
 * This function provides the highest accuracy by synchronizing VSOP87 calculations
 * with WhatToEatNext's planetary position rectification service.
 */
export async function generateSynchronizedAlchmForBirthInfo(
  birthInfo: BirthInfo
): Promise<SynchronizedAlchemicalData> {
  try {
    // First, synchronize planetary positions
    const birthDate = new Date(
      birthInfo.year,
      birthInfo.month - 1, // Convert to 0-based month
      birthInfo.day,
      birthInfo.hour,
      birthInfo.minute
    )

    const syncResult = await planetaryPositionSyncService.synchronizePositions(birthDate)

    if (!syncResult.success) {
      console.warn('Planetary position synchronization failed, falling back to local VSOP87')
      // Fallback to original implementation
      const horoscope = await generateProfessionalHoroscope(birthInfo, {
        useLegacyFallback: false,
      })
      return formatAlchemicalData(alchemize(birthInfo, horoscope))
    }

    // Generate horoscope with synchronized positions
    const horoscope = await generateProfessionalHoroscope(birthInfo, {
      synchronizedPositions: syncResult.synchronized_positions,
      useLegacyFallback: false, // WTEN engine is 100% reliable now
    })

    const alchmData = formatAlchemicalData(
      alchemize(birthInfo, horoscope)
    ) as SynchronizedAlchemicalData

    // Add synchronization metadata
    alchmData.sync_metadata = {
      synchronized: true,
      authoritative_source: syncResult.sync_report.authoritative_source,
      corrections_applied: syncResult.sync_report.corrections_applied,
      sync_timestamp: new Date().toISOString(),
    }

    return alchmData
  } catch (error) {
    console.error('Synchronized alchemical calculation failed:', error)

    // Fallback to original implementation
    try {
      const horoscope = await generateProfessionalHoroscope(birthInfo, {
        useLegacyFallback: false,
      })
      return formatAlchemicalData(alchemize(birthInfo, horoscope))
    } catch (fallbackError) {
      console.error('Fallback alchemical calculation also failed:', fallbackError)
      throw new Error(`Alchemical calculation failed: ${(error as any).message}`)
    }
  }
}

/**
 * Batch process multiple birth infos with synchronized planetary positions
 * Optimized for performance with caching and parallel processing
 */
export async function generateBatchSynchronizedAlchm(
  birthInfos: BirthInfo[],
  options: {
    maxConcurrency?: number
    enableCache?: boolean
    progressCallback?: (completed: number, total: number) => void
  } = {}
): Promise<SynchronizedAlchemicalData[]> {
  const { maxConcurrency = 5, enableCache = true, progressCallback } = options
  const results: SynchronizedAlchemicalData[] = []

  // Process in batches to avoid overwhelming the sync service
  for (let i = 0; i < birthInfos.length; i += maxConcurrency) {
    const batch = birthInfos.slice(i, i + maxConcurrency)

    const batchPromises = batch.map(async birthInfo => {
      try {
        return await generateSynchronizedAlchmForBirthInfo(birthInfo)
      } catch (error) {
        console.error(
          `Failed to process birth info for ${birthInfo.year}-${birthInfo.month}-${birthInfo.day}:`,
          error
        )

        // Return fallback result
        const fallbackHoroscope = await generateProfessionalHoroscope(birthInfo, {
          useLegacyFallback: true,
        })
        const fallbackData = alchemize(birthInfo, fallbackHoroscope) as SynchronizedAlchemicalData
        fallbackData.sync_metadata = {
          synchronized: false,
          authoritative_source: 'fallback_error',
          corrections_applied: 0,
          sync_timestamp: new Date().toISOString(),
        }
        return fallbackData
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Report progress
    if (progressCallback) {
      progressCallback(Math.min(i + maxConcurrency, birthInfos.length), birthInfos.length)
    }
  }

  return results
}

/**
 * Get synchronization health and recommendations for alchemical calculations
 */
export async function getAlchemicalSyncHealth(): Promise<{
  sync_available: boolean
  accuracy_level: 'high' | 'medium' | 'low'
  recommendations: string[]
  last_sync_status?: any
}> {
  try {
    const health = await planetaryPositionSyncService.getHealthStatus()
    const syncStatus = await planetaryPositionSyncService.getSyncStatus()

    const recommendations: string[] = []

    if (health.overall_health === 'healthy') {
      recommendations.push('Cross-backend synchronization is fully operational')
      recommendations.push('Using highest accuracy VSOP87 + rectification calculations')
    } else if (health.overall_health === 'warning') {
      recommendations.push('Partial synchronization available, some accuracy optimizations limited')
      recommendations.push('Consider checking WhatToEatNext connectivity')
    } else {
      recommendations.push('Synchronization unavailable, using local VSOP87 calculations only')
      recommendations.push('Check cross-backend connectivity and API keys')
    }

    return {
      sync_available: health.overall_health === 'healthy',
      accuracy_level:
        health.overall_health === 'healthy'
          ? 'high'
          : health.overall_health === 'warning'
            ? 'medium'
            : 'low',
      recommendations,
      last_sync_status: syncStatus,
    }
  } catch (error) {
    console.error('Failed to get alchemical sync health:', error)
    return {
      sync_available: false,
      accuracy_level: 'low',
      recommendations: [
        'Synchronization health check failed',
        'Using local VSOP87 calculations as fallback',
        'Check system connectivity and configuration',
      ],
    }
  }
}
