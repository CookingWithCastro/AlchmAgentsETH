import { createHash } from 'node:crypto'
import { HISTORICAL_AGENTS, getHistoricalAgent } from '@/lib/agents/historical'
import { STAR_AGENTS, getStarAgent } from '@/lib/agents/star-agents'
import type { CraftedAgent } from '@/lib/agent-types'
import { formatPersonaBlock } from './format-persona-block'

export interface AgentContext {
  agent: CraftedAgent
  personaBlock: string
  /** Stable hash of the persona content — use as a prompt-cache breakpoint key. */
  cacheKey: string
}

const cache = new Map<string, AgentContext>()

function findAgent(agentId: string): CraftedAgent | undefined {
  const star = getStarAgent(agentId)
  if (star) return star
  const byId = getHistoricalAgent(agentId)
  if (byId) return byId
  const lowered = agentId.toLowerCase()
  return (
    STAR_AGENTS.find(a => a.id.toLowerCase() === lowered || a.name.toLowerCase() === lowered) ||
    HISTORICAL_AGENTS.find(a => a.id.toLowerCase() === lowered || a.name.toLowerCase() === lowered)
  )
}

export function buildAgentContext(agentId: string): AgentContext | null {
  const cached = cache.get(agentId)
  if (cached) return cached

  const agent = findAgent(agentId)
  if (!agent) return null

  const personaBlock = formatPersonaBlock(agent)
  const cacheKey = createHash('sha256').update(personaBlock).digest('hex').slice(0, 16)

  const ctx: AgentContext = { agent, personaBlock, cacheKey }
  cache.set(agentId, ctx)
  return ctx
}

export function clearAgentContextCache(): void {
  cache.clear()
}
