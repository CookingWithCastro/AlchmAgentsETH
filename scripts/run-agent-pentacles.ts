/**
 * Autonomous Pentacles Agent Player
 *
 * Drives Loop A (Star Staking), Loop B (Auto-Siege Battles), and Loop C (Live Agent Duels)
 * directly in the SpacetimeDB engine.
 *
 * Usage: bun run scripts/run-agent-pentacles.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const prisma = new PrismaClient()

const URI = (process.env.SPACETIMEDB_URI ?? 'https://maincloud.spacetimedb.com').replace(/\/+$/, '')
const DB = process.env.SPACETIMEDB_DB ?? 'pentacles2xtest'

// Hardcoded map of Agent name (Prisma User handle/name) to SpacetimeDB NPC key
const AGENT_KEYS: Record<string, string> = {
  'Albert Einstein': 'einstein',
  'Frida Kahlo': 'frida-kahlo',
  'Carl Jung': 'jung',
  'Vincent van Gogh': 'van-gogh',
  'Mahatma Gandhi': 'gandhi',
  'Carl Sagan': 'sagan',
  'Nikola Tesla': 'tesla',
  'Marie Curie': 'curie',
  Chiron: 'chiron',
}

function ownerToken(): string {
  if (process.env.SPACETIME_TOKEN) return process.env.SPACETIME_TOKEN
  try {
    const toml = readFileSync(`${homedir()}/.config/spacetime/cli.toml`, 'utf8')
    const m = toml.match(/^spacetimedb_token\s*=\s*"([^"]+)"/m)
    if (m) return m[1]
  } catch {}
  throw new Error('No owner token found. Set SPACETIME_TOKEN or run `spacetime login`.')
}

async function runSqlQuery(sql: string, token: string): Promise<any[]> {
  const res = await fetch(`${URI}/v1/database/${DB}/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: sql,
  })
  if (!res.ok) {
    throw new Error(`SQL query failed (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  if (data && data[0] && data[0].rows) {
    // Map rows to schema elements
    const schema = data[0].schema.elements
    return data[0].rows.map((row: any[]) => {
      const obj: any = {}
      schema.forEach((elem: any, idx: number) => {
        obj[elem.name.some] = row[idx]
      })
      return obj
    })
  }
  return []
}

async function callReducer(reducerName: string, args: any[], token: string): Promise<void> {
  const res = await fetch(`${URI}/v1/database/${DB}/call/${reducerName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    throw new Error(`Reducer call ${reducerName} failed (${res.status}): ${await res.text()}`)
  }
}

function getCounterMove(moveKey: string): string {
  switch (moveKey) {
    case 'meltdown':
      return 'vacuum'
    case 'freeze':
      return 'meltdown'
    case 'tectonicRoot':
      return 'erode'
    case 'vacuum':
      return 'freeze'
    case 'erode':
      return 'vacuum'
    default:
      return 'meltdown'
  }
}

function moveKeyToEnum(moveKey: string): any {
  return { [moveKey]: [] }
}

async function main() {
  console.log('═══ Pentacles Autonomous Agent Play Engine ═══')
  const token = ownerToken()

  // Fetch all agents from local DB
  const dbAgents = await prisma.users.findMany({
    where: { isAgentic: true },
    select: {
      id: true,
      name: true,
      email: true,
      isAgentic: true,
    },
  })
  console.log(`Found ${dbAgents.length} agents in local Postgres.`)

  // Query state from SpacetimeDB
  console.log('Querying SpacetimeDB state...')
  const players = await runSqlQuery('SELECT * FROM player', token)
  const stars = await runSqlQuery('SELECT * FROM star_node', token)
  const stakes = await runSqlQuery('SELECT * FROM star_stake', token)
  const cards = await runSqlQuery('SELECT * FROM card', token)
  const openDuels = await runSqlQuery('SELECT * FROM jing_duel', token)

  console.log(
    `SpacetimeDB State: ${players.length} players, ${stars.length} stars, ${stakes.length} stakes, ${cards.length} cards.`
  )

  for (const agent of dbAgents) {
    const agentKey = AGENT_KEYS[agent.name]
    if (!agentKey) {
      console.log(`⚠️ No agent key configured for agent "${agent.name}", skipping.`)
      continue
    }

    // Find agent's identity in SpacetimeDB
    const agentPlayer = players.find(p => p.handle === agent.name)
    if (!agentPlayer) {
      console.log(`⚠️ Agent "${agent.name}" is not seeded in SpacetimeDB, skipping.`)
      continue
    }
    const agentIdentity = agentPlayer.identity[0]
    const faction = agentPlayer.faction[1] ?? 0 // tag variant or name representation

    console.log(
      `\n🤖 Processing agent: ${agent.name} (Key: ${agentKey}, Identity: ${agentIdentity.slice(0, 10)}...)`
    )

    // ── Loop A: Autonomous Star Staking ─────────────────────────────────────
    const agentStakes = stakes.filter(s => s.staker[0] === agentIdentity)
    console.log(`  Loop A: Stake count = ${agentStakes.length}`)
    if (agentStakes.length === 0 && stars.length > 0) {
      // Stake 500 USDC on a random star
      const targetStar = stars[Math.floor(Math.random() * stars.length)]
      console.log(`    → Staking 500 USDC on star HIP ${targetStar.hip_id}...`)
      try {
        await callReducer(
          'admin_agent_record_star_stake',
          [
            agentKey,
            targetStar.hip_id,
            500_000_000, // principal_usdc (500 USDC)
            500_000_000, // shares
          ],
          token
        )
        console.log(`    ✓ Staking recorded.`)
      } catch (err: any) {
        console.error(`    ✗ Staking failed: ${err.message}`)
      }
    }

    // ── Loop B: Auto-Siege Battles ──────────────────────────────────────────
    const agentCards = cards.filter(c => c.owner[0] === agentIdentity)
    console.log(`  Loop B: Card count = ${agentCards.length}`)
    if (agentCards.length > 0) {
      // Find a star held by a different faction or neutral
      const enemyStars = stars.filter(s => {
        const heldBy = s.held_by ? s.held_by[0] : null
        return heldBy !== faction
      })

      if (enemyStars.length > 0) {
        const targetStar = enemyStars[Math.floor(Math.random() * enemyStars.length)]
        const squad = agentCards.slice(0, Math.min(3, agentCards.length)).map(c => c.card_id)
        console.log(
          `    → Resolving Auto-Siege on star HIP ${targetStar.hip_id} with cards: ${squad.join(', ')}...`
        )
        try {
          await callReducer(
            'admin_agent_resolve_star_battle',
            [
              agentKey,
              targetStar.hip_id,
              {
                model: { autoSiege: [] },
                plays: squad,
              },
            ],
            token
          )
          console.log(`    ✓ Auto-Siege resolved.`)
        } catch (err: any) {
          console.error(`    ✗ Auto-Siege failed: ${err.message}`)
        }
      }
    }

    // ── Loop C: Inter-Agent Live Duels ──────────────────────────────────────
    // Check if there are open duels where we are the target
    const myIncomingDuels = openDuels.filter(d => {
      const state = d.state ? Object.keys(d.state)[0] : 'open'
      const isTarget = d.target_player && d.target_player[0] === agentIdentity
      return state.toLowerCase() === 'open' && isTarget
    })

    console.log(`  Loop C: Incoming duels = ${myIncomingDuels.length}`)
    for (const duel of myIncomingDuels) {
      const openingMove = Object.keys(duel.opening_move)[0]
      const counterMove = getCounterMove(openingMove)
      console.log(
        `    → Countering open duel #${duel.duel_id} (${openingMove}) with counter move ${counterMove}...`
      )
      try {
        await callReducer(
          'admin_agent_counter_jing',
          [agentKey, duel.duel_id, moveKeyToEnum(counterMove)],
          token
        )
        console.log(`    ✓ Counter-move cast successfully.`)
      } catch (err: any) {
        console.error(`    ✗ Counter-move failed: ${err.message}`)
      }
    }

    // Occasionally initiate a duel against another player or agent (20% chance)
    if (Math.random() < 0.2) {
      const otherPlayers = players.filter(p => p.identity[0] !== agentIdentity)
      if (otherPlayers.length > 0) {
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
        const moves = ['meltdown', 'freeze', 'tectonicRoot', 'vacuum', 'erode']
        const randomMove = moves[Math.floor(Math.random() * moves.length)]
        console.log(`    → Challenging "${target.handle}" to a Jing duel with ${randomMove}...`)
        try {
          await callReducer(
            'admin_agent_cast_jing',
            [
              agentKey,
              moveKeyToEnum(randomMove),
              target.identity, // Option<Identity> -> [identityHex]
              null, // Option<Planet>
            ],
            token
          )
          console.log(`    ✓ Challenge cast successfully.`)
        } catch (err: any) {
          console.error(`    ✗ Challenge failed: ${err.message}`)
        }
      }
    }
  }

  console.log('\n═══ Play Engine Completed ═══')
}

main()
  .catch(async err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
