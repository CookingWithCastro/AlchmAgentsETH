// Performance Cache System
// Implements intelligent caching for expensive calculations

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // time to live in milliseconds
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()

  // Cache planetary positions for 5 minutes (they don't change that often)
  private readonly PLANETARY_POSITIONS_TTL = 5 * 60 * 1000 // 5 minutes

  // Cache alchemical calculations for 30 seconds (user-specific but short-lived)
  private readonly ALCHEMICAL_TTL = 30 * 1000 // 30 seconds

  // Cache elemental info for 1 minute
  private readonly ELEMENTAL_TTL = 60 * 1000 // 1 minute

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.ALCHEMICAL_TTL,
    }

    this.cache.set(key, entry)

    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanup()
    }
  }

  // Specialized methods for different types of data
  setPlanetaryPositions<T>(data: T): void {
    this.set('planetary-positions', data, this.PLANETARY_POSITIONS_TTL)
  }

  getPlanetaryPositions<T>(): T | null {
    return this.get<T>('planetary-positions')
  }

  setAlchemicalData<T>(birthInfoHash: string, data: T): void {
    this.set(`alchemical-${birthInfoHash}`, data, this.ALCHEMICAL_TTL)
  }

  getAlchemicalData<T>(birthInfoHash: string): T | null {
    return this.get<T>(`alchemical-${birthInfoHash}`)
  }

  setElementalData<T>(requestHash: string, data: T): void {
    this.set(`elemental-${requestHash}`, data, this.ELEMENTAL_TTL)
  }

  getElementalData<T>(requestHash: string): T | null {
    return this.get<T>(`elemental-${requestHash}`)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: Date.now() > entry.timestamp + entry.ttl,
      })),
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
  }

  // Clear specific type of cache
  clearType(type: 'planetary' | 'alchemical' | 'elemental'): void {
    for (const key of this.cache.keys()) {
      if (key.includes(type)) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Cache key for a birth moment.
 *
 * It hashes EVERY own enumerable field, with keys sorted so the result does not
 * depend on property order. That bias is deliberate: over-keying a cache costs
 * a miss, whereas UNDER-keying returns one caller's answer to another.
 *
 * This previously hashed a hand-picked `{date, time, location, hour}`. Callers
 * pass `{year, month, day, hour, minute, second, latitude, longitude}` — so
 * three of those four were `undefined`, `JSON.stringify` dropped them, and every
 * key collapsed to the literal `{"hour":12}`. Twenty-four possible keys for the
 * whole application. Measured: `alchemize` called with two completely different
 * ten-body horoscopes returned the SAME OBJECT, and 30 of 72 historical agents
 * share birth hour 12, so one agent's ESMS was served as another's.
 *
 * The digest below is a 32-bit string hash, so it is not collision-resistant in
 * the cryptographic sense; it only has to separate the inputs this app actually
 * sees. If that ever stops being true, widen the digest — do not narrow the key.
 */
export function createBirthInfoHash(birthInfo: any): string {
  if (birthInfo === null || typeof birthInfo !== 'object') {
    return `nonobject:${String(birthInfo)}`
  }
  const key = JSON.stringify(
    Object.keys(birthInfo)
      .sort()
      .map(k => [k, birthInfo[k]])
  )

  // Simple hash function
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

export function createRequestHash(request: any): string {
  const key = JSON.stringify(request)

  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  return Math.abs(hash).toString(36)
}

// Global cache instance
export const performanceCache = new PerformanceCache()

// Export types
export type { CacheEntry }
export { PerformanceCache }
