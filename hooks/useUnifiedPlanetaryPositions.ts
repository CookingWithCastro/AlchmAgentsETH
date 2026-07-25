'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getPlanetaryPositionsAction,
  getAlchemicalQuantitiesAction,
} from '@/lib/actions/backend-actions'

export type AccuracyLevel = 'high' | 'medium' | 'low' | 'fallback'

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
  Heat?: number
  Entropy?: number
  Reactivity?: number
  Energy?: number
}

export interface PlanetaryData {
  timestamp: string
  planetaryPositions: PlanetaryPosition[]
  alchmQuantities?: AlchemicalQuantities
  monicaConstant?: number
  source: string
  accuracy: AccuracyLevel
  cached: boolean
  error?: string | null
}

interface UseUnifiedPlanetaryPositionsOptions {
  accuracy?: AccuracyLevel
  includeAlchemy?: boolean
  useCache?: boolean
  refreshInterval?: number // milliseconds, default 30000 (30 seconds)
  retryAttempts?: number
  autoRefresh?: boolean
}

const DEFAULT_OPTIONS: Required<UseUnifiedPlanetaryPositionsOptions> = {
  accuracy: 'high',
  includeAlchemy: false,
  useCache: true,
  refreshInterval: 30000,
  retryAttempts: 3,
  autoRefresh: true,
}

// Shared cache to ensure all components get the same data at the same time
const sharedCache = {
  data: null as PlanetaryData | null,
  lastFetch: 0,
  subscribers: new Set<() => void>(),
  isLoading: false,
  currentOptions: null as any,
}

export interface UnifiedPlanetaryState extends PlanetaryData {
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isStale: boolean
  refresh: () => Promise<void>
  clearCache: () => void
}

