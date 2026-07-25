/**
 * Smart Caching System for Agent Consciousness Responses
 * Implements Redis-based caching with semantic similarity detection
 * and intelligent cache management for optimal performance
 */

import { Redis } from 'ioredis'
import crypto from 'crypto'

export interface CacheEntry {
  agentId: string
  userMessage: string
  agentResponse: string
  messageHash: string
  contextHash: string
  timestamp: Date
  responseTime: number
  personalityScore: number | null
  interactionCount: number
  ttl: number
}

export interface CacheContext {
  agentId: string
  userId?: string
  sessionId?: string
  conversationType: 'individual' | 'group' | 'training'
  messageLength: number
  messageTopics: string[]
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  weekday: boolean
}

export interface CacheMetrics {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  hitRate: number
  averageResponseTime: number
  savedTimeMs: number
  similarityMatches: number
}

export class AgentCacheSystem {
  private redis: Redis | null = null
  private inMemoryCache: Map<string, { data: CacheEntry; expiry: number }> = new Map()
  private readonly CACHE_PREFIX = 'agent:cache:'
  private readonly METRICS_KEY = 'agent:cache:metrics'
  private readonly SIMILARITY_THRESHOLD = 0.75
  private readonly DEFAULT_TTL = 3600 // 1 hour in seconds
  private readonly SEMANTIC_TTL = 1800 // 30 minutes for semantic matches
  private readonly MAX_IN_MEMORY_ENTRIES = 100 // Limit in-memory cache size
  private isRedisAvailable = false

