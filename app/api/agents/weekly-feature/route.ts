/**
 * GET /api/agents/weekly-feature
 *
 * This week's "best dignity of the week" rotation: top-dignity planets, the
 * active aspects of the week, the FREE featured historical guides, and the
 * degree-sprite council (the planets in those aspects) ready to drop into the
 * `/api/multi-agent` planetary council. Public read; deterministic per week.
 */

import { NextResponse } from 'next/server'
import { resolveWeeklyFeature, rankPlanetsByDignity } from '@/lib/agents/weekly-feature-rotation'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'
import type { Element } from '@/lib/agent-types'

export const dynamic = 'force-dynamic'

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)

const SIGN_ELEMENT: Record<string, Element> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
}
const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

export async function GET() {
  try {
    const feature = await resolveWeeklyFeature()
    const ranked = rankPlanetsByDignity()
    const byPlanet = new Map(ranked.map(r => [r.planet, r]))

    // Resolve featured guide name/title/element from the canonical roster.
    const guideMeta = new Map<string, { name: string; title?: string; element?: string }>()
    try {
      const mod: any = await import('@/lib/agents/historical')
      for (const a of (mod.HISTORICAL_AGENTS ?? []) as any[])
        guideMeta.set(a.id, {
          name: a.name,
          title: a.title,
          element: a.consciousness?.dominantElement,
        })
    } catch {
      /* names are best-effort */
    }
    const guides = feature.featuredGuideIds.map(id => {
      const m = guideMeta.get(id)
      return { id, name: m?.name ?? id, title: m?.title, element: m?.element, free: true }
    })

    // Council = the unique planets in this week's active aspects, as the
    // `{ planet, sign, degree }` AgentConfig shape /api/multi-agent expects (≤5).
    const councilPlanets = new Set<string>()
    for (const a of feature.activeAspects) {
      councilPlanets.add(a.a)
      councilPlanets.add(a.b)
    }
    const council = [...councilPlanets]
      .map(p => byPlanet.get(p))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map(r => ({
        planet: cap(r.planet),
        sign: cap(r.sign),
        degree: String(Math.round(r.degree)),
        spriteId: r.spriteId,
        tier: r.tier,
      }))
      .slice(0, 5)

    // Mixed-room roster for /api/unified-multi-agent-chat (≤6, prod cap):
    // 3 guide stubs (the endpoint hydrates historical agents) + 3 planetary
    // sprite agents built with full personas via the factory.
    const guideAgents = guides
      .slice(0, 3)
      .map(g => ({ id: g.id, name: g.name, type: 'historical' as const }))
    const spriteAgents = council.slice(0, 3).map(c =>
      unifiedAgentFactory.createFromPlanetary({
        planet: c.planet,
        sign: c.sign,
        degree: c.degree,
        dignity: c.tier,
        element: SIGN_ELEMENT[c.sign] ?? 'Earth',
        color: '#8b5cf6',
        symbol: PLANET_GLYPH[c.planet] ?? '✦',
      })
    )
    const roster = [...guideAgents, ...spriteAgents]

    return NextResponse.json({
      ok: true,
      weekStart: feature.weekStart,
      weekEnd: feature.weekEnd,
      roster,
      topPlanets: feature.topPlanets.map(p => ({
        planet: cap(p.planet),
        sign: cap(p.sign),
        degree: Math.round(p.degree),
        tier: p.tier,
        factor: p.factor,
        retrograde: p.retrograde,
        spriteId: p.spriteId,
      })),
      activeAspects: feature.activeAspects,
      guides,
      council,
      degreeParticipantIds: feature.degreeParticipantIds,
      freeAgentIds: feature.freeAgentIds,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}
