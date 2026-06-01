/**
 * Transit auto-attunement (step 4 of the sky-economy).
 *
 * When a live transiting planet conjuncts a historical (wallet) agent's natal
 * point, the degree sprite at the planet's current sign/degree auto-attunes:
 *   - bestows ESMS from its reservoir into the agent's wallet (BESTOW_FRACTION),
 *   - raises that planet's planetary-12 stat on the agent (statBuff, dignity-scaled
 *     + diminishing),
 *   - depletes its own reservoir by the bestowed amount.
 * Capped at once per agent↔degree pair per day; surfaced as an `attunement`
 * event (feed + the agent's action history).
 *
 * Runs in the hourly tick cron. Sprites' reservoirs are re-minted daily (step 3),
 * so a depleted degree gives little until the next refresh.
 */

import { prisma } from '@/lib/db'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { convertSignDegreesToLongitude, angularSeparation } from '@/lib/aspects-dynamics'
import { syncCreditToAlchm } from '@/lib/alchm-credit-sync'
import {
  isEconomyWallet,
  BESTOW_FRACTION,
  PLANET_STAT,
  statBuff,
  PLANETS,
  type Planet,
} from './agent-type-model'

const CONJUNCTION_ORB = 1.5 // degrees — a transiting planet within this of a natal point "hits" it
const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'

// convertSignDegreesToLongitude matches Title-case signs ("Aries") via indexOf;
// a lowercase/mixed sign silently maps to longitude 0 and would false-match every
// conjunction (over-bestowing). Normalize before any longitude conversion.
const toTitleSign = (s: string | undefined): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''

export interface AttunementSummary {
  walletsChecked: number
  attunements: number
  skippedCappedOrEmpty: number
  errors: number
}

interface NatalPoint {
  planet?: string
  sign?: string
  degree?: number
}

export async function runTransitAttunements(
  opts: { onlyWalletEmail?: string } = {}
): Promise<AttunementSummary> {
  const summary: AttunementSummary = {
    walletsChecked: 0,
    attunements: 0,
    skippedCappedOrEmpty: 0,
    errors: 0,
  }
  const todayKey = new Date().toISOString().split('T')[0]

  // Live transiting positions → longitude per planet.
  const live = getCurrentPlanetaryPositions()
  const liveLon: Record<string, { sign: string; degree: number; lon: number }> = {}
  for (const [planet, pos] of Object.entries(live)) {
    const p = planet.toLowerCase()
    if (!(PLANETS as readonly string[]).includes(p)) continue
    if (!pos?.sign || typeof pos.degree !== 'number') continue
    liveLon[p] = {
      sign: pos.sign,
      degree: pos.degree,
      lon: convertSignDegreesToLongitude(toTitleSign(pos.sign), pos.degree),
    }
  }

  const wallets = await prisma.users.findMany({
    where: opts.onlyWalletEmail ? { email: opts.onlyWalletEmail } : undefined,
    select: {
      id: true,
      email: true,
      isAgentic: true,
      user_profiles: { select: { natalPositions: true } },
    },
  })

  for (const w of wallets) {
    const isAgent = Boolean(w.isAgentic)
    const agentId = isAgent ? String(w.email || '').replace(AGENTIC_DOMAIN, '') : null

    // For agents, only economy wallets get attunements.
    if (isAgent && agentId && !isEconomyWallet(agentId)) continue

    const natal = (w.user_profiles?.natalPositions ?? []) as NatalPoint[]
    if (!Array.isArray(natal) || natal.length === 0) continue
    const natalLons = natal
      .filter(n => n.sign && typeof n.degree === 'number')
      .map(n => convertSignDegreesToLongitude(toTitleSign(n.sign), n.degree!))
    if (!natalLons.length) continue

    summary.walletsChecked++

    for (const [planet, t] of Object.entries(liveLon)) {
      const hit = natalLons.some(npLon => angularSeparation(t.lon, npLon) <= CONJUNCTION_ORB)
      if (!hit) continue
      try {
        const did = await attune(
          w.id,
          w.email,
          agentId,
          planet as Planet,
          t.sign,
          t.degree,
          todayKey,
          isAgent
        )
        if (did) summary.attunements++
        else summary.skippedCappedOrEmpty++
      } catch (err) {
        summary.errors++
        console.warn(`[transit-attunement] failed ${agentId || w.id} ← ${planet}:`, err)
      }
    }
  }

  console.log(
    `[transit-attunement] ${summary.attunements} attunements across ${summary.walletsChecked} wallets ` +
      `(${summary.skippedCappedOrEmpty} capped/empty, ${summary.errors} errors)`
  )
  return summary
}

