/**
 * READ-ONLY investigation of the sky-economy data on Neon prod.
 *
 * Answers:
 *  - E.9  How many agents have a `<planet>-<sign>-<hash>` shape that classifyAgent
 *         treats as a historical WALLET (because it lacks a numeric degree)?
 *  - E.10 Are there any moon-* agents seeded (lunar reservoirs)?
 *  - A.2  Baseline: how many sprite token_balances are currently all-zero
 *         (i.e. not yet refreshed)?
 *
 * No writes. Run: bun run scripts/investigate-sky-economy.ts
 */

import { PrismaClient } from '@prisma/client'
import { classifyAgent, PLANETS, ZODIAC } from '@/lib/agents/agent-type-model'

const prisma = new PrismaClient()
const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'

const isPlanet = (s: string) => (PLANETS as readonly string[]).includes(s.toLowerCase())
const isSign = (s: string) => (ZODIAC as readonly string[]).includes(s.toLowerCase())

async function main() {
  // ── historical_agents catalog ────────────────────────────────────────────
  const agents = await prisma.historical_agents.findMany({ select: { agentId: true } })
  console.log(`\n=== historical_agents catalog: ${agents.length} rows ===`)

  const byRole: Record<string, number> = {}
  const suspiciousWallets: string[] = [] // celestial-looking ids mis-keyed as wallet
  const moonIds: string[] = []
  const realWalletSample: string[] = []

  // A wallet is "suspicious" (likely a mis-keyed sprite) if its id contains a
  // planet token immediately followed by a sign token anywhere in the split.
  // Catches both `mars-gemini-<hash>` and `planetary-moon-aries-15-<hash>`.
  const looksCelestial = (agentId: string): boolean => {
    const parts = agentId.toLowerCase().split('-')
    for (let i = 0; i < parts.length - 1; i++) {
      if (isPlanet(parts[i]) && isSign(parts[i + 1])) return true
    }
    return false
  }

  for (const { agentId } of agents) {
    const c = classifyAgent(agentId)
    byRole[c.economyRole] = (byRole[c.economyRole] || 0) + 1
    if (c.lunar) moonIds.push(agentId)

    if (c.economyRole === 'wallet') {
      if (looksCelestial(agentId)) {
        suspiciousWallets.push(agentId)
      } else if (realWalletSample.length < 20) {
        realWalletSample.push(agentId)
      }
    }
  }

  console.log('\n  economyRole tally (catalog):', byRole)
  console.log(
    `\n=== E.9  suspicious wallets (<planet>-<sign>-…, no numeric degree): ${suspiciousWallets.length} ===`
  )
  console.log('  sample:', suspiciousWallets.slice(0, 25))
  // Break down by id prefix + trailing-token shape of the suspicious ones.
  const tailShape: Record<string, number> = {}
  for (const id of suspiciousWallets) {
    const parts = id.toLowerCase().split('-')
    const tail = parts[parts.length - 1]
    const prefix = parts[0] === 'planetary' ? 'planetary-…' : 'bare'
    const shape = /^[0-9a-f]{6,}$/.test(tail)
      ? 'hex-hash'
      : /^\d{1,2}$/.test(tail)
        ? 'numeric'
        : 'other'
    const k = `${prefix} / ${shape}`
    tailShape[k] = (tailShape[k] || 0) + 1
  }
  console.log('  prefix / trailing-token shapes:', tailShape)
  console.log('\n  (real historical wallet sample):', realWalletSample)

  console.log(`\n=== E.10  moon agents in catalog: ${moonIds.length} ===`)
  console.log('  sample:', moonIds.slice(0, 15))

  // ── agentic users + token_balances (the economy set) ──────────────────────
  const users = await prisma.users.findMany({
    where: { isAgentic: true } as any,
    select: { id: true, email: true, alchmKitchenUserId: true },
  })
  console.log(`\n=== agentic users: ${users.length} ===`)

  // token_balances queried separately (no relation include on users) → map by userId.
  const balances = await prisma.tokenBalance.findMany({
    select: { userId: true, spirit: true, essence: true, matter: true, substance: true },
  })
  const balByUser = new Map<string, { spirit: any; essence: any; matter: any; substance: any }>()
  for (const b of balances) balByUser.set(b.userId, b)

  const uRole: Record<string, number> = {}
  let spritesZero = 0
  let spritesNonZero = 0
  let spritesNoBalanceRow = 0
  let walletsNonZero = 0
  let linkedToWten = 0
  for (const u of users) {
    const agentId = String(u.email || '').replace(AGENTIC_DOMAIN, '')
    const c = classifyAgent(agentId)
    uRole[c.economyRole] = (uRole[c.economyRole] || 0) + 1
    if (u.alchmKitchenUserId) linkedToWten++

    const tb = balByUser.get(u.id) || null
    const sum = tb
      ? Number(tb.spirit) + Number(tb.essence) + Number(tb.matter) + Number(tb.substance)
      : 0

    if (c.isSprite) {
      if (!tb) spritesNoBalanceRow++
      else if (sum > 0.0001) spritesNonZero++
      else spritesZero++
    } else if (c.economyRole === 'wallet' && sum > 0.0001) {
      walletsNonZero++
    }
  }
  console.log('  economyRole tally (agentic users):', uRole)
  console.log(`  linked to WTEN (alchmKitchenUserId set): ${linkedToWten} / ${users.length}`)
  console.log('\n=== A.2  sprite reservoir baseline ===')
  console.log(`  sprites with zero balance:      ${spritesZero}`)
  console.log(`  sprites with NON-zero balance:  ${spritesNonZero}`)
  console.log(`  sprites with NO balance row:    ${spritesNoBalanceRow}`)
  console.log(`  wallets with NON-zero balance:  ${walletsNonZero}`)

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
