/**
 * Unified Planetary Positions Service
 * ===================================
 *
 * Provides accurate, cached, and resilient planetary position calculations
 * with comprehensive fallback hierarchy for maximum reliability.
 */

import { CircuitBreaker, withRetries } from '@/lib/resilience'
import { EnhancedBirthInfo, calculateAllPlanets } from '@/lib/enhanced-astronomical-calculator'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { performanceCache } from '@/lib/performance-cache'
import { swissEphemerisService } from '@/lib/swiss-ephemeris-service'

export interface PlanetaryPosition {
  planet: string
  sign: string
  degree: number // 0-29.9999 within sign
  longitude?: number // 0-360 absolute longitude
  retrograde: boolean
  speed?: number // degrees per day
}

export interface AlchemicalQuantities {
  spirit: number
  essence: number
  matter: number
  substance: number
  Heat: number
  Entropy: number
  Reactivity: number
  Energy: number
}

export interface PlanetaryData {
  timestamp: string
  planetaryPositions: PlanetaryPosition[]
  alchmQuantities?: AlchemicalQuantities
  monicaConstant?: number
  source: 'external-api' | 'enhanced-calculator' | 'basic-transits' | 'static-fallback'
  accuracy: 'high' | 'medium' | 'low' | 'fallback'
  cached: boolean
  cacheAge?: number // milliseconds since cached
  error?: string
}

export type AccuracyLevel = 'high' | 'medium' | 'low' | 'fallback'

interface ServiceOptions {
  accuracy: AccuracyLevel
  useCache: boolean
  timeout: number
  retryAttempts: number
}

const DEFAULT_OPTIONS: Required<ServiceOptions> = {
  accuracy: 'high',
  useCache: true,
  timeout: 10000,
  retryAttempts: 2,
}

// Circuit breakers for different services
const swissEphemCB = new CircuitBreaker()
const enhancedCalcCB = new CircuitBreaker()
const basicTransitsCB = new CircuitBreaker()

export class PlanetaryPositionsService {
  private cache = new Map<string, { data: PlanetaryData; timestamp: number; expiresAt: number }>()
  private readonly cacheTTL = {
    high: 5 * 60 * 1000, // 5 minutes for high accuracy
    medium: 15 * 60 * 1000, // 15 minutes for medium
    low: 60 * 60 * 1000, // 1 hour for low
    fallback: 24 * 60 * 60 * 1000, // 24 hours for fallback
  }

  /**
   * Generate cache key for planetary data
   */
  private generateCacheKey(date: Date, accuracy: AccuracyLevel): string {
    // Cache by hour for high/medium, by day for low/fallback
    const precision = accuracy === 'high' || accuracy === 'medium' ? 'hour' : 'day'
    const timeKey =
      precision === 'hour'
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
        : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

    return `planetary-${precision}-${timeKey}-${accuracy}`
  }

  /**
   * Get cached data if available and valid
   */
  private getCachedData(date: Date, accuracy: AccuracyLevel): PlanetaryData | null {
    const key = this.generateCacheKey(date, accuracy)
    const cached = this.cache.get(key)

    if (!cached) return null

    const now = Date.now()
    if (now > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return {
      ...cached.data,
      cached: true,
      cacheAge: now - cached.timestamp,
    }
  }

  /**
   * Cache planetary data
   */
  private setCachedData(date: Date, accuracy: AccuracyLevel, data: PlanetaryData): void {
    const key = this.generateCacheKey(date, accuracy)
    const ttl = this.cacheTTL[accuracy]

    this.cache.set(key, {
      data: { ...data, cached: false },
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })

    // Cleanup old cache entries (keep last 100)
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )

      entries.slice(0, 20).forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Method 1: Swiss Ephemeris (highest accuracy - ±0.01°)
   */
  private async fetchFromSwissEphemeris(
    date: Date,
    options: ServiceOptions
  ): Promise<PlanetaryData> {
    try {
      const result = await swissEphemCB.exec(async () => {
        return await Promise.race([
          swissEphemerisService.getAllPlanetaryPositions(date, 0, 0),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Swiss Ephemeris timeout')), options.timeout)
          ),
        ])
      })

      if (!result.result || Object.keys(result.result).length === 0) {
        throw new Error('Swiss Ephemeris returned no result')
      }

      const swissPositions = result.result as Record<string, any>

      const planetaryPositions: PlanetaryPosition[] = Object.entries(swissPositions).map(
        ([planet, pos]: [string, any]) => ({
          planet,
          sign: pos.sign || 'Aries',
          degree: Math.max(0, Math.min(29.9999, pos.degree || 0)),
          longitude: pos.longitude,
          retrograde: Boolean(pos.retrograde),
          speed: pos.speed,
        })
      )

      console.log(`[Swiss Ephemeris] Calculated ${planetaryPositions.length} planetary positions`)

      return {
        timestamp: date.toISOString(),
        planetaryPositions,
        source: 'external-api', // Use external-api to indicate highest accuracy
        accuracy: 'high',
        cached: false,
      }
    } catch (error) {
      console.warn('Swiss Ephemeris failed:', error)
      throw error
    }
  }

