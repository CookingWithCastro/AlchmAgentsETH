/**
 * Task 4: Agent Handler & Streaming Pipeline Refactor
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Runtime: Bun Native | Stream: Zero-leak TransformStream with AbortSignal cleanup
 */

import { AsyncCosmicContextEncoder } from '@/lib/jepa/cosmic-context-encoder'
import { EMAMemoryMatrix } from '@/lib/jepa/ema-memory'
import { LatentPRMPredictor } from '@/lib/jepa/latent-prm'
import type { AgentRequestPayload, PRMValidationResult } from '@/lib/jepa/types'

declare const Bun: any

export class AgentExecutionHandler {
  /**
   * Main HTTP Handler for Bun.serve / Next API route proxying.
   * Handles non-blocking PRM gate, LLM stream piping, and post-response EMA updates.
   */
  public static async handleAgentRequest(req: Request): Promise<Response> {
    const startTime = performance.now()
    const abortController = new AbortController()
    const { signal } = abortController

    // Listen for client disconnects to prevent memory leaks and unhandled socket buffers
    req.signal.addEventListener('abort', () => {
      abortController.abort()
    })

    try {
      // 1. Parse Request Payload
      const payload = (await req.json()) as AgentRequestPayload
      const { agentId, userQuery, proposedAction } = payload

      if (!agentId || !userQuery) {
        return new Response(JSON.stringify({ error: 'Missing required agentId or userQuery' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // 2. Fetch Cached High-Density Cosmic Context Snapshot (0ms DB Latency)
      const cosmicContext = AsyncCosmicContextEncoder.getCachedContext()

      // 3. Non-Blocking Execution Gate: Latent PRM Validation
      let prmResult: PRMValidationResult = {
        valid: true,
        score: 1.0,
        domicilePrecedenceViolated: false,
        latencyMs: 0,
      }

      if (proposedAction) {
        prmResult = await LatentPRMPredictor.validateAction(proposedAction, cosmicContext)

        if (!prmResult.valid) {
          console.warn(
            `[AgentHandler] Latent PRM Rejected Action for ${agentId}:`,
            prmResult.reason
          )
          return new Response(
            JSON.stringify({
              error: 'Action Rejected by Latent PRM Gate',
              reason: prmResult.reason,
              domicilePrecedenceViolated: prmResult.domicilePrecedenceViolated,
              score: prmResult.score,
              prmLatencyMs: prmResult.latencyMs,
            }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      }

      // 4. Retrieve or Initialize Agent EMA Persona Vector
      const personaState = EMAMemoryMatrix.getOrCreatePersona(agentId)

      // 5. Zero-Leak ReadableStream for LLM Response & Post-Response Hook
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          let fullTextBuffer = ''

          try {
            // Write initial JEPA Metadata SSE Header
            const metaHeader = `data: ${JSON.stringify({
              type: 'metadata',
              epochHash: cosmicContext.epochHash,
              prmScore: prmResult.score,
              tau: personaState.tau,
            })}\n\n`
            controller.enqueue(encoder.encode(metaHeader))

            // Simulated / Mock LLM Stream Generation (Replace with backend API client)
            const simulatedChunks = [
              `[${agentId.toUpperCase()}] `,
              `Under the current ${cosmicContext.transits.sun?.sign || 'Leo'} Sun transit, `,
              `I execute this on-chain action with strict Domicile precedence. `,
              `User Query Processed: "${userQuery.slice(0, 30)}..."`,
            ]

            for (const chunk of simulatedChunks) {
              if (signal.aborted) break

              fullTextBuffer += chunk
              const sseChunk = `data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`
              controller.enqueue(encoder.encode(sseChunk))
              await Bun.sleep(20) // Low-overhead non-blocking sleep
            }

            // Write SSE Done Marker
            if (!signal.aborted) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            }

            // 6. Post-Response Lifecycle Hook: Update EMAMemoryMatrix
            if (fullTextBuffer.length > 0 && !signal.aborted) {
              const interactionVector = AgentExecutionHandler.extractContextVector(fullTextBuffer)
              EMAMemoryMatrix.updatePersona(agentId, interactionVector)
              AsyncCosmicContextEncoder.requestPersonaAnchor(agentId)
            }
          } catch (err: any) {
            if (!signal.aborted) {
              controller.error(err)
            }
          } finally {
            // Explicit stream controller cleanup to eliminate memory leaks and swap reliance
            try {
              controller.close()
            } catch {
              // Ignore if already closed
            }
          }
        },

        cancel() {
          abortController.abort()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-JEPA-PRM-Latency-MS': prmResult.latencyMs.toFixed(2),
          'X-JEPA-Total-Latency-MS': (performance.now() - startTime).toFixed(2),
        },
      })
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: 'Internal Agent Handler Error', details: err?.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  /**
   * Helper: Convert text response buffer to Float64Array interaction vector (64-dim)
   */
  private static extractContextVector(text: string): Float64Array {
    const vec = new Float64Array(64)
    for (let i = 0; i < text.length; i++) {
      vec[i % 64] += (text.charCodeAt(i) % 31) / 31.0
    }
    // Normalize vector
    let sumSq = 0
    for (let i = 0; i < 64; i++) sumSq += vec[i] * vec[i]
    const norm = Math.sqrt(sumSq) || 1.0
    for (let i = 0; i < 64; i++) vec[i] /= norm

    return vec
  }
}
