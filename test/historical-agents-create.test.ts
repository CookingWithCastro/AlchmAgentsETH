import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    historical_agents: { create: vi.fn() },
  },
}))
vi.mock('@/lib/agents/agentic-user-sync', () => ({
  ensureAgenticUserAndSync: vi.fn().mockResolvedValue(undefined),
}))

import { HistoricalAgentsService } from '@/lib/historical-agents-db'
import { prisma } from '@/lib/db'

const createMock = (prisma as any).historical_agents.create as ReturnType<typeof vi.fn>

const baseAgentData = {
  agentId: 'agent-test-vessel-123',
  name: 'Test Vessel',
  title: 'Verification of the ignition sequence',
  birthDate: new Date('1991-06-23T10:24:00Z'),
  birthTime: '10:24',
  birthLocation: { lat: 40.7128, lon: -74.006, name: 'New York' },
  consciousnessLevel: 'Active',
  kalchmConstant: 0.149,
  monicaConstant: 3.7,
  dominantElement: 'Air',
  dominantModality: 'Mutable',
  signature: 'Test Vessel',
  personalityCore: {},
  personalityShadows: [],
  personalityGifts: [],
  personalityChallenges: [],
  currentMood: 'contemplative',
  evolutionStage: 0,
  specialty: 'Wisdom',
  wisdomDomains: [] as string[],
  teachingStyle: 'Intuitive',
  resonanceType: 'Spirit',
  uniquePower: 'Personalized Consciousness',
  avatar: '/avatars/user-created/default.png',
  color: '#8B5CF6',
  symbol: '🔮',
  aura: {},
  natalChart: {},
}

describe('HistoricalAgentsService.createAgent — distinct Monica and Kalchm columns', () => {
  beforeEach(() => {
    createMock.mockReset()
    createMock.mockImplementation(async ({ data }: any) => data)
  })

  it('preserves the independently computed values', async () => {
    await HistoricalAgentsService.createAgent(baseAgentData)

    expect(createMock).toHaveBeenCalledTimes(1)
    const { data } = createMock.mock.calls[0][0]
    expect(data.kalchmConstant).toBe(0.149)
    expect(data.monicaConstant).toBe(3.7)
  })

  it('respects an explicit monicaConstant when provided', async () => {
    await HistoricalAgentsService.createAgent({ ...baseAgentData, monicaConstant: 4.2 })

    const { data } = createMock.mock.calls[0][0]
    expect(data.kalchmConstant).toBe(0.149)
    expect(data.monicaConstant).toBe(4.2)
  })
})
