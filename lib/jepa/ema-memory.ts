/**
 * Task 2: Exponential Moving Average (EMA) Persona Stabilizer Matrix
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Runtime: Bun Native | Performance: O(1) Memory, Zero GC Allocations during loop
 */

import type { EMAPersonaState } from './types'

export class EMAMemoryMatrix {
  private static readonly DEFAULT_TAU = 0.99 // Hardcoded tau per specification
  private static readonly VECTOR_DIM = 64 // Fixed latent persona dimension

  // In-memory cache of agent state matrices: AgentId -> EMAPersonaState
  private static agentStore: Map<string, EMAPersonaState> = new Map()

  /**
   * Get or initialize agent persona vectors in O(1) memory allocation.
   */
  public static getOrCreatePersona(agentId: string, initialVector?: Float64Array): EMAPersonaState {
    let state = this.agentStore.get(agentId)
    if (!state) {
      const dim = initialVector ? initialVector.length : this.VECTOR_DIM
      const targetVec = new Float64Array(dim)
      const contextVec = new Float64Array(dim)

      if (initialVector) {
        targetVec.set(initialVector)
        contextVec.set(initialVector)
      }

      state = {
        agentId,
        tau: this.DEFAULT_TAU,
        targetPersona: targetVec,
        contextPersona: contextVec,
        updateCount: 0,
        lastUpdatedMs: Date.now(),
      }
      this.agentStore.set(agentId, state)
    }
    return state
  }

  /**
   * Update persona vectors using Exponential Moving Average (EMA) in O(1) memory.
   * Formula: theta_target = tau * theta_target + (1 - tau) * theta_context
   *
   * @param agentId Unique identifier of the planetary agent
   * @param incomingContext Vector extracted from latest interaction turn
   * @param customTau Optional parameter drift coefficient (defaults to 0.99)
   */
  public static updatePersona(
    agentId: string,
    incomingContext: Float64Array,
    customTau?: number
  ): EMAPersonaState {
    const state = this.getOrCreatePersona(agentId, incomingContext)
    const tau = customTau ?? state.tau
    const oneMinusTau = 1.0 - tau

    const target = state.targetPersona
    const context = state.contextPersona
    const len = Math.min(target.length, incomingContext.length)

    // In-place O(1) memory update across Float64Array buffer - ZERO GC allocations
    for (let i = 0; i < len; i++) {
      // 1. Update fast context persona directly
      context[i] = incomingContext[i]
      // 2. Perform EMA drift update on slow target persona
      target[i] = tau * target[i] + oneMinusTau * incomingContext[i]
    }

    state.updateCount++
    state.lastUpdatedMs = Date.now()
    return state
  }

  /**
   * Calculate L2 norm similarity / drift magnitude between context and target persona.
   */
  public static calculatePersonaDrift(agentId: string): number {
    const state = this.agentStore.get(agentId)
    if (!state) return 0.0

    const target = state.targetPersona
    const context = state.contextPersona
    let sumSqDiff = 0.0

    for (let i = 0; i < target.length; i++) {
      const diff = target[i] - context[i]
      sumSqDiff += diff * diff
    }

    return Math.sqrt(sumSqDiff)
  }

  /**
   * Clear or reset memory state for an agent to prevent leaks over long-lived server processes.
   */
  public static purgeAgent(agentId: string): boolean {
    return this.agentStore.delete(agentId)
  }

  /**
   * Return size of active in-memory store
   */
  public static getStoreSize(): number {
    return this.agentStore.size
  }
}
