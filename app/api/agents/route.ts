import { NextRequest, NextResponse } from 'next/server'
import { backend } from '@/lib/backend'
import { DEMO_AGENTS } from '@/lib/demo-agents-data'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { prisma } from '@/lib/db'

interface GetAgentsResponse {
  success: boolean
  agents?: any[]
  total?: number
  error?: string
}

// Maps a historical_agents row (Railway response or Prisma row — same table,
// same field names) to the gallery's agent shape.
function formatAgentRow(agent: any) {
  return {
    id: agent.agentId,
    name: agent.name,
    title: agent.title,
    birthData: {
      date: agent.birthDate,
      time: agent.birthTime,
      location: agent.birthLocation,
    },
    consciousness: {
      natalChart: agent.natalChart,
      monicaConstant: agent.monicaConstant || 0,
      level: agent.consciousnessLevel || 'Novice',
      dominantElement: agent.dominantElement || 'Earth',
      dominantModality: agent.dominantModality || 'Fixed',
      signature: agent.signature || 'Standard',
    },
    personality: {
      core: agent.personalityCore || {},
      shadows: agent.personalityShadows || [],
      gifts: agent.personalityGifts || [],
      challenges: agent.personalityChallenges || [],
      currentMood: agent.currentMood || 'Neutral',
      evolutionStage: agent.evolutionStage || 0,
    },
    abilities: {
      specialty: agent.specialty,
      wisdomDomains: agent.wisdomDomains || [],
      teachingStyle: agent.teachingStyle || 'Standard',
      resonanceType: agent.resonanceType || 'Standard',
      uniquePower: agent.uniquePower || '',
    },
    appearance: {
      avatar: agent.avatar,
      color: agent.color,
      symbol: agent.symbol,
      aura: agent.aura,
    },
    stats: {
      conversations: agent.conversations,
      wisdomShared: agent.wisdomShared,
      resonanceScore: agent.resonanceScore,
      evolutionPoints: agent.evolutionPoints,
      lastActive: agent.lastActive,
      kineticEvolution: {
        consciousnessVelocity: 0.1,
        interactionMomentum: 0,
        evolutionTrajectory: 'ascending',
        powerLevelUnlocks: [],
        optimalInteractionHours: [],
        aspectSensitivityGrowth: 0,
        memoryPersistence: 0.3,
        lastKineticUpdate: agent.lastActive,
      },
      qualityMetrics: {
        averageResponseDepth: 0.5,
        aspectInfluenceStrength: 0.4,
        temporalAlignment: 0.5,
        personalityEvolution: 0,
        kineticResonance: 0.5,
      },
    },
    // Cosmic EV & Leveling (present once the backend exposes them; the gallery
    // also hydrates these directly from Neon via /api/agents/leveling).
    level: agent.level,
    xp: agent.xp,
    evolutionValues: agent.evolutionValues,
    evTotal: agent.evTotal,
    ivSnapshot: agent.ivSnapshot,
    isUserCreated:
      agent.historicalEra === 'user_created' || agent.craftedBy === 'philosopher-stone-user',
    craftedBy: agent.craftedBy || 'philosopher-stone',
    historicalEra: agent.historicalEra,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetAgentsResponse>> {
  const { searchParams } = new URL(request.url)

  // Legacy escape hatch: proxy a raw window of the Railway table (the old
  // default — an arbitrary slice of the ~3,700-row table including sprites).
  if (searchParams.get('source') === 'backend') {
    try {
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')
      const dbAgents = await backend.agents.list({ skip: offset, limit })
      const agents = dbAgents.map(formatAgentRow)
      return NextResponse.json({ success: true, agents, total: agents.length })
    } catch (error: any) {
      return NextResponse.json({
        success: true,
        agents: DEMO_AGENTS,
        total: DEMO_AGENTS.length,
        error: `Backend error, falling back to demo data: ${error.message}`,
      })
    }
  }

  // Default roster: the canonical in-memory historical agents (the source of
  // truth per CLAUDE.md — complete and instant) plus user-forged vessels from
  // Neon. Replaces the old arbitrary 100-row window of the full table that
  // mislabeled a sprite-heavy slice as "the roster".
  // Strip prose-heavy fields no gallery consumer reads (diet lore, quotes,
  // beliefs, creation story) — they were ~60% of a 442KB response.
  const canonical = HISTORICAL_AGENTS.map(agent => {
    const { historicalDiet, quotes, coreBeliefs, monicaCreationStory, ...slim } = agent as any
    return {
      ...slim,
      isUserCreated: false,
      historicalEra: (agent as any).historicalEra ?? agent.era,
    }
  })

  let userCreated: any[] = []
  try {
    const rows = await prisma.historical_agents.findMany({
      where: { isActive: true, craftedBy: 'philosopher-stone-user' },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    userCreated = rows.map(formatAgentRow)
  } catch (error: any) {
    console.warn('User-created roster fetch failed (canonical roster only):', error.message)
  }

  const canonicalIds = new Set(canonical.map(a => a.id))
  const allAgents = [...canonical, ...userCreated.filter(a => !canonicalIds.has(a.id))]

  return NextResponse.json({
    success: true,
    agents: allAgents,
    total: allAgents.length,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const result = await backend.agents.create(body)

    return NextResponse.json({
      success: true,
      agent: result,
    })
  } catch (error: any) {
    console.error('Failed to create agent via backend:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create agent' },
      { status: 500 }
    )
  }
}
