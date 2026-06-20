import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ensSubnameRegisterTool,
  ensSubnamesListTool,
  walrusMemoryStoreTool,
  walrusMemoryRecallTool,
  liveSkyTransitsTool,
  cosmicRecipeGeneratorTool,
} from '@/lib/langchain/agent-tools'

// Mock NameStone module
vi.mock('@/lib/namestone', () => ({
  setSubname: vi.fn(),
  getNames: vi.fn(),
}))

// Mock Walrus memory module
vi.mock('@/lib/walrus/memory', () => ({
  writeMemory: vi.fn(),
  recallMemory: vi.fn(),
}))

// Mock Backend module
vi.mock('@/lib/backend', () => ({
  backend: {
    request: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/lib/structured-logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Planetary Agent LangChain Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ens_subname_register tool', () => {
    it('should call setSubname with correct parameters', async () => {
      const { setSubname } = await import('@/lib/namestone')
      vi.mocked(setSubname).mockResolvedValue(undefined)

      const resultStr = await ensSubnameRegisterTool.invoke({
        name: 'plato',
        address: '0x1234567890123456789012345678901234567890',
        description: 'Plato on ENS',
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.message).toContain('plato.alchmagents.eth')
      expect(setSubname).toHaveBeenCalledWith({
        name: 'plato',
        address: '0x1234567890123456789012345678901234567890',
        textRecords: { description: 'Plato on ENS' },
      })
    })
  })

  describe('ens_subnames_list tool', () => {
    it('should query registered names from NameStone', async () => {
      const { getNames } = await import('@/lib/namestone')
      vi.mocked(getNames).mockResolvedValue([
        {
          name: 'plato',
          address: '0x123',
          text_records: { description: 'Test Plato' },
        },
      ])

      const resultStr = await ensSubnamesListTool.invoke({
        address: '0x123',
        limit: 10,
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.names).toHaveLength(1)
      expect(result.names[0].name).toBe('plato')
      expect(getNames).toHaveBeenCalledWith({
        address: '0x123',
        limit: 10,
      })
    })
  })

  describe('walrus_memory_store tool', () => {
    it('should call writeMemory on Walrus backend', async () => {
      const { writeMemory } = await import('@/lib/walrus/memory')
      vi.mocked(writeMemory).mockResolvedValue({
        backend: 'walrus-http',
        blobId: 'blob-123',
        encrypted: false,
        url: 'https://aggregator.walrus.space/v1/blobs/blob-123',
      })

      const resultStr = await walrusMemoryStoreTool.invoke({
        content: 'Historical fact about Plato',
        agentId: 'plato',
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.blobId).toBe('blob-123')
      expect(writeMemory).toHaveBeenCalledWith({
        content: 'Historical fact about Plato',
        namespace: 'agent:plato',
      })
    })
  })

  describe('walrus_memory_recall tool', () => {
    it('should call recallMemory on Walrus backend', async () => {
      const { recallMemory } = await import('@/lib/walrus/memory')
      vi.mocked(recallMemory).mockResolvedValue([
        {
          blobId: 'blob-123',
          text: 'Memory content',
          distance: 0.1,
        },
      ])

      const resultStr = await walrusMemoryRecallTool.invoke({
        query: 'What did Plato say?',
        agentId: 'plato',
        limit: 3,
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.memories).toHaveLength(1)
      expect(result.memories[0].blobId).toBe('blob-123')
      expect(recallMemory).toHaveBeenCalledWith({
        query: 'What did Plato say?',
        namespace: 'agent:plato',
        limit: 3,
      })
    })
  })

  describe('live_sky_transits tool', () => {
    it('should query internal backend endpoint', async () => {
      const { backend } = await import('@/lib/backend')
      vi.mocked(backend.request).mockResolvedValue({
        planetary_positions: {
          Sun: { sign: 'Leo', degree: 15 },
        },
      })

      const resultStr = await liveSkyTransitsTool.invoke({
        latitude: 40.7,
        longitude: -74.0,
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.transits.planetary_positions.Sun.sign).toBe('Leo')
      expect(backend.request).toHaveBeenCalledWith({
        path: '/api/planetary/positions',
        method: 'POST',
        body: { lat: 40.7, lon: -74.0 },
      })
    })
  })

  describe('cosmic_recipe_generator tool', () => {
    it('should call backend to generate cosmic recipe', async () => {
      const { backend } = await import('@/lib/backend')
      vi.mocked(backend.request).mockResolvedValue({
        title: 'Cosmic Stew',
        difficulty: 'easy',
      })

      const resultStr = await cosmicRecipeGeneratorTool.invoke({
        prompt: 'Cook dinner with chicken',
        cuisine: 'Mediterranean',
        dietary: ['low-carb'],
        dominantElement: 'Earth',
      })

      const result = JSON.parse(resultStr)
      expect(result.success).toBe(true)
      expect(result.recipe.title).toBe('Cosmic Stew')
      expect(backend.request).toHaveBeenCalledWith({
        path: '/api/generate-recipe',
        method: 'POST',
        body: {
          prompt: 'Cook dinner with chicken',
          cuisine: 'Mediterranean',
          dietary: ['low-carb'],
          dominantElement: 'Earth',
        },
      })
    })
  })
})
