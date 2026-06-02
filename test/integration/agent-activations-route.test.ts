import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/agents/activations/route'
import { HistoricalAgentsService } from '@/lib/historical-agents-db'

vi.mock('@/lib/historical-agents-db', () => ({
  HistoricalAgentsService: {
    getAllAgents: vi.fn(),
  },
}))

describe('GET /api/agents/activations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns active agents in the commensal alignment contract', async () => {
    vi.mocked(HistoricalAgentsService.getAllAgents).mockResolvedValue([
      {
        agentId: 'hermes',
        name: 'Hermes',
        title: 'Messenger of Mutable Air',
        dominantElement: 'Air',
        resonanceScore: 0.7,
        monicaConstant: 3,
      } as any,
      {
        agentId: 'ares',
        name: 'Ares',
        specialty: 'Combustion and courage',
        dominantElement: 'Fire',
        resonanceScore: 0.7,
        monicaConstant: 3,
      } as any,
    ])

    const response = await GET(
      new NextRequest('http://localhost/api/agents/activations?date=2026-04-01T12:00:00Z')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.activations).toHaveLength(2)
    expect(data.activations[0]).toMatchObject({
      agent: {
        id: 'ares',
        name: 'Ares',
        description: 'Combustion and courage',
      },
      dignity: 'domicile',
      element: 'Fire',
      planetaryRuler: 'Mars',
    })
    expect(data.activations[0].strength).toBeGreaterThanOrEqual(0)
    expect(data.activations[0].strength).toBeLessThanOrEqual(1)
  })

  it('rejects invalid dates', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/agents/activations?date=not-a-date')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid date parameter' })
  })
})
