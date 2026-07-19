import { describe, it, expect } from 'vitest'
import { buildAgentContext } from '@/lib/agents/persona/build-agent-context'
import { STAR_AGENTS, SIRIUS_STAR_AGENT } from '@/lib/agents/star-agents'

describe('Pentacles Star Agents Persona Context', () => {
  it('should include 4 Star Agents in STAR_AGENTS array', () => {
    expect(STAR_AGENTS.length).toBe(4)
    const names = STAR_AGENTS.map(a => a.name)
    expect(names).toContain('Sirius')
    expect(names).toContain('Arcturus')
    expect(names).toContain('Vega')
    expect(names).toContain('Polaris')
  })

  it('should build a persona block for Sirius', () => {
    const ctx = buildAgentContext('sirius')
    expect(ctx).not.toBeNull()
    expect(ctx?.agent.name).toBe('Sirius')
    expect(ctx?.personaBlock).toContain('You are Sirius, The Dog Star · Radiant Sovereign of Fire.')
    expect(ctx?.personaBlock).toContain('Spirit / Fire Staking & Celestial Vaults')
    expect(ctx?.cacheKey).toBeDefined()
    expect(ctx?.cacheKey.length).toBeGreaterThan(0)
  })

  it('should build persona blocks for all 4 star agents', () => {
    const ids = ['sirius', 'arcturus', 'vega', 'polaris']
    for (const id of ids) {
      const ctx = buildAgentContext(id)
      expect(ctx).not.toBeNull()
      expect(ctx?.personaBlock).toContain('## Core Voice')
      expect(ctx?.personaBlock).toContain('## Core Beliefs')
    }
  })
})
