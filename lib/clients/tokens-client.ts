/**
 * Backend-first Tokens Client
 * Calculates token rates with planetary and temporal influences
 * Falls back to local calculation if backend is unavailable
 */

import { RealAlchemizeService } from '@/lib/services/real-alchemize-service'

// Types
export interface TokenCalculationRequest {
  datetime: Date
  location: { latitude: number; longitude: number }
  baseTokens?: {
    Spirit: number
    Essence: number
    Matter: number
    Substance: number
  }
}

export interface TokenRates {
  Spirit: number
  Essence: number
  Matter: number
  Substance: number
  kalchm?: number | null
  monica?: number | null
}

export interface TokenProjection {
  timeframe: 'next_hour' | 'next_6_hours' | 'next_24_hours'
  rates: TokenRates
  confidence: number
  trend: 'rising' | 'falling' | 'stable'
}

export interface TokenCalculationResult {
  rates: TokenRates
  projections: TokenProjection[]
  harmonics: {
    phase: number
    amplitude: number
    resonance: 'constructive' | 'destructive' | 'neutral'
  }
  marketPhase: 'dawn' | 'rising' | 'peak' | 'dusk' | 'night'
  volatilityIndex: number
  powerLevel: number
  totalValue: number
  metadata: {
    calculationTime: number
    source: 'backend' | 'local_fallback'
    planetaryHour: string
    location: string
  }
}

export class TokensClient {
  private static backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  private static useBackend = process.env.NEXT_PUBLIC_TOKENS_BACKEND === 'true'

  /**
   * Calculate token rates with backend-first approach
   */
  static async calculateRates(request: TokenCalculationRequest): Promise<TokenCalculationResult> {
    const startTime = Date.now()

    if (this.useBackend) {
      try {
        const backendResult = await this.callBackend(request)
        if (backendResult) {
          return {
            ...backendResult,
            metadata: {
              ...backendResult.metadata,
              calculationTime: Date.now() - startTime,
              source: 'backend',
            },
          }
        }
      } catch (error) {
        console.warn('Backend token calculation failed, falling back to local:', error)
      }
    }

    // Local fallback
    return this.calculateLocal(request, startTime)
  }

