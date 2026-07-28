/**
 * Run the full Agent Action tick from the command line.
 *
 * Usage: bun run scripts/run-agent-tick.ts
 */

// Use relative imports so bun can resolve without Next.js path aliases
import { PrismaClient, Prisma } from '@prisma/client'
import { PlanetaryHourCalculator } from '../lib/planetary-hour'
import { getCurrentPlanetaryPositions } from '../lib/calculate-transits'
import { signDegreeToLongitude } from '../lib/enhanced-astronomical-calculator'
import { AGENT_ACTIVATION_THRESHOLD, AGENT_DAILY_YIELD } from '../lib/economy-config'
import { syncDebitToAlchm } from '../lib/alchm-debit-sync'

const prisma = new PrismaClient()

// Sign → Element lookup
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

interface NatalPos {
  planet: string
  sign: string
  degree: number
  /** `null` when it cannot be derived — never 0, which is a real longitude. */
  longitude: number | null
}

async function main() {
  console.log('═══ Agent Activation Tick ═══\n')

  const now = new Date()
  const positions = getCurrentPlanetaryPositions(now)
  const hourCalc = new PlanetaryHourCalculator()
  const { planet: hourPlanet, isDaytime } = hourCalc.getPlanetaryHour(now)
  const dayRuler = hourCalc.getPlanetaryDay(now)

  console.log(`⏰ ${now.toISOString()}`)
  console.log(`☉ Planetary hour: ${hourPlanet} (${isDaytime ? 'day' : 'night'})`)
  console.log(`📅 Day ruler: ${dayRuler}`)
  console.log(
    `🌍 Sky: ${Object.entries(positions)
      .map(([p, d]: any) => `${p} ${d.degree.toFixed(0)}°${d.sign}`)
      .join(' | ')}\n`
  )

  // Fetch all agentic users
  const agents = await (prisma.users as any).findMany({
    where: { isAgentic: true },
    include: {
      user_profiles: {
        select: {
          natalPositions: true,
          natalChart: true,
          dominantElement: true,
          birthDate: true,
          birthTime: true,
          birthLocation: true,
          monicaConstant: true,
          bio: true,
        },
      },
    },
  })

  console.log(`Evaluating ${agents.length} agentic users...\n`)

  let activatedCount = 0
  let actionsExecuted = 0

  for (const agent of agents) {
    const natalPositions: NatalPos[] | null = extractNatal(agent.user_profiles)
    if (!natalPositions || natalPositions.length === 0) continue

    const { score, triggers } = calculateScore(
      natalPositions,
      positions,
      hourPlanet,
      dayRuler,
      agent.user_profiles?.dominantElement ?? 'Fire'
    )
    const activated = score >= AGENT_ACTIVATION_THRESHOLD

    if (activated) {
      activatedCount++
      console.log(`⚡ ${agent.name} — score ${score.toFixed(3)} — ${triggers.join(', ')}`)

      // Execute action via remote debit on alchm.kitchen
      // Default to feed_post; the main AgentActionService uses balance-based selection
      const actionType = 'feed_post' as const
      const operationKey = actionType === 'feed_post' ? 'agent_feed_post' : 'agent_transmutation'
      const costs =
        actionType === 'feed_post'
          ? { spirit: '2.0000', essence: '1.0000', matter: '0.0000', substance: '0.0000' }
          : { spirit: '0.0000', essence: '0.0000', matter: '3.0000', substance: '2.0000' }

      const hourKey = now.toISOString().slice(0, 13)
      const idKey = `agent_action:${agent.id}:${hourKey}`

      try {
        const debitResult = await syncDebitToAlchm({
          userEmail: agent.email,
          amounts: costs,
          operationType: operationKey,
          source: 'planetary_agents_action_engine',
          idempotencyKey: idKey,
          metadata: {
            agentName: agent.name,
            actionType,
            activationScore: score,
            triggers: triggers.slice(0, 5),
            agentProfile: agent.user_profiles
              ? {
                  bio: agent.user_profiles.bio ?? null,
                  natalChart: agent.user_profiles.natalChart,
                  natalPositions: Array.isArray(agent.user_profiles.natalPositions)
                    ? agent.user_profiles.natalPositions.slice(0, 7).map((p: any) => ({
                        planet: p.planet ?? '',
                        sign: p.sign ?? '',
                        degree: Number((p.signDegree ?? p.degree ?? 0).toFixed?.(2) ?? 0),
                      }))
                    : [],
                  dominantElement: agent.user_profiles.dominantElement ?? 'Fire',
                  monicaConstant: (() => {
                    const value = agent.user_profiles.monicaConstant
                    if (value === null || value === undefined) return null
                    const parsed = Number(value)
                    return Number.isFinite(parsed) ? parsed : null
                  })(),
                  birthDate:
                    agent.user_profiles.birthDate instanceof Date
                      ? agent.user_profiles.birthDate.toISOString().split('T')[0]
                      : String(agent.user_profiles.birthDate ?? '').split('T')[0],
                  birthTime: agent.user_profiles.birthTime ?? null,
                  birthLocation:
                    typeof agent.user_profiles.birthLocation === 'string'
                      ? agent.user_profiles.birthLocation
                      : agent.user_profiles.birthLocation
                        ? JSON.stringify(agent.user_profiles.birthLocation)
                        : '',
                }
              : undefined,
          },
        })

        if (!debitResult.ok && debitResult.reason !== 'already_applied') {
          console.log(`  → ${debitResult.reason ?? debitResult.error ?? 'debit failed'}`)
          continue
        }

        // Record action event
        await prisma.agent_action_events.upsert({
          where: { idempotencyKey: idKey },
          create: {
            agentId: agent.id,
            agentEmail: agent.email,
            eventType: actionType === 'feed_post' ? 'insight' : 'transmutation',
            triggerType: 'celestial_activation',
            triggerSummary: triggers.slice(0, 3).join(', '),
            metadataPayload: {
              agentName: agent.name,
              actionType,
              insightContent: `During the ${hourPlanet} hour on this ${dayRuler} day, ${agent.name} observes heightened ${triggers[0]?.replace(/_/g, ' ') || 'celestial'} energy.`,
            },
            score,
            idempotencyKey: idKey,
            status: 'executed',
            evaluatedAt: now,
            postedAt: now,
            createdAt: now,
            updatedAt: now,
          },
          update: { attempts: { increment: 1 }, status: 'executed', updatedAt: now },
        })

        // Update activation tracking
        await (prisma.users as any).update({
          where: { id: agent.id },
          data: { lastActivationAt: now, activationCount: { increment: 1 } },
        })

        actionsExecuted++
        console.log(`  → ${actionType} debited on alchm.kitchen (${JSON.stringify(costs)})`)
      } catch (err: any) {
        console.error(`  ✗ Error: ${err.message}`)
      }
    }
  }

  console.log(`\n═══════════════════════════════════════════`)
  console.log(`  Evaluated: ${agents.length}`)
  console.log(`  Activated: ${activatedCount}`)
  console.log(`  Actions:   ${actionsExecuted}`)
  console.log(`═══════════════════════════════════════════`)

  await prisma.$disconnect()
}

