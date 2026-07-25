// Unified hook for consistent planetary positions across all components
// Enhanced with Chrome DevTools MCP integration and backend API calls
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  defaultAlchemicalMCPConfig,
  validateTokenEquilibrium,
} from '@/test/alchemical-devtools/mcp-config'
import {
  getPlanetaryPositionsAction,
  getAlchemicalQuantitiesAction,
} from '@/lib/actions/backend-actions'

export interface PlanetaryPosition {
  planet: string
  sign: string
  degree: number
  retrograde?: boolean
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

export interface UnifiedPlanetaryData {
  timestamp: string
  planetaryPositions: PlanetaryPosition[]
  alchmQuantities: AlchemicalQuantities
  monicaConstant: number | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  // MCP-enhanced fields for token stabilization
  mcpMetrics?: {
    tokenStability: 'stable' | 'warning' | 'critical'
    equilibrium: ReturnType<typeof validateTokenEquilibrium>
    performanceMetrics: {
      calculationTime: number
      tokenRecalculationTime: number
      aspectCalculationTime: number
      memoryUsage: number
    }
    lastStabilization?: Date
    stabilizationEvents: number
  }
}

interface UsePlanetaryPositionsOptions {
  refreshInterval?: number // milliseconds, default 30000 (30 seconds)
  useApi?: boolean // Use API endpoint vs direct calculation, default true
  retryAttempts?: number // Number of retry attempts, default 3
  enabled?: boolean // Disable all fetches for passive native widget surfaces
}

const DEFAULT_OPTIONS: Required<UsePlanetaryPositionsOptions> = {
  refreshInterval: 30000, // 30 seconds
  useApi: true, // Use API endpoint by default for consistency
  retryAttempts: 3,
  enabled: true,
}

// Shared cache to ensure all components get the same data at the same time
const sharedCache = {
  data: null as UnifiedPlanetaryData | null,
  lastFetch: 0,
  subscribers: new Set<() => void>(),
  isLoading: false,
}

export function usePlanetaryPositions(options: UsePlanetaryPositionsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [data, setData] = useState<UnifiedPlanetaryData>({
    timestamp: new Date().toISOString(),
    planetaryPositions: [],
    alchmQuantities: {
      spirit: 0,
      essence: 0,
      matter: 0,
      substance: 0,
      Heat: 0,
      Entropy: 0,
      Reactivity: 0,
      Energy: 0,
    },
    monicaConstant: null,
    loading: true,
    error: null,
    lastUpdated: null,
  })

  // Suppress repeated backend-unavailable warnings — first failure per hook
  // mount is enough; subsequent retries shouldn't flood the console.
  const backendWarnedRef = useRef(false)

  const fetchPlanetaryData = useCallback(async () => {
    if (!opts.enabled) {
      setData(prev => ({ ...prev, loading: false, error: null }))
      return
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      const [posData, alchmData] = await Promise.all([
        getPlanetaryPositionsAction(),
        getAlchemicalQuantitiesAction(true),
      ])

      const posPayload = posData as {
        error?: string
        planetary_positions?: Record<
          string,
          { sign?: string; degree?: number; isRetrograde?: boolean }
        >
      }
      const alchmPayload = alchmData as {
        error?: string
        spirit_score?: number
        essence_score?: number
        matter_score?: number
        substance_score?: number
        Heat?: number
        Entropy?: number
        Reactivity?: number
        Energy?: number
        'A-Number'?: number
      }

      if (posPayload.error) throw new Error(posPayload.error)
      if (alchmPayload.error) throw new Error(alchmPayload.error)

      const planetaryPositions: PlanetaryPosition[] = Object.entries(
        posPayload?.planetary_positions || {}
      ).map(([name, body]) => ({
        planet: name,
        sign: body?.sign ?? '',
        degree: typeof body?.degree === 'number' ? body.degree : 0,
        retrograde: Boolean(body?.isRetrograde),
      }))

      const alchmQuantities: AlchemicalQuantities = {
        spirit: Number(alchmPayload?.spirit_score ?? 0),
        essence: Number(alchmPayload?.essence_score ?? 0),
        matter: Number(alchmPayload?.matter_score ?? 0),
        substance: Number(alchmPayload?.substance_score ?? 0),
        Heat: Number(alchmPayload?.Heat ?? 0),
        Entropy: Number(alchmPayload?.Entropy ?? 0),
        Reactivity: Number(alchmPayload?.Reactivity ?? 0),
        Energy: Number(alchmPayload?.Energy ?? 0),
      }

      // Backend recovered — re-arm the warning so a future outage gets logged once.
      backendWarnedRef.current = false
      const monicaInput = alchmPayload?.['A-Number']
      const rawMonica =
        monicaInput === null || monicaInput === undefined ? Number.NaN : Number(monicaInput)
      setData({
        timestamp: new Date().toISOString(),
        planetaryPositions,
        alchmQuantities,
        monicaConstant: Number.isFinite(rawMonica) ? rawMonica : null,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      if (!backendWarnedRef.current) {
        backendWarnedRef.current = true
        console.warn(
          'usePlanetaryPositions: Backend unavailable, using defaults (silenced for further retries):',
          (error as Error)?.message || error
        )
      }
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [opts.enabled])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchPlanetaryData()
  }, [fetchPlanetaryData])

  // Initial fetch
  useEffect(() => {
    if (!opts.enabled) {
      setData(prev => ({ ...prev, loading: false, error: null }))
      return
    }

    fetchPlanetaryData()
  }, [fetchPlanetaryData, opts.enabled])

  return {
    ...data,
    refresh,
  }
}

// Helper hook for legacy components that just need positions
export function usePlanetaryPositionsOnly(options: UsePlanetaryPositionsOptions = {}) {
  const { planetaryPositions, loading, error, refresh } = usePlanetaryPositions(options)

  // Convert to legacy format for backward compatibility with validation
  const legacyPositions =
    planetaryPositions?.reduce(
      (acc, pos) => {
        // Ensure degree is valid before converting to string
        const safeDegree =
          typeof pos.degree === 'number' && Number.isFinite(pos.degree) ? pos.degree : 0
        acc[pos.planet] = {
          sign: typeof pos.sign === 'string' ? pos.sign : 'Aries',
          degree: safeDegree.toString(),
          retrograde: typeof pos.retrograde === 'boolean' ? pos.retrograde : false,
        }
        return acc
      },
      {} as Record<string, { sign: string; degree: string; retrograde: boolean }>
    ) || {}

  return {
    positions: legacyPositions,
    loading,
    error,
    refresh,
  }
}

export default usePlanetaryPositions