/**
 * One attunement: the degree sprite at (planet, sign, degree) bestows to the
 * wallet. Returns false if already done today (cap) or the reservoir is empty.
 *
 * Agent wallets live in this repo's Neon DB, so their credit + stat-buff are a
 * single Prisma transaction. HUMAN wallets live on alchm.kitchen's Railway DB
 * (the canonical ESMS source of truth) — their credit is sent over the
 * authenticated `/api/economy/sync-credit` endpoint (per-axis), and only the
 * Neon-side reservoir decrement + a daily-cap marker stay local.
 */
async function attune(
  walletUserId: string,
  userEmail: string,
  agentId: string | null,
  planet: Planet,
  sign: string,
  degree: number,
  todayKey: string,
  isAgentic: boolean
): Promise<boolean> {
  const degreeAgentId = `planetary-${planet.toLowerCase()}-${sign.toLowerCase()}-${Math.round(degree)}`
  const idempotencyKey = isAgentic
    ? `attune:${agentId}:${degreeAgentId}:${todayKey}`
    : `attune:human:${walletUserId}:${degreeAgentId}:${todayKey}`

  // Daily cap: one attune per agent↔degree pair per day.
  if (isAgentic) {
    const already = await prisma.agent_action_events.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    })
    if (already) return false
  } else {
    const already = await prisma.tokenTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    })
    if (already) return false
  }

  const degUser = await prisma.users.findFirst({
    where: { email: `${degreeAgentId}${AGENTIC_DOMAIN}` },
    select: { id: true },
  })
  if (!degUser) return false
  const reservoir = await prisma.tokenBalance.findUnique({ where: { userId: degUser.id } })
  if (!reservoir) return false

  const bestow = {
    spirit: Number(reservoir.spirit) * BESTOW_FRACTION,
    essence: Number(reservoir.essence) * BESTOW_FRACTION,
    matter: Number(reservoir.matter) * BESTOW_FRACTION,
    substance: Number(reservoir.substance) * BESTOW_FRACTION,
  }
  const total = bestow.spirit + bestow.essence + bestow.matter + bestow.substance
  if (total <= 0.0001) return false // reservoir empty (e.g. before the first daily refresh)

  // ── AGENT WALLETS: credit, deplete, stat-buff, and event — all on Neon. ──
  if (isAgentic && agentId) {
    const stat = PLANET_STAT[planet]
    const agentRow = (await prisma.historical_agents.findUnique({
      where: { agentId },
      select: { [stat]: true } as any,
    })) as Record<string, number> | null
    const buff = statBuff(Number(agentRow?.[stat] ?? 0), planet, sign)

    await prisma.$transaction([
      // credit the agent's Neon wallet
      prisma.tokenBalance.upsert({
        where: { userId: walletUserId },
        create: {
          userId: walletUserId,
          spirit: bestow.spirit,
          essence: bestow.essence,
          matter: bestow.matter,
          substance: bestow.substance,
          updatedAt: new Date(),
        },
        update: {
          spirit: { increment: bestow.spirit },
          essence: { increment: bestow.essence },
          matter: { increment: bestow.matter },
          substance: { increment: bestow.substance },
          updatedAt: new Date(),
        },
      }),
      // deplete the degree sprite's reservoir
      prisma.tokenBalance.update({
        where: { userId: degUser.id },
        data: {
          spirit: { decrement: bestow.spirit },
          essence: { decrement: bestow.essence },
          matter: { decrement: bestow.matter },
          substance: { decrement: bestow.substance },
          updatedAt: new Date(),
        },
      }),
      // raise the planet's planetary-12 stat on the agent (whitelisted column name)
      prisma.$executeRawUnsafe(
        `UPDATE "historical_agents" SET "${stat}" = COALESCE("${stat}", 0) + $1 WHERE "agentId" = $2`,
        buff,
        agentId
      ),
      // record the attunement (feed + history + the daily-cap marker)
      prisma.agent_action_events.create({
        data: {
          agentId,
          agentEmail: `${agentId}${AGENTIC_DOMAIN}`,
          eventType: 'attunement',
          triggerType: 'transit_attunement',
          triggerSummary: `${planet} at ${sign} ${Math.round(degree)}° conjunct natal`,
          score: 0.8,
          idempotencyKey,
          status: 'posted',
          evaluatedAt: new Date(),
          postedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadataPayload: {
            attunement: true,
            degreeAgentId,
            planet,
            sign,
            degree: Math.round(degree),
            bestowed: bestow,
            statBuffed: stat,
            statBuff: buff,
            insightTitle: `Attuned to ${planet} at ${sign} ${Math.round(degree)}°`,
            insightContent: `${agentId} drew ${total.toFixed(1)} ESMS and +${buff.toFixed(2)} ${stat} from the ${planet} degree.`,
          },
        },
      }),
    ])
    return true
  }

  // ── HUMAN WALLETS: the real ESMS wallet lives on alchm.kitchen (Railway). ──
  // Credit it over the authenticated sync endpoint (per-axis amounts); alchm
  // idempotency-checks the key, updates the four balance columns atomically, and
  // — because source === 'transit_attunement' — emits the "🌠 Sky Drop" feed
  // event + bell notification. The reservoir + daily cap stay here on Neon.
  if (!userEmail) {
    console.warn(
      `[transit-attunement] human wallet ${walletUserId} has no email; cannot credit on alchm.kitchen — skipping`
    )
    return false
  }

  // 1) Credit on Railway FIRST. On failure we deliberately skip the reservoir
  //    decrement + cap marker so the next tick retries (no stranded credit).
  const sync = await syncCreditToAlchm({
    userEmail,
    amounts: {
      spirit: bestow.spirit.toFixed(4),
      essence: bestow.essence.toFixed(4),
      matter: bestow.matter.toFixed(4),
      substance: bestow.substance.toFixed(4),
    },
    source: 'transit_attunement',
    idempotencyKey,
    metadata: {
      planet,
      sign,
      degree: Math.round(degree),
      totalTokens: total,
      degreeAgentId,
    },
  })

  if (!sync.ok) {
    // syncCreditToAlchm already logged the underlying HTTP/network error; throw
    // so runTransitAttunements counts it as an error (surfacing stranded credits).
    throw new Error(
      `alchm.kitchen sync-credit failed for ${userEmail} (${degreeAgentId}): ${sync.error ?? 'unknown error'}`
    )
  }

  // 2) Railway credit landed (or was an idempotent 409). Record the Neon side
  //    effects atomically: deplete the sprite reservoir + write the cap marker.
  await prisma.$transaction([
    prisma.tokenBalance.update({
      where: { userId: degUser.id },
      data: {
        spirit: { decrement: bestow.spirit },
        essence: { decrement: bestow.essence },
        matter: { decrement: bestow.matter },
        substance: { decrement: bestow.substance },
        updatedAt: new Date(),
      },
    }),
    prisma.tokenTransaction.create({
      data: {
        transactionGroupId: `attune_${todayKey}`,
        userId: walletUserId,
        // Marker only — the real ESMS credit lives on alchm.kitchen. Deliberately
        // NOT 'ESMS_BUNDLE' (rejected by alchm's token_type CHECK) and amount 0 so
        // it can't be mistaken for a Neon balance humans don't hold here. Doubles
        // as the once-per-day cap row (idempotencyKey is @unique).
        tokenType: 'ATTUNE_SYNCED',
        amount: 0,
        sourceType: 'transit_attunement',
        sourceId: degreeAgentId,
        description: `Synced ${total.toFixed(1)} ESMS to alchm.kitchen — ${planet} at ${sign} ${Math.round(degree)}°`,
        idempotencyKey,
        createdAt: new Date(),
      },
    }),
  ])
  return true
}
