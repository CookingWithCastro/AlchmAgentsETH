/**
 * Agent Action Service
 * ====================
 *
 * Core engine for the Agentic User system on alchm.kitchen.
 *
 * Responsibilities:
 *  1. **Daily Yield** — Automatically claims ESMS tokens for every active
 *     agentic user based on their natal chart and current transits.
 *  2. **Activation Evaluation** — Computes a resonance score between each
 *     agent's natal chart and the current celestial weather (planetary hour,
 *     transit aspects). If the score exceeds `AGENT_ACTIVATION_THRESHOLD`,
 *     the agent is marked for action.
 *  3. **Action Execution** — Activated agents spend tokens to post insights
 *     to the community feed or perform token transmutations.
 *
 * All token mutations are atomic (single Prisma transaction) to prevent
 * double-spending or partial writes.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  AGENT_ACTIVATION_THRESHOLD,
  AGENT_DAILY_YIELD,
  AGENT_OPERATION_COSTS,
  TOKEN_TYPES,
  type TokenType,
} from '@/lib/economy-config'
import { EconomyService } from '@/lib/services/economyService'
import { syncDebitToAlchm } from '@/lib/alchm-debit-sync'
import { syncCreditToAlchm } from '@/lib/alchm-credit-sync'
import { syncEventToAlchm } from '@/lib/alchm-event-sync'
import { feedPusherService } from '@/lib/agents/feed-pusher'
import { isEconomyWallet } from '@/lib/agents/agent-type-model'
import { WTENEventType } from '@/lib/agents/feed-activation-engine'
import { PlanetaryHourCalculator } from '@/lib/planetary-hour'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import type { CurrentPlanetPosition } from '@/lib/calculate-transits'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Natal position stored in user_profiles.natalPositions */
export interface NatalPosition {
  planet: string
  sign: string
  degree: number // 0–30 within sign
  longitude: number // 0–360 absolute
}

/** Result of evaluating a single agent's activation */
export interface ActivationResult {
  userId: string
  agentEmail: string
  agentName: string
  score: number
  activated: boolean
  triggers: string[]
  planetarySignature?: PlanetarySignature
  agentProfile?: any
}

export interface PlanetarySignature {
  postedAt: string
  planetaryHour: string
  planetaryDay: string
  dominantPlanet: string
  dominantElement: string
  sacredStat: TokenType
  natalPositions: Array<{ planet: string; sign: string; degree: number }>
  transitPositions: Array<{ planet: string; sign: string; degree: number }>
}

/** Normalized agentProfile shape sent to alchm.kitchen */
export interface AgentProfilePayload {
  bio: string | null
  monicaCreationStory: string | null
  natalChart: any
  natalPositions: Array<{ planet: string; sign: string; degree: number }>
  dominantElement: string
  monicaConstant: number
  birthDate: string
  birthTime: string | null
  birthLocation: string
}

/** Summary returned from the daily yield cron */
export interface DailyYieldSummary {
  processedCount: number
  claimedCount: number
  skippedCount: number
  errors: Array<{ userId: string; error: string }>
}

/** Summary returned from the tick (activation + action) cron */
export interface TickSummary {
  evaluatedCount: number
  activatedCount: number
  actionsExecuted: number
  activations: ActivationResult[]
  errors: Array<{ userId: string; error: string }>
}