  constructor() {
    // Initialize Redis connection if available
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryStrategy: times => Math.min(times * 50, 2000),
        })

        this.redis.on('error', err => {
          console.warn('AgentCache Redis error (non-fatal):', err?.message || err)
          this.isRedisAvailable = false
        })

        this.redis.on('connect', () => {
          console.log('🗄️ Agent Cache System: Redis connected')
          this.isRedisAvailable = true
          // Warm up cache after connection
          this.warmUpCache()
        })

        this.redis.on('ready', () => {
          this.isRedisAvailable = true
        })
      } catch (error) {
        console.warn('AgentCache Redis initialization failed:', error)
        this.redis = null
        this.isRedisAvailable = false
      }
    }

    // Start in-memory cache cleanup interval
    setInterval(() => this.cleanupInMemoryCache(), 60000) // Clean every minute
  }

  /**
   * Get cached response for agent + message combination
   */
  async getCachedResponse(
    agentId: string,
    userMessage: string,
    context?: Partial<CacheContext>
  ): Promise<CacheEntry | null> {
    // Generate cache keys
    const messageHash = this.generateMessageHash(userMessage)
    const contextHash = this.generateContextHash(agentId, context)
    const exactKey = `${this.CACHE_PREFIX}exact:${agentId}:${messageHash}:${contextHash}`

    // Try Redis first if available
    if (this.redis && this.isRedisAvailable) {
      try {
        // Try exact match first
        const exactMatch = await this.redis.get(exactKey)
        if (exactMatch) {
          await this.updateMetrics('hit', 'exact')
          return JSON.parse(exactMatch)
        }

        // Try semantic similarity search
        const semanticMatch = await this.findSemanticMatch(agentId, userMessage, context)
        if (semanticMatch) {
          await this.updateMetrics('hit', 'semantic')
          return semanticMatch
        }
      } catch (error) {
        console.warn('Redis cache get error, falling back to in-memory:', error)
      }
    }

    // Fallback to in-memory cache
    const inMemoryEntry = this.getFromInMemoryCache(exactKey)
    if (inMemoryEntry) {
      await this.updateMetrics('hit', 'memory' as any)
      return inMemoryEntry
    }

    // Try semantic match in memory
    const inMemorySemanticMatch = this.findInMemorySemanticMatch(agentId, userMessage)
    if (inMemorySemanticMatch) {
      await this.updateMetrics('hit', 'memory-semantic' as any)
      return inMemorySemanticMatch
    }

    await this.updateMetrics('miss')
    return null
  }

  /**
   * Cache a new agent response
   */
  async cacheResponse(
    agentId: string,
    userMessage: string,
    agentResponse: string,
    responseTime: number,
    context?: Partial<CacheContext>,
    personalityScore?: number
  ): Promise<void> {
    const messageHash = this.generateMessageHash(userMessage)
    const contextHash = this.generateContextHash(agentId, context)

    const cacheEntry: CacheEntry = {
      agentId,
      userMessage,
      agentResponse,
      messageHash,
      contextHash,
      timestamp: new Date(),
      responseTime,
      personalityScore: personalityScore ?? null,
      interactionCount: 1,
      ttl: this.calculateTTL(responseTime, personalityScore),
    }

    // Try to store in Redis first
    if (this.redis && this.isRedisAvailable) {
      try {
        // Store exact match
        const exactKey = `${this.CACHE_PREFIX}exact:${agentId}:${messageHash}:${contextHash}`
        await this.redis.setex(exactKey, cacheEntry.ttl, JSON.stringify(cacheEntry))

        // Store for semantic search (include message keywords)
        const semanticKey = `${this.CACHE_PREFIX}semantic:${agentId}:${messageHash}`
        const semanticData = {
          ...cacheEntry,
          keywords: this.extractKeywords(userMessage),
          messageLength: userMessage.length,
          topicClassification: this.classifyMessageTopic(userMessage),
        }
        await this.redis.setex(semanticKey, this.SEMANTIC_TTL, JSON.stringify(semanticData))

        // Update agent-specific cache index
        const agentIndex = `${this.CACHE_PREFIX}index:${agentId}`
        await this.redis.sadd(agentIndex, messageHash)
        await this.redis.expire(agentIndex, this.DEFAULT_TTL * 2)

        console.log(`💾 Cached response for ${agentId}: ${userMessage.substring(0, 50)}...`)
      } catch (error) {
        console.warn('Redis cache set error, falling back to in-memory:', error)
        this.storeInMemoryCache(cacheEntry)
      }
    } else {
      // Fallback to in-memory cache
      this.storeInMemoryCache(cacheEntry)
    }
  }

  /**
   * Find semantically similar cached responses
   */
  private async findSemanticMatch(
    agentId: string,
    userMessage: string,
    context?: Partial<CacheContext>
  ): Promise<CacheEntry | null> {
    if (!this.redis) return null

    try {
      // Get all semantic cache entries for this agent
      const pattern = `${this.CACHE_PREFIX}semantic:${agentId}:*`
      const keys = await this.redis.keys(pattern)

      if (keys.length === 0) return null

      const currentKeywords = this.extractKeywords(userMessage)
      const currentTopic = this.classifyMessageTopic(userMessage)
      const currentLength = userMessage.length

      let bestMatch: CacheEntry | null = null
      let bestSimilarity = 0

      for (const key of keys) {
        const cached = await this.redis.get(key)
        if (!cached) continue

        const cachedData = JSON.parse(cached)

        // Calculate similarity score
        const similarity = this.calculateSimilarity(
          currentKeywords,
          cachedData.keywords,
          currentTopic,
          cachedData.topicClassification,
          currentLength,
          cachedData.messageLength
        )

        if (similarity >= this.SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestSimilarity = similarity
          bestMatch = cachedData
        }
      }

      return bestMatch
    } catch (error) {
      console.warn('Semantic search error:', error)
      return null
    }
  }

  /**
   * Calculate similarity between two messages
   */
  private calculateSimilarity(
    keywords1: string[],
    keywords2: string[],
    topic1: string,
    topic2: string,
    length1: number,
    length2: number
  ): number {
    // Keyword overlap (40% weight)
    const commonKeywords = keywords1.filter(k => keywords2.includes(k))
    const keywordSimilarity = commonKeywords.length / Math.max(keywords1.length, keywords2.length)

    // Topic similarity (30% weight)
    const topicSimilarity = topic1 === topic2 ? 1 : 0

    // Length similarity (30% weight)
    const lengthRatio = Math.min(length1, length2) / Math.max(length1, length2)
    const lengthSimilarity = lengthRatio

    return keywordSimilarity * 0.4 + topicSimilarity * 0.3 + lengthSimilarity * 0.3
  }

  /**
   * Extract keywords from message for semantic matching
   */
  private extractKeywords(message: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'must',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'this',
      'that',
      'these',
      'those',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
    ])

    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10) // Keep top 10 keywords
  }

  /**
   * Classify message topic for better matching
   */
  private classifyMessageTopic(message: string): string {
    const lowerMessage = message.toLowerCase()

    if (
      lowerMessage.includes('astrolog') ||
      lowerMessage.includes('chart') ||
      lowerMessage.includes('planet')
    ) {
      return 'astrology'
    }
    if (
      lowerMessage.includes('tarot') ||
      lowerMessage.includes('card') ||
      lowerMessage.includes('reading')
    ) {
      return 'tarot'
    }
    if (
      lowerMessage.includes('wisdom') ||
      lowerMessage.includes('advice') ||
      lowerMessage.includes('guidance')
    ) {
      return 'wisdom'
    }
    if (
      lowerMessage.includes('creative') ||
      lowerMessage.includes('art') ||
      lowerMessage.includes('inspiration')
    ) {
      return 'creativity'
    }
    if (
      lowerMessage.includes('science') ||
      lowerMessage.includes('research') ||
      lowerMessage.includes('discovery')
    ) {
      return 'science'
    }
    if (
      lowerMessage.includes('relationship') ||
      lowerMessage.includes('love') ||
      lowerMessage.includes('partner')
    ) {
      return 'relationships'
    }
    if (
      lowerMessage.includes('career') ||
      lowerMessage.includes('work') ||
      lowerMessage.includes('job')
    ) {
      return 'career'
    }
    if (
      lowerMessage.includes('health') ||
      lowerMessage.includes('healing') ||
      lowerMessage.includes('wellness')
    ) {
      return 'health'
    }

    return 'general'
  }

  /**
   * Generate message hash for cache key
   */
  private generateMessageHash(message: string): string {
    return crypto.createHash('sha256').update(message.toLowerCase()).digest('hex').substring(0, 16)
  }

  /**
   * Generate context hash for cache key
   */
  private generateContextHash(agentId: string, context?: Partial<CacheContext>): string {
    const contextString = JSON.stringify({
      agentId,
      conversationType: context?.conversationType || 'individual',
      timeOfDay: this.getTimeOfDay(),
      messageLength: context?.messageLength || 0,
    })
    return crypto.createHash('sha256').update(contextString).digest('hex').substring(0, 8)
  }

  /**
   * Calculate TTL based on response quality
   */
  private calculateTTL(responseTime: number, personalityScore?: number): number {
    let ttl = this.DEFAULT_TTL

    // Higher quality responses get cached longer
    if (personalityScore && personalityScore > 0.8) {
      ttl *= 2 // 2 hours for high-quality responses
    }

    // Faster responses get cached longer (likely from better API conditions)
    if (responseTime < 2000) {
      ttl *= 1.5
    }

    // But don't cache too long to allow for agent evolution
    return Math.min(ttl, 7200) // Max 2 hours
  }

  /**
   * Get current time of day for context
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'night'
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  /**
   * Update cache metrics
   */
  private async updateMetrics(type: 'hit' | 'miss', subtype?: 'exact' | 'semantic'): Promise<void> {
    if (!this.redis) return

    try {
      const metricsKey = this.METRICS_KEY
      const metrics = await this.redis.get(metricsKey)
      const current: CacheMetrics = metrics
        ? JSON.parse(metrics)
        : {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            averageResponseTime: 0,
            savedTimeMs: 0,
            similarityMatches: 0,
          }

      current.totalRequests++

      if (type === 'hit') {
        current.cacheHits++
        if (subtype === 'semantic') {
          current.similarityMatches++
        }
      } else {
        current.cacheMisses++
      }

      current.hitRate = current.cacheHits / current.totalRequests

      await this.redis.setex(metricsKey, 86400, JSON.stringify(current)) // 24 hour metrics
    } catch (error) {
      console.warn('Metrics update error:', error)
    }
  }

  /**
   * Get cache performance metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    if (!this.redis) {
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        averageResponseTime: 0,
        savedTimeMs: 0,
        similarityMatches: 0,
      }
    }

    try {
      const metrics = await this.redis.get(this.METRICS_KEY)
      return metrics
        ? JSON.parse(metrics)
        : {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            averageResponseTime: 0,
            savedTimeMs: 0,
            similarityMatches: 0,
          }
    } catch (error) {
      console.warn('Get metrics error:', error)
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        averageResponseTime: 0,
        savedTimeMs: 0,
        similarityMatches: 0,
      }
    }
  }

  /**
   * Get the current size of the cache
   */
  async getSize(): Promise<{ redisSize: number; memorySize: number; totalSize: number }> {
    let redisSize = 0
    let memorySize = this.inMemoryCache.size

    if (this.redis && this.isRedisAvailable) {
      try {
        // Get all keys matching the cache prefix
        const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`)
        redisSize = keys.length
      } catch (error) {
        console.warn('Failed to get Redis cache size:', error)
      }
    }

    return {
      redisSize,
      memorySize,
      totalSize: redisSize + memorySize,
    }
  }

  /**
   * Clear cache for specific agent (useful for agent updates)
   */
  async clearAgentCache(agentId: string): Promise<void> {
    if (!this.redis) return

    try {
      const patterns = [
        `${this.CACHE_PREFIX}exact:${agentId}:*`,
        `${this.CACHE_PREFIX}semantic:${agentId}:*`,
        `${this.CACHE_PREFIX}index:${agentId}`,
      ]

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }

      console.log(`🗑️ Cleared cache for agent: ${agentId}`)
    } catch (error) {
      console.warn('Clear cache error:', error)
    }
  }

  /**
   * Warm up cache with common agent queries
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Starting cache warmup...')

    const popularAgents = [
      'leonardo-da-vinci',
      'william-shakespeare',
      'albert-einstein',
      'nikola-tesla',
      'marie-curie',
      'cleopatra',
      'socrates',
      'carl-jung',
    ]

    const commonQueries = [
      'What wisdom can you share?',
      'Tell me about your greatest insights',
      'What is your perspective on creativity?',
      'How do you approach problem-solving?',
      'What advice would you give?',
    ]

    try {
      for (const agentId of popularAgents) {
        for (const query of commonQueries) {
          // Create synthetic cache entry for common queries
          const cacheEntry: CacheEntry = {
            agentId,
            userMessage: query,
            agentResponse: `[Warmup placeholder - will be replaced on first real query]`,
            messageHash: this.generateMessageHash(query),
            contextHash: this.generateContextHash(agentId),
            timestamp: new Date(),
            responseTime: 1000,
            personalityScore: 0.8,
            interactionCount: 0,
            ttl: this.DEFAULT_TTL * 2, // Longer TTL for warmup entries
          }

          // Store in memory for instant availability
          this.storeInMemoryCache(cacheEntry)
        }
      }

      console.log(
        `✅ Cache warmup complete: ${popularAgents.length} agents x ${commonQueries.length} queries preloaded`
      )
    } catch (error) {
      console.warn('Cache warmup error:', error)
    }
  }

  /**
   * Store entry in in-memory cache
   */
  private storeInMemoryCache(entry: CacheEntry): void {
    const key = `${this.CACHE_PREFIX}exact:${entry.agentId}:${entry.messageHash}:${entry.contextHash}`
    const expiry = Date.now() + entry.ttl * 1000

    // Check cache size limit
    if (this.inMemoryCache.size >= this.MAX_IN_MEMORY_ENTRIES) {
      // Remove oldest entry
      const oldestKey = this.inMemoryCache.keys().next().value
      if (oldestKey) {
        this.inMemoryCache.delete(oldestKey)
      }
    }

    this.inMemoryCache.set(key, { data: entry, expiry })
    console.log(`💾 Stored in memory cache: ${entry.agentId}`)
  }

  /**
   * Get entry from in-memory cache
   */
  private getFromInMemoryCache(key: string): CacheEntry | null {
    const cached = this.inMemoryCache.get(key)

    if (!cached) return null

    // Check expiry
    if (Date.now() > cached.expiry) {
      this.inMemoryCache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Find semantic match in memory cache
   */
  private findInMemorySemanticMatch(agentId: string, userMessage: string): CacheEntry | null {
    const currentKeywords = this.extractKeywords(userMessage)
    const currentTopic = this.classifyMessageTopic(userMessage)

    let bestMatch: CacheEntry | null = null
    let bestSimilarity = 0

    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (!key.includes(agentId)) continue
      if (Date.now() > cached.expiry) continue

      const cachedKeywords = this.extractKeywords(cached.data.userMessage)
      const cachedTopic = this.classifyMessageTopic(cached.data.userMessage)

      const similarity = this.calculateSimilarity(
        currentKeywords,
        cachedKeywords,
        currentTopic,
        cachedTopic,
        userMessage.length,
        cached.data.userMessage.length
      )

      if (similarity >= this.SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = cached.data
      }
    }

    return bestMatch
  }

  /**
   * Cleanup expired entries from in-memory cache
   */
  private cleanupInMemoryCache(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (now > cached.expiry) {
        this.inMemoryCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired in-memory cache entries`)
    }
  }

  /**
   * Check if caching is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable || this.inMemoryCache.size > 0
  }
}

// Singleton instance
export const agentCache = new AgentCacheSystem()

// Helper function to extract cache context from request
export function buildCacheContext(
  agentId: string,
  userMessage: string,
  requestData: any
): CacheContext {
  return {
    agentId,
    userId: requestData.userId,
    sessionId: requestData.sessionId,
    conversationType: requestData.agents ? 'group' : 'individual',
    messageLength: userMessage.length,
    messageTopics: [], // Could be enhanced with NLP
    timeOfDay:
      new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
    weekday: new Date().getDay() >= 1 && new Date().getDay() <= 5,
  }
}
