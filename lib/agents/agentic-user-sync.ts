import { prisma } from '@/lib/db'
import { signDegreeToLongitude } from '@/lib/enhanced-astronomical-calculator'
import { syncAgentToWten, type SyncAgentProfilePayload } from '@/lib/wtenClient'

const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'

interface EnsureAgenticUserInput {
  agentId: string
  name: string
  bio?: string | null
  birthDate: Date
  birthTime?: string | null
  birthLocation: unknown
  natalChart: unknown
  monicaConstant: number
  dominantElement: string
}

/** First value that coerces to a finite number; `null` when there is none. */
function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Absolute ECLIPTIC longitude (0–360) of a natal placement — where the planet
 * sits on the zodiac, NOT a birth location's geographic longitude.
 *
 * A finite longitude already on the record wins (real stored data). Otherwise
 * it is DERIVED from the sign + within-sign degree the record actually holds,
 * delegated to the canonical `signDegreeToLongitude`. Deriving from data we
 * have is arithmetic; defaulting is invention.
 *
 * Returns `null` when neither path is available — no numeric degree, or a sign
 * the zodiac table does not recognise. Never 0: 0 is a real longitude
 * (0°00′ Aries), so a sentinel 0 both asserts a placement nobody measured and,
 * being non-nullish, silently satisfies any downstream `x ?? longitude ?? y`
 * or `longitude || fallback` chain that was meant to reach its fallback.
 */
function natalLongitude(sign: unknown, degree: number | null, stored: unknown): number | null {
  const explicit = firstFiniteNumber(stored)
  if (explicit !== null) return explicit
  if (degree === null || typeof sign !== 'string' || !sign.trim()) return null
  return signDegreeToLongitude(sign, degree)
}

function extractNatalPositions(natalChart: any): any[] {
  if (!natalChart) return []
  if (natalChart.planets && typeof natalChart.planets === 'object') {
    return Object.entries(natalChart.planets).map(([planet, data]: [string, any]) => {
      const sign = data?.sign ?? ''
      const degree = firstFiniteNumber(data?.signDegree, data?.degree)
      return {
        planet,
        sign,
        // `degree` keeps its 0 default deliberately: the alchm.kitchen sync
        // contracts require a number here, and dropping the entry instead would
        // strip the planet→sign pair their yield engine reads. See the round-3
        // report; absence is carried by `longitude` below.
        degree: degree ?? 0,
        longitude: natalLongitude(sign, degree, data?.longitude),
      }
    })
  }
  if (Array.isArray(natalChart)) {
    return natalChart.map((p: any) => {
      const sign = p?.sign ?? ''
      const degree = firstFiniteNumber(p?.signDegree, p?.degree)
      return {
        planet: p?.planet ?? p?.label ?? '',
        sign,
        degree: degree ?? 0,
        longitude: natalLongitude(sign, degree, p?.longitude),
      }
    })
  }
  return []
}

export function agenticEmailFor(agentId: string): string {
  return `${agentId}${AGENTIC_DOMAIN}`
}

export async function ensureAgenticUserAndSync(input: EnsureAgenticUserInput): Promise<void> {
  const email = agenticEmailFor(input.agentId)
  const natalPositions = extractNatalPositions(input.natalChart)

  const userId = await prisma.$transaction(async tx => {
    const user = await tx.users.upsert({
      where: { email },
      create: {
        email,
        name: input.name,
        provider: 'agentic',
        role: 'agent',
        isAgentic: true,
        verified: true,
      } as any,
      update: {
        name: input.name,
        isAgentic: true,
        role: 'agent',
        verified: true,
      } as any,
      select: { id: true },
    })

    await tx.user_profiles.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        birthLocation: input.birthLocation as any,
        natalChart: input.natalChart as any,
        natalPositions: natalPositions as any,
        monicaConstant: input.monicaConstant,
        dominantElement: input.dominantElement,
        bio: input.bio,
      },
      update: {
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        birthLocation: input.birthLocation as any,
        natalChart: input.natalChart as any,
        natalPositions: natalPositions as any,
        monicaConstant: input.monicaConstant,
        dominantElement: input.dominantElement,
        bio: input.bio,
      },
    })

    await tx.tokenBalance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        spirit: 0,
        essence: 0,
        matter: 0,
        substance: 0,
        updatedAt: new Date(),
      },
      update: {},
    })

    return user.id
  })

  const profile: SyncAgentProfilePayload = {
    bio: input.bio ?? undefined,
    birthDate: input.birthDate.toISOString(),
    birthTime: input.birthTime ?? undefined,
    birthLocation: input.birthLocation,
    natalChart: input.natalChart,
    natalPositions,
    monicaConstant: input.monicaConstant,
    dominantElement: input.dominantElement,
  }

  const { wtenUserId } = await syncAgentToWten(email, input.name, profile)
  await prisma.users.update({
    where: { id: userId },
    data: { alchmKitchenUserId: wtenUserId } as any,
  })
}