function extractNatal(profile: any): NatalPos[] | null {
  if (!profile) return null
  if (profile.natalPositions && Array.isArray(profile.natalPositions)) return profile.natalPositions
  const chart = profile.natalChart
  if (!chart) return null
  if (chart.planets && typeof chart.planets === 'object') {
    return Object.entries(chart.planets).map(([planet, data]: [string, any]) => {
      const sign = data.sign ?? ''
      const degree = data.signDegree ?? data.degree ?? 0
      const stored = Number(data.longitude)
      return {
        planet,
        sign,
        degree,
        // DERIVED from the sign and degree the record actually holds, not
        // defaulted. 0 is a real longitude (0°00′ Aries), so a sentinel 0 both
        // asserts a placement nobody measured and, being non-nullish, silently
        // satisfies any downstream `?? longitude ??` chain meant to reach its
        // fallback. Stored natal charts carry `degree`, never `longitude`.
        longitude: Number.isFinite(stored) ? stored : signDegreeToLongitude(sign, degree),
      }
    })
  }
  return null
}

function calculateScore(
  natalPositions: NatalPos[],
  currentPositions: Record<string, any>,
  hourPlanet: string,
  dayRuler: string,
  dominantElement: string
) {
  const triggers: string[] = []
  const natalPlanets = natalPositions.map(p => p.planet)

  // Hour resonance (0.30)
  let hourScore = 0
  if (natalPlanets.includes(hourPlanet)) {
    hourScore = 0.8
    triggers.push(`planetary_hour_${hourPlanet}`)
  }
  const sunPos = natalPositions.find(p => p.planet === 'Sun')
  if (sunPos && PLANET_RULERS[hourPlanet] === sunPos.sign) {
    hourScore = 1.0
    triggers.push('hour_ruler_sun_sign_match')
  }

  // Transit aspects (0.35)
  let transitScore = 0
  for (const natal of natalPositions) {
    for (const [tp, td] of Object.entries(currentPositions)) {
      const orb = Math.abs(natal.degree - (td as any).degree)
      const minOrb = Math.min(orb, 30 - orb)
      if (minOrb < 5) {
        const s = (5 - minOrb) / 5
        if (s > transitScore) {
          transitScore = s
          triggers.push(`transit_${tp}_${natal.planet}`)
        }
      }
    }
  }

  // Elemental affinity (0.20)
  let elementScore = 0
  const eCounts: Record<string, number> = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
  for (const pos of Object.values(currentPositions)) {
    const e = SIGN_ELEMENTS[(pos as any).sign]
    if (e) eCounts[e]++
  }
  const domCurrent = Object.entries(eCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (domCurrent === dominantElement) {
    elementScore = 1.0
    triggers.push(`elemental_resonance_${dominantElement}`)
  }

  // Day ruler (0.15)
  let dayScore = 0
  if (natalPlanets.includes(dayRuler)) {
    dayScore = 0.7
    triggers.push(`day_ruler_${dayRuler}`)
  }
  if (sunPos && PLANET_RULERS[dayRuler] === sunPos.sign) {
    dayScore = 1.0
    triggers.push('day_ruler_sun_sign_match')
  }

  const score = hourScore * 0.3 + transitScore * 0.35 + elementScore * 0.2 + dayScore * 0.15
  return { score: Math.min(1, Math.max(0, score)), triggers }
}

main().catch(async err => {
  console.error('Fatal:', err)
  await prisma.$disconnect()
  process.exit(1)
})
