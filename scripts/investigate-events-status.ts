/**
 * READ-ONLY: recent agent_action_events activity on Neon prod.
 * Tells us whether the feed/tick/yield/attunement pipeline is actually running.
 * Run: bun run scripts/investigate-events-status.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const total = await prisma.agent_action_events.count()
  console.log(`\n=== agent_action_events: ${total} total rows ===`)

  const byType = await prisma.$queryRaw<Array<{ eventType: string; n: bigint; latest: Date }>>`
    SELECT "eventType", COUNT(*)::bigint AS n, MAX("createdAt") AS latest
    FROM agent_action_events GROUP BY "eventType" ORDER BY n DESC
  `
  console.log('\n  by eventType (count / latest):')
  for (const r of byType) {
    console.log(
      `    ${String(r.eventType).padEnd(22)} ${String(r.n).padStart(6)}   latest ${r.latest?.toISOString?.() ?? r.latest}`
    )
  }

  const recent = await prisma.agent_action_events.findMany({
    select: { agentId: true, eventType: true, triggerType: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  console.log('\n  10 most recent events:')
  for (const e of recent) {
    console.log(
      `    ${e.createdAt.toISOString()}  ${String(e.eventType).padEnd(18)} ${String(e.status).padEnd(8)} ${e.agentId}`
    )
  }

  await prisma.$disconnect()
}
main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
