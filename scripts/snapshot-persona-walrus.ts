/**
 * Snapshot agent personas to Walrus memory (encrypted via MemWal when configured,
 * else a raw Walrus blob), and optionally write the ENS `agent-memory` record.
 *
 * Usage (Bun):
 *   # Preview the snapshot payload (no network):
 *   bun run scripts/snapshot-persona-walrus.ts --agent plato --dry-run
 *
 *   # Write to Walrus (HTTP publisher works with zero config; MemWal if MEMWAL_* set):
 *   bun run scripts/snapshot-persona-walrus.ts --agent plato
 *   bun run scripts/snapshot-persona-walrus.ts --all-flagships
 *
 *   # …and set the ENS agent-memory record (needs NameStone configured):
 *   bun run scripts/snapshot-persona-walrus.ts --agent plato --ens
 *
 * Flags: --agent <slug> · --all-flagships · --ens · --dry-run
 * Env (MemWal path): MEMWAL_PRIVATE_KEY, MEMWAL_ACCOUNT_ID, MEMWAL_SERVER_URL.
 */

import { snapshotAgentPersonaToWalrus, buildPersonaSnapshot } from '@/lib/walrus'
import { ensLabel } from '@/lib/erc8004'

const FLAGSHIPS = ['plato', 'aristotle', 'socrates', 'homer', 'marie-curie', 'leonardo-da-vinci']

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

const dryRun = flag('dry-run')
const writeEns = flag('ens')
const agents = arg('agent') ? [arg('agent')!] : FLAGSHIPS

async function main() {
  console.log(`Snapshotting ${agents.length} agent(s) → Walrus memory${dryRun ? ' (dry-run)' : ''}`)

  for (const agentId of agents) {
    if (dryRun) {
      const snap = buildPersonaSnapshot(agentId, new Date().toISOString())
      if (!snap) {
        console.warn(`  ⚠ ${agentId}: agent not found`)
        continue
      }
      console.log(
        `  ${agentId}: persona ${snap.personaBlock.length} chars, cacheKey=${snap.cacheKey}`
      )
      console.log(`    preview: ${snap.personaBlock.slice(0, 100).replace(/\n/g, ' ')}…`)
      continue
    }

    try {
      const { snapshot, memory } = await snapshotAgentPersonaToWalrus(agentId)
      console.log(
        `  ✓ ${agentId}: ${memory.backend}${memory.encrypted ? ' (encrypted)' : ''} ` +
          `blobId=${memory.blobId}`
      )
      console.log(`    ${memory.url}`)

      if (writeEns) {
        if (!process.env.NAMESTONE_API_KEY || !process.env.NAMESTONE_DOMAIN) {
          console.warn('    (skipping ENS write — NAMESTONE_API_KEY / NAMESTONE_DOMAIN not set)')
          continue
        }
        const { mergeSetSubname } = await import('@/lib/namestone')
        const label = ensLabel(agentId)
        // merge-write only the memory record so this never clobbers the
        // agent-endpoint / agent-wallet / human-verified records.
        await mergeSetSubname({
          name: label,
          textRecords: { 'agent-memory': memory.url },
        })
        console.log(`    ✓ ENS agent-memory set for ${label}.${process.env.NAMESTONE_DOMAIN}`)
      }
    } catch (err) {
      console.error(`  ✗ ${agentId}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

main().catch(err => {
  console.error('snapshot-persona-walrus failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
