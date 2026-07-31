/**
 * Task 3: Asynchronous Cosmic Context Encoder & Raw PG Query Engine
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * DB Driver: Native PostgreSQL using `pg` (node-postgres). STRICT NO-PRISMA RULE.
 * Runtime: Bun Native Background Daemon
 */

import { Pool, type PoolClient } from 'pg'
import type { AstrologicalTransit, CosmicContextSnapshot, DignityLevel } from '@/lib/jepa/types'
import { createHash } from 'crypto'

export class AsyncCosmicContextEncoder {
  private static pool: Pool | null = null
  private static cachedSnapshot: CosmicContextSnapshot | null = null
  private static cronJobHandle: ReturnType<typeof setInterval> | null = null
  private static trackedAgentIds = new Set<string>()
  private static lastAnchorAt = new Map<string, number>()
  private static anchorInFlight = new Map<string, Promise<void>>()

  /**
   * Initialize native node-postgres connection pool with aggressive low-overhead settings.
   */
  private static getPool(): Pool {
    if (!this.pool) {
      const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
      if (!connectionString) {
        throw new Error('[CosmicContextEncoder] Missing DATABASE_URL / DIRECT_URL in environment.')
      }

      this.pool = new Pool({
        connectionString,
        max: 5, // Small pool size to eliminate swap reliance on Mac M5
        idleTimeoutMillis: 10000, // Close idle clients fast
        connectionTimeoutMillis: 5000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      })

      this.pool.on('error', err => {
        console.error('[CosmicContextEncoder] Unexpected PG pool error:', err.message)
      })
    }
    return this.pool
  }

  /**
   * Execute raw SQL query to fetch live transits, retrogrades, and Domicile maps.
   * Hand-tuned raw SQL with strict parameterization and client release cleanup semantics.
   */
  public static async encodeCosmicContext(): Promise<CosmicContextSnapshot> {
    const pool = this.getPool()
    let client: PoolClient | null = null

    try {
      client = await pool.connect()

      // Raw SQL 1: Fetch active planetary positions and dignities
      const transitsQuery = `
        SELECT 
          LOWER(planet_name) AS planet,
          zodiac_sign AS sign,
          degree,
          is_retrograde,
          dignity_status
        FROM planetary_positions
        WHERE is_active = true
        ORDER BY planet_name ASC;
      `
      const transitsRes = await client.query(transitsQuery)

      // Raw SQL 2: Fetch Domicile and Exaltation maps
      const dignitiesQuery = `
        SELECT 
          LOWER(planet_name) AS planet,
          domicile_sign,
          exaltation_sign
        FROM planet_dignity_rules;
      `
      const dignitiesRes = await client.query(dignitiesQuery)

      // Raw SQL 3: Fetch active planetary aspects
      const aspectsQuery = `
        SELECT 
          planet1,
          planet2,
          aspect_type,
          orb_degrees
        FROM active_planetary_aspects
        WHERE orb_degrees <= 8.0;
      `
      const aspectsRes = await client.query(aspectsQuery)

      // Process DB Rows into High-Density Objects
      const transits: Record<string, AstrologicalTransit> = {}
      for (const row of transitsRes.rows) {
        const status = (row.dignity_status || 'NEUTRAL').toUpperCase() as DignityLevel
        let score = 0
        if (status === 'DOMICILE') score = 5
        else if (status === 'EXALTATION') score = 4
        else if (status === 'TRIPLICITY') score = 3

        transits[row.planet] = {
          planet: row.planet,
          sign: row.sign,
          degree: Number(row.degree),
          isRetrograde: Boolean(row.is_retrograde),
          dignity: status,
          dignityScore: score,
        }
      }

      const domicileMap: Record<string, string> = {}
      const exaltationMap: Record<string, string> = {}
      for (const row of dignitiesRes.rows) {
        if (row.domicile_sign) domicileMap[row.planet] = row.domicile_sign
        if (row.exaltation_sign) exaltationMap[row.planet] = row.exaltation_sign
      }

      const activeAspects = aspectsRes.rows.map(row => ({
        planet1: row.planet1,
        planet2: row.planet2,
        aspectType: row.aspect_type as any,
        orbDegrees: Number(row.orb_degrees),
      }))

      // High-density JSON compression string
      const payload = { transits, domicileMap, exaltationMap, activeAspects }
      const compressedJSON = JSON.stringify(payload)
      const epochHash = createHash('sha256').update(compressedJSON).digest('hex')

      const snapshot: CosmicContextSnapshot = {
        timestamp: Date.now(),
        epochHash,
        transits,
        domicileMap,
        exaltationMap,
        activeAspects,
        compressedJSON,
      }

      // Atomic in-memory cache update
      this.cachedSnapshot = snapshot
      return snapshot
    } catch (err: any) {
      console.warn('[CosmicContextEncoder] Raw PG query fallback triggered:', err.message)
      // Fallback static high-density context snapshot if DB is offline/migrating
      const fallback = this.getFallbackSnapshot()
      this.cachedSnapshot = fallback
      return fallback
    } finally {
      // Explicit connection cleanup semantics to eliminate memory leaks and socket locks
      if (client) {
        client.release()
      }
    }
  }

  /**
   * Get instant cached context snapshot without hitting database (0ms latency, O(1)).
   */
  public static getCachedContext(): CosmicContextSnapshot {
    if (!this.cachedSnapshot) {
      return this.getFallbackSnapshot()
    }
    return this.cachedSnapshot
  }

