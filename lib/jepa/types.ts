/**
 * Joint Embedding Predictive Architecture (JEPA) Core Types & Interfaces
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Runtime: Bun Native | DB: pg (Raw SQL)
 */

export type DignityLevel =
  | 'DOMICILE'
  | 'EXALTATION'
  | 'TRIPLICITY'
  | 'TERMS'
  | 'FACES'
  | 'DETRIMENT'
  | 'FALL'

export interface AstrologicalTransit {
  planet: string
  sign: string
  degree: number
  isRetrograde: boolean
  dignity: DignityLevel
  dignityScore: number // Domicile = 5, Exaltation = 4, etc.
}

export interface CosmicContextSnapshot {
  timestamp: number
  epochHash: string
  transits: Record<string, AstrologicalTransit>
  domicileMap: Record<string, string> // Planet -> Domicile Sign
  exaltationMap: Record<string, string> // Planet -> Exaltation Sign
  activeAspects: Array<{
    planet1: string
    planet2: string
    aspectType: 'CONJUNCTION' | 'OPPOSITION' | 'TRINE' | 'SQUARE' | 'SEXTILE'
    orbDegrees: number
  }>
  compressedJSON: string
}

export interface AgentActionVector {
  agentId: string
  intentCategory: string
  targetTokenId?: string
  symbolicDignityClaim: DignityLevel
  actionPayload: Record<string, unknown>
  embeddingVector: Float64Array // Low-dimensional action representation (e.g., 64-dim)
}

export interface PRMValidationResult {
  valid: boolean
  score: number
  domicilePrecedenceViolated: boolean
  reason?: string
  latencyMs: number
}

export interface EMAPersonaState {
  agentId: string
  tau: number // Fixed at 0.99
  contextPersona: Float64Array // Fast-updating context vector
  targetPersona: Float64Array // Slow-updating target vector
  updateCount: number
  lastUpdatedMs: number
}

export interface AgentRequestPayload {
  sessionId: string
  agentId: string
  userQuery: string
  proposedAction?: AgentActionVector
  contextOverride?: Partial<CosmicContextSnapshot>
}

export interface AgentResponseStreamOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (fullResponse: string, finalPersona: Float64Array) => void
  onError?: (err: Error) => void
  signal?: AbortSignal
}
