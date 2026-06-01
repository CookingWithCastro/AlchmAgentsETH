/**
 * Planetary API Client
 *
 * Alchemical Principle: This service acts as the "channel" through which
 * elemental energies (astronomical data) flow from the Earth vessel (backend)
 * to the Air vessel (frontend).
 *
 * All planetary calculations are performed on the backend using Swiss Ephemeris,
 * ensuring proper separation of native compilation (Earth) from distributed
 * visualization (Air).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export interface PlanetaryPosition {
  longitude: number // Ecliptic longitude in degrees (0-360)
  latitude: number // Ecliptic latitude in degrees
  distance: number // Distance from Earth in AU
  speed: number // Degrees per day (negative = retrograde)
}

export interface PlanetaryPositions {
  [planet: string]: PlanetaryPosition
}

export interface HouseSystem {
  houses: number[] // 12 house cusps in degrees
  ascendant: number // Rising sign degree
  mc: number // Midheaven degree
}

export interface ConsciousnessParameters {
  spirit: number // Fire element (0-1)
  essence: number // Air element (0-1)
  matter: number // Water element (0-1)
  substance: number // Earth element (0-1)
  monicaConstant: number // (Spirit × φ + Essence) / (Matter + Substance + 1)
  planetaryInfluences: Record<string, { element: string; strength: number }>
}

export interface BackendResponse<T> {
  success: boolean
  data: T
  metadata?: {
    computeTime?: number
    requestDate?: string
    totalPlanets?: number
    coordinates?: { latitude: number; longitude: number } | null
    [key: string]: any
  }
  error?: string
}

export class PlanetaryAPIClient {
  private baseUrl: string

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Get planetary positions for a given moment in time
   * Traditional correspondence: Queries the celestial sphere positions
   */
  async getPlanetaryPositions(
    date: Date,
    latitude?: number,
    longitude?: number,
    planets?: string[]
  ): Promise<PlanetaryPositions> {
    try {
      const response = await fetch(`${this.baseUrl}/api/planetary/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          latitude,
          longitude,
          planets: planets || [
            'sun',
            'moon',
            'mercury',
            'venus',
            'mars',
            'jupiter',
            'saturn',
            'uranus',
            'neptune',
            'pluto',
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to fetch planetary positions: ${response.statusText} - ${errorData.error || ''}`
        )
      }

      const result: BackendResponse<PlanetaryPositions> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Backend returned unsuccessful response')
      }

      return result.data
    } catch (error) {
      // The backend planetary endpoint is OPTIONAL. When it's unavailable,
      // callers (planetaryPositionsService) fall back to the local VSOP87
      // calculator — which is actually MORE accurate (±0.1°) than the backend's
      // linear approximation — so this is an expected, handled condition, not a
      // failure. Log at warn so it doesn't surface as a (misleading) error.
      console.warn(
        '[PlanetaryAPIClient] backend positions unavailable; caller will fall back to the local calculator:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }

  /**
   * Get planetary positions in batch
   */
  async getBatchPlanetaryPositions(
    requests: { date: Date; planet: string }[]
  ): Promise<Array<{ date: string; planet: string; position: PlanetaryPosition | null }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/planets/batch-positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: requests.map(req => ({
            date: req.date.toISOString(),
            planet: req.planet,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to fetch batch planetary positions: ${response.statusText} - ${errorData.error || ''}`
        )
      }

      const result: BackendResponse<any> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Backend returned unsuccessful response')
      }

      return result.data
    } catch (error) {
      console.error('[PlanetaryAPIClient] getBatchPlanetaryPositions error:', error)
      throw error
    }
  }

  /**
   * Calculate house system for a birth chart
   * Traditional correspondence: Divides the celestial sphere into 12 houses
   */
  async getHouseSystem(
    date: Date,
    latitude: number,
    longitude: number,
    houseSystem: string = 'P' // Placidus
  ): Promise<HouseSystem> {
    try {
      const response = await fetch(`${this.baseUrl}/api/planets/houses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          latitude,
          longitude,
          houseSystem,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to fetch house system: ${response.statusText} - ${errorData.error || ''}`
        )
      }

      const result: BackendResponse<HouseSystem> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Backend returned unsuccessful response')
      }

      return result.data
    } catch (error) {
      console.error('[PlanetaryAPIClient] getHouseSystem error:', error)
      throw error
    }
  }

  /**
   * Calculate consciousness parameters from birth data and current transits
   * Traditional correspondence: Synthesizes elemental energies from planetary configurations
   */
  async calculateConsciousness(
    birthDate: Date,
    birthLatitude?: number,
    birthLongitude?: number,
    currentDate?: Date
  ): Promise<ConsciousnessParameters> {
    try {
      const response = await fetch(`${this.baseUrl}/api/planets/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthData: {
            date: birthDate.toISOString(),
            latitude: birthLatitude,
            longitude: birthLongitude,
          },
          currentDate: (currentDate || new Date()).toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to calculate consciousness: ${response.statusText} - ${errorData.error || ''}`
        )
      }

      const result: BackendResponse<ConsciousnessParameters> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Backend returned unsuccessful response')
      }

      return result.data
    } catch (error) {
      console.error('[PlanetaryAPIClient] calculateConsciousness error:', error)
      throw error
    }
  }

  /**
   * Get available planets for calculation
   */
  async getAvailablePlanets(): Promise<
    Array<{
      id: string
      name: string
      element: string
      alchemy: { spirit: number; essence: number; matter: number; substance: number }
    }>
  > {
    try {
      const response = await fetch(`${this.baseUrl}/api/planets/available`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch available planets: ${response.statusText}`)
      }

      const result: BackendResponse<any[]> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Backend returned unsuccessful response')
      }

      return result.data
    } catch (error) {
      console.error('[PlanetaryAPIClient] getAvailablePlanets error:', error)
      throw error
    }
  }

  /**
   * Health check for backend connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      return response.ok
    } catch (error) {
      console.error('[PlanetaryAPIClient] Health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const planetaryAPI = new PlanetaryAPIClient()
