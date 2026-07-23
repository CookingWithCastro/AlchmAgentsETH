import 'server-only'
import type { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { createRequire } from 'module'

type PrismaDelegateAliases = {
  transitMonitoringJob: any
  transitNotification: any
  userNatalChart: any
  profile: any
  subscriptions: any
  consciousnessSnapshot: any
  consciousnessInteraction: any
  userProfile: any
  user: any
  natalChart: any
  auditLog: any
  agentAttachment: any
  agentAttachmentUsage: any
}

type AppPrismaClient = PrismaClient & PrismaDelegateAliases

const PRISMA_DELEGATE_ALIASES: Partial<Record<keyof PrismaDelegateAliases, string>> = {
  transitMonitoringJob: 'transit_monitoring_jobs',
  transitNotification: 'transit_notifications',
  userNatalChart: 'user_natal_charts',
  profile: 'profiles',
  subscriptions: 'userSubscription',
  consciousnessSnapshot: 'consciousness_snapshots',
  consciousnessInteraction: 'consciousness_interactions',
  userProfile: 'user_profiles',
  user: 'users',
  natalChart: 'user_natal_charts',
  auditLog: 'monica_interactions',
  agentAttachment: 'agent_attachments',
  agentAttachmentUsage: 'agent_attachment_usage',
}

declare global {
  var __prisma: PrismaClient | undefined
}

/**
 * Lazy Prisma client — `@prisma/client` is ~80MB resolved.
 * The client is only materialized on first property access (e.g. `prisma.user.findMany`),
 * not at module-import time. Routes that don't touch the DB never load the engine.
 */
let _prismaInstance: PrismaClient | undefined
function materializePrisma(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma
  if (_prismaInstance) return _prismaInstance

  // Synchronous require — only paid when first used
  const req = typeof require !== 'undefined' ? require : createRequire(import.meta.url)
  const { PrismaClient: PrismaClientCtor } = req(
    '@prisma/client'
  ) as typeof import('@prisma/client')
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.POSTGRES_URL ||
    process.env.RAILWAY_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL

  const client = dbUrl
    ? new PrismaClientCtor({ datasources: { db: { url: dbUrl } } })
    : new PrismaClientCtor()

  // Apply Accelerate extension only when using a prisma+postgres:// URL
  if (dbUrl?.startsWith('prisma+postgres://')) {
    const { withAccelerate } = req(
      '@prisma/extension-accelerate'
    ) as typeof import('@prisma/extension-accelerate')
    _prismaInstance = client.$extends(withAccelerate()) as unknown as PrismaClient
  } else {
    _prismaInstance = client
  }

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = _prismaInstance
  }
  return _prismaInstance
}

export const prisma: AppPrismaClient = new Proxy({} as AppPrismaClient, {
  get(_target, prop, receiver) {
    const real = materializePrisma()
    const mappedProp =
      typeof prop === 'string' && prop in PRISMA_DELEGATE_ALIASES
        ? PRISMA_DELEGATE_ALIASES[prop as keyof PrismaDelegateAliases]!
        : prop
    const value = Reflect.get(real, mappedProp, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
  has(_t, prop) {
    if (typeof prop === 'string' && prop in PRISMA_DELEGATE_ALIASES) return true
    return Reflect.has(materializePrisma(), prop)
  },
})

// Redis client singleton - optional (only when REDIS_URL is provided)
let redis: Redis | null = null

// Initialize Redis only if explicitly configured
if (typeof window === 'undefined' && process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: times => Math.min(times * 50, 2000),
    })

    // Redis error handling (silent in absence of REDIS_URL)
    redis.on('error', err => {
      console.warn('Redis connection error (non-fatal):', err?.message || err)
    })

    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
  } catch (error) {
    console.warn('Redis initialization failed, continuing without Redis:', error)
    redis = null
  }
}

