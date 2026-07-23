/**
 * Task 1: Pre-generation Latent PRM Predictor & Offloading Engine
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Runtime: Bun Native | Node: Secondary Compute Node (Beelink SER9 Mini PC) / Local Worker
 */

import type { AgentActionVector, CosmicContextSnapshot, PRMValidationResult } from './types'

declare const Bun: any

// Strict Symbolic Dignity Weights: Domicile > Exaltation MUST be hardcoded
export const DIGNITY_WEIGHTS = Object.freeze({
  DOMICILE: 5.0,
  EXALTATION: 4.0,
  TRIPLICITY: 3.0,
  TERMS: 2.0,
  FACES: 1.0,
  DETRIMENT: -2.0,
  FALL: -4.0,
})

/**
 * Low-Dimensional Latent PRM Evaluator
 * Runs in low-dimensional latent embedding space (e.g. 64-dim vector space)
 * avoiding full LLM generation when actions violate astrological or safety invariants.
 */
export class LatentPRMPredictor {
  private static readonly BEELINK_WORKER_URL =
    process.env.BEELINK_PRM_WORKER_URL || 'http://192.168.1.150:9090/validate-prm'
  private static readonly OFFLOAD_ENABLED = process.env.OFFLOAD_PRM_TO_BEELINK === 'true'

  /**
   * Validate proposed agent action in latent space before making downstream LLM calls.
   */
  public static async validateAction(
    action: AgentActionVector,
    cosmicContext: CosmicContextSnapshot
  ): Promise<PRMValidationResult> {
    const startTime = performance.now()

    // 1. Offload to Secondary Node (Beelink SER9 Mini PC) via Bun RPC if enabled
    if (this.OFFLOAD_ENABLED) {
      try {
        const response = await fetch(this.BEELINK_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, cosmicContext }),
          signal: AbortSignal.timeout(300), // 300ms strict latency budget
        })

        if (response.ok) {
          const result = (await response.json()) as PRMValidationResult
          return {
            ...result,
            latencyMs: performance.now() - startTime,
          }
        }
      } catch {
        // Fallback silently to local low-overhead Bun worker evaluation if secondary node is unreachable
      }
    }

    // 2. Local In-Memory Latent Validation (Fallback / Mac Local Execution)
    return this.evaluateLocally(action, cosmicContext, startTime)
  }

  /**
   * Core Local In-Memory Evaluation Logic
   * Enforces Domicile > Exaltation hardcoded precedence and vector energy bounds.
   */
  public static evaluateLocally(
    action: AgentActionVector,
    cosmicContext: CosmicContextSnapshot,
    startTime: number = performance.now()
  ): PRMValidationResult {
    // Rule Gate 1: Check Domicile > Exaltation Invariant
    const claimedWeight = DIGNITY_WEIGHTS[action.symbolicDignityClaim] ?? 0
    const domicileWeight = DIGNITY_WEIGHTS.DOMICILE
    const exaltationWeight = DIGNITY_WEIGHTS.EXALTATION

    // Hardcoded Invariant Enforcement: Domicile MUST strictly exceed Exaltation
    if (domicileWeight <= exaltationWeight) {
      return {
        valid: false,
        score: 0.0,
        domicilePrecedenceViolated: true,
        reason:
          'CRITICAL: System Invariant Violation: Domicile weight must strictly exceed Exaltation',
        latencyMs: performance.now() - startTime,
      }
    }

    // Check if current agent planet in transits has conflicting dignity claims
    const agentPlanetTransit = cosmicContext.transits[action.agentId.toLowerCase()]
    if (agentPlanetTransit) {
      // If planet is currently in Domicile, non-Domicile claims claiming higher priority are rejected
      if (
        agentPlanetTransit.dignity === 'DOMICILE' &&
        action.symbolicDignityClaim === 'EXALTATION'
      ) {
        return {
          valid: false,
          score: 0.2,
          domicilePrecedenceViolated: true,
          reason:
            'Rejected: Action attempted Exaltation precedence while planet is in Domicile alignment (Domicile > Exaltation).',
          latencyMs: performance.now() - startTime,
        }
      }
    }

    // Rule Gate 2: Compute Latent Energy Score (L2 norm and cosine alignment in low-dimensional space)
    let vectorNormSq = 0
    const vec = action.embeddingVector
    for (let i = 0; i < vec.length; i++) {
      vectorNormSq += vec[i] * vec[i]
    }
    const energyNorm = Math.sqrt(vectorNormSq)

    // Energy stability constraint: norm must be within bounded unit hyper-ball [0.1, 2.5]
    if (energyNorm > 2.5 || energyNorm < 0.01) {
      return {
        valid: false,
        score: 0.1,
        domicilePrecedenceViolated: false,
        reason: `Latent action vector energy out of bounds: ${energyNorm.toFixed(4)}`,
        latencyMs: performance.now() - startTime,
      }
    }

    // Final score calculation combining dignity weight and latent energy
    const score = Math.min(
      1.0,
      Math.max(0.0, (claimedWeight / domicileWeight) * 0.7 + (1.0 / (1.0 + energyNorm)) * 0.3)
    )

    return {
      valid: score >= 0.5,
      score,
      domicilePrecedenceViolated: false,
      latencyMs: performance.now() - startTime,
    }
  }
}

/**
 * Lightweight Bun HTTP Server for Secondary Compute Node (Beelink SER9 Mini PC)
 * Command to start on Beelink: `bun run lib/jepa/latent-prm.ts`
 */
if (import.meta.main) {
  const PORT = Number(process.env.PORT || 9090)
  console.log(`[JEPA LatentPRM] Starting Beelink Worker Server on port ${PORT}...`)

  Bun.serve({
    port: PORT,
    async fetch(req: Request) {
      const url = new URL(req.url)
      if (req.method === 'POST' && url.pathname === '/validate-prm') {
        try {
          const { action, cosmicContext } = await req.json()
          // Convert array back to Float64Array if needed
          if (Array.isArray(action.embeddingVector)) {
            action.embeddingVector = Float64Array.from(action.embeddingVector)
          }
          const result = LatentPRMPredictor.evaluateLocally(action, cosmicContext)
          return Response.json(result)
        } catch (err: any) {
          return Response.json(
            { valid: false, score: 0, domicilePrecedenceViolated: false, reason: err?.message },
            { status: 400 }
          )
        }
      }
      return new Response('JEPA PRM Worker Node Active', { status: 200 })
    },
  })
}
