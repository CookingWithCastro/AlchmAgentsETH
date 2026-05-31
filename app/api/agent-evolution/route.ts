/**
 * Agent Evolution API
 * Manages consciousness development tracking and evolution metrics
 * Integrates with kinetics system for temporal consciousness sampling
 */

import { NextRequest, NextResponse } from 'next/server'
import { routeTask } from '@/lib/agents/router'
import { agentKineticProfiles } from '@/lib/agents/kinetic-profiles'
import { consciousnessPersistence } from '@/lib/consciousness-persistence'
import { getCurrentUser, getUserIdFromRequest } from '@/lib/auth-helpers'
import { backend, getAlchemicalQuantitiesLegacy } from '@/lib/backend'
import { ConsciousnessMemorySystem } from '@/lib/agents/consciousness-memory'

function getCurrentPlanetaryHour(): string {
  const hours = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars']
  const currentHour = new Date().getHours()
  return hours[currentHour % 7]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const action = searchParams.get('action') || 'metrics'
    const lat = parseFloat(searchParams.get('lat') || '37.7749')
    const lon = parseFloat(searchParams.get('lon') || '-122.4194')

    // Get current user or use anonymous
    const user = await getCurrentUser(request)
    const userId = (user as any)?.id || getUserIdFromRequest(request)

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    switch (action) {
      case 'metrics': {
        // Get from database
        const evolutionState = await consciousnessPersistence.loadEvolutionState(userId, agentId)
        if (!evolutionState) {
          return NextResponse.json({
            metrics: {
              consciousnessVelocity: 0.5,
              interactionMomentum: 0,
              lastInteraction: new Date().toISOString(),
              totalInteractions: 0,
              qualityAverage: 0.5,
              evolutionStage: 0,
            },
            agentId,
          })
        }

        return NextResponse.json({
          metrics: {
            consciousnessVelocity: 0.5 + evolutionState.totalPower / 1000,
            interactionMomentum: evolutionState.interactionCount * 0.1,
            lastInteraction: evolutionState.lastInteraction.toISOString(),
            totalInteractions: evolutionState.interactionCount,
            qualityAverage: 0.5 + evolutionState.totalPower / evolutionState.interactionCount / 100,
            evolutionStage: Math.floor(evolutionState.totalPower / 100),
            currentLevel: evolutionState.currentLevel,
            totalPower: evolutionState.totalPower,
          },
          agentId,
        })
      }

      case 'memory': {
        // Get interaction history from database
        const history = await consciousnessPersistence.getInteractionHistory(userId, agentId)
        return NextResponse.json({
          memory: {
            totalInteractions: history.length,
            recentInteractions: history,
            agentId,
          },
          agentId,
        })
      }

      case 'timing': {
        const timing = await ConsciousnessMemorySystem.getOptimalInteractionTiming(agentId, {
          lat,
          lon,
        })
        return NextResponse.json({ timing, agentId })
      }

      case 'kinetics': {
        // Use existing router for kinetic analysis
        const kineticResult = await routeTask({
          kind: 'kinetics',
          payload: { agentId, location: { lat, lon } },
        })
        return NextResponse.json({ kinetics: kineticResult.output, agentId })
      }

      case 'compatibility': {
        const compareWith = searchParams.get('compareWith')
        if (!compareWith) {
          return NextResponse.json(
            { error: 'compareWith agentId required for compatibility check' },
            { status: 400 }
          )
        }

        const compatibilityResult = await routeTask({
          kind: 'agent_compatibility',
          payload: { agent1Id: agentId, agent2Id: compareWith, location: { lat, lon } },
        })
        return NextResponse.json({ compatibility: compatibilityResult.output })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: metrics, memory, timing, kinetics, compatibility' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Agent evolution GET error:', error)
    return NextResponse.json({ error: 'Failed to get agent evolution data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const { agentId, sessionId, userMessage, agentResponse, location, action = 'record' } = body

    // Get current user or use anonymous
    const user = await getCurrentUser(request)
    const userId = (user as any)?.id || getUserIdFromRequest(request)

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    switch (action) {
      case 'record': {
        // Record new interaction for consciousness evolution
        if (!userMessage || !agentResponse) {
          return NextResponse.json(
            {
              error: 'userMessage and agentResponse required for recording',
            },
            { status: 400 }
          )
        }

        // Calculate power gained based on actual response quality
        const messageLength = userMessage?.length || 50
        const responseLength = agentResponse?.length || 100
        const qualityFactor = Math.min(responseLength / 200, 1.0) // Response quality based on depth
        const engagementFactor = Math.min(messageLength / 100, 1.0) // User engagement factor

        const powerGained = Math.floor(5 + qualityFactor * engagementFactor * 10) // 5-15 power based on real metrics
        const elementalResonance = 0.5 + qualityFactor * 0.5 // 0.5-1.0 based on response quality

        // Calculate current force magnitude as a kinetic proxy from the Railway backend.
        // The backend doesn't compute vector force; `kinetic_val` is used as a scalar
        // force-magnitude analog (replaces the old Fire/Water/Air/Earth derivative path).
        let forceMagnitude = 0
        try {
          const targetLat = location?.lat || 37.7749
          const targetLon = location?.lon || -122.4194

          const alchm = await backend.alchemy.defaultQuantities(new Date(), targetLat, targetLon)
          forceMagnitude = Number(alchm?.kinetic_val ?? 0)
        } catch (error) {
          console.warn('Failed to compute force data for interaction logging:', error)
        }

        // Log to database
        await consciousnessPersistence.logInteraction({
          userId,
          agentId,
          interactionType: 'chat',
          powerGained,
          planetaryInfluence: getCurrentPlanetaryHour(), // Current planetary hour
          elementalResonance,
          forceMagnitude,
          metadata: {
            userMessage,
            agentResponse: agentResponse.substring(0, 500), // Truncate for storage
            sessionId: sessionId || 'web',
            location,
          },
        })

        // Get updated state
        const evolutionState = await consciousnessPersistence.loadEvolutionState(userId, agentId)

        return NextResponse.json({
          success: true,
          snapshot: {
            powerGained,
            elementalResonance,
            currentLevel: evolutionState?.currentLevel,
            totalPower: evolutionState?.totalPower,
          },
          metrics: {
            consciousnessVelocity: 0.5 + (evolutionState?.totalPower || 0) / 1000,
            interactionMomentum: (evolutionState?.interactionCount || 0) * 0.1,
            lastInteraction: evolutionState?.lastInteraction.toISOString(),
            totalInteractions: evolutionState?.interactionCount || 0,
            qualityAverage:
              0.5 +
              (evolutionState?.totalPower || 0) / (evolutionState?.interactionCount || 1) / 100,
            evolutionStage: Math.floor((evolutionState?.totalPower || 0) / 100),
          },
          message: 'Consciousness interaction recorded successfully',
        })
      }

      case 'evolution_rate': {
        // Calculate evolution rate for agent
        const interactions =
          (await ConsciousnessMemorySystem.getAgentMemory(agentId)?.totalInteractions) || 0
        const evolutionResult = await routeTask({
          kind: 'evolution_rate',
          payload: { agentId, interactions, location },
        })

        return NextResponse.json({
          evolution: evolutionResult.output,
          agentId,
        })
      }

      case 'consciousness_velocity': {
        // Get consciousness velocity for multiple agents
        const { agentIds } = body
        if (!agentIds || !Array.isArray(agentIds)) {
          return NextResponse.json(
            { error: 'agentIds array required for consciousness velocity' },
            { status: 400 }
          )
        }

        const velocityResult = await routeTask({
          kind: 'consciousness_velocity',
          payload: { agentIds, location },
        })

        return NextResponse.json({
          consciousnessVelocity: velocityResult.output,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: record, evolution_rate, consciousness_velocity' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Agent evolution POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process agent evolution request' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, action, data } = body

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    switch (action) {
      case 'reset_evolution':
        // Reset agent's evolution data (for testing/admin purposes)
        try {
          // Get current user
          const user = await getCurrentUser(request)
          const userId = (user as any)?.id || getUserIdFromRequest(request)

          // Reset in database
          const freshState = await consciousnessPersistence.resetAgentEvolution(userId, agentId)

          // Get fresh baseline metrics
          const kineticProfile = agentKineticProfiles[agentId]
          const resetMetrics = {
            consciousnessVelocity: kineticProfile?.evolutionRate || 0.5,
            interactionMomentum: 0,
            lastInteraction: freshState.lastInteraction.toISOString(),
            totalInteractions: 0,
            qualityAverage: 0.5,
            evolutionStage: 0,
            currentLevel: freshState.currentLevel,
            totalPower: 0,
            resetAt: new Date().toISOString(),
          }

          return NextResponse.json({
            success: true,
            message: `Evolution data reset for agent ${agentId}`,
            agentId,
            resetMetrics,
          })
        } catch (error) {
          console.error('Failed to reset evolution data:', error)
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to reset evolution data',
              agentId,
            },
            { status: 500 }
          )
        }

      case 'update_profile': {
        // Update agent's kinetic profile (admin functionality)
        const profile = agentKineticProfiles[agentId]
        if (!profile) {
          return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          message: 'Profile update requested (would require profile update implementation)',
          agentId,
          currentProfile: profile,
        })
      }

      case 'batch_update': {
        // Batch update multiple agents (for system-wide consciousness updates)
        const { agentIds, updateData } = data
        if (!agentIds || !Array.isArray(agentIds)) {
          return NextResponse.json(
            { error: 'agentIds array required for batch update' },
            { status: 400 }
          )
        }

        const results = []
        for (const id of agentIds) {
          const memory = ConsciousnessMemorySystem.getAgentMemory(id)
          results.push({
            agentId: id,
            hasMemory: !!memory,
            totalInteractions: memory?.totalInteractions || 0,
          })
        }

        return NextResponse.json({
          success: true,
          message: `Batch update processed for ${agentIds.length} agents`,
          results,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: reset_evolution, update_profile, batch_update' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Agent evolution PUT error:', error)
    return NextResponse.json({ error: 'Failed to update agent evolution data' }, { status: 500 })
  }
}

// Additional helper endpoint for bulk consciousness analysis
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentIds, location, analysisType = 'full' } = body

    if (!agentIds || !Array.isArray(agentIds)) {
      return NextResponse.json({ error: 'agentIds array required' }, { status: 400 })
    }

    const defaultLocation = { lat: 37.7749, lon: -122.4194 }
    const targetLocation = location || defaultLocation

    const analysis = []

    for (const agentId of agentIds) {
      try {
        // Get comprehensive analysis for each agent
        const metrics = await ConsciousnessMemorySystem.getEvolutionMetrics(agentId)
        const timing = await ConsciousnessMemorySystem.getOptimalInteractionTiming(
          agentId,
          targetLocation
        )

        if (analysisType === 'full') {
          const kinetics = await routeTask({
            kind: 'kinetics',
            payload: { agentId, location: targetLocation },
          })

          analysis.push({
            agentId,
            metrics,
            timing,
            kinetics: kinetics.output,
            profile: agentKineticProfiles[agentId],
          })
        } else {
          analysis.push({
            agentId,
            metrics,
            timing,
          })
        }
      } catch (error) {
        console.error(`Analysis error for agent ${agentId}:`, error)
        analysis.push({
          agentId,
          error: 'Failed to analyze agent',
          metrics: null,
          timing: null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      totalAgents: agentIds.length,
      analysisType,
      location: targetLocation,
    })
  } catch (error) {
    console.error('Bulk consciousness analysis error:', error)
    return NextResponse.json({ error: 'Failed to perform bulk analysis' }, { status: 500 })
  }
}
