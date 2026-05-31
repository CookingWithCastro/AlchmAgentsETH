/**
 * Sky-sprite profile data (step 5). A planetary-degree / moon sprite isn't a
 * full CraftedAgent — it's a celestial point. This assembles its "rich" view
 * directly from the model + live sky + its reservoir row, without going through
 * resolveAnyAgent (which is why /agent/<degree> used to 404).
 */

import 'server-only'
import { prisma } from '@/lib/db'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { calculateMoonIllumination } from '@/lib/moon-phase-calculator'
import {
  classifyAgent,
  dignityOf,
  degreeReservoir,
  lunarReservoir,
  PLANET_STAT,
  PLANET_ESMS,
  type EsmsVector,
  type DignityTier,
  type Planet,
} from './agent-type-model'

const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'
const ZERO: EsmsVector = { spirit: 0, essence: 0, matter: 0, substance: 0 }

export interface SpriteBestowal {
  agentId: string
  total: number
  statBuff: number
  statBuffed: string
  at: string
}

export interface SpriteView {
  agentId: string
  kind: 'planetary' | 'lunar'
  planet: string
  sign?: string
  degree?: number
  dignity?: DignityTier
  bestowsStat?: string
  affinity: EsmsVector
  idealReservoir: EsmsVector
  currentReservoir: EsmsVector | null
  transit?: { sign: string; degree: number; active: boolean }
  illumination?: number
  recentBestowals: SpriteBestowal[]
}

const toNum = (v: unknown): number => Number(v ?? 0) || 0
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)

export async function getSpriteView(agentId: string): Promise<SpriteView | null> {
  const c = classifyAgent(agentId)
  if (!c.isSprite || !c.planet) return null

  const planet = c.planet
  const lunar = c.economyRole === 'lunar-reservoir'
  const illumination = lunar ? calculateMoonIllumination(new Date()) : undefined
  const dignity = !lunar && c.sign ? dignityOf(planet, c.sign) : undefined
  const idealReservoir = lunar
    ? lunarReservoir(illumination ?? 0)
    : c.sign
      ? degreeReservoir(planet, c.sign)
      : ZERO

  // Live reservoir (possibly depleted by today's attunes).
  let currentReservoir: EsmsVector | null = null
  try {
    const u = await prisma.users.findFirst({
      where: { email: `${agentId}${AGENTIC_DOMAIN}` },
      select: { id: true },
    })
    if (u) {
      const b = await prisma.tokenBalance.findUnique({ where: { userId: u.id } })
      if (b) {
        currentReservoir = {
          spirit: toNum(b.spirit),
          essence: toNum(b.essence),
          matter: toNum(b.matter),
          substance: toNum(b.substance),
        }
      }
    }
  } catch {
    /* reservoir optional */
  }

  // Where the planet is in the live sky (and whether it's near THIS degree).
  let transit: SpriteView['transit']
  try {
    const live = getCurrentPlanetaryPositions()
    const pos =
      (live as Record<string, { sign: string; degree: number }>)[cap(planet)] ||
      (live as Record<string, { sign: string; degree: number }>)[planet]
    if (pos?.sign) {
      const active =
        !lunar &&
        !!c.sign &&
        typeof c.degree === 'number' &&
        pos.sign.toLowerCase() === c.sign &&
        Math.abs(pos.degree - c.degree) <= 1.5
      transit = { sign: pos.sign, degree: pos.degree, active }
    }
  } catch {
    /* transit optional */
  }

  // Recent attunements radiated by this sprite.
  let recentBestowals: SpriteBestowal[] = []
  try {
    const rows = await prisma.$queryRaw<
      Array<{ agentId: string; metadataPayload: any; createdAt: Date }>
    >`
      SELECT "agentId", "metadataPayload", "createdAt"
      FROM agent_action_events
      WHERE "eventType" = 'attunement'
        AND "metadataPayload"->>'degreeAgentId' = ${agentId}
      ORDER BY "createdAt" DESC
      LIMIT 8
    `
    recentBestowals = rows.map(r => {
      const b = (r.metadataPayload?.bestowed ?? {}) as Partial<EsmsVector>
      const total = toNum(b.spirit) + toNum(b.essence) + toNum(b.matter) + toNum(b.substance)
      return {
        agentId: r.agentId,
        total,
        statBuff: toNum(r.metadataPayload?.statBuff),
        statBuffed: String(r.metadataPayload?.statBuffed ?? ''),
        at: r.createdAt.toISOString(),
      }
    })
  } catch {
    /* bestowals optional */
  }

  return {
    agentId,
    kind: lunar ? 'lunar' : 'planetary',
    planet,
    sign: c.sign,
    degree: c.degree,
    dignity,
    bestowsStat: PLANET_STAT[planet as Planet],
    affinity: PLANET_ESMS[planet as Planet] ?? ZERO,
    idealReservoir,
    currentReservoir,
    transit,
    illumination,
    recentBestowals,
  }
}
