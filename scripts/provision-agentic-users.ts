/**
 * Agentic User Provisioning Script
 * =================================
 *
 * Creates agentic user records in the database for each historical agent
 * that doesn't already have a corresponding user row.
 *
 * Each agentic user gets:
 *  - A deterministic email: `{agentId}@agentic.alchm.kitchen`
 *  - `isAgentic: true` flag on the `users` table
 *  - A `user_profiles` row with natal chart data extracted from the
 *    `historical_agents` table (including natalPositions for DailyYieldService)
 *  - A zero-balance `token_balances` row so yield claims work immediately
 *  - A linked WTEN user (`alchmKitchenUserId`) via /api/internal/agent-sync
 *
 * Atomicity contract:
 *   The DB writes (users + user_profiles + token_balances) commit in one
 *   transaction. The WTEN sync runs AFTER the transaction commits, in a
 *   separate try/catch — a network failure leaves the local row intact for
 *   `scripts/backfill-agent-sync.ts` to pick up later. The previous version
 *   ran the sync INSIDE the transaction, which both held DB locks across a
 *   network call and could orphan the WTEN row if the tx rolled back.
 *
 * Usage:
 *   bun run scripts/provision-agentic-users.ts
 */

import { PrismaClient } from '@prisma/client'
import { syncAgentToWten } from '@/lib/wtenClient'

const prisma = new PrismaClient()

interface ProvisionResult {
  created: number
  skipped: number
  syncFailed: number
  errors: string[]
}