  /**
   * Start scheduled Bun background job to update context every interval.
   */
  public static startCronJob(intervalMs = 60000): void {
    if (this.cronJobHandle) return
    console.log(`[CosmicContextEncoder] Starting Async Background Encoder Job (${intervalMs}ms)...`)

    for (const agentId of (process.env.JEPA_ANCHOR_AGENT_IDS ?? '').split(',')) {
      this.trackAgentForAnchoring(agentId)
    }

    // Initial run
    void this.refreshAndAnchor()

    // Scheduled Bun interval
    this.cronJobHandle = setInterval(() => {
      void this.refreshAndAnchor()
    }, intervalMs)
  }

  /**
   * Stop background job and gracefully drain database connection pool.
   */
  public static async stopCronJob(): Promise<void> {
    if (this.cronJobHandle) {
      clearInterval(this.cronJobHandle)
      this.cronJobHandle = null
    }
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  public static trackAgentForAnchoring(agentId: string): void {
    const normalized = agentId.trim()
    if (normalized) this.trackedAgentIds.add(normalized)
  }

  /**
   * Debounced publisher for EMA lifecycle hooks. Epoch changes pass `force` and
   * fan out immediately; ordinary persona updates publish at a bounded cadence.
   */
  public static requestPersonaAnchor(
    agentId: string,
    options: { force?: boolean; now?: number } = {}
  ): boolean {
    this.trackAgentForAnchoring(agentId)
    const now = options.now ?? Date.now()
    const intervalMs = Number(process.env.JEPA_PERSONA_ANCHOR_INTERVAL_MS ?? 300_000)
    const last = this.lastAnchorAt.get(agentId) ?? 0
    if (!options.force && now - last < intervalMs) return false
    if (this.anchorInFlight.has(agentId)) return false
    this.lastAnchorAt.set(agentId, now)
    const work = import('@/lib/jepa/onchain-sync')
      .then(({ anchorPersonaState }) => anchorPersonaState(agentId))
      .then(() => undefined)
      .catch(error => {
        console.error(
          `[CosmicContextEncoder] Persona anchor failed for ${agentId}:`,
          error instanceof Error ? error.message : error
        )
      })
      .finally(() => this.anchorInFlight.delete(agentId))
    this.anchorInFlight.set(agentId, work)
    return true
  }

  private static async refreshAndAnchor(): Promise<void> {
    try {
      const previousEpoch = this.cachedSnapshot?.epochHash
      const snapshot = await this.encodeCosmicContext()
      const epochChanged = previousEpoch !== snapshot.epochHash
      if (epochChanged) {
        for (const agentId of await this.discoverActiveAnchorAgents()) {
          this.trackAgentForAnchoring(agentId)
        }
      }
      for (const agentId of this.trackedAgentIds) {
        this.requestPersonaAnchor(agentId, { force: epochChanged })
      }
    } catch (error) {
      console.error(
        '[CosmicContextEncoder] Background refresh failed:',
        error instanceof Error ? error.message : error
      )
    }
  }

  private static async discoverActiveAnchorAgents(): Promise<string[]> {
    const configured = (process.env.JEPA_ANCHOR_AGENT_IDS ?? '')
      .split(',')
      .map(agentId => agentId.trim())
      .filter(Boolean)
    try {
      const activeWindowHours = Number(process.env.JEPA_ANCHOR_ACTIVE_WINDOW_HOURS ?? 24)
      const result = await this.getPool().query<{ agentId: string }>(
        `
          SELECT "agentId"
          FROM historical_agents
          WHERE "isActive" = true
            AND "lastActive" >= NOW() - ($1::double precision * INTERVAL '1 hour')
          ORDER BY "lastActive" DESC
        `,
        [activeWindowHours]
      )
      return [...new Set([...configured, ...result.rows.map(row => row.agentId)])]
    } catch (error) {
      console.warn(
        '[CosmicContextEncoder] Active-agent discovery fell back to configured IDs:',
        error instanceof Error ? error.message : error
      )
      return configured
    }
  }

  /**
   * Bounded static fallback snapshot for deterministic offline execution.
   */
  private static getFallbackSnapshot(): CosmicContextSnapshot {
    const defaultTransits: Record<string, AstrologicalTransit> = {
      sun: {
        planet: 'sun',
        sign: 'Leo',
        degree: 1.0,
        isRetrograde: false,
        dignity: 'DOMICILE',
        dignityScore: 5,
      },
      moon: {
        planet: 'moon',
        sign: 'Taurus',
        degree: 15.0,
        isRetrograde: false,
        dignity: 'EXALTATION',
        dignityScore: 4,
      },
      mars: {
        planet: 'mars',
        sign: 'Aries',
        degree: 10.0,
        isRetrograde: false,
        dignity: 'DOMICILE',
        dignityScore: 5,
      },
    }
    const payload = {
      transits: defaultTransits,
      domicileMap: { sun: 'Leo', moon: 'Cancer', mars: 'Aries' },
      exaltationMap: { sun: 'Aries', moon: 'Taurus', mars: 'Capricorn' },
      activeAspects: [],
    }
    return {
      timestamp: Date.now(),
      epochHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      transits: defaultTransits,
      domicileMap: payload.domicileMap,
      exaltationMap: payload.exaltationMap,
      activeAspects: [],
      compressedJSON: JSON.stringify(payload),
    }
  }
}
