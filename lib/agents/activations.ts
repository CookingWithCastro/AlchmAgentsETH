import { DEMO_AGENTS } from '@/lib/demo-agents-data'
import { HistoricalAgentsService, type EnhancedHistoricalAgent } from '@/lib/historical-agents-db'

export interface AgentActivationContract {
  agent: {
    id: string
    name: string
    description: string
  }
  strength: number
  dignity: string
  element: string
  planetaryRuler: string
}

const SIGN_WINDOWS = [
  { sign: 'Capricorn', start: [1, 1], end: [1, 19] },
  { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
  { sign: 'Pisces', start: [2, 19], end: [3, 20] },
  { sign: 'Aries', start: [3, 21], end: [4, 19] },
  { sign: 'Taurus', start: [4, 20], end: [5, 20] },
  { sign: 'Gemini', start: [5, 21], end: [6, 20] },
  { sign: 'Cancer', start: [6, 21], end: [7, 22] },
  { sign: 'Leo', start: [7, 23], end: [8, 22] },
  { sign: 'Virgo', start: [8, 23], end: [9, 22] },
  { sign: 'Libra', start: [9, 23], end: [10, 22] },
  { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
  { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
  { sign: 'Capricorn', start: [12, 22], end: [12, 31] },
] as const

const SIGN_ELEMENT: Record<string, string> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
}

const SIGN_RULER: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

const EXALTATION: Record<string, string> = {
  Aries: 'Sun',
  Taurus: 'Moon',
  Cancer: 'Jupiter',
  Virgo: 'Mercury',
  Libra: 'Saturn',
  Capricorn: 'Mars',
  Pisces: 'Venus',
}

function signForDate(date: Date): string {
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  return (
    SIGN_WINDOWS.find(({ start, end }) => {
      const afterStart = month > start[0] || (month === start[0] && day >= start[1])
      const beforeEnd = month < end[0] || (month === end[0] && day <= end[1])
      return afterStart && beforeEnd
    })?.sign || 'Aries'
  )
}

function dignityFor(sign: string, agentElement: string): string {
  if (SIGN_ELEMENT[sign] === agentElement) return 'domicile'
  if (EXALTATION[sign]) return 'exaltation'
  return 'peregrine'
}

function normalizeElement(value: unknown): string {
  const element = String(value || 'Earth')
  const canonical = ['Fire', 'Water', 'Air', 'Earth'].find(
    e => e.toLowerCase() === element.toLowerCase()
  )
  return canonical || 'Earth'
}

function stableFraction(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  return (hash % 1000) / 1000
}

function descriptionFor(agent: any): string {
  return String(
    agent.description ||
      agent.title ||
      agent.specialty ||
      agent.abilities?.specialty ||
      agent.background?.legacy ||
      'Planetary consciousness agent'
  )
}

function mapAgent(agent: any, date: Date): AgentActivationContract {
  const sign = signForDate(date)
  const momentElement = SIGN_ELEMENT[sign]
  const element = normalizeElement(agent.dominantElement || agent.consciousness?.dominantElement)
  const resonance = Number(agent.resonanceScore ?? agent.stats?.resonanceScore ?? 0.5)
  const monica = Number(agent.monicaConstant ?? agent.consciousness?.monicaConstant ?? 0.5)
  const affinity = element === momentElement ? 0.35 : 0.08
  const jitter =
    stableFraction(`${agent.agentId || agent.id}:${date.toISOString().slice(0, 10)}`) * 0.12
  const strength = Math.max(
    0,
    Math.min(1, 0.28 + affinity + resonance * 0.18 + monica * 0.04 + jitter)
  )

  return {
    agent: {
      id: String(agent.agentId || agent.id),
      name: String(agent.name),
      description: descriptionFor(agent),
    },
    strength: Number(strength.toFixed(4)),
    dignity: dignityFor(sign, element),
    element,
    planetaryRuler: SIGN_RULER[sign] || 'Sun',
  }
}

export async function getAgentActivations(
  date: Date,
  limit = 12
): Promise<AgentActivationContract[]> {
  let agents: Array<EnhancedHistoricalAgent | any>

  try {
    agents = await HistoricalAgentsService.getAllAgents({ limit: Math.max(limit * 3, 24) })
  } catch (error) {
    console.warn('[agent-activations] DB unavailable, using demo fallback:', error)
    agents = DEMO_AGENTS
  }

  return agents
    .filter(agent => agent?.agentId || agent?.id)
    .map(agent => mapAgent(agent, date))
    .sort((a, b) => b.strength - a.strength || a.agent.name.localeCompare(b.agent.name))
    .slice(0, limit)
}

export function getFallbackAgentActivations(date: Date, limit = 12): AgentActivationContract[] {
  return DEMO_AGENTS.map(agent => mapAgent(agent, date))
    .sort((a, b) => b.strength - a.strength || a.agent.name.localeCompare(b.agent.name))
    .slice(0, limit)
}
