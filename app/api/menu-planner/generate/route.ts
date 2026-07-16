import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { resolveAnyAgent } from '@/lib/agents/resolve-any-agent'
import { getAgentWeeklyMenu, postAgentWeeklyMenu } from '@/lib/wtenClient'
import { getAlchemicalQuantitiesLegacy, backend } from '@/lib/backend'

export const dynamic = 'force-dynamic'

// Days of the week in order (JavaScript Date style: 0 = Sunday)
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

// Classical planetary rulers for the days of the week
const PLANETARY_RULERS = {
  0: 'Sun', // Sunday
  1: 'Moon', // Monday
  2: 'Mars', // Tuesday
  3: 'Mercury', // Wednesday
  4: 'Jupiter', // Thursday
  5: 'Venus', // Friday
  6: 'Saturn', // Saturday
} as const

// Elemental mapping for planetary days
const PLANETARY_ELEMENTS = {
  Sun: 'Fire',
  Moon: 'Water',
  Mars: 'Fire',
  Mercury: 'Air',
  Jupiter: 'Air',
  Venus: 'Water',
  Saturn: 'Earth',
} as const

function getSundayOfWeek(date: Date = new Date()): Date {
  const result = new Date(date)
  const day = result.getUTCDay()
  result.setUTCDate(result.getUTCDate() - day)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

export async function POST(request: NextRequest) {
  try {
    const {
      agentId,
      weekStartDate: requestedDate,
      regenerate = false,
      status = 'draft',
      shareToFeed = false,
    } = await request.json()

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId is required' }, { status: 400 })
    }

    const agent = await resolveAnyAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent ${agentId} not found` },
        { status: 404 }
      )
    }

    // Resolve Sunday date
    const dateObj = requestedDate ? new Date(requestedDate) : new Date()
    const sundayDate = getSundayOfWeek(dateObj)
    const weekStartDateStr = sundayDate.toISOString()

    // 1. Check if a menu already exists (use it to avoid replacing drafts unless requested)
    if (!regenerate) {
      try {
        const existing = await getAgentWeeklyMenu(agent.id, weekStartDateStr)
        if (existing) {
          return NextResponse.json({
            success: true,
            menu: existing,
            reused: true,
          })
        }
      } catch (e) {
        console.warn(`[Generate Menu] Failed to check existing menu:`, e)
      }
    }

    // 2. Fetch alchemical quantities or live sky to enrich the snapshot
    let dominantElement = agent.consciousness?.dominantElement || 'Earth'
    let currentTransits = {}
    try {
      const live = await backend.planetary.current()
      currentTransits = live.planetary_positions || {}
    } catch (e) {
      console.warn(`[Generate Menu] Failed to fetch current transits:`, e)
    }

    // Calculate zodiac sign of the week (Sun sign)
    const sunPos = (currentTransits as any)?.Sun
    const currentZodiacSign =
      sunPos?.sign || agent.consciousness?.natalChart?.planets?.Sun?.sign || 'Gemini'

    // Formulate a robust prompt reflecting the agent's specific culinary style and specialties
    const agentStyle = {
      name: agent.name,
      title: agent.title,
      specialty: agent.abilities?.specialty || agent.specialization || 'Philosophical gastronomy',
      era: agent.era || 'Historical',
      dominantElement,
      dominantModality: agent.consciousness?.dominantModality || 'Fixed',
      traits: agent.personality?.traits || [],
      diet: agent.historicalDiet || {},
    }

    console.log(
      `[Generate Menu] Planning weekly menu for ${agent.name} for week of ${weekStartDateStr}`
    )

    const systemPrompt = `You are the ${agentStyle.name} (${agentStyle.title}), a legendary historical figure.
Specialty: ${agentStyle.specialty}
Culture/Era: ${agentStyle.era}
Dominant Element: ${agentStyle.dominantElement} (${agentStyle.dominantModality})
Culinary Heritage: ${JSON.stringify(agentStyle.diet)}
Personality Traits: ${agentStyle.traits.join(', ')}

Your task is to plan a complete, alchemically-attuned Weekly Menu for the week of ${weekStartDateStr}.
You must create exactly 28 meal slots: Sunday through Saturday, with breakfast, lunch, dinner, and snack for each day.
Each slot should reflect the planetary day alignment (Sunday is ruled by the Sun, Monday by the Moon, etc.) and your unique historical and culinary style.

Each meal slot must have:
1. dayOfWeek: index 0 (Sunday) to 6 (Saturday).
2. mealType: "breakfast", "lunch", "dinner", or "snack".
3. servings: typically 1 or 2.
4. recipe: a beautiful, practical recipe that you would make. It should include:
   - id: a unique string like "hildegard-spelt-bread"
   - name: clear name of the dish
   - cuisine: your culture's cuisine or adapted style
   - ingredients: array of strings of ingredients
   - nutrition: estimated calories, protein (g), carbs (g), fat (g)
   - elementalProperties: Fire, Water, Earth, Air scores summing up to 1.0
5. planetarySnapshot: the planet ruling that day, the zodiac sign "${currentZodiacSign}", the current lunar phase, and elemental states.
6. notes: 1-2 sentences written in your unique voice explaining why this dish is perfect for this specific planetary day and alchemical moment.

Create a premium, theme-based menu title (e.g. "Hildegard's Verdant Fermentation Week") and a one-sentence summary. Also list a consolidated groceryList of up to 25 items needed for the week. Make sure 3 to 6 of the best meals are selected as featuredMeals.`

    const zodSchema = z.object({
      title: z.string(),
      summary: z.string(),
      planetaryFocus: z.string(),
      dietaryFocus: z.string(),
      meals: z.array(
        z.object({
          id: z.string().optional(),
          dayOfWeek: z.number().min(0).max(6),
          mealType: z.enum(MEAL_TYPES),
          servings: z.number().default(1),
          recipe: z.object({
            id: z.string(),
            name: z.string(),
            cuisine: z.string().optional(),
            ingredients: z.array(z.string()).optional(),
            nutrition: z
              .object({
                calories: z.number(),
                protein: z.number(),
                carbs: z.number(),
                fat: z.number(),
              })
              .optional(),
            elementalProperties: z.object({
              Fire: z.number(),
              Water: z.number(),
              Earth: z.number(),
              Air: z.number(),
            }),
          }),
          planetarySnapshot: z.object({
            dominantPlanet: z.string(),
            zodiacSign: z.string(),
            lunarPhase: z.string(),
            elementalState: z.object({
              Fire: z.number(),
              Water: z.number(),
              Earth: z.number(),
              Air: z.number(),
            }),
            timestamp: z.string(),
          }),
          notes: z.string(),
        })
      ),
      nutritionalTotals: z.object({
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }),
      groceryList: z.array(
        z.object({
          name: z.string(),
          category: z.string().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
        })
      ),
      inventory: z.array(z.string()).optional(),
      featuredMeals: z.array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          mealType: z.string(),
          recipeId: z.string(),
          recipeName: z.string(),
        })
      ),
    })

    let menuData: any
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: zodSchema,
        system: systemPrompt,
        prompt: `Generate the complete alchemically-attuned Weekly Menu for the week of ${weekStartDateStr} for agent "${agent.name}". Ensure exactly 28 meals are populated (Sunday-Saturday x breakfast/lunch/dinner/snack).`,
        temperature: 0.35,
      })
      menuData = object
    } catch (err: any) {
      if (process.env.OPENROUTER_API_KEY) {
        console.warn(
          '[Generate Menu] OpenAI call failed, falling back to OpenRouter:',
          err.message || err
        )
        const { createOpenAI } = require('@ai-sdk/openai')
        const openrouter = createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
        })
        const { object } = await generateObject({
          model: openrouter('openai/gpt-4o-mini'),
          schema: zodSchema,
          system: systemPrompt,
          prompt: `Generate the complete alchemically-attuned Weekly Menu for the week of ${weekStartDateStr} for agent "${agent.name}". Ensure exactly 28 meals are populated (Sunday-Saturday x breakfast/lunch/dinner/snack).`,
          temperature: 0.35,
        })
        menuData = object
      } else {
        throw err
      }
    }

    // Attune meals list to have correct ISO timestamps and planetary rulers strictly matched to javascript dayOfWeek
    const enrichedMeals = menuData.meals.map(meal => {
      const targetDate = new Date(sundayDate)
      targetDate.setUTCDate(targetDate.getUTCDate() + meal.dayOfWeek)
      // Estimate reasonable hour based on mealType
      const hours =
        meal.mealType === 'breakfast'
          ? 8
          : meal.mealType === 'lunch'
            ? 12
            : meal.mealType === 'dinner'
              ? 19
              : 15
      targetDate.setUTCHours(hours, 0, 0, 0)

      const ruler = PLANETARY_RULERS[meal.dayOfWeek as keyof typeof PLANETARY_RULERS] || 'Moon'
      const element = PLANETARY_ELEMENTS[ruler as keyof typeof PLANETARY_ELEMENTS] || 'Water'

      // Set standard fields
      meal.planetarySnapshot.dominantPlanet = ruler
      meal.planetarySnapshot.timestamp = targetDate.toISOString()
      meal.planetarySnapshot.zodiacSign = currentZodiacSign
      meal.id = `${DAYS[meal.dayOfWeek]}-${meal.mealType}`
      return meal
    })

    const weekRuler = PLANETARY_RULERS[0]
    const weekElement = PLANETARY_ELEMENTS[weekRuler] || 'Fire'

    const weeklyMenuPayload: any = {
      agentSlug: agent.id,
      agentDisplayName: agent.name,
      weekStartDate: weekStartDateStr,
      status, // Saved as draft/completed depending on request
      shareToFeed,
      title: menuData.title,
      summary: menuData.summary,
      planetaryFocus: menuData.planetaryFocus,
      dietaryFocus: menuData.dietaryFocus,
      meals: enrichedMeals,
      nutritionalTotals: menuData.nutritionalTotals,
      groceryList: menuData.groceryList,
      inventory: menuData.inventory,
      weeklyBudget: null,
      featuredMeals: menuData.featuredMeals,
      planetarySignature: {
        planetaryHour: 'Sun',
        planetaryDay: 'Sun',
        dominantElement: weekElement,
      },
    }

    // Persist as DRAFT to alchm.kitchen
    const response = await postAgentWeeklyMenu(weeklyMenuPayload)

    return NextResponse.json({
      success: true,
      menu: {
        ...weeklyMenuPayload,
        id: response.menu?.id,
      },
      reused: false,
    })
  } catch (error: any) {
    console.error('[API Weekly Menu Generate] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate weekly menu' },
      { status: 500 }
    )
  }
}
