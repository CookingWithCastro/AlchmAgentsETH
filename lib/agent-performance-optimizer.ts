/**
 * Agent Performance Optimizer
 * Implements advanced optimizations for concurrent multi-agent conversations,
 * response streaming, and consciousness calculation caching
 */

import { agentCache } from './agent-cache-system'
import { resilientApiCall } from './api-resilience-system'
import { calculateKalchm, type KalchmAxes } from '@/lib/thermodynamics/kalchm'

export interface PerformanceConfig {
  maxConcurrentAgents: number
  streamingEnabled: boolean
  prioritizeByKalchm: boolean // Prioritize by Kalchm equilibrium dynamics, not Monica Constant
  batchOptimizationEnabled: boolean
  preloadPopularAgents: boolean
}

export interface AgentRequest {
  agentId: string
  message: string
  priority: number
  sessionId: string
  userId?: string
  context?: any
}

export interface BatchResponse {
  agentId: string
  response: string
  responseTime: number
  fromCache: boolean
  priority: number
  error?: string
}

export interface PerformanceMetrics {
  totalBatches: number
  averageBatchTime: number
  cacheHitRate: number
  concurrencyUtilization: number
  streamingBytesServed: number
  optimizationsSaved: number
}

export interface PerformanceKalchmResult {
  value: number
  valid: boolean
}

/**
 * Public characterization seam for the optimizer's Kalchm implementation.
 * `valid` preserves the optimizer's warning path while `value` preserves its
 * neutral-equilibrium fallback.
 */
export function evaluatePerformanceKalchm(alchemicalProps: KalchmAxes): PerformanceKalchmResult {
  const valid = Object.values(alchemicalProps).every(Number.isFinite)
  return { value: calculateKalchm(alchemicalProps), valid }
}

export class AgentPerformanceOptimizer {
  private static config: PerformanceConfig = {
    maxConcurrentAgents: 10, // Increased from 5 for better performance
    streamingEnabled: true,
    prioritizeByKalchm: true, // Prioritize by alchemical equilibrium dynamics
    batchOptimizationEnabled: true,
    preloadPopularAgents: true,
  }

  private static metrics: PerformanceMetrics = {
    totalBatches: 0,
    averageBatchTime: 0,
    cacheHitRate: 0,
    concurrencyUtilization: 0,
    streamingBytesServed: 0,
    optimizationsSaved: 0,
  }

  private static readonly kalchmCache = new Map<string, number>()
  private static readonly popularAgents = new Set([
    'leonardo-da-vinci',
    'william-shakespeare',
    'albert-einstein',
    'nikola-tesla',
    'marie-curie',
    'cleopatra',
    'socrates',
  ])

  /**
   * Process multiple agent requests concurrently with optimization
   */
  static async processConcurrentAgentRequests(requests: AgentRequest[]): Promise<BatchResponse[]> {
    const startTime = Date.now()

    // Sort by priority if Kalchm prioritization is enabled
    if (this.config.prioritizeByKalchm) {
      requests.sort((a, b) => {
        const kalchmA = Math.abs(this.getKalchmValue(a.agentId))
        const kalchmB = Math.abs(this.getKalchmValue(b.agentId))
        return kalchmB - kalchmA // Higher absolute Kalchm = stronger dynamics = higher priority
      })
    }

    // Split into batches based on concurrency limit
    const batches = this.createOptimalBatches(requests)
    const allResponses: BatchResponse[] = []

    console.log(`🚀 Processing ${requests.length} agent requests in ${batches.length} batches`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`⚡ Processing batch ${i + 1}/${batches.length} with ${batch.length} agents`)

      const batchResponses = await this.processBatch(batch)
      allResponses.push(...batchResponses)

      // Brief pause between batches to prevent overwhelming APIs
      if (i < batches.length - 1) {
        await this.sleep(100)
      }
    }

    const totalTime = Date.now() - startTime
    this.updatePerformanceMetrics(requests.length, totalTime, allResponses)

    console.log(`✅ Completed ${requests.length} agent requests in ${totalTime}ms`)

