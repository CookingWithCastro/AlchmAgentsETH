import type { CraftedAgent } from '@/lib/agent-types'
import { deriveStatsFromChart, type Sacred7Stats } from '@/lib/sacred-7-stats'

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function planetLongitude(
  planets: Record<string, { sign: string; degree: number }> | undefined,
  planet: string,
  fallback = 0
): number {
  const p = planets?.[planet]
  if (!p) return fallback
  const idx = SIGN_ORDER.indexOf(p.sign)
  if (idx < 0) return fallback
  return idx * 30 + (typeof p.degree === 'number' ? p.degree : 0)
}

/**
 * Synchronously derive the Seven Sacred Stats from an agent's natal chart.
 *
 * This is the *static* baseline used by the persona builder so every response
 * carries stat-informed communication style. The async `computeLiveStats` adds
 * temporal modifiers (planetary hour, moon phase) on top — that's a separate
 * concern reserved for higher-latency contexts.
 */
export function deriveSacredStats(agent: CraftedAgent): Sacred7Stats {
  const planets = agent.consciousness?.natalChart?.planets
  const ascendant = agent.consciousness?.natalChart?.ascendant ?? 0

  return deriveStatsFromChart({
    monicaConstant: agent.consciousness.monicaConstant,
    sunLongitude: planetLongitude(planets as any, 'Sun', 120),
    moonLongitude: planetLongitude(planets as any, 'Moon', 90),
    mercuryLongitude: planetLongitude(planets as any, 'Mercury', 150),
    venusLongitude: planetLongitude(planets as any, 'Venus', 60),
    marsLongitude: planetLongitude(planets as any, 'Mars', 0),
    ascendantLongitude: typeof ascendant === 'number' ? ascendant : 0,
  })
}
