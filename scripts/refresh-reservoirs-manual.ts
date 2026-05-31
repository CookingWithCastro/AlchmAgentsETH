/**
 * One-shot sky-sprite reservoir refresh (task A.2).
 *
 * Re-mints every sky-sprite's ESMS reservoir from the live sky (degree → dignity,
 * moon → phase) by calling refreshSpriteReservoirs() directly — the same function
 * the daily `/api/cron/agents/refresh-reservoirs` cron runs. Use this to populate
 * the ~3,600 zero reservoirs immediately instead of waiting for the 00:00 UTC cron.
 *
 * Reads DATABASE_URL from .env (Neon). Idempotent — re-running just re-sets the
 * dignity/phase value. Wallet agents are left untouched.
 *
 *     bun run scripts/refresh-reservoirs-manual.ts
 */
import { refreshSpriteReservoirs } from '../lib/agents/sprite-reservoirs'

async function main() {
  console.log('Refreshing sky-sprite reservoirs from the live sky…')
  const summary = await refreshSpriteReservoirs()
  console.log('Summary:', summary)
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