async function provisionAgenticUsers(
  opts: { limit?: number; dryRun?: boolean } = {}
): Promise<ProvisionResult> {
  const result: ProvisionResult = { created: 0, skipped: 0, syncFailed: 0, errors: [] }

  const historicalAgents = await prisma.historical_agents.findMany({
    where: { isActive: true },
    orderBy: { agentId: 'asc' },
    ...(opts.limit ? { take: opts.limit } : {}),
    select: {
      agentId: true,
      name: true,
      natalChart: true,
      dominantElement: true,
      monicaConstant: true,
      birthDate: true,
      birthTime: true,
      birthLocation: true,
      spiritScore: true,
      essenceScore: true,
      matterScore: true,
      substanceScore: true,
    },
  })

  console.log(`Found ${historicalAgents.length} historical agents to provision`)

  // Bulk existence lookup — one query instead of N findUnique calls inside the loop.
  const expectedEmails = historicalAgents.map(a => `${a.agentId}@agentic.alchm.kitchen`)
  const existingUsers = await prisma.users.findMany({
    where: { email: { in: expectedEmails } },
    select: { id: true, email: true, isAgentic: true, alchmKitchenUserId: true } as any,
  })
  const existingByEmail = new Map(existingUsers.map(u => [u.email, u]))

  // Dry-run: report what WOULD happen without writing anything. Lets you
  // confirm the batch size + create/skip split before a production write.
  if (opts.dryRun) {
    const toCreate = historicalAgents.filter(
      a => !existingByEmail.has(`${a.agentId}@agentic.alchm.kitchen`)
    ).length
    console.log(
      `[dry-run] would create ${toCreate}, skip ${historicalAgents.length - toCreate} ` +
        `(of ${historicalAgents.length} active agents` +
        `${opts.limit ? `, limited to ${opts.limit}` : ''}). No writes performed.`
    )
    result.skipped = historicalAgents.length
    return result
  }

  for (const agent of historicalAgents) {
    const email = `${agent.agentId}@agentic.alchm.kitchen`
    const existing = existingByEmail.get(email) as
      | { id: string; isAgentic: boolean; alchmKitchenUserId: string | null }
      | undefined

    try {
      if (existing) {
        if (!existing.isAgentic) {
          await prisma.users.update({
            where: { id: existing.id },
            data: { isAgentic: true } as any,
          })
          console.log(`  ↻ Updated ${agent.name} → isAgentic=true`)
        } else {
          console.log(`  ⊘ Skipped ${agent.name} (already provisioned)`)
        }
        result.skipped++
        // Still try to repair an unlinked existing user if WTEN ID is missing.
        if (!existing.alchmKitchenUserId) {
          await syncAndPersist(existing.id, email, agent.name, agent, result)
        }
        continue
      }

      const natalPositions = extractNatalPositions(agent.natalChart)

      // Tx scope: local writes only. WTEN sync runs after commit.
      const newUserId = await prisma.$transaction(async tx => {
        const user = await tx.users.create({
          data: {
            email,
            name: agent.name,
            provider: 'agentic',
            role: 'agent',
            isAgentic: true,
            verified: true,
          } as any,
        })

        await tx.user_profiles.create({
          data: {
            userId: user.id,
            birthDate: agent.birthDate,
            birthTime: agent.birthTime,
            birthLocation: agent.birthLocation as any,
            natalChart: agent.natalChart as any,
            natalPositions: natalPositions as any,
            monicaConstant: agent.monicaConstant,
            dominantElement: agent.dominantElement,
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

      console.log(`  ✓ Provisioned ${agent.name} → ${email} (${newUserId})`)
      result.created++

      await syncAndPersist(newUserId, email, agent.name, agent, result)
    } catch (err: any) {
      const msg = `Failed to provision ${agent.name}: ${err?.message ?? err}`
      console.error(`  ✗ ${msg}`)
      result.errors.push(msg)
    }
  }

  return result
}

/**
 * Push the agent to WTEN, then persist the returned wtenUserId locally.
 * Soft-fails: a network error logs and bumps `syncFailed`, but does not
 * abort the run — the row remains for the backfill script to retry.
 */
async function syncAndPersist(
  userId: string,
  email: string,
  displayName: string | null,
  agent: {
    natalChart?: unknown
    dominantElement?: string | null
    monicaConstant?: number | null
    birthDate?: Date | null
    birthTime?: string | null
    birthLocation?: unknown
  },
  result: ProvisionResult
): Promise<void> {
  try {
    const { wtenUserId } = await syncAgentToWten(email, displayName, {
      birthDate: agent.birthDate?.toISOString(),
      birthTime: agent.birthTime ?? undefined,
      birthLocation: agent.birthLocation,
      natalChart: agent.natalChart,
      natalPositions: extractNatalPositions(agent.natalChart),
      monicaConstant: agent.monicaConstant ?? undefined,
      dominantElement: agent.dominantElement ?? undefined,
    })
    await prisma.users.update({
      where: { id: userId },
      data: { alchmKitchenUserId: wtenUserId } as any,
    })
  } catch (err: any) {
    console.warn(`  ⚠ WTEN sync failed for ${email}: ${err?.message ?? err}`)
    result.syncFailed++
  }
}

/**
 * Extract a flat NatalPosition[] array from whatever shape the
 * natalChart JSON might be in.
 */
function extractNatalPositions(natalChart: any): any[] {
  if (!natalChart) return []

  try {
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
  } catch {
    console.warn('  ⚠ Could not parse natalChart')
  }

  return []
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit'))
  let limit: number | undefined
  if (limitArg) {
    const raw = limitArg.includes('=') ? limitArg.split('=')[1] : args[args.indexOf(limitArg) + 1]
    const n = parseInt(raw ?? '', 10)
    if (Number.isFinite(n) && n > 0) limit = n
  }

  console.log('═══════════════════════════════════════════════════')
  console.log(
    `  Agentic User Provisioning${dryRun ? '  (dry-run)' : ''}${limit ? `  [limit ${limit}]` : ''}`
  )
  console.log('═══════════════════════════════════════════════════\n')

  const result = await provisionAgenticUsers({ limit, dryRun })

  console.log('\n═══════════════════════════════════════════════════')
  console.log(`  Created:      ${result.created}`)
  console.log(`  Skipped:      ${result.skipped}`)
  console.log(`  Sync failed:  ${result.syncFailed}  (run backfill-agent-sync.ts to retry)`)
  console.log(`  Errors:       ${result.errors.length}`)
  console.log('═══════════════════════════════════════════════════')

  if (result.errors.length > 0) {
    console.log('\nErrors:')
    result.errors.forEach(e => console.log(`  - ${e}`))
  }

  await prisma.$disconnect()
  process.exit(result.errors.length > 0 ? 1 : 0)
}

main().catch(async err => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