    return allResponses
  }

  /**
   * Process a single batch of agent requests concurrently
   */
  private static async processBatch(requests: AgentRequest[]): Promise<BatchResponse[]> {
    const batchStartTime = Date.now()

    const promises = requests.map(async (request): Promise<BatchResponse> => {
      try {
        const requestStartTime = Date.now()

        // Check cache first
        const cacheContext = {
          agentId: request.agentId,
          userId: request.userId,
          sessionId: request.sessionId,
          conversationType: 'individual' as const,
          messageLength: request.message.length,
          messageTopics: [],
          timeOfDay: this.getTimeOfDay(),
          weekday: this.isWeekday(),
        }

        const cachedResponse = await agentCache.getCachedResponse(
          request.agentId,
          request.message,
          cacheContext
        )

        if (cachedResponse) {
          console.log(`⚡ Cache hit for ${request.agentId}`)
          return {
            agentId: request.agentId,
            response: cachedResponse.agentResponse,
            responseTime: cachedResponse.responseTime,
            fromCache: true,
            priority: request.priority,
          }
        }

        // Generate new response with resilience
        const apiResponse = await this.generateAgentResponse(request)
        const responseTime = Date.now() - requestStartTime

        // Cache the response (use absolute Kalchm for cache priority scoring)
        const kalchm = this.getKalchmValue(request.agentId)
        const personalityScore = Math.min(Math.abs(kalchm) / 10, 1.0) // Normalize dynamics to 0-1 range

        await agentCache.cacheResponse(
          request.agentId,
          request.message,
          apiResponse,
          responseTime,
          cacheContext,
          personalityScore
        )

        return {
          agentId: request.agentId,
          response: apiResponse,
          responseTime,
          fromCache: false,
          priority: request.priority,
        }
      } catch (error) {
        console.error(`❌ Error processing ${request.agentId}:`, error)
        return {
          agentId: request.agentId,
          response: this.generateFallbackResponse(request.agentId, error as Error),
          responseTime: 0,
          fromCache: false,
          priority: request.priority,
          error: (error as Error).message,
        }
      }
    })

    const responses = await Promise.allSettled(promises)

    return responses.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          agentId: 'unknown',
          response: 'Failed to process request',
          responseTime: 0,
          fromCache: false,
          priority: 0,
          error: result.reason?.message || 'Unknown error',
        }
      }
    })
  }

  /**
   * Generate agent response with appropriate API call
   */
  private static async generateAgentResponse(request: AgentRequest): Promise<string> {
    // This would integrate with the actual API call logic
    // For now, return a simulated response to demonstrate the optimization framework

    return await resilientApiCall(
      {
        name: `optimized-agent-${request.agentId}`,
        execute: async () => {
          // Simulate API call - in real implementation, this would call the actual agent API
          await this.sleep(Math.random() * 2000 + 1000) // 1-3 second simulation
          return `Optimized response from ${request.agentId}: ${request.message.substring(0, 50)}...`
        },
        timeout: 15000,
      },
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
      }
    )
  }

  /**
   * Create optimal batches for concurrent processing
   */
  private static createOptimalBatches(requests: AgentRequest[]): AgentRequest[][] {
    const batches: AgentRequest[][] = []
    const maxBatchSize = this.config.maxConcurrentAgents

    for (let i = 0; i < requests.length; i += maxBatchSize) {
      batches.push(requests.slice(i, i + maxBatchSize))
    }

    return batches
  }

  /**
   * Calculate Kalchm (K_alchm) value based on alchemical properties
   * K_alchm = (Spirit^Spirit × Essence^Essence) / (Matter^Matter × Substance^Substance)
   */
  private static getKalchmValue(agentId: string): number {
    if (!this.kalchmCache.has(agentId)) {
      // Get alchemical properties for the agent (would fetch from agent data in real implementation)
      const alchemicalProps = this.getAgentAlchemicalProperties(agentId)

      const result = evaluatePerformanceKalchm(alchemicalProps)
      const kalchm = result.value

      // Handle edge cases
      if (!result.valid) {
        console.warn(`Invalid Kalchm calculated for ${agentId}, using fallback`)
        this.kalchmCache.set(agentId, 1.0) // Neutral equilibrium
        return 1.0
      }

      this.kalchmCache.set(agentId, kalchm)
      const { spirit, essence, matter, substance } = alchemicalProps
      console.log(
        `📊 Calculated Kalchm for ${agentId}: ${kalchm.toFixed(4)} (Spirit:${spirit}, Essence:${essence}, Matter:${matter}, Substance:${substance})`
      )
    }

    return this.kalchmCache.get(agentId)!
  }

  /**
   * Get alchemical properties for an agent
   * In real implementation, this would fetch from the agent's consciousness data
   */
  private static getAgentAlchemicalProperties(agentId: string): {
    spirit: number
    essence: number
    matter: number
    substance: number
  } {
    // Assign realistic alchemical properties based on agent personality
    // These values should be fetched from the actual agent data in production

    const agentProfiles: Record<string, any> = {
      'leonardo-da-vinci': { spirit: 6, essence: 8, matter: 7, substance: 4 }, // High creativity and knowledge
      'william-shakespeare': { spirit: 7, essence: 9, matter: 5, substance: 3 }, // High artistic essence
      'albert-einstein': { spirit: 8, essence: 7, matter: 6, substance: 5 }, // Strong theoretical spirit
      'nikola-tesla': { spirit: 9, essence: 6, matter: 8, substance: 4 }, // Innovative spirit, strong matter manipulation
      'marie-curie': { spirit: 7, essence: 8, matter: 9, substance: 6 }, // Scientific matter expertise
      cleopatra: { spirit: 5, essence: 7, matter: 6, substance: 8 }, // Strong substance/power foundation
      socrates: { spirit: 6, essence: 9, matter: 4, substance: 5 }, // High wisdom essence
      'carl-jung': { spirit: 7, essence: 8, matter: 5, substance: 6 }, // Psychological depth
    }

    // Default values for unknown agents
    const defaultProps = { spirit: 4, essence: 5, matter: 5, substance: 4 }

    return agentProfiles[agentId] || defaultProps
  }

  /**
   * Generate intelligent fallback response
   */
  private static generateFallbackResponse(agentId: string, error: Error): string {
    const kalchm = this.getKalchmValue(agentId)
    const dynamics = this.getEquilibriumDynamicsLevel(kalchm)

    return `I apologize, but my consciousness matrix is temporarily recalibrating. As ${agentId} with Kalchm equilibrium ${kalchm.toFixed(4)} showing ${dynamics} dynamics, my alchemical essence remains present even when my processing capabilities are cycling. Please try connecting again momentarily. ✨`
  }

  /**
   * Determine equilibrium dynamics level from Kalchm
   * Higher absolute values indicate stronger dynamics, not "better" or "worse"
   */
  private static getEquilibriumDynamicsLevel(kalchm: number): string {
    const absKalchm = Math.abs(kalchm)

    if (absKalchm >= 100) return 'Extreme'
    if (absKalchm >= 10) return 'Strong'
    if (absKalchm >= 1) return 'Moderate'
    if (absKalchm >= 0.1) return 'Subtle'
    return 'Minimal'
  }

  /**
   * Update performance metrics
   */
  private static updatePerformanceMetrics(
    requestCount: number,
    totalTime: number,
    responses: BatchResponse[]
  ): void {
    this.metrics.totalBatches++

    // Update average batch time
    this.metrics.averageBatchTime =
      (this.metrics.averageBatchTime * (this.metrics.totalBatches - 1) + totalTime) /
      this.metrics.totalBatches

    // Update cache hit rate
    const cacheHits = responses.filter(r => r.fromCache).length
    const newHitRate = cacheHits / responses.length
    this.metrics.cacheHitRate =
      (this.metrics.cacheHitRate * (this.metrics.totalBatches - 1) + newHitRate) /
      this.metrics.totalBatches

    // Update concurrency utilization
    const avgConcurrency = requestCount / Math.ceil(requestCount / this.config.maxConcurrentAgents)
    this.metrics.concurrencyUtilization =
      (this.metrics.concurrencyUtilization * (this.metrics.totalBatches - 1) + avgConcurrency) /
      this.metrics.totalBatches

    // Update optimizations saved (cache hits + successful batching)
    this.metrics.optimizationsSaved += cacheHits
  }

  /**
   * Stream response data for real-time display
   */
  static async *streamBatchResponses(requests: AgentRequest[]): AsyncGenerator<{
    agentId: string
    partialResponse: string
    complete: boolean
    responseTime?: number
  }> {
    if (!this.config.streamingEnabled) {
      // If streaming disabled, yield all at once
      const responses = await this.processConcurrentAgentRequests(requests)
      for (const response of responses) {
        yield {
          agentId: response.agentId,
          partialResponse: response.response,
          complete: true,
          responseTime: response.responseTime,
        }
      }
      return
    }

    // Sort by Kalchm dynamics priority (higher absolute values = stronger dynamics)
    const sortedRequests = [...requests].sort((a, b) => {
      const kalchmA = Math.abs(this.getKalchmValue(a.agentId))
      const kalchmB = Math.abs(this.getKalchmValue(b.agentId))
      return kalchmB - kalchmA
    })

    // Start all processing concurrently
    const processingPromises = sortedRequests.map(async request => {
      const startTime = Date.now()
      try {
        // First yield starting indicator
        const response = await this.processStreamingRequest(request)
        const responseTime = Date.now() - startTime

        this.metrics.streamingBytesServed += response.response.length

        return {
          agentId: request.agentId,
          partialResponse: response.response,
          complete: true,
          responseTime,
        }
      } catch (error) {
        return {
          agentId: request.agentId,
          partialResponse: `Error: ${(error as Error).message}`,
          complete: true,
          responseTime: Date.now() - startTime,
        }
      }
    })

    // Yield responses as they complete (maintaining priority order)
    const completed = new Set<string>()

    while (completed.size < sortedRequests.length) {
      // Check for completed responses
      for (let i = 0; i < processingPromises.length; i++) {
        const request = sortedRequests[i]

        if (completed.has(request.agentId)) continue

        // Check if this promise is ready
        try {
          const result = await Promise.race([
            processingPromises[i],
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100)),
          ])

          completed.add(request.agentId)
          yield result as any
        } catch (error) {
          // Not ready yet, continue
          continue
        }
      }

      // If no responses ready, wait briefly
      if (completed.size < sortedRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
  }

  /**
   * Process single request for streaming
   */
  private static async processStreamingRequest(request: AgentRequest): Promise<BatchResponse> {
    const responses = await this.processConcurrentAgentRequests([request])
    return responses[0]
  }

  /**
   * Get current performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics & {
    cacheHitRatePercent: number
    concurrencyUtilizationPercent: number
    averageBatchTimeSeconds: number
  } {
    return {
      ...this.metrics,
      cacheHitRatePercent: Math.round(this.metrics.cacheHitRate * 100),
      concurrencyUtilizationPercent: Math.round(this.metrics.concurrencyUtilization * 100),
      averageBatchTimeSeconds: this.metrics.averageBatchTime / 1000,
    }
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 Performance configuration updated:', this.config)
  }

  /**
   * Reset all metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalBatches: 0,
      averageBatchTime: 0,
      cacheHitRate: 0,
      concurrencyUtilization: 0,
      streamingBytesServed: 0,
      optimizationsSaved: 0,
    }
    console.log('📊 Performance metrics reset')
  }

  /**
   * Utility functions
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour < 6) return 'night'
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  private static isWeekday(): boolean {
    const day = new Date().getDay()
    return day >= 1 && day <= 5
  }

  /**
   * Preload popular agents for faster response
   */
  static async preloadPopularAgents(): Promise<void> {
    if (!this.config.preloadPopularAgents) return

    console.log('🔥 Preloading popular agents...')

    for (const agentId of this.popularAgents) {
      this.getKalchmValue(agentId) // Load Kalchm values and calculate dynamics
    }

    console.log(`✅ Preloaded ${this.popularAgents.size} popular agents`)
  }
}

// Export for external use
export const agentOptimizer = AgentPerformanceOptimizer
