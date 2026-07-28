import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ConsciousnessClient } from '@/lib/api-client/consciousness-client'
import { analyzePhiAxisIndex } from '@/lib/monica/monica-constant'
import { backend, getAlchemicalQuantitiesLegacy } from '@/lib/backend'

const InteractionSchema = z.object({
  userId: z.string().optional(),
  agentId: z.string(),
  interactionData: z.record(z.any()).optional(),
})

const consciousnessClient = new ConsciousnessClient()

export async function POST(request: Request) {
  try {
    const payload = InteractionSchema.parse(await request.json())
    const userId = payload.userId || 'anonymous'
    const agentId = payload.agentId

    const agent = await prisma.historical_agents.findUnique({
      where: { agentId },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const birthChart = agent.natalChart
    const currentMoment = await getAlchemicalQuantitiesLegacy()

    const blueprint = await consciousnessClient.createAgentOfMoment(birthChart, currentMoment)

    const spirit = currentMoment?.['Alchemy Effects']?.['Total Spirit'] || 0
    const essence = currentMoment?.['Alchemy Effects']?.['Total Essence'] || 0
    const matter = currentMoment?.['Alchemy Effects']?.['Total Matter'] || 0
    const substance = currentMoment?.['Alchemy Effects']?.['Total Substance'] || 0

    const phiAxis = analyzePhiAxisIndex({
      spirit,
      essence,
      matter,
      substance,
      Heat: currentMoment?.Heat || 0,
      Entropy: currentMoment?.Entropy || 0,
      Reactivity: currentMoment?.Reactivity || 0,
      Energy: currentMoment?.Energy || 0,
    })

    await prisma.consciousness_interactions.create({
      data: {
        id: randomUUID(),
        userId,
        agentId,
        interactionType: 'crafting',
        powerGained: phiAxis.value,
        planetaryInfluence: agent.name ?? agentId,
        elementalResonance: blueprint.consciousness.resonance,
        metadata: JSON.stringify({
          blueprint,
          interactionData: payload.interactionData,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      blueprint,
      // Response key kept as-is (archived route); the payload is the Phi Axis Index
      // analysis, not the thermodynamic Monica (lib/thermodynamics/kalchm.ts).
      monicaConstant: phiAxis,
    })
  } catch (error) {
    console.error('Agent interaction error:', error)
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 })
  }
}
