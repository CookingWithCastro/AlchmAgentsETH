import { prisma } from '@/lib/db'
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

function extractNatalPositions(natalChart: any): any[] {
  if (!natalChart) return []
  if (natalChart.planets && typeof natalChart.planets === 'object') {
    return Object.entries(natalChart.planets).map(([planet, data]: [string, any]) => ({
      planet,
      sign: data.sign ?? '',
      degree: data.signDegree ?? data.degree ?? 0,
      longitude: data.longitude ?? data.degrees ?? 0,
    }))
  }
  if (Array.isArray(natalChart)) {
    return natalChart.map((p: any) => ({
      planet: p.planet ?? p.label ?? '',
      sign: p.sign ?? '',
      degree: p.signDegree ?? p.degree ?? 0,
      longitude: p.longitude ?? p.degrees ?? 0,
    }))
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
