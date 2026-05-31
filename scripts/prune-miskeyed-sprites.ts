/**
 * Prune mis-keyed "sprite" agents that classify as wallets (task E.9).
 *
 * Background: ~37 test/dev seed artifacts look celestial but don't fit the clean
 * `planetary-<planet>-<sign>-<degree>` sprite format, so classifyAgent() treats
 * them as historical WALLETS (which would wrongly accrue daily yield):
 *   - `mars-gemini-<hex>`                       (bare planet-sign, trailing hash)
 *   - `planetary-{mars,moon}-aries-15-<hex>`    (degree THEN a hash suffix)
 * They duplicate the canonical 3,600-sprite set, so re-keying would collide —
 * prune is the right call (sky-economy Q&A, May 2026).
 *
 * Detection re-derives the set deterministically: classifyAgent === 'wallet'
 * AND contains an adjacent <planet>-<sign> AND ends in a 6+ char hex hash.
 * The clean sprites end in a 1-2 digit degree, so they're never matched; name
 * slugs (socrates) and real wallets (greg-castro-1991) aren't celestial.
 *
 * Removes BOTH the historical_agents catalog row AND the agentic users row
 * (keyed by email `<agentId>@agentic.alchm.kitchen`, no FK to historical_agents)
 * plus their FK children. Dry-run by default; FK-safe per-row transactions.
 *
 *     bun run scripts/prune-miskeyed-sprites.ts                   # dry run
 *     bun run scripts/prune-miskeyed-sprites.ts --apply --cascade # delete + clear children
 */
import pg from 'pg'
import { config } from 'dotenv'
import { classifyAgent, PLANETS, ZODIAC } from '../lib/agents/agent-type-model'

config()
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL })

const APPLY = process.argv.includes('--apply')
const CASCADE = process.argv.includes('--cascade')
const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'
const MAX_EXPECTED = 100 // safety cap — the known mis-keyed set is ~37

const isPlanet = (s: string) => (PLANETS as readonly string[]).includes(s.toLowerCase())
const isSign = (s: string) => (ZODIAC as readonly string[]).includes(s.toLowerCase())
const looksCelestial = (id: string): boolean => {
  const parts = id.toLowerCase().split('-')
  for (let i = 0; i < parts.length - 1; i++) {
    if (isPlanet(parts[i]) && isSign(parts[i + 1])) return true
  }
  return false
}
const endsInHex = (id: string) => /-[0-9a-f]{6,}$/i.test(id)
const isMiskeyed = (id: string): boolean =>
  classifyAgent(id).economyRole === 'wallet' && looksCelestial(id) && endsInHex(id)

interface Fk {
  table: string
  column: string
  refColumn: string
}

async function discoverFks(refTable: 'historical_agents' | 'users'): Promise<Fk[]> {
  const { rows } = await pool.query<Fk>(
    `SELECT tc.table_name AS table, kcu.column_name AS column, ccu.column_name AS "refColumn"
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1`,
    [refTable]
  )
  return rows
}

async function main() {
  const { rows: all } = await pool.query<{ agentId: string; id: string; name: string }>(
    `SELECT "agentId","id","name" FROM "historical_agents"`
  )
  const targets = all
    .filter(r => isMiskeyed(r.agentId))
    .sort((a, b) => a.agentId.localeCompare(b.agentId))

  console.log(
    `\n--- Prune mis-keyed sprites (${APPLY ? 'APPLY' : 'DRY RUN'}${CASCADE ? ' +CASCADE' : ''}) ---`
  )
  console.log(`Matched ${targets.length} mis-keyed rows (of ${all.length} catalog rows):\n`)
  for (const t of targets) console.log(`  • ${t.agentId.padEnd(42)} "${t.name}"`)

  // Safety guards: never touch a clean sprite, a name slug, or an over-broad set.
  const bad = targets.filter(t => !isMiskeyed(t.agentId))
  if (bad.length) throw new Error(`Refusing: ${bad.length} rows don't fit the mis-keyed pattern`)
  if (targets.length > MAX_EXPECTED) {
    throw new Error(
      `Refusing: ${targets.length} > ${MAX_EXPECTED} expected — detection may be too broad`
    )
  }
  if (targets.length === 0) {
    console.log('\nNothing to prune.\n')
    return
  }

  // Resolve agentic user ids (keyed by email).
  const emails = targets.map(t => `${t.agentId}${AGENTIC_DOMAIN}`)
  const { rows: users } = await pool.query<{ id: string; email: string }>(
    `SELECT "id","email" FROM "users" WHERE "email" = ANY($1)`,
    [emails]
  )
  const userByAgent = new Map(users.map(u => [u.email.replace(AGENTIC_DOMAIN, ''), u.id]))
  console.log(`\nResolved ${users.length} agentic user rows for the ${targets.length} agents.`)

  if (!APPLY) {
    console.log(`\nDry run — no rows deleted. Re-run with --apply --cascade to delete.\n`)
    return
  }

  const haFks = CASCADE ? await discoverFks('historical_agents') : []
  const userFks = CASCADE ? await discoverFks('users') : []
  if (CASCADE) {
    console.log(
      `\nCascade FKs → historical_agents: ${haFks.map(f => `${f.table}.${f.column}`).join(', ') || '(none)'}`
    )
    console.log(
      `Cascade FKs → users: ${userFks.map(f => `${f.table}.${f.column}`).join(', ') || '(none)'}`
    )
  }

  let deleted = 0
  let childrenDeleted = 0
  const skipped: { agentId: string; reason: string }[] = []

  for (const t of targets) {
    const userId = userByAgent.get(t.agentId)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (CASCADE) {
        if (userId) {
          for (const fk of userFks) {
            const res = await client.query(`DELETE FROM "${fk.table}" WHERE "${fk.column}" = $1`, [
              userId,
            ])
            childrenDeleted += res.rowCount ?? 0
          }
        }
        for (const fk of haFks) {
          const ref = fk.refColumn === 'id' ? t.id : t.agentId
          const res = await client.query(`DELETE FROM "${fk.table}" WHERE "${fk.column}" = $1`, [
            ref,
          ])
          childrenDeleted += res.rowCount ?? 0
        }
      }
      if (userId) await client.query(`DELETE FROM "users" WHERE "id" = $1`, [userId])
      await client.query(`DELETE FROM "historical_agents" WHERE "agentId" = $1`, [t.agentId])
      await client.query('COMMIT')
      deleted++
    } catch (err) {
      await client.query('ROLLBACK')
      skipped.push({
        agentId: t.agentId,
        reason: (err instanceof Error ? err.message : String(err)).split('\n')[0],
      })
    } finally {
      client.release()
    }
  }

  console.log(
    `\n🧹 Deleted ${deleted} / ${targets.length} mis-keyed agents${CASCADE ? ` (+${childrenDeleted} child rows)` : ''}.`
  )
  if (skipped.length) {
    console.log(`\n⚠️  Skipped ${skipped.length} (still referenced — re-run with --cascade):`)
    for (const s of skipped) console.log(`  • ${s.agentId} — ${s.reason}`)
  }
  console.log()
}

main()
  .catch(err => {
    console.error('❌ Prune failed:', err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
