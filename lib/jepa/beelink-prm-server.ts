/**
 * Task 6: Beelink Secondary Compute Node TCP Worker Server (Stream Frame Buffer)
 * Architecture: Joint Embedding Predictive Architecture (JEPA)
 * Target Scope: cookingwithcastro-llc / planetaryagentseth
 * Runtime: Bun Native TCP Server (Zero HTTP overhead, high throughput)
 */

import { LatentPRMPredictor } from './latent-prm'
import type { AgentActionVector, CosmicContextSnapshot } from './types'

declare const Bun: any

const PORT = Number(process.env.BEELINK_TCP_PORT || 9091)

console.log(`[Beelink TCP Worker] Starting high-throughput TCP PRM server on port ${PORT}...`)

Bun.listen({
  hostname: '0.0.0.0',
  port: PORT,
  socket: {
    open(socket: any) {
      socket.data = { buffer: '' }
    },
    data(socket: any, data: Buffer) {
      if (!socket.data) socket.data = { buffer: '' }
      socket.data.buffer += data.toString('utf-8')

      let newlineIndex: number
      while ((newlineIndex = socket.data.buffer.indexOf('\n')) !== -1) {
        const line = socket.data.buffer.slice(0, newlineIndex).trim()
        socket.data.buffer = socket.data.buffer.slice(newlineIndex + 1)

        if (!line) continue

        try {
          const payload = JSON.parse(line)
          const action: AgentActionVector = payload.action
          const context: CosmicContextSnapshot = payload.context

          if (Array.isArray(action.embeddingVector)) {
            action.embeddingVector = Float64Array.from(action.embeddingVector)
          }

          const result = LatentPRMPredictor.evaluateLocally(action, context)
          socket.write(JSON.stringify(result) + '\n')
        } catch (err: any) {
          socket.write(
            JSON.stringify({ valid: false, error: err?.message || 'Malformed Payload' }) + '\n'
          )
        }
      }
    },
    error(socket: any, error: Error) {
      console.error('[Beelink TCP Worker] Socket Error:', error.message)
    },
  },
})