  /**
   * Call backend token calculation service
   */
  private static async callBackend(
    request: TokenCalculationRequest
  ): Promise<TokenCalculationResult | null> {
    try {
      const response = await fetch(`${this.backendUrl}/api/tokens/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: request.baseTokens || {
            Spirit: 1.0,
            Essence: 0.8,
            Matter: 0.6,
            Substance: 0.4,
          },
          location: {
            lat: request.location.latitude,
            lon: request.location.longitude,
          },
          timestamp: request.datetime.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        return this.transformBackendResponse(data.data)
      }

      return null
    } catch (error) {
      console.error('Error calling backend token service:', error)
      return null
    }
  }

  /**
   * Transform backend response to our interface
   */
  private static transformBackendResponse(backendData: any): TokenCalculationResult {
    return {
      rates: {
        Spirit: backendData.rates.Spirit,
        Essence: backendData.rates.Essence,
        Matter: backendData.rates.Matter,
        Substance: backendData.rates.Substance,
        kalchm: backendData.rates.kalchm ?? null,
        monica: backendData.rates.monica ?? null,
      },
      projections: backendData.projections || [],
      harmonics: backendData.harmonics || {
        phase: 0,
        amplitude: 1,
        resonance: 'neutral' as const,
      },
      marketPhase: backendData.marketPhase || 'peak',
      volatilityIndex: backendData.volatilityIndex || 0.5,
      powerLevel: backendData.powerLevel || 0.5,
      totalValue: backendData.totalValue || 0,
      metadata: {
        calculationTime: 0,
        source: 'backend',
        planetaryHour: backendData.metadata?.planetaryHour || 'Sun',
        location: `${backendData.metadata?.location?.lat || 0},${backendData.metadata?.location?.lon || 0}`,
      },
    }
  }

  /**
   * Local fallback calculation using existing services
   */
  private static async calculateLocal(
    request: TokenCalculationRequest,
    startTime: number
  ): Promise<TokenCalculationResult> {
    try {
      // Use existing RealAlchemizeService for local calculation
      const horoscope = await RealAlchemizeService.generateHoroscopeAsync({
        date: request.datetime.getDate(),
        month: request.datetime.getMonth(), // Note: zero-based month indexing maintained
        year: request.datetime.getFullYear(),
        hour: request.datetime.getHours(),
        minute: request.datetime.getMinutes(),
        latitude: request.location.latitude,
        longitude: request.location.longitude,
      })

      const alchemicalData = RealAlchemizeService.alchemize(
        {
          date: request.datetime.getDate(),
          month: request.datetime.getMonth(), // Note: zero-based month indexing maintained
          year: request.datetime.getFullYear(),
          hour: request.datetime.getHours(),
          minute: request.datetime.getMinutes(),
        },
        horoscope
      )

      // Extract token rates from alchemical effects
      const effects = alchemicalData['Alchemy Effects']
      const baseTokens = request.baseTokens || {
        Spirit: 1.0,
        Essence: 0.8,
        Matter: 0.6,
        Substance: 0.4,
      }

      // Calculate enhanced rates based on alchemical influence
      const rates: TokenRates = {
        Spirit: baseTokens.Spirit * (1 + effects['Total Spirit'] / 10),
        Essence: baseTokens.Essence * (1 + effects['Total Essence'] / 10),
        Matter: baseTokens.Matter * (1 + effects['Total Matter'] / 10),
        Substance: baseTokens.Substance * (1 + effects['Total Substance'] / 10),
      }

      // Calculate derived tokens
      rates.kalchm = (rates.Spirit + rates.Matter) / (rates.Essence + rates.Substance + 0.01)
      rates.monica = Math.sqrt(rates.Spirit * rates.Essence * rates.Matter * rates.Substance)

      // Generate projections
      const projections: TokenProjection[] = [
        {
          timeframe: 'next_hour',
          rates: this.projectRates(rates, 0.05),
          confidence: 0.85,
          trend: this.determineTrend(rates),
        },
        {
          timeframe: 'next_6_hours',
          rates: this.projectRates(rates, 0.15),
          confidence: 0.7,
          trend: this.determineTrend(rates),
        },
        {
          timeframe: 'next_24_hours',
          rates: this.projectRates(rates, 0.3),
          confidence: 0.55,
          trend: this.determineTrend(rates),
        },
      ]

      // Calculate harmonics
      const totalAlchemical =
        effects['Total Spirit'] +
        effects['Total Essence'] +
        effects['Total Matter'] +
        effects['Total Substance']
      const harmonics = {
        phase: (request.datetime.getHours() / 24) * 2 * Math.PI,
        amplitude: Math.abs(totalAlchemical) / 100,
        resonance:
          totalAlchemical > 10
            ? ('constructive' as const)
            : totalAlchemical < -10
              ? ('destructive' as const)
              : ('neutral' as const),
      }

      return {
        rates,
        projections,
        harmonics,
        marketPhase: this.determineMarketPhase(request.datetime, rates),
        volatilityIndex: this.calculateVolatility(rates, harmonics),
        powerLevel: Math.min(1, Math.abs(totalAlchemical) / 50),
        totalValue: Object.values(rates).reduce((sum, rate) => sum + rate, 0),
        metadata: {
          calculationTime: Date.now() - startTime,
          source: 'local_fallback',
          planetaryHour: this.getCurrentPlanetaryHour(request.datetime),
          location: `${request.location.latitude},${request.location.longitude}`,
        },
      }
    } catch (error) {
      console.error('Local token calculation failed:', error)

      // Emergency fallback with base rates
      const baseTokens = request.baseTokens || {
        Spirit: 1.0,
        Essence: 0.8,
        Matter: 0.6,
        Substance: 0.4,
      }
      return {
        rates: { ...baseTokens, kalchm: null, monica: null },
        projections: [],
        harmonics: { phase: 0, amplitude: 1, resonance: 'neutral' },
        marketPhase: 'peak',
        volatilityIndex: 0.5,
        powerLevel: 0.5,
        totalValue: Object.values(baseTokens).reduce((sum, rate) => sum + rate, 0),
        metadata: {
          calculationTime: Date.now() - startTime,
          source: 'local_fallback',
          planetaryHour: 'Sun',
          location: `${request.location.latitude},${request.location.longitude}`,
        },
      }
    }
  }

  /**
   * Project future token rates
   */
  private static projectRates(currentRates: TokenRates, volatility: number): TokenRates {
    return {
      Spirit: Math.max(0.1, currentRates.Spirit * (1 + (Math.random() - 0.5) * volatility)),
      Essence: Math.max(0.1, currentRates.Essence * (1 + (Math.random() - 0.5) * volatility)),
      Matter: Math.max(0.1, currentRates.Matter * (1 + (Math.random() - 0.5) * volatility)),
      Substance: Math.max(0.1, currentRates.Substance * (1 + (Math.random() - 0.5) * volatility)),
      kalchm: currentRates.kalchm,
      monica: currentRates.monica,
    }
  }

  /**
   * Determine trend direction
   */
  private static determineTrend(rates: TokenRates): 'rising' | 'falling' | 'stable' {
    const avgRate =
      Object.values(rates).reduce((sum, rate) => sum + rate, 0) / Object.keys(rates).length
    return avgRate > 1.0 ? 'rising' : avgRate < 0.8 ? 'falling' : 'stable'
  }

  /**
   * Determine current market phase
   */
  private static determineMarketPhase(
    datetime: Date,
    rates: TokenRates
  ): 'dawn' | 'rising' | 'peak' | 'dusk' | 'night' {
    const hour = datetime.getHours()
    const avgRate =
      Object.values(rates).reduce((sum, rate) => sum + rate, 0) / Object.keys(rates).length

    if (hour >= 6 && hour < 9) return avgRate > 1.0 ? 'rising' : 'dawn'
    if (hour >= 9 && hour < 15) return avgRate > 1.2 ? 'peak' : 'rising'
    if (hour >= 15 && hour < 20) return avgRate > 1.0 ? 'peak' : 'dusk'
    if (hour >= 20 || hour < 2) return 'night'
    return 'dawn'
  }

  /**
   * Calculate volatility index
   */
  private static calculateVolatility(rates: TokenRates, harmonics: any): number {
    const rateValues = Object.values(rates)
    const mean = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length
    const variance =
      rateValues.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rateValues.length
    return Math.min(1, Math.sqrt(variance) * harmonics.amplitude)
  }

  /**
   * Get current planetary hour (simplified)
   */
  private static getCurrentPlanetaryHour(datetime: Date): string {
    const hours = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
    return hours[datetime.getHours() % 7]
  }
}