/** Shape of an agentic user row joined with profile */
interface AgenticUser {
  id: string
  email: string
  name: string | null
  lastActivationAt: Date | null
  activationCount: number
  user_profiles: {
    natalChart: any
    natalPositions: any
    dominantElement: string
    monicaConstant: number
    birthDate: Date
    birthTime: string | null
    birthLocation: any
    bio: string | null
    monicaCreationStory?: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Element / Sign mappings
// ---------------------------------------------------------------------------

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
}

const PLANET_RULERS: Record<string, string> = {
  Sun: 'Leo',
  Moon: 'Cancer',
  Mercury: 'Gemini',
  Venus: 'Taurus',
  Mars: 'Aries',
  Jupiter: 'Sagittarius',
  Saturn: 'Capricorn',
}

const PLANETARY_HOUR_ELEMENTS: Record<string, string> = {
  Sun: 'Fire',
  Moon: 'Water',
  Mercury: 'Air',
  Venus: 'Water',
  Mars: 'Fire',
  Jupiter: 'Fire',
  Saturn: 'Earth',
}

const ELEMENT_TO_SACRED_STAT: Record<string, TokenType> = {
  Fire: 'Spirit',
  Water: 'Essence',
  Earth: 'Matter',
  Air: 'Substance',
}

const SPECIALIZED_AGENT_ACTIONS: Array<{
  emailFragment: string
  actionType: string
  operationKey: string
  logMessage: string
  questEvents: string[]
}> = [
  {
    emailFragment: 'galileo-galilei',
    actionType: 'meal_plan',
    operationKey: 'agent_meal_plan',
    logMessage: 'is planning a cosmic feast',
    questEvents: ['generate_recipe', 'log_from_plan'],
  },
  {
    emailFragment: 'albert-einstein',
    actionType: 'pantry_update',
    operationKey: 'agent_pantry_update',
    logMessage: 'is stocking the master pantry',
    questEvents: ['masters_pantry_verified'],
  },
  {
    emailFragment: 'marie-curie',
    actionType: 'alchemical_transmutation',
    operationKey: 'agent_alchemical_transmutation',
    logMessage: 'is demonstrating an alchemical transmutation',
    questEvents: ['agent_alchemical_transmutation'],
  },
  {
    emailFragment: 'leonardo-da-vinci',
    actionType: 'sacred_geometry_design',
    operationKey: 'agent_sacred_geometry_design',
    logMessage: 'is drafting a sacred geometry design',
    questEvents: ['agent_sacred_geometry_design'],
  },
  {
    emailFragment: 'nikola-tesla',
    actionType: 'energy_harmonic_calibration',
    operationKey: 'agent_energy_harmonic_calibration',
    logMessage: 'is calibrating harmonic energy flow',
    questEvents: ['agent_energy_harmonic_calibration'],
  },
]

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AgentActionService {
  private hourCalc = new PlanetaryHourCalculator()

  // -----------------------------------------------------------------------
  // 1. Daily Yield
  // -----------------------------------------------------------------------

  /**
   * Claim daily ESMS yield for every active agentic user.
   *
   * Distributes `AGENT_DAILY_YIELD` tokens evenly across the four token
   * types. Skips any agent that has already claimed today (idempotent via
   * `lastDailyClaimAt` check inside the transaction).
   */
  async runDailyYieldForAgents(): Promise<DailyYieldSummary> {
    // Only historical "wallet" agents accrue daily yield. Sky sprites
    // (planetary degree / moon) hold a dignity/phase-derived reservoir they
    // RADIATE — it isn't earned via daily claims — so they're excluded here.
    const agenticUsers = (await this.getActiveAgenticUsers()).filter(a =>
      isEconomyWallet(String((a as { email?: string }).email || '').split('@')[0])
    )
    const summary: DailyYieldSummary = {
      processedCount: agenticUsers.length,
      claimedCount: 0,
      skippedCount: 0,
      errors: [],
    }

    for (const agent of agenticUsers) {
      try {
        const alreadyClaimed = await EconomyService.hasClaimedAgentsYieldToday(agent.id)
        if (alreadyClaimed) {
          summary.skippedCount++
          continue
        }

        const now = new Date()
        let shouldClaim = false
        const birthTimeStr = agent.user_profiles?.birthTime
        if (birthTimeStr && typeof birthTimeStr === 'string' && birthTimeStr.includes(':')) {
          const birthHour = parseInt(birthTimeStr.split(':')[0], 10)
          if (now.getUTCHours() >= birthHour) {
            shouldClaim = true
          }
        } else {
          // If no birth time, default to midnight UTC
          shouldClaim = true
        }

        if (!shouldClaim) {
          continue
        }

        await this.claimYieldForAgent(agent.id, agent)
        summary.claimedCount++

        const agentName = `${agent.name ?? agent.email.split('@')[0]} `
        const dateStr = new Date().toISOString().split('T')[0]
        const idempotencyKey = `agentic:yield:feed:${agent.email}:${dateStr}`
        const agentProfilePayload = this.buildAgentProfilePayload(agent.user_profiles)

        await feedPusherService
          .pushActions([
            {
              agentEmail: agent.email,
              eventType: 'claim_daily',
              idempotencyKey,
              metadataPayload: {
                agentName,
                agentProfile: agentProfilePayload ?? undefined,
                message: 'Claimed automated cosmic yield.',
              },
            },
          ])
          .catch(err => {
            console.error(
              `[AgentActionService] Failed to push claim_daily feed action for ${agent.email}:`,
              err
            )
          })
      } catch (err: any) {
        if (err?.message === 'Already claimed today') {
          summary.skippedCount++
        } else {
          summary.errors.push({ userId: agent.id, error: err?.message ?? String(err) })
        }
      }
    }

    console.log(
      `[AgentActionService] Daily yield: ${summary.claimedCount} claimed, ` +
        `${summary.skippedCount} skipped, ${summary.errors.length} errors`
    )

    return summary
  }

  /**
   * Atomic yield claim for a single agentic user. Uses the same
   * transaction pattern as `EconomyService.claimAgentsYield` but
   * with the agent-specific daily yield amount.
   */
  private async claimYieldForAgent(userId: string, agent: any): Promise<void> {
    const totalYield = AGENT_DAILY_YIELD
    const dateStr = new Date().toISOString().split('T')[0]
    const transactionGroupId = crypto.randomUUID()

    const natalPositions = this.extractNatalPositions(agent)
    let fire = 1,
      earth = 1,
      air = 1,
      water = 1

    if (natalPositions && natalPositions.length > 0) {
      const positionsObj: Record<string, CurrentPlanetPosition> = {}
      for (const p of natalPositions) {
        positionsObj[p.planet] = { sign: p.sign, degree: p.degree } as any
      }
      const elementCounts = this.countElements(positionsObj)
      fire += elementCounts.Fire || 0
      earth += elementCounts.Earth || 0
      air += elementCounts.Air || 0
      water += elementCounts.Water || 0
    }

    const totalWeight = fire + earth + air + water
    const amountsObj: Record<string, number> = {
      spirit: (fire / totalWeight) * totalYield,
      matter: (earth / totalWeight) * totalYield,
      substance: (air / totalWeight) * totalYield,
      essence: (water / totalWeight) * totalYield,
    }

    await prisma.$transaction(async tx => {
      // Idempotency guard within the transaction
      const bal = await tx.tokenBalance.findUnique({ where: { userId } })
      if (bal?.lastDailyClaimAgentsAt) {
        const last = new Date(bal.lastDailyClaimAgentsAt)
        const now = new Date()
        if (
          last.getUTCFullYear() === now.getUTCFullYear() &&
          last.getUTCMonth() === now.getUTCMonth() &&
          last.getUTCDate() === now.getUTCDate()
        ) {
          throw new Error('Already claimed today')
        }
      }

      const amounts: Record<string, number> = {}
      for (const token of TOKEN_TYPES) {
        const tokenKey = token.toLowerCase() as keyof typeof amountsObj
        const amt = amountsObj[tokenKey]
        amounts[tokenKey] = amt
        await tx.tokenTransaction.create({
          data: {
            transactionGroupId,
            userId,
            tokenType: token,
            amount: new Prisma.Decimal(amt),
            sourceType: 'agents_daily_yield',
            description: 'Automated Cosmic Yield (Agentic)',
            idempotencyKey: `agentic:daily:${userId}:${dateStr}:${token}`,
            createdAt: new Date(),
          },
        })
      }

      // Sync yield to alchm.kitchen (with identity metadata so user_profiles is kept fresh)
      const agent = await tx.users.findUnique({
        where: { id: userId },
        select: { email: true, name: true, isAgentic: true },
      })

      if (agent?.isAgentic) {
        const email = agent.email.toLowerCase()
        console.log(`[AgentActionService] Syncing yield for ${email} to alchm.kitchen...`)

        await syncCreditToAlchm({
          userEmail: email,
          amounts: this.toFixedAmounts(amounts),
          source: 'agents_yield',
          idempotencyKey: `agentic:yield:${email}:${dateStr}`,
          metadata: { agentName: `${agent.name ?? email.split('@')[0]} ` },
        })
      }

      // Upsert balance
      await tx.tokenBalance.upsert({
        where: { userId },
        create: {
          userId,
          spirit: amountsObj.spirit,
          essence: amountsObj.essence,
          matter: amountsObj.matter,
          substance: amountsObj.substance,
          lastDailyClaimAgentsAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          spirit: { increment: amountsObj.spirit },
          essence: { increment: amountsObj.essence },
          matter: { increment: amountsObj.matter },
          substance: { increment: amountsObj.substance },
          lastDailyClaimAgentsAt: new Date(),
          updatedAt: new Date(),
        },
      })
    })
  }

  // -----------------------------------------------------------------------
  // 2. Activation Evaluation
  // -----------------------------------------------------------------------

  /**
   * Evaluate all active agentic users against the current celestial
   * weather and return activation results. If an agent's score exceeds
   * `AGENT_ACTIVATION_THRESHOLD`, they are flagged for action.
   */
  async evaluateAgentActivations(): Promise<ActivationResult[]> {
    const agenticUsers = await this.getActiveAgenticUsers()
    const now = new Date()

    // Current sky state
    const currentPositions = getCurrentPlanetaryPositions(now)
    const { planet: hourPlanet, isDaytime } = this.hourCalc.getPlanetaryHour(now)
    const dayRuler = this.hourCalc.getPlanetaryDay(now)

    const results: ActivationResult[] = []

    for (const agent of agenticUsers) {
      const natalPositions = this.extractNatalPositions(agent)
      if (!natalPositions || natalPositions.length === 0) {
        continue // skip agents without stored natal chart
      }

      const { score, triggers } = this.calculateActivationScore(
        natalPositions,
        currentPositions,
        hourPlanet,
        dayRuler,
        isDaytime,
        agent.user_profiles?.dominantElement ?? 'Fire'
      )

      let activated = score >= AGENT_ACTIVATION_THRESHOLD

      if (activated) {
        const balances = await EconomyService.getBalances(agent.id)

        let hasEnoughBalance = false
        const specializedAction = SPECIALIZED_AGENT_ACTIONS.find(action =>
          agent.email.includes(action.emailFragment)
        )

        if (specializedAction) {
          const cost = AGENT_OPERATION_COSTS[specializedAction.operationKey] || {}
          if (
            balances.spirit >= (cost.Spirit || 0) &&
            balances.essence >= (cost.Essence || 0) &&
            balances.matter >= (cost.Matter || 0) &&
            balances.substance >= (cost.Substance || 0)
          ) {
            hasEnoughBalance = true
          }
        } else {
          const feedPostCost = AGENT_OPERATION_COSTS['agent_feed_post'] || {}
          const transmutationCost = AGENT_OPERATION_COSTS['agent_transmutation'] || {}

          const canAffordFeed =
            balances.spirit >= (feedPostCost.Spirit || 0) &&
            balances.essence >= (feedPostCost.Essence || 0) &&
            balances.matter >= (feedPostCost.Matter || 0) &&
            balances.substance >= (feedPostCost.Substance || 0)

          const canAffordTransmutation =
            balances.spirit >= (transmutationCost.Spirit || 0) &&
            balances.essence >= (transmutationCost.Essence || 0) &&
            balances.matter >= (transmutationCost.Matter || 0) &&
            balances.substance >= (transmutationCost.Substance || 0)

          if (canAffordFeed || canAffordTransmutation) {
            hasEnoughBalance = true
          }
        }

        if (!hasEnoughBalance) {
          activated = false
        }
      }

      results.push({
        userId: agent.id,
        agentEmail: agent.email,
        agentName: `${agent.name ?? agent.email.split('@')[0]} `,
        agentProfile: agent.user_profiles,
        score,
        activated,
        triggers,
        planetarySignature: this.buildPlanetarySignature(
          natalPositions,
          currentPositions,
          hourPlanet,
          dayRuler,
          agent.user_profiles?.dominantElement ?? 'Fire'
        ),
      })
    }

    return results
  }

  /**
   * Core activation score algorithm.
   *
   * Components (each normalized to 0–1, then weighted):
   *  - **Planetary Hour Resonance** (0.30) — Does the current hour ruler
   *    appear as a dominant planet in the agent's natal chart?
   *  - **Transit Aspect Score** (0.35) — How tightly do transiting planets
   *    aspect the agent's natal placements? Conjunction/opposition = high.
   *  - **Elemental Affinity** (0.20) — Does the current sky's dominant
   *    element match the agent's dominant element?
   *  - **Day Ruler Bonus** (0.15) — Is today's day ruler the agent's chart
   *    ruler?
   */
  private calculateActivationScore(
    natalPositions: NatalPosition[],
    currentPositions: Record<string, CurrentPlanetPosition>,
    hourPlanet: string,
    dayRuler: string,
    _isDaytime: boolean,
    dominantElement: string
  ): { score: number; triggers: string[] } {
    const triggers: string[] = []

    // 1. Planetary Hour Resonance (weight 0.30)
    let hourScore = 0
    const natalPlanets = natalPositions.map(p => p.planet)
    if (natalPlanets.includes(hourPlanet)) {
      hourScore = 0.8
      triggers.push(`planetary_hour_${hourPlanet}`)
    }
    // Extra boost if agent's Sun sign ruler matches hour planet
    const sunPos = natalPositions.find(p => p.planet === 'Sun')
    if (sunPos && PLANET_RULERS[hourPlanet] === sunPos.sign) {
      hourScore = 1.0
      triggers.push('hour_ruler_sun_sign_match')
    }

    // 2. Transit Aspect Score (weight 0.35)
    let transitScore = 0
    let closestOrb = 360
    for (const natal of natalPositions) {
      for (const [transitPlanet, transitPos] of Object.entries(currentPositions)) {
        const orb = this.calculateOrb(natal.degree, transitPos.degree)
        // Check conjunction (0°), opposition (180°)
        const conjunctionOrb = orb
        const oppositionOrb = Math.abs(orb - 180) < 180 ? Math.abs(orb - 180) : orb
        const minOrb = Math.min(conjunctionOrb, oppositionOrb)

        if (minOrb < 5) {
          // Tight aspect — scale inversely with orb
          const aspectScore = (5 - minOrb) / 5
          if (aspectScore > transitScore) {
            transitScore = aspectScore
            closestOrb = minOrb
            triggers.push(`transit_${transitPlanet}_${natal.planet}_orb_${minOrb.toFixed(1)}`)
          }
        }
      }
    }

    // 3. Elemental Affinity (weight 0.20)
    let elementScore = 0
    const currentElementCounts = this.countElements(currentPositions)
    const dominantCurrentElement = Object.entries(currentElementCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0]
    if (dominantCurrentElement === dominantElement) {
      elementScore = 1.0
      triggers.push(`elemental_resonance_${dominantElement}`)
    } else if (this.areComplementaryElements(dominantCurrentElement ?? '', dominantElement)) {
      elementScore = 0.5
      triggers.push('complementary_element')
    }

    // 4. Day Ruler Bonus (weight 0.15)
    let dayScore = 0
    if (natalPlanets.includes(dayRuler)) {
      dayScore = 0.7
      triggers.push(`day_ruler_${dayRuler}`)
    }
    if (sunPos && PLANET_RULERS[dayRuler] === sunPos.sign) {
      dayScore = 1.0
      triggers.push('day_ruler_sun_sign_match')
    }

    const baseScore = hourScore * 0.3 + transitScore * 0.35 + elementScore * 0.2 + dayScore * 0.15
    const sacredStats = this.calculateSacredStatsMultiplier(dominantElement, hourPlanet)
    if (sacredStats.trigger) {
      triggers.push(sacredStats.trigger)
    }

    return { score: Math.min(1, Math.max(0, baseScore * sacredStats.multiplier)), triggers }
  }

  // -----------------------------------------------------------------------
  // 3. Action Execution
  // -----------------------------------------------------------------------

  /**
   * Execute an action for an activated agentic user.
   *
   * Token debits are performed on **alchm.kitchen** (source of truth)
   * via `POST /api/economy/sync-debit`. There is NO local fallback —
   * if the remote debit fails, the action is recorded with status
   * `debit_failed` and not executed.
   *
   * Action selection logic:
   *  - If the agent has more Spirit+Essence than Matter+Substance →
   *    **Feed Post** (insight action, costs 2 Spirit + 1 Essence)
   *  - Otherwise → **Token Transmutation** (costs 3 Matter + 2 Substance)
   */
  async executeAgentAction(
    activation: ActivationResult
  ): Promise<{ success: boolean; actionType: string; error?: string }> {
    const { userId, agentEmail, agentName } = activation

    try {
      // Fetch current balances (local pre-check for action type selection)
      const balances = await EconomyService.getBalances(userId)

      // Determine action type by dominant token pool OR agent identity
      const spiritEssence = balances.spirit + balances.essence
      const matterSubstance = balances.matter + balances.substance

      let actionType: string
      let operationKey: string
      const specializedAction = SPECIALIZED_AGENT_ACTIONS.find(action =>
        agentEmail.includes(action.emailFragment)
      )

      if (specializedAction) {
        actionType = specializedAction.actionType
        operationKey = specializedAction.operationKey
      } else {
        const feedPostCost = AGENT_OPERATION_COSTS['agent_feed_post'] || {}
        const canAffordFeed =
          balances.spirit >= (feedPostCost.Spirit || 0) &&
          balances.essence >= (feedPostCost.Essence || 0) &&
          balances.matter >= (feedPostCost.Matter || 0) &&
          balances.substance >= (feedPostCost.Substance || 0)

        // Prefer feed post to increase feed activity
        if (canAffordFeed) {
          actionType = 'feed_post'
        } else {
          actionType = 'transmutation'
        }
        operationKey = actionType === 'feed_post' ? 'agent_feed_post' : 'agent_transmutation'
      }

      // Build idempotency key BEFORE debit (needed in the sync payload)
      const hourKey = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
      const idempotencyKey = `agent_action:${userId}:${hourKey}`

      // Normalize raw profile into the contracted AgentProfilePayload shape
      const agentProfilePayload = this.buildAgentProfilePayload(activation.agentProfile)
      // Resolve cost amounts for the payload
      const cost = AGENT_OPERATION_COSTS[operationKey] ?? {}
      const amounts = {
        spirit: (cost.Spirit ?? 0).toFixed(4),
        essence: (cost.Essence ?? 0).toFixed(4),
        matter: (cost.Matter ?? 0).toFixed(4),
        substance: (cost.Substance ?? 0).toFixed(4),
      }

      // Build a lean planetarySignature for the metadata (same shape the feed chip uses)
      const debitPlanetarySignature = activation.planetarySignature
        ? {
            planetaryHour: activation.planetarySignature.planetaryHour,
            planetaryDay: activation.planetarySignature.planetaryDay,
            dominantPlanet: activation.planetarySignature.dominantPlanet,
            dominantElement: activation.planetarySignature.dominantElement,
            sacredStat: activation.planetarySignature.sacredStat,
            natalPositions: activation.planetarySignature.natalPositions,
          }
        : undefined

      // ── Remote debit on alchm.kitchen (source of truth) ──────────
      const debitResult = await syncDebitToAlchm({
        userEmail: agentEmail,
        amounts,
        operationType: operationKey,
        source: 'planetary_agents_action_engine',
        idempotencyKey,
        metadata: {
          agentName,
          actionType,
          activationScore: activation.score,
          triggers: activation.triggers.slice(0, 5),
          agentProfile: agentProfilePayload ?? undefined,
          planetarySignature: debitPlanetarySignature,
        },
      })

      // Persist alchm.kitchen's UUID on first contact (returned on 200, 402, and 409).
      // This is their stable actorId used to build /profile/{userId} links.
      if (debitResult.userId) {
        await prisma.users
          .update({
            where: { id: userId },
            data: { alchmKitchenUserId: debitResult.userId },
          })
          .catch(() => {
            // Non-fatal: unique constraint if two ticks race; safe to ignore
          })
      }

      if (debitResult.reason === 'already_applied') {
        console.info(
          `[AgentActionService] Idempotency hit for ${agentEmail} — profile already updated this hour`
        )
      }

      if (!debitResult.ok && debitResult.reason !== 'already_applied') {
        // Record the failed attempt locally
        const now = new Date()
        await prisma.agent_action_events.upsert({
          where: { idempotencyKey },
          create: {
            agentId: userId,
            agentEmail,
            eventType: actionType === 'feed_post' ? 'insight' : actionType,
            triggerType: 'celestial_activation',
            triggerSummary: activation.triggers.slice(0, 3).join(', '),
            metadataPayload: { error: debitResult.reason ?? debitResult.error },
            score: activation.score,
            idempotencyKey,
            status: 'debit_failed',
            evaluatedAt: now,
            createdAt: now,
            updatedAt: now,
          },
          update: {
            attempts: { increment: 1 },
            status: 'debit_failed',
            updatedAt: now,
          },
        })

        return {
          success: false,
          actionType,
          error: debitResult.reason ?? debitResult.error ?? 'sync_debit_failed',
        }
      }

      // ── Debit succeeded (or was already applied) ─────────────────
      const now = new Date()
      await prisma.agent_action_events.upsert({
        where: { idempotencyKey },
        create: {
          agentId: userId,
          agentEmail,
          eventType: actionType,
          triggerType: 'celestial_activation',
          triggerSummary: activation.triggers.slice(0, 3).join(', '),
          metadataPayload: this.buildActionMetadata(
            agentName,
            actionType,
            activation,
            agentProfilePayload
          ),
          score: activation.score,
          idempotencyKey,
          status: 'executed',
          evaluatedAt: now,
          postedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          attempts: { increment: 1 },
          status: 'executed',
          updatedAt: now,
        },
      })

      // Update the user's activation tracking
      await prisma.users.update({
        where: { id: userId },
        data: {
          lastActivationAt: now,
          activationCount: { increment: 1 },
        },
      })

      // ── Perform the high-level action (reporting events, etc) ─────
      if (specializedAction) {
        const identityMeta = {
          agentName,
          agentProfile: agentProfilePayload ?? undefined,
        }
        console.log(`[AgentActionService] ${agentName} ${specializedAction.logMessage}...`)
        for (const event of specializedAction.questEvents) {
          await syncEventToAlchm({ userEmail: agentEmail, event, metadata: identityMeta })
        }
      }

      // ── Push to the WTEN Feed if applicable ──────────────────────
      let feedActionType: WTENEventType | null = null
      if (actionType === 'feed_post') feedActionType = 'insight'
      else if (actionType === 'transmutation') feedActionType = 'lab_entry'
      else if (['insight', 'lab_entry', 'made_it', 'recipe_generation'].includes(actionType)) {
        feedActionType = actionType as WTENEventType
      }

      if (feedActionType) {
        const feedMetadata = {
          ...this.buildActionMetadata(agentName, actionType, activation, agentProfilePayload),
        }
        console.log(
          `[AgentActionService] Pushing ${feedActionType} for ${agentName} to WTEN feed...`
        )
        await feedPusherService
          .pushActions([
            {
              agentEmail,
              idempotencyKey,
              eventType: feedActionType,
              metadataPayload: feedMetadata,
            },
          ])
          .catch(err => {
            console.error(`[AgentActionService] Feed push failed for ${agentName}:`, err)
          })
      }

      return { success: true, actionType }
    } catch (err: any) {
      console.error(`[AgentActionService] Action failed for ${agentEmail}:`, err)
      return {
        success: false,
        actionType: 'unknown',
        error: err?.message ?? String(err),
      }
    }
  }

  /**
   * Full tick: evaluate all agents, execute actions for activated ones.
   */
  async runTick(): Promise<TickSummary> {
    const activations = await this.evaluateAgentActivations()
    const summary: TickSummary = {
      evaluatedCount: activations.length,
      activatedCount: 0,
      actionsExecuted: 0,
      activations,
      errors: [],
    }

    for (const activation of activations) {
      if (!activation.activated) continue
      summary.activatedCount++

      const result = await this.executeAgentAction(activation)
      if (result.success) {
        summary.actionsExecuted++
      } else {
        summary.errors.push({
          userId: activation.userId,
          error: result.error ?? 'Action execution failed',
        })
      }
    }

    console.log(
      `[AgentActionService] Tick: ${summary.evaluatedCount} evaluated, ` +
        `${summary.activatedCount} activated, ${summary.actionsExecuted} actions, ` +
        `${summary.errors.length} errors`
    )

    return summary
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Fetch all active agentic users with their profiles */
  private async getActiveAgenticUsers(): Promise<AgenticUser[]> {
    const users = (await prisma.users.findMany({
      where: { isAgentic: true },
      include: {
        user_profiles: {
          select: {
            natalChart: true,
            natalPositions: true,
            dominantElement: true,
            monicaConstant: true,
            birthDate: true,
            birthTime: true,
            birthLocation: true,
            bio: true,
          },
        },
      },
    })) as any[]

    // Pull monicaCreationStory from historical_agents as fallback bio source.
    // Email convention: agentId@agentic.alchm.kitchen
    const agentIds = users.map(u => u.email?.split('@')[0]).filter(Boolean) as string[]

    const historicalAgents = await (prisma as any).historical_agents.findMany({
      where: { agentId: { in: agentIds } },
      select: { agentId: true, monicaCreationStory: true },
    })
    const storyByAgentId = new Map<string, string | null>(
      historicalAgents.map((a: any) => [a.agentId, a.monicaCreationStory])
    )

    for (const user of users) {
      const agentId = user.email?.split('@')[0]
      if (user.user_profiles && agentId) {
        user.user_profiles.monicaCreationStory = storyByAgentId.get(agentId) ?? null
      }
    }

    return users as unknown as AgenticUser[]
  }

  /** Extract natal positions from an agent's profile */
  private extractNatalPositions(agent: AgenticUser): NatalPosition[] | null {
    const profile = agent.user_profiles
    if (!profile) return null

    // Prefer explicit natalPositions if stored
    if (profile.natalPositions && Array.isArray(profile.natalPositions)) {
      return profile.natalPositions as NatalPosition[]
    }

    // Fall back to extracting from natalChart JSON
    const chart = profile.natalChart
    if (!chart) return null

    try {
      // Handle both { planets: { Sun: { degree, sign, ... } } } and array formats
      if (chart.planets && typeof chart.planets === 'object') {
        return Object.entries(chart.planets).map(([planet, data]: [string, any]) => ({
          planet,
          sign: data.sign ?? '',
          degree: data.signDegree ?? data.degree ?? 0,
          longitude: data.longitude ?? data.degrees ?? 0,
        }))
      }

      if (Array.isArray(chart)) {
        return chart.map((p: any) => ({
          planet: p.planet ?? p.label ?? '',
          sign: p.sign ?? '',
          degree: p.signDegree ?? p.degree ?? 0,
          longitude: p.longitude ?? p.degrees ?? 0,
        }))
      }
    } catch {
      console.warn(`[AgentActionService] Failed to parse natal chart for ${agent.id}`)
    }

    return null
  }

  /** Angular distance between two zodiac degrees (0–30 scale) */
  private calculateOrb(degree1: number, degree2: number): number {
    const diff = Math.abs(degree1 - degree2)
    return Math.min(diff, 30 - diff)
  }

  /** Count how many transiting planets fall in each element */
  private countElements(positions: Record<string, CurrentPlanetPosition>): Record<string, number> {
    const counts: Record<string, number> = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
    for (const pos of Object.values(positions)) {
      const element = SIGN_ELEMENTS[pos.sign]
      if (element) counts[element]++
    }
    return counts
  }

  /** Fire↔Air and Water↔Earth are complementary */
  private areComplementaryElements(a: string, b: string): boolean {
    const pairs: Record<string, string> = {
      Fire: 'Air',
      Air: 'Fire',
      Water: 'Earth',
      Earth: 'Water',
    }
    return pairs[a] === b
  }

  private calculateSacredStatsMultiplier(
    dominantElement: string,
    hourPlanet: string
  ): { multiplier: number; trigger?: string } {
    const normalizedElement = this.normalizeElement(dominantElement)
    const hourElement = PLANETARY_HOUR_ELEMENTS[hourPlanet]
    const sacredStat = ELEMENT_TO_SACRED_STAT[normalizedElement] ?? 'Spirit'

    if (!hourElement) {
      return { multiplier: 1 }
    }

    if (hourElement === normalizedElement) {
      return {
        multiplier: 1.15,
        trigger: `sacred_stat_${sacredStat.toLowerCase()}_${hourPlanet.toLowerCase()}_hour`,
      }
    }

    if (this.areComplementaryElements(hourElement, normalizedElement)) {
      return {
        multiplier: 1.08,
        trigger: `sacred_stat_complement_${sacredStat.toLowerCase()}_${hourPlanet.toLowerCase()}_hour`,
      }
    }

    if (this.areChallengingElements(hourElement, normalizedElement)) {
      return {
        multiplier: 0.92,
        trigger: `sacred_stat_tension_${sacredStat.toLowerCase()}_${hourPlanet.toLowerCase()}_hour`,
      }
    }

    return { multiplier: 1 }
  }

  private areChallengingElements(a: string, b: string): boolean {
    const pairs: Record<string, string> = {
      Fire: 'Water',
      Water: 'Fire',
      Air: 'Earth',
      Earth: 'Air',
    }
    return pairs[a] === b
  }

  private normalizeElement(element: string): string {
    const lower = element.toLowerCase()
    if (lower === 'fire' || lower === 'spirit') return 'Fire'
    if (lower === 'water' || lower === 'essence') return 'Water'
    if (lower === 'earth' || lower === 'matter') return 'Earth'
    if (lower === 'air' || lower === 'substance') return 'Air'
    return 'Fire'
  }

  /** Stable hash of the profile fields that matter for alchm.kitchen upsert */
  private toFixedAmounts(amounts: Partial<Record<string, number>>): {
    spirit: string
    essence: string
    matter: string
    substance: string
  } {
    return {
      spirit: (amounts.spirit ?? 0).toFixed(4),
      essence: (amounts.essence ?? 0).toFixed(4),
      matter: (amounts.matter ?? 0).toFixed(4),
      substance: (amounts.substance ?? 0).toFixed(4),
    }
  }

  private buildPlanetarySignature(
    natalPositions: NatalPosition[],
    currentPositions: Record<string, CurrentPlanetPosition>,
    hourPlanet: string,
    dayRuler: string,
    dominantElement: string
  ): PlanetarySignature {
    const normalizedElement = this.normalizeElement(dominantElement)
    const signaturePlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

    return {
      postedAt: new Date().toISOString(),
      planetaryHour: hourPlanet,
      planetaryDay: dayRuler,
      dominantPlanet: hourPlanet,
      dominantElement: normalizedElement,
      sacredStat: ELEMENT_TO_SACRED_STAT[normalizedElement] ?? 'Spirit',
      natalPositions: natalPositions
        .filter(position => signaturePlanets.includes(position.planet))
        .slice(0, 7)
        .map(position => ({
          planet: position.planet,
          sign: position.sign,
          degree: Number(position.degree.toFixed(2)),
        })),
      transitPositions: Object.entries(currentPositions)
        .filter(([planet]) => signaturePlanets.includes(planet))
        .slice(0, 7)
        .map(([planet, position]) => ({
          planet,
          sign: position.sign,
          degree: Number(position.degree.toFixed(2)),
        })),
    }
  }

  /** Normalize raw user_profiles row into the contracted agentProfile shape */
  private buildAgentProfilePayload(
    profile: AgenticUser['user_profiles']
  ): AgentProfilePayload | null {
    if (!profile) return null

    const natalPositions: Array<{ planet: string; sign: string; degree: number }> = []
    if (Array.isArray(profile.natalPositions)) {
      for (const p of profile.natalPositions as any[]) {
        natalPositions.push({
          planet: p.planet ?? '',
          sign: p.sign ?? '',
          degree: Number((p.signDegree ?? p.degree ?? 0).toFixed?.(2) ?? 0),
        })
      }
    }

    // Normalize birthDate: Date object → ISO date string
    const birthDate =
      profile.birthDate instanceof Date
        ? profile.birthDate.toISOString().split('T')[0]
        : profile.birthDate
          ? String(profile.birthDate).split('T')[0]
          : ''

    // Normalize birthLocation: object → readable string
    let birthLocation = ''
    if (profile.birthLocation) {
      if (typeof profile.birthLocation === 'string') {
        birthLocation = profile.birthLocation
      } else if (typeof profile.birthLocation === 'object') {
        const loc = profile.birthLocation as any
        birthLocation = [loc.city, loc.country].filter(Boolean).join(', ') || JSON.stringify(loc)
      }
    }

    // Mirror alchm.kitchen's own fallback: bio || monicaCreationStory || null
    const bio = profile.bio ?? profile.monicaCreationStory ?? null

    return {
      bio,
      monicaCreationStory: profile.monicaCreationStory ?? null,
      natalChart: profile.natalChart ?? null,
      natalPositions,
      dominantElement: profile.dominantElement ?? 'Fire',
      monicaConstant: Number(profile.monicaConstant ?? 0),
      birthDate,
      birthTime: profile.birthTime ?? null,
      birthLocation,
    }
  }

  /**
   * Build structured metadata payload for the action event record.
   * agentProfilePayload is the normalized profile (from buildAgentProfilePayload),
   * not the raw DB row.
   */
  private buildActionMetadata(
    agentName: string,
    actionType: string,
    activation: ActivationResult,
    agentProfilePayload?: AgentProfilePayload | null
  ): Record<string, any> {
    const now = new Date()
    const baseIdentity = {
      agentName,
      agentProfile: agentProfilePayload ?? undefined,
      planetarySignature: activation.planetarySignature,
      timestamp: now.toISOString(),
    }

    if (actionType === 'meal_plan') {
      return {
        ...baseIdentity,
        featureDemo: 'Weekly Menu Planning',
        planAction: 'generate_recipe',
        secondaryAction: 'log_from_plan',
        internalConfidence: activation.score,
      }
    }

    if (actionType === 'pantry_update') {
      return {
        ...baseIdentity,
        featureDemo: "Master's Pantry",
        pantryAction: 'masters_pantry_verified',
        ingredient: 'Oranges',
        internalConfidence: activation.score,
      }
    }

    if (actionType === 'alchemical_transmutation') {
      return {
        ...baseIdentity,
        dishName: `${agentName}'s Alchemical Transmutation`,
        featureDemo: 'Alchemical Transmutation',
        transmutationAction: 'agent_alchemical_transmutation',
        sampleTransformation: 'Stabilizing volatile pantry elements into radiant preserves',
        internalConfidence: activation.score,
      }
    }

    if (actionType === 'sacred_geometry_design') {
      return {
        ...baseIdentity,
        featureDemo: 'Sacred Geometry Design',
        designAction: 'agent_sacred_geometry_design',
        pattern: 'Golden-ratio plating grid for a seasonal tasting board',
        internalConfidence: activation.score,
      }
    }

    if (actionType === 'energy_harmonic_calibration') {
      return {
        ...baseIdentity,
        featureDemo: 'Energy Harmonic Calibration',
        calibrationAction: 'agent_energy_harmonic_calibration',
        frequency: 'Kitchen workflow resonance and alternating-current heat timing',
        internalConfidence: activation.score,
      }
    }

    if (actionType === 'feed_post') {
      return {
        ...baseIdentity,
        messageType: 'insight',
        insightTitle: `Cosmic Observation — ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        insightContent: this.generateInsightContent(agentName, activation.triggers),
        internalConfidence: activation.score,
        internalTrigger: activation.triggers[0] ?? 'celestial_activation',
      }
    }

    // transmutation (lab_entry)
    return {
      ...baseIdentity,
      messageType: 'transmutation',
      dishName: `${agentName}'s Token Transmutation`,
      description: `${agentName} transmuted tokens under ${activation.triggers[0] ?? 'cosmic'} alignment`,
      internalConfidence: activation.score,
      internalTrigger: activation.triggers[0] ?? 'celestial_activation',
    }
  }

  /** Generate a simple astrologically-themed insight message */
  private generateInsightContent(agentName: string, triggers: string[]): string {
    const now = new Date()
    const { planet: hourPlanet } = this.hourCalc.getPlanetaryHour(now)
    const dayRuler = this.hourCalc.getPlanetaryDay(now)

    const triggerPhrase = triggers
      .filter(t => !t.startsWith('transit_'))
      .map(t => t.replace(/_/g, ' '))
      .slice(0, 2)
      .join(' and ')

    return (
      `During the ${hourPlanet} hour on this ${dayRuler} day, ` +
      `${agentName} observes a surge of ${triggerPhrase || 'celestial'} energy. ` +
      `The alignment suggests a moment of heightened alchemical potential — ` +
      `a window for transformation and deeper understanding of the cosmic order.`
    )
  }
}

// Singleton
export const agentActionService = new AgentActionService()