export function useUnifiedPlanetaryPositions(
  options: UseUnifiedPlanetaryPositionsOptions = {}
): UnifiedPlanetaryState {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [data, setData] = useState<PlanetaryData>({
    timestamp: new Date().toISOString(),
    planetaryPositions: [],
    source: 'static-fallback',
    accuracy: 'fallback',
    cached: false,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const retryCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPlanetaryData = useCallback(
    async (force: boolean = false): Promise<void> => {
      const now = Date.now()
      const cacheKey = `${opts.accuracy}-${opts.includeAlchemy}-${opts.useCache}`

      // Use shared cache if data is fresh and options match
      if (
        !force &&
        sharedCache.data &&
        cacheKey === sharedCache.currentOptions &&
        now - sharedCache.lastFetch < Math.min(opts.refreshInterval, 30000)
      ) {
        setData(sharedCache.data)
        setLoading(false)
        setError(null)
        setLastUpdated(new Date(sharedCache.lastFetch))
        return
      }

      // Prevent multiple simultaneous fetches
      if (sharedCache.isLoading && !force) {
        return
      }

      sharedCache.isLoading = true
      sharedCache.currentOptions = cacheKey

      try {
        setLoading(true)
        setError(null)

        const fetches: Promise<any>[] = [getPlanetaryPositionsAction()]
        if (opts.includeAlchemy) {
          fetches.push(getAlchemicalQuantitiesAction(true))
        }
        const results = await Promise.all(fetches)
        const posData = results[0]
        if (posData.error) throw new Error(posData.error)

        const planetaryPositions: PlanetaryPosition[] = Object.entries(
          (posData as any)?.planetary_positions || {}
        ).map(([name, body]: [string, any]) => ({
          planet: name,
          sign: body?.sign ?? '',
          degree: typeof body?.degree === 'number' ? body.degree : 0,
          retrograde: Boolean(body?.isRetrograde),
        }))

        let alchmQuantities: AlchemicalQuantities | undefined
        let monicaConstant: number | undefined
        if (opts.includeAlchemy && results[1]) {
          const a = results[1]
          if (a.error) throw new Error(a.error)
          alchmQuantities = {
            spirit: Number((a as any)?.spirit_score ?? 0),
            essence: Number((a as any)?.essence_score ?? 0),
            matter: Number((a as any)?.matter_score ?? 0),
            substance: Number((a as any)?.substance_score ?? 0),
            Heat: Number((a as any)?.Heat ?? 0),
            Entropy: Number((a as any)?.Entropy ?? 0),
            Reactivity: Number((a as any)?.Reactivity ?? 0),
            Energy: Number((a as any)?.Energy ?? 0),
          }
          const monicaInput = (a as any)?.['A-Number']
          const rawMonica =
            monicaInput === null || monicaInput === undefined ? Number.NaN : Number(monicaInput)
          monicaConstant = Number.isFinite(rawMonica) ? rawMonica : undefined
        }

        const result: PlanetaryData = {
          timestamp: new Date().toISOString(),
          planetaryPositions,
          alchmQuantities,
          monicaConstant,
          source: 'railway-action',
          accuracy: opts.accuracy,
          cached: false,
        }

        // Update shared cache
        sharedCache.data = result
        sharedCache.lastFetch = now

        // Notify all subscribers
        sharedCache.subscribers.forEach(callback => callback())

        setData(result)
        setLastUpdated(new Date())
        retryCountRef.current = 0 // Reset retry count on success
      } catch (error) {
        console.error('Error fetching unified planetary positions:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

        // Retry logic
        if (retryCountRef.current < opts.retryAttempts) {
          retryCountRef.current++
          console.log(
            `Retrying unified planetary positions fetch (${retryCountRef.current}/${opts.retryAttempts})...`
          )

          // Exponential backoff: 1s, 2s, 4s
          const retryDelay = Math.pow(2, retryCountRef.current - 1) * 1000
          setTimeout(() => fetchPlanetaryData(force), retryDelay)
          return
        }

        setError(errorMessage)
        setData(prev => ({ ...prev, error: errorMessage }))
      } finally {
        setLoading(false)
        sharedCache.isLoading = false
      }
    },
    [opts.accuracy, opts.includeAlchemy, opts.useCache, opts.refreshInterval, opts.retryAttempts]
  )

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchPlanetaryData(true)
  }, [fetchPlanetaryData])

  // Clear cache function
  const clearCache = useCallback(() => {
    sharedCache.data = null
    sharedCache.lastFetch = 0
  }, [])

  // Subscribe to shared cache updates
  useEffect(() => {
    const updateFromCache = () => {
      if (sharedCache.data) {
        setData(sharedCache.data)
        setLoading(false)
        setError(null)
        setLastUpdated(new Date(sharedCache.lastFetch))
      }
    }

    sharedCache.subscribers.add(updateFromCache)

    return () => {
      sharedCache.subscribers.delete(updateFromCache)
    }
  }, [])

  // Initial fetch and interval setup
  useEffect(() => {
    fetchPlanetaryData()

    // Set up refresh interval if auto-refresh is enabled
    if (opts.autoRefresh && opts.refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchPlanetaryData()
      }, opts.refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchPlanetaryData, opts.autoRefresh, opts.refreshInterval])

  return {
    ...data,
    loading,
    error,
    lastUpdated,
    isStale: lastUpdated ? Date.now() - lastUpdated.getTime() > opts.refreshInterval : true,
    refresh,
    clearCache,
  }
}

// Legacy compatibility hook - maps to unified hook
export function usePlanetaryPositions(options: UseUnifiedPlanetaryPositionsOptions = {}) {
  const unified = useUnifiedPlanetaryPositions(options)

  // Convert to legacy format for backward compatibility
  const legacyPositions = unified.planetaryPositions.reduce(
    (acc, pos) => {
      acc[pos.planet] = {
        sign: pos.sign,
        degree: pos.degree.toString(),
        retrograde: !!pos.retrograde,
      }
      return acc
    },
    {} as Record<string, { sign: string; degree: string; retrograde: boolean }>
  )

  return {
    positions: legacyPositions,
    alchmQuantities: unified.alchmQuantities,
    monicaConstant: unified.monicaConstant,
    loading: unified.loading,
    error: unified.error,
    lastUpdated: unified.lastUpdated,
    isStale: unified.isStale,
    refresh: unified.refresh,
    source: unified.source,
    accuracy: unified.accuracy,
    cached: unified.cached,
  }
}

// Helper hook for positions-only (backward compatibility)
export function usePlanetaryPositionsOnly(options: UseUnifiedPlanetaryPositionsOptions = {}) {
  const { planetaryPositions, loading, error, refresh, source, accuracy, cached } =
    useUnifiedPlanetaryPositions(options)

  // Convert to legacy format
  const legacyPositions = planetaryPositions.reduce(
    (acc, pos) => {
      acc[pos.planet] = {
        sign: pos.sign,
        degree: pos.degree.toString(),
        retrograde: !!pos.retrograde,
      }
      return acc
    },
    {} as Record<string, { sign: string; degree: string; retrograde: boolean }>
  )

  return {
    positions: legacyPositions,
    loading,
    error,
    refresh,
    source,
    accuracy,
    cached,
  }
}

export default useUnifiedPlanetaryPositions