  /**
   * Method 2: Enhanced Astronomical Calculator (high accuracy)
   */
  private async fetchFromEnhancedCalculator(
    date: Date,
    options: ServiceOptions
  ): Promise<PlanetaryData> {
    try {
      const birthInfo: EnhancedBirthInfo = {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        latitude: 0, // Not needed for planetary positions
        longitude: 0,
      }

      const result = await enhancedCalcCB.exec(async () => {
        return await Promise.race([
          calculateAllPlanets(birthInfo),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Enhanced calculator timeout')), options.timeout)
          ),
        ])
      })

      if (!result.result) {
        throw new Error('Enhanced calculator returned no result')
      }

      const planetaryPositions: PlanetaryPosition[] = Object.entries(
        (result.result as any).planets
      ).map(([planet, pos]: [string, any]) => ({
        planet,
        sign: pos.sign || 'Aries',
        degree: Math.max(0, Math.min(29.9999, pos.signDegree || 0)),
        longitude: pos.longitude,
        retrograde: Boolean(pos.retrograde),
        speed: pos.speed,
      }))

      return {
        timestamp: date.toISOString(),
        planetaryPositions,
        source: 'enhanced-calculator',
        accuracy: 'high',
        cached: false,
      }
    } catch (error) {
      console.warn('Enhanced calculator failed:', error)
      throw error
    }
  }

  /**
   * Method 3: Basic Transit Calculations (medium accuracy)
   */
  private async fetchFromBasicTransits(
    date: Date,
    options: ServiceOptions
  ): Promise<PlanetaryData> {
    try {
      const result = await basicTransitsCB.exec(async () => {
        return await Promise.race([
          getCurrentPlanetaryPositions(date),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Basic transits timeout')), options.timeout)
          ),
        ])
      })

      if (!result.result) {
        throw new Error('Basic transits returned no result')
      }

      const planetaryPositions: PlanetaryPosition[] = Object.entries(result.result).map(
        ([planet, pos]: [string, any]) => ({
          planet,
          sign: pos.sign || 'Aries',
          degree: Math.max(0, Math.min(29.9999, parseFloat(pos.degree) || 0)),
          retrograde: Boolean(pos.retrograde),
        })
      )

      return {
        timestamp: date.toISOString(),
        planetaryPositions,
        source: 'basic-transits',
        accuracy: 'medium',
        cached: false,
      }
    } catch (error) {
      console.warn('Basic transits failed:', error)
      throw error
    }
  }

  /**
   * Method 4: Static Fallback Positions (low accuracy, guaranteed availability)
   * Updated to July 2026 Barbault Cradle alignment positions
   */
  private getStaticFallbackPositions(date: Date): PlanetaryData {
    // Positions as of July 2026 Barbault Cradle Alignment
    const planetaryPositions: PlanetaryPosition[] = [
      { planet: 'Sun', sign: 'Leo', degree: 0.8, retrograde: false },
      { planet: 'Moon', sign: 'Scorpio', degree: 25.7, retrograde: false },
      { planet: 'Mercury', sign: 'Cancer', degree: 16.3, retrograde: true },
      { planet: 'Venus', sign: 'Virgo', degree: 15.3, retrograde: false },
      { planet: 'Mars', sign: 'Gemini', degree: 17.4, retrograde: false },
      { planet: 'Jupiter', sign: 'Leo', degree: 4.0, retrograde: false },
      { planet: 'Saturn', sign: 'Aries', degree: 14.7, retrograde: false },
      { planet: 'Uranus', sign: 'Gemini', degree: 4.0, retrograde: false },
      { planet: 'Neptune', sign: 'Aries', degree: 4.0, retrograde: true },
      { planet: 'Pluto', sign: 'Aquarius', degree: 4.0, retrograde: true },
    ]

    return {
      timestamp: date.toISOString(),
      planetaryPositions,
      source: 'static-fallback',
      accuracy: 'fallback',
      cached: false,
      error: 'All calculation methods failed, using static fallback positions (July 2026)',
    }
  }

  /**
   * Main method to get planetary positions with automatic fallback hierarchy
   */
  async getPlanetaryPositions(
    date: Date = new Date(),
    options: Partial<ServiceOptions> = {}
  ): Promise<PlanetaryData> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Try cache first if enabled
    if (opts.useCache) {
      const cached = this.getCachedData(date, opts.accuracy)
      if (cached) {
        return cached
      }
    }

    // Fallback hierarchy based on accuracy requirement
    const methods: Array<{
      method: () => Promise<PlanetaryData | null>
      source: PlanetaryData['source']
      accuracy: PlanetaryData['accuracy']
    }> = []

    if (opts.accuracy === 'high') {
      methods.push(
        {
          method: () => this.fetchFromSwissEphemeris(date, opts),
          source: 'external-api',
          accuracy: 'high',
        },
        {
          method: () => this.fetchFromEnhancedCalculator(date, opts),
          source: 'enhanced-calculator',
          accuracy: 'high',
        },
        {
          method: () => this.fetchFromBasicTransits(date, opts),
          source: 'basic-transits',
          accuracy: 'medium',
        }
      )
    } else if (opts.accuracy === 'medium') {
      methods.push(
        {
          method: () => this.fetchFromSwissEphemeris(date, opts),
          source: 'external-api',
          accuracy: 'high',
        },
        {
          method: () => this.fetchFromEnhancedCalculator(date, opts),
          source: 'enhanced-calculator',
          accuracy: 'high',
        },
        {
          method: () => this.fetchFromBasicTransits(date, opts),
          source: 'basic-transits',
          accuracy: 'medium',
        }
      )
    } else if (opts.accuracy === 'low') {
      methods.push(
        {
          method: () => this.fetchFromSwissEphemeris(date, opts),
          source: 'external-api',
          accuracy: 'high',
        },
        {
          method: () => this.fetchFromBasicTransits(date, opts),
          source: 'basic-transits',
          accuracy: 'medium',
        }
      )
    }

    // Always have static fallback as last resort
    methods.push({
      method: () => Promise.resolve(this.getStaticFallbackPositions(date)),
      source: 'static-fallback',
      accuracy: 'fallback',
    })

    // Try methods in order
    for (const { method, source, accuracy } of methods) {
      try {
        const result = await method()
        if (result) {
          // Cache successful result if caching is enabled
          if (opts.useCache) {
            this.setCachedData(date, opts.accuracy, result)
          }

          return result
        }
      } catch (error) {
        console.warn(`${source} method failed:`, error)
        continue
      }
    }

    // This should never happen due to static fallback, but just in case
    throw new Error('All planetary position calculation methods failed')
  }

  /**
   * Get planetary positions with alchemical calculations
   * Uses local calculation functions (no backend dependency)
   */
  async getPlanetaryPositionsWithAlchemy(
    date: Date = new Date(),
    options: Partial<ServiceOptions> = {}
  ): Promise<PlanetaryData> {
    const planetaryData = await this.getPlanetaryPositions(date, options)

    // Calculate alchemical data using local functions (no API call needed)
    try {
      // Import local alchemical calculation functions
      const { generateAlchmForCurrentMoment } = await import('@/lib/alchemizer')
      const { calculateMC } = await import('@/lib/monica/monica-constant-validator')

      // Generate alchemical data for the current moment
      const alchm = await generateAlchmForCurrentMoment()

      if (alchm) {
        const spirit = alchm['Alchemy Effects']?.['Total Spirit'] || 0
        const essence = alchm['Alchemy Effects']?.['Total Essence'] || 0
        const matter = alchm['Alchemy Effects']?.['Total Matter'] || 0
        const substance = alchm['Alchemy Effects']?.['Total Substance'] || 0

        const fire = alchm['Total Effect Value']?.['Fire'] || 0
        const water = alchm['Total Effect Value']?.['Water'] || 0
        const air = alchm['Total Effect Value']?.['Air'] || 0
        const earth = alchm['Total Effect Value']?.['Earth'] || 0

        planetaryData.alchmQuantities = {
          spirit,
          essence,
          matter,
          substance,
          Heat: alchm['Heat'] || 0,
          Entropy: alchm['Entropy'] || 0,
          Reactivity: alchm['Reactivity'] || 0,
          Energy: alchm['Energy'] || 0,
        }

        planetaryData.monicaConstant = calculateMC(
          spirit,
          essence,
          matter,
          substance,
          fire,
          water,
          air,
          earth
        )
      }
    } catch (error) {
      console.warn('Failed to calculate alchemical data locally:', error)
      // Continue without alchemical data rather than failing
    }

    return planetaryData
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; hitRate?: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Validate planetary position data
   */
  validatePositions(positions: PlanetaryPosition[]): boolean {
    if (!Array.isArray(positions) || positions.length === 0) {
      return false
    }

    for (const pos of positions) {
      if (!pos.planet || !pos.sign) return false
      if (typeof pos.degree !== 'number' || pos.degree < 0 || pos.degree >= 30) return false
      if (typeof pos.retrograde !== 'boolean') return false
    }

    return true
  }
}

// Export singleton instance
export const planetaryPositionsService = new PlanetaryPositionsService()
