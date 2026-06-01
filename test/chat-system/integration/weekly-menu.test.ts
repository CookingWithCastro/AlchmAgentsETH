import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { generateObject } from 'ai'
import { POST as generatePOST } from '@/app/api/menu-planner/generate/route'
import { POST as weeklyPOST, GET as weeklyGET } from '@/app/api/menu-planner/weekly/route'
import { getAgentWeeklyMenu, postAgentWeeklyMenu } from '@/lib/wtenClient'

// Mock external dependencies
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => `mocked-${model}`),
}))

vi.mock('@/lib/agents/resolve-any-agent', () => ({
  resolveAnyAgent: vi.fn(async () => ({
    id: 'hildegard-of-bingen',
    name: 'Hildegard of Bingen',
    title: 'Sibyl of the Rhine',
    abilities: { specialty: 'Verdant Fermentation' },
    era: 'Medieval',
    historicalDiet: { staples: ['Spelt'] },
    personality: { traits: ['Mystical'] },
    consciousness: {
      natalChart: { planets: { Sun: { sign: 'Taurus' } } },
      dominantElement: 'Earth',
      dominantModality: 'Fixed',
    },
  })),
}))

vi.mock('@/lib/wtenClient', () => ({
  getAgentWeeklyMenu: vi.fn(),
  postAgentWeeklyMenu: vi.fn(),
}))

vi.mock('@/lib/backend', () => ({
  getAlchemicalQuantitiesLegacy: vi.fn(async () => ({})),
  backend: {
    planetary: {
      current: vi.fn(async () => ({
        planetary_positions: {
          Sun: { sign: 'Taurus', degree: 22 },
        },
      })),
    },
  },
}))

describe('Weekly Menu Planner Integration', () => {
  let mockGenerateObject: any
  let mockGetAgentWeeklyMenu: any
  let mockPostAgentWeeklyMenu: any

  beforeEach(() => {
    vi.clearAllMocks()
    global.console.error = console.error
    global.console.log = console.log
    mockGenerateObject = vi.mocked(generateObject)
    mockGetAgentWeeklyMenu = vi.mocked(getAgentWeeklyMenu)
    mockPostAgentWeeklyMenu = vi.mocked(postAgentWeeklyMenu)

    // Default mock implementation of generateObject returning exactly 28 meals
    mockGenerateObject.mockResolvedValue({
      object: {
        title: "Hildegard's Verdant Fermentation Week",
        summary: 'A weekly menu balanced in elemental green virtues and spiritual nourishment.',
        planetaryFocus: 'Venus',
        dietaryFocus: 'Verdant Spelt',
        meals: Array.from({ length: 28 }).map((_, i) => ({
          id: `slot-${i}`,
          dayOfWeek: Math.floor(i / 4),
          mealType: ['breakfast', 'lunch', 'dinner', 'snack'][i % 4],
          servings: 1,
          recipe: {
            id: 'mock-recipe',
            name: 'Mock Dish',
            cuisine: 'Medieval Spelt',
            ingredients: ['Spelt flour', 'Verdant herbs'],
            nutrition: { calories: 350, protein: 12, carbs: 60, fat: 5 },
            elementalProperties: { Fire: 0.1, Water: 0.3, Earth: 0.5, Air: 0.1 },
          },
          planetarySnapshot: {
            dominantPlanet: 'Venus',
            zodiacSign: 'Gemini',
            lunarPhase: 'Full Moon',
            elementalState: { Fire: 0.15, Water: 0.35, Earth: 0.4, Air: 0.1 },
            timestamp: new Date().toISOString(),
          },
          notes: 'A wonderful Medieval dish for spiritual health.',
        })),
        nutritionalTotals: { calories: 1500, protein: 50, carbs: 220, fat: 35 },
        groceryList: [{ name: 'Spelt flour', category: 'Pantry', quantity: 2, unit: 'kg' }],
        inventory: ['Verdant herbs'],
        featuredMeals: [
          {
            dayOfWeek: 0,
            mealType: 'breakfast',
            recipeId: 'mock-recipe',
            recipeName: 'Mock Dish',
          },
        ],
      },
    })
  })

  describe('Generate API Route (/api/menu-planner/generate)', () => {
    it('generates a new weekly menu when no draft exists', async () => {
      mockGetAgentWeeklyMenu.mockResolvedValueOnce(null)
      mockPostAgentWeeklyMenu.mockResolvedValueOnce({
        success: true,
        agentEmail: 'hildegard-of-bingen@agentic.alchm.kitchen',
        userId: 'wten-user-uuid',
        menu: { id: 'mock-persisted-menu-id' },
      })

      const request = new NextRequest('http://localhost/api/menu-planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          agentId: 'hildegard-of-bingen',
          regenerate: false,
        }),
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reused).toBe(false)
      expect(data.menu.title).toBe("Hildegard's Verdant Fermentation Week")
      expect(data.menu.meals).toHaveLength(28)
      expect(mockGenerateObject).toHaveBeenCalledOnce()
      expect(mockPostAgentWeeklyMenu).toHaveBeenCalledOnce()
    })

    it('reuses existing menu if it already exists and regenerate is false', async () => {
      const existingMenu = { id: 'existing-id', title: 'Existing Menu', meals: [] }
      mockGetAgentWeeklyMenu.mockResolvedValueOnce(existingMenu)

      const request = new NextRequest('http://localhost/api/menu-planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          agentId: 'hildegard-of-bingen',
          regenerate: false,
        }),
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reused).toBe(true)
      expect(data.menu.id).toBe('existing-id')
      expect(mockGenerateObject).not.toHaveBeenCalled()
    })

    it('forces regeneration even if a menu exists when regenerate is true', async () => {
      mockPostAgentWeeklyMenu.mockResolvedValueOnce({
        success: true,
        menu: { id: 'new-id' },
      })

      const request = new NextRequest('http://localhost/api/menu-planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          agentId: 'hildegard-of-bingen',
          regenerate: true,
        }),
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reused).toBe(false)
      expect(data.menu.title).toBe("Hildegard's Verdant Fermentation Week")
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })
  })

  describe('Proxy Weekly API Routes (/api/menu-planner/weekly)', () => {
    it('successfully proxies GET requests', async () => {
      const mockMenu = { id: 'fetched-id', title: 'Fetched Menu' }
      mockGetAgentWeeklyMenu.mockResolvedValueOnce(mockMenu)

      const request = new NextRequest(
        'http://localhost/api/menu-planner/weekly?agentSlug=hildegard-of-bingen&weekStartDate=2026-05-31',
        { method: 'GET' }
      )

      const response = await weeklyGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.menu.id).toBe('fetched-id')
      expect(mockGetAgentWeeklyMenu).toHaveBeenCalledWith('hildegard-of-bingen', '2026-05-31')
    })

    it('successfully proxies POST requests to complete and publish', async () => {
      const payload = {
        agentSlug: 'hildegard-of-bingen',
        weekStartDate: '2026-05-31',
        meals: [{ id: 'slot-1' }],
        status: 'completed',
        shareToFeed: true,
      }

      mockPostAgentWeeklyMenu.mockResolvedValueOnce({
        success: true,
        feedShared: true,
        menu: { id: 'published-id' },
      })

      const request = new NextRequest('http://localhost/api/menu-planner/weekly', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await weeklyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedShared).toBe(true)
      expect(mockPostAgentWeeklyMenu).toHaveBeenCalledWith(payload)
    })
  })
})
