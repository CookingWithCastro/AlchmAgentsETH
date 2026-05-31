/**
 * Sky-sprite reservoir refresh (step 3 of the sky-economy).
 *
 * A degree/moon sprite's "balance" isn't earned — it's a reservoir re-minted
 * from the live sky. This recomputes each sprite's ESMS reservoir and writes it
 * to its token_balances row:
 *   - planetary degree → degreeReservoir(planet, sign)  (dignity-derived)
 *   - moon            → lunarReservoir(currentIllumination)  (phase-derived)
 * Historical wallet agents are skipped (their balance is earned, never reset).
 *
 * Runs daily (the daily refresh re-mints reservoirs; attunes deplete them
 * through the day). Idempotent — re-running just re-sets the dignity/phase value.
 */

import { prisma } from '@/lib/db'
import { calculateMoonIllumination } from '@/lib/moon-phase-calculator'
import { classifyAgent, degreeReservoir, lunarReservoir, type EsmsVector } from './agent-type-model'

const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'

/** Reservoir for a sprite agentId, or null if it's not a sprite (a wallet). */
export function spriteReservoirFor(agentId: string, illumination: number): EsmsVector | null {
  const c = classifyAgent(agentId)
  if (c.economyRole === 'lunar-reservoir') return lunarReservoir(illumination)
  if (c.economyRole === 'reservoir' && c.planet && c.sign) {
    return degreeReservoir(c.planet, c.sign)
  }
  return null
}

export interface SpriteRefreshSummary {
  processed: number
  refreshed: number
  skippedWallets: number
  errors: number
  illumination: number
}

/**
 * Re-mint every sky-sprite's reservoir from the current sky. Wallet agents are
 * left untouched. Returns a summary for the cron response.
 */
export async function refreshSpriteReservoirs(): Promise<SpriteRefreshSummary> {
  const illumination = calculateMoonIllumination(new Date())
  const summary: SpriteRefreshSummary = {
    processed: 0,
    refreshed: 0,
    skippedWallets: 0,
    errors: 0,
    illumination,
  }

  const users = await prisma.users.findMany({
    where: { isAgentic: true } as any,
    select: { id: true, email: true },
  })

  for (const u of users) {
    summary.processed++
    const agentId = String((u as { email?: string }).email || '')
      .replace(AGENTIC_DOMAIN, '')
      .trim()
    const reservoir = spriteReservoirFor(agentId, illumination)
    if (!reservoir) {
      summary.skippedWallets++
      continue
    }
    try {
      await prisma.tokenBalance.upsert({
        where: { userId: u.id },
        create: {
          userId: u.id,
          spirit: reservoir.spirit,
          essence: reservoir.essence,
          matter: reservoir.matter,
          substance: reservoir.substance,
          updatedAt: new Date(),
        },
        update: {
          spirit: reservoir.spirit,
          essence: reservoir.essence,
          matter: reservoir.matter,
          substance: reservoir.substance,
          updatedAt: new Date(),
        },
      })
      summary.refreshed++
    } catch (err) {
      summary.errors++
      console.warn(`[sprite-reservoirs] failed to refresh ${agentId}:`, err)
    }
  }

  console.log(
    `[sprite-reservoirs] refreshed ${summary.refreshed} sprite reservoirs ` +
      `(illumination ${(illumination * 100).toFixed(0)}%, ${summary.skippedWallets} wallets skipped, ${summary.errors} errors)`
  )
  return summary
}
