/**
 * GET /api/agents/gallery
 *
 * Live roster listing for the Techno-Occult v2 Vault (Stitch realization
 * plan, Phase 5). Pages through the real historical_agents populations
 * straight from Neon via Prisma — no Railway round-trip, no invented agents.
 *
 *   ?population=historical | planetary | moon-phase   (default historical)
 *   ?search=<substring>                               (name, case-insensitive)
 *   ?limit=24&offset=0                                (limit capped at 60)
 *
 * Populations are discriminated by agentId prefix (see the population note
 * in scripts/prune-test-agents.ts): planetary-* / moon-phase-* / the rest
 * minus test rows = canonical historical figures.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CORS_HEADERS, corsPreflight } from '@/lib/cors'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { deriveSacredStats } from '@/lib/agents/persona/derive-sacred-stats'

export function OPTIONS() {
  return corsPreflight()
}

const POPULATION_WHERE: Record<string, object> = {
  planetary: { agentId: { startsWith: 'planetary-' } },
  'moon-phase': { agentId: { startsWith: 'moon-phase-' } },
  historical: {
    NOT: [
      { agentId: { startsWith: 'planetary-' } },
      { agentId: { startsWith: 'moon-phase-' } },
      { agentId: { startsWith: 'custom-historical-agent-' } },
      { agentId: { startsWith: 'sync-test-agent-' } },
      { agentId: { startsWith: 'agent-' } }, // forge-crafted vessels listed separately
    ],
  },
  crafted: { agentId: { startsWith: 'agent-' } },
}

function canonicalHistoricalGallery(search: string | undefined, limit: number, offset: number) {
  const needle = search?.toLocaleLowerCase()
  const matching = HISTORICAL_AGENTS.filter(agent => {
    if (!needle) return true
    return [agent.name, agent.title, agent.abilities?.specialty]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(needle))
  }).sort((a, b) => a.name.localeCompare(b.name))

  const agents = matching.slice(offset, offset + limit).map(agent => ({
    agentId: agent.id,
    name: agent.name,
    title: agent.title,
    symbol: agent.appearance?.symbol ?? null,
    color: agent.appearance?.color ?? null,
    monicaConstant: agent.consciousness?.monicaConstant ?? null,
    consciousnessLevel: agent.consciousness?.level ?? null,
    dominantElement: agent.consciousness?.dominantElement ?? null,
    level: Math.max(1, Math.min(100, Math.round(agent.personality?.evolutionStage ?? 1))),
    sacred7: deriveSacredStats(agent),
  }))

  return { success: true, population: 'historical', total: matching.length, offset, limit, agents }
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const population = params.get('population') ?? 'historical'
    const search = params.get('search')?.trim()
    const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '24', 10) || 24, 1), 60)
    const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0)

    const populationWhere = POPULATION_WHERE[population]
    if (!populationWhere) {
      return NextResponse.json(
        { success: false, error: `Unknown population '${population}'` },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (population === 'historical' && !process.env.DATABASE_URL) {
      return NextResponse.json(canonicalHistoricalGallery(search, limit, offset), {
        headers: CORS_HEADERS,
      })
    }

    const where = search
      ? { AND: [populationWhere, { name: { contains: search, mode: 'insensitive' } }] }
      : populationWhere

    const [rows, total] = await Promise.all([
      (prisma.historical_agents as any).findMany({
        where,
        select: {
          agentId: true,
          name: true,
          title: true,
          symbol: true,
          color: true,
          monicaConstant: true,
          consciousnessLevel: true,
          dominantElement: true,
          level: true,
          powerScore: true,
          resonanceScore7: true,
          wisdomScore: true,
          charismaScore: true,
          intuitionScore: true,
          adaptabilityScore: true,
          vitalityScore: true,
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      (prisma.historical_agents as any).count({ where }),
    ])

    const agents = (rows as any[]).map(r => ({
      agentId: r.agentId,
      name: r.name,
      title: r.title,
      symbol: r.symbol,
      color: r.color,
      monicaConstant: r.monicaConstant,
      consciousnessLevel: r.consciousnessLevel,
      dominantElement: r.dominantElement,
      level: r.level ?? 1,
      sacred7: {
        power: r.powerScore ?? 0,
        resonance: r.resonanceScore7 ?? 0,
        wisdom: r.wisdomScore ?? 0,
        charisma: r.charismaScore ?? 0,
        intuition: r.intuitionScore ?? 0,
        adaptability: r.adaptabilityScore ?? 0,
        vitality: r.vitalityScore ?? 0,
      },
    }))

    if (population === 'historical' && rows.length === 0) {
      return NextResponse.json(canonicalHistoricalGallery(search, limit, offset), {
        headers: CORS_HEADERS,
      })
    }

    return NextResponse.json(
      { success: true, population, total, offset, limit, agents },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('agents gallery GET error:', error)

    const params = new URL(request.url).searchParams
    const population = params.get('population') ?? 'historical'
    const search = params.get('search')?.trim()
    const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '24', 10) || 24, 1), 60)
    const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0)

    // Historical personas are canonical in source control, so the public Vault
    // remains useful even when the optional Neon mirror is not configured.
    if (population === 'historical') {
      return NextResponse.json(canonicalHistoricalGallery(search, limit, offset), {
        headers: CORS_HEADERS,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'This agent population is temporarily unavailable.',
        agents: [],
      },
      { status: 503, headers: CORS_HEADERS }
    )
  }
}
