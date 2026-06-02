/**
 * scripts/backfill-agent-sync.ts
 *
 * One-shot backfill: push every isAgentic=true user that lacks an
 * alchmKitchenUserId through WTEN's /api/internal/agent-sync endpoint
 * and persist the returned wtenUserId.
 *
 * Required env:
 *   ALCHM_KITCHEN_SYNC_SECRET   (validated lazily by lib/wtenClient)
 *   WTEN_API_BASE_URL           (optional; defaults to the prod URL)
 *
 * Run:
 *   bun run scripts/backfill-agent-sync.ts
 */

import { PrismaClient } from '@prisma/client'
import { syncAgentToWten } from '@/lib/wtenClient'

const CONCURRENCY = 10

const prisma = new PrismaClient()

interface BackfillRow {
  id: string
  email: string
  name: string | null
  user_profiles?: {
    bio: string | null
    birthDate: Date
    birthTime: string | null
    birthLocation: unknown
    natalChart: unknown
    natalPositions: unknown
    monicaConstant: number
    dominantElement: string
  } | null
}

interface BackfillTotals {
  synced: number
  skipped: number
  failed: number
}

async function syncOne(agent: BackfillRow): Promise<'synced' | 'failed'> {
  const t0 = Date.now()
  try {
    const profile = agent.user_profiles
    const { wtenUserId, created } = await syncAgentToWten(agent.email, agent.name, {
      bio: profile?.bio ?? undefined,
      birthDate: profile?.birthDate?.toISOString(),
      birthTime: profile?.birthTime ?? undefined,
      birthLocation: profile?.birthLocation,
      natalChart: profile?.natalChart,
      natalPositions: profile?.natalPositions,
      monicaConstant: profile?.monicaConstant,
      dominantElement: profile?.dominantElement,
    })
    await prisma.users.update({
      where: { id: agent.id },
      data: { alchmKitchenUserId: wtenUserId },
    })
    console.log(
      `OK email=${agent.email} wtenUserId=${wtenUserId} created=${created} elapsed_ms=${Date.now() - t0}`
    )
    return 'synced'
  } catch (err: any) {
    console.error(`FAIL ${agent.email}: ${err?.message ?? err}`)
    return 'failed'
  }
}

async function main() {
  // The DB filter does the skip-already-linked work; no need to re-check
  // per-row. Idempotent or not, the round-trip is wasted bandwidth.
  const agents = await prisma.users.findMany({
    where: { isAgentic: true, alchmKitchenUserId: null } as any,
    select: {
      id: true,
      email: true,
      name: true,
      user_profiles: {
        select: {
          bio: true,
          birthDate: true,
          birthTime: true,
          birthLocation: true,
          natalChart: true,
          natalPositions: true,
          monicaConstant: true,
          dominantElement: true,
        },
      },
    },
    orderBy: { email: 'asc' },
  })

  const totalAgentic = await prisma.users.count({ where: { isAgentic: true } })
  console.log(
    `Found ${agents.length} unlinked agentic users to sync (of ${totalAgentic} total agentic).`
  )

  const totals: BackfillTotals = { synced: 0, skipped: totalAgentic - agents.length, failed: 0 }

  for (let i = 0; i < agents.length; i += CONCURRENCY) {
    const batch = agents.slice(i, i + CONCURRENCY)
    const outcomes = await Promise.all(batch.map(syncOne))
    for (const outcome of outcomes) {
      totals[outcome]++
    }
  }

  console.log(
    `\nBackfill complete — synced: ${totals.synced}, already-linked: ${totals.skipped}, failed: ${totals.failed}`
  )
  if (totals.failed > 0) {
    console.error(
      `${totals.failed} agents still have no alchmKitchenUserId — see FAIL lines above.`
    )
    process.exitCode = 1
  }
}

main()
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
