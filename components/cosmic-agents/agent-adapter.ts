/* CraftedAgent → CouncilAgent adapter.
 * The CraftedAgent shape (lib/agent-types.ts) is the canonical source for historical
 * agents; this adapter projects it into the slimmer shape the council feed UI uses.
 */

import type { CraftedAgent, SacredStats } from '../../lib/agent-types'
import { calculateKalchm as calculateCanonicalKalchm } from '@/lib/thermodynamics/kalchm'
import type { CouncilAgent, Element, NatalPosition, Sacred7Stats, Planetary12 } from './types'

const SIGN_ELEMENT: Record<string, Element> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
}

function elementalPercentages(planets: Record<string, { sign: string }>): Record<Element, number> {
  const counts: Record<Element, number> = { Fire: 0, Water: 0, Earth: 0, Air: 0 }
  let total = 0
  for (const p of Object.values(planets || {})) {
    const el = SIGN_ELEMENT[p.sign]
    if (el) {
      counts[el] += 1
      total += 1
    }
  }
  if (total === 0) return { Fire: 25, Water: 25, Earth: 25, Air: 25 }
  return {
    Fire: Math.round((counts.Fire / total) * 100),
    Water: Math.round((counts.Water / total) * 100),
    Earth: Math.round((counts.Earth / total) * 100),
    Air: Math.round((counts.Air / total) * 100),
  }
}

function defaultSacred7(): Sacred7Stats {
  return {
    power: 70,
    resonance: 70,
    wisdom: 70,
    charisma: 70,
    intuition: 70,
    adaptability: 70,
    vitality: 70,
  }
}

function defaultPlanetary12(): Planetary12 {
  return {
    solarAgency: 70,
    lunarReceptivity: 70,
    mercurialVelocity: 70,
    venusianCoherence: 70,
    martialImpetus: 70,
    jovianExpansion: 70,
    saturnianStructure: 70,
    chironicAdaptation: 70,
    uranianSurprisal: 70,
    neptunianResonance: 70,
    plutonicIntegration: 70,
    kineticAlignment: 70,
  }
}

function pickSacred7(s?: SacredStats): Sacred7Stats {
  if (!s) return defaultSacred7()
  return {
    power: s.power,
    resonance: s.resonance,
    wisdom: s.wisdom,
    charisma: s.charisma,
    intuition: s.intuition,
    adaptability: s.adaptability,
    vitality: s.vitality,
  }
}

function pickPlanetary12(s?: SacredStats): Planetary12 {
  if (!s) return defaultPlanetary12()
  return {
    solarAgency: s.solarAgency,
    lunarReceptivity: s.lunarReceptivity,
    mercurialVelocity: s.mercurialVelocity,
    venusianCoherence: s.venusianCoherence,
    martialImpetus: s.martialImpetus,
    jovianExpansion: s.jovianExpansion,
    saturnianStructure: s.saturnianStructure,
    chironicAdaptation: s.chironicAdaptation,
    uranianSurprisal: s.uranianSurprisal,
    neptunianResonance: s.neptunianResonance,
    plutonicIntegration: s.plutonicIntegration,
    kineticAlignment: s.kineticAlignment,
  }
}

function natalArray(planets: Record<string, { sign: string; degree: number }>): NatalPosition[] {
  if (!planets) return []
  return Object.entries(planets).map(([planet, p]) => ({
    planet,
    sign: p.sign,
    degree: p.degree,
  }))
}

export function craftedToCouncilAgent(agent: CraftedAgent, cooldownMins = 0): CouncilAgent {
  const natalChart = agent.consciousness?.natalChart
  const planets = (natalChart?.planets || {}) as Record<
    string,
    { sign: string; degree: number; retrograde?: boolean; house?: number }
  >
  const sunPos = planets.Sun
  const moonPos = planets.Moon
  const alchemical = agent.consciousness?.alchemicalElements
  return {
    id: agent.id,
    name: agent.name,
    kind: 'historical',
    sun: sunPos?.sign,
    moon: moonPos?.sign,
    rising: agent.consciousness?.signature?.split(' ')?.[0],
    natal: natalArray(planets),
    elemental: elementalPercentages(planets),
    esms: alchemical
      ? {
          spirit: alchemical.spirit,
          essence: alchemical.essence,
          matter: alchemical.matter,
          substance: alchemical.substance,
        }
      : null,
    monicaConstant: agent.consciousness?.monicaConstant ?? null,
    kalchm: deriveKalchm(alchemical),
    stats: pickSacred7(agent.sacredStats),
    planetary12: pickPlanetary12(agent.sacredStats),
    specialty: agent.specialization || agent.title || '',
    evolutionLevel: agent.consciousness?.level?.toLowerCase(),
    consciousness: agent.consciousness?.level,
    cooldown: cooldownMins,
  }
}

export function deriveKalchm(alchemical?: {
  spirit: number
  essence: number
  matter: number
  substance: number
}): number | null {
  if (!alchemical) return null
  return calculateCanonicalKalchm(alchemical)
}

/* User natal chart → CouncilAgent */
export interface UserChartLite {
  id?: string
  name?: string
  birthDate?: string
  birthLocation?: string
  positions: Array<{ planet: string; sign: string; degree: number }>
}

export function userChartToCouncilAgent(chart: UserChartLite | null): CouncilAgent | null {
  if (!chart || !chart.positions?.length) return null
  const planetsRec: Record<string, { sign: string; degree: number }> = {}
  for (const p of chart.positions) planetsRec[p.planet] = { sign: p.sign, degree: p.degree }
  const sun = planetsRec.Sun?.sign
  const moon = planetsRec.Moon?.sign
  return {
    id: 'user-self',
    name: chart.name ? `${chart.name} · Self-Agent` : 'You · Self-Agent',
    kind: 'user',
    sun,
    moon,
    natal: chart.positions,
    elemental: elementalPercentages(planetsRec),
    esms: null,
    monicaConstant: null,
    kalchm: null,
    stats: defaultSacred7(),
    planetary12: defaultPlanetary12(),
    specialty: chart.birthDate ? `native of ${chart.birthDate} · operator` : 'operator',
    evolutionLevel: 'silver',
    consciousness: 'Awakening',
    cooldown: 0,
    birthDate: chart.birthDate,
    birthLocation: chart.birthLocation,
  }
}

/* Compatibility — mirrors design's compatibility() function:
 * elemental overlap (0.6 weight) + shared natal placement (0.4 weight) */
export function compatibility(a: CouncilAgent, b: CouncilAgent): number {
  if (!a || !b) return 0
  const elements: Element[] = ['Fire', 'Water', 'Earth', 'Air']
  const elemSum = elements.reduce(
    (acc, el) => acc + Math.min(a.elemental[el], b.elemental[el]) / 100,
    0
  )
  const elemCompat = Math.min(1, elemSum)
  const aspectCompat = a.natal.some(na =>
    b.natal.some(nb => na.planet === nb.planet && na.sign === nb.sign)
  )
    ? 1
    : 0.5
  return Math.round((elemCompat * 0.6 + aspectCompat * 0.4) * 100)
}

export function isActivated(
  agent: CouncilAgent,
  moment: { dominantElement: Element; aspects: Array<{ a: string; b: string }> }
): boolean {
  const hasResonance = (agent.planetary12.kineticAlignment || 0) > 60
  const elementMatch = (agent.elemental[moment.dominantElement] || 0) >= 25
  const aspectHit = moment.aspects.some(asp =>
    agent.natal.some(n => n.planet === asp.a || n.planet === asp.b)
  )
  return elementMatch || aspectHit || hasResonance
}