// Session management utilities
export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:'
  private static readonly SESSION_TTL = 24 * 60 * 60 // 24 hours in seconds

  static async createSession(userId: string, personalityId: string, data: any): Promise<string> {
    if (!redis) {
      console.warn('Redis not available, session creation skipped')
      return `${userId}-${personalityId}-${Date.now()}`
    }

    const sessionId = `${userId}-${personalityId}-${Date.now()}`
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`

    const sessionData = {
      userId,
      personalityId,
      ...data,
      createdAt: new Date().toISOString(),
    }

    await redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData))

    return sessionId
  }

  static async getSession(sessionId: string): Promise<any | null> {
    if (!redis) {
      console.warn('Redis not available, session retrieval skipped')
      return null
    }

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const data = await redis.get(sessionKey)

    if (!data) return null

    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to parse session data:', error)
      return null
    }
  }

  static async updateSession(sessionId: string, updates: any): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available, session update skipped')
      return false
    }

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const existingData = await this.getSession(sessionId)

    if (!existingData) return false

    const updatedData = {
      ...existingData,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    const ttl = await redis.ttl(sessionKey)
    await redis.setex(sessionKey, ttl > 0 ? ttl : this.SESSION_TTL, JSON.stringify(updatedData))

    return true
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available, session deletion skipped')
      return false
    }

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const result = await redis.del(sessionKey)
    return result > 0
  }

  static async extendSession(sessionId: string): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available, session extension skipped')
      return false
    }

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const result = await redis.expire(sessionKey, this.SESSION_TTL)
    return result === 1
  }
}

// Cache utilities for frequently accessed data
export class CacheManager {
  private static readonly CACHE_PREFIX = 'cache:'
  private static readonly DEFAULT_TTL = 60 * 60 // 1 hour

  static async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      console.warn('Redis not available, cache get skipped')
      return null
    }

    const cacheKey = `${this.CACHE_PREFIX}${key}`
    const data = await redis.get(cacheKey)

    if (!data) return null

    try {
      return JSON.parse(data) as T
    } catch (error) {
      console.error('Failed to parse cache data:', error)
      return null
    }
  }

  static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!redis) {
      console.warn('Redis not available, cache set skipped')
      return
    }

    const cacheKey = `${this.CACHE_PREFIX}${key}`
    const ttl = ttlSeconds || this.DEFAULT_TTL

    await redis.setex(cacheKey, ttl, JSON.stringify(value))
  }

  static async delete(key: string): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available, cache deletion skipped')
      return false
    }

    const cacheKey = `${this.CACHE_PREFIX}${key}`
    const result = await redis.del(cacheKey)
    return result > 0
  }

  static async invalidatePattern(pattern: string): Promise<number> {
    if (!redis) {
      console.warn('Redis not available, cache invalidation skipped')
      return 0
    }

    const keys = await redis.keys(`${this.CACHE_PREFIX}${pattern}`)
    if (keys.length === 0) return 0

    const result = await redis.del(...keys)
    return result
  }
}

// Daily streak tracking
export class StreakTracker {
  private static readonly STREAK_PREFIX = 'streak:'

  static async recordInteraction(userId: string, personalityId: string): Promise<number> {
    if (!redis) {
      console.warn('Redis not available, streak recording skipped')
      return 0
    }

    const today = new Date().toISOString().split('T')[0]
    const streakKey = `${this.STREAK_PREFIX}${userId}:${personalityId}`

    // Get current streak data
    const streakData = await redis.hgetall(streakKey)
    const lastDate = streakData.lastDate
    const currentStreak = parseInt(streakData.currentStreak || '0')

    // Calculate new streak
    let newStreak = 1
    if (lastDate) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastDate === today) {
        // Already recorded today
        return currentStreak
      } else if (lastDate === yesterdayStr) {
        // Consecutive day
        newStreak = currentStreak + 1
      }
      // Else streak resets to 1
    }

    // Update streak data
    await redis.hmset(streakKey, {
      lastDate: today,
      currentStreak: newStreak,
      maxStreak: Math.max(newStreak, parseInt(streakData.maxStreak || '0')),
    })

    // Set expiry to prevent stale data
    await redis.expire(streakKey, 90 * 24 * 60 * 60) // 90 days

    return newStreak
  }

  static async getStreak(
    userId: string,
    personalityId: string
  ): Promise<{
    current: number
    max: number
    lastDate: string | null
  }> {
    if (!redis) {
      console.warn('Redis not available, streak retrieval skipped')
      return { current: 0, max: 0, lastDate: null }
    }

    const streakKey = `${this.STREAK_PREFIX}${userId}:${personalityId}`
    const streakData = await redis.hgetall(streakKey)

    return {
      current: parseInt(streakData.currentStreak || '0'),
      max: parseInt(streakData.maxStreak || '0'),
      lastDate: streakData.lastDate || null,
    }
  }
}

export { redis }
