#!/usr/bin/env node
/**
 * fetch-agent-ingredients.ts
 *
 * Fetches personalized ingredient recommendations from alchm.kitchen API
 * for each agent's natal chart data. Outputs results to JSON.
 *
 * Usage: npx tsx scripts/fetch-agent-ingredients.ts
 */

// Use dynamic import for ESM module
async function main() {
  const fs = await import('fs')
  const path = await import('path')

  // Import all agents
  const { DEMO_AGENTS } = await import('../lib/demo-agents-data')

  const BACKEND_URL =
    process.env.WHATTOEATNEXT_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://whattoeatnext-production.up.railway.app'

  const API_SECRET = process.env.INTERNAL_API_SECRET
  if (!API_SECRET) {
    console.error('INTERNAL_API_SECRET is not set — refusing to run with a committed fallback.')
    process.exit(1)
  }

  const OUTPUT_DIR = path.join(import.meta.dirname || '.', 'output')
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const DELAY_MS = 150 // Throttle between agents
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  interface AgentIngredientResult {
    agentId: string
    name: string
    birthData: {
      year: number
      month: number
      day: number
      hour: number
      minute: number
      lat: number
      lon: number
    }
    positions?: any
    alchemicalState?: any
    contextBlueprint?: any
    recipeRecommendations?: any
    errors: string[]
    timestamp: string
  }

  async function fetchJSON(path: string, body: any): Promise<any> {
    const url = `${BACKEND_URL}${path}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          INTERNAL_API_SECRET: API_SECRET,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        return { error: `HTTP ${res.status}: ${res.statusText}` }
      }
      return await res.json()
    } catch (e: any) {
      return { error: e.message }
    }
  }

  /**
   * Convert agent birth data to API-compatible payload.
   * Handles BCE dates by using a proxy modern date for ephemeris calculations.
   */
  function getBirthPayload(agent: any) {
    const date = agent.birthData.date
    const year = date.getFullYear()
    const isValidDate = !isNaN(date.getTime()) && year > 0

    if (isValidDate) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        latitude: agent.birthData.location.lat,
        longitude: agent.birthData.location.lon,
      }
    }

    // BCE/invalid date fallback: use the natal chart sign positions already computed
    // Map Sun sign to approximate month for ephemeris
    const signMonths: Record<string, number[]> = {
      Aries: [3, 25],
      Taurus: [4, 22],
      Gemini: [5, 23],
      Cancer: [6, 22],
      Leo: [7, 23],
      Virgo: [8, 23],
      Libra: [9, 23],
      Scorpio: [10, 23],
      Sagittarius: [11, 22],
      Capricorn: [12, 22],
      Aquarius: [1, 20],
      Pisces: [2, 19],
    }
    const sunSign = agent.consciousness.natalChart.planets.Sun?.sign || 'Aries'
    const [proxyMonth, proxyDay] = signMonths[sunSign] || [3, 21]

    return {
      year: 2000, // Use Y2K as proxy for stable ephemeris
      month: proxyMonth,
      day: proxyDay,
      hour: parseInt(agent.birthData.time?.split(':')[0]) || 12,
      minute: parseInt(agent.birthData.time?.split(':')[1]) || 0,
      latitude: agent.birthData.location.lat,
      longitude: agent.birthData.location.lon,
    }
  }

  console.log(`\n🔮 Fetching ingredient recommendations for ${DEMO_AGENTS.length} agents`)
  console.log(`   Backend: ${BACKEND_URL}\n`)

  const results: AgentIngredientResult[] = []

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const agent = DEMO_AGENTS[i]
    const payload = getBirthPayload(agent)
    const result: AgentIngredientResult = {
      agentId: agent.id,
      name: agent.name,
      birthData: payload,
      errors: [],
      timestamp: new Date().toISOString(),
    }

    console.log(`[${i + 1}/${DEMO_AGENTS.length}] ${agent.name} (${agent.id})...`)

    // 1. Planetary Positions
    const positions = await fetchJSON('/api/planetary/positions', payload)
    if (positions.error) {
      result.errors.push(`positions: ${positions.error}`)
    } else {
      result.positions = positions
    }
    await sleep(DELAY_MS)

    // 2. Alchemize (full alchemical state)
    const alchPayload = { ...payload, date: payload.day }
    const alchState = await fetchJSON('/alchemize', alchPayload)
    if (alchState.error) {
      result.errors.push(`alchemize: ${alchState.error}`)
    } else {
      result.alchemicalState = alchState
    }
    await sleep(DELAY_MS)

    // 3. Context Blueprint (Sun/Moon/Asc + elemental balance)
    const blueprint = await fetchJSON('/api/astrological/context-blueprint', payload)
    if (blueprint.error) {
      result.errors.push(`blueprint: ${blueprint.error}`)
    } else {
      result.contextBlueprint = blueprint
    }
    await sleep(DELAY_MS)

    // 4. Recipe Recommendations by Chart
    const recipes = await fetchJSON('/api/astrological/recipe-recommendations-by-chart', {
      ...payload,
      include_lunar_data: true,
    })
    if (recipes.error) {
      result.errors.push(`recipes: ${recipes.error}`)
    } else {
      result.recipeRecommendations = recipes
    }
    await sleep(DELAY_MS)

    const status = result.errors.length === 0 ? '✅' : `⚠️ (${result.errors.length} errors)`
    console.log(`   ${status}`)

    results.push(result)
  }

  // Write results
  const outputPath = path.join(OUTPUT_DIR, 'agent-ingredient-recommendations.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  // Summary
  const successCount = results.filter(r => r.errors.length === 0).length
  const errorCount = results.filter(r => r.errors.length > 0).length

  console.log(`\n📊 Summary:`)
  console.log(`   Total: ${results.length}`)
  console.log(`   Success: ${successCount}`)
  console.log(`   With errors: ${errorCount}`)
  console.log(`   Output: ${outputPath}`)

  if (errorCount > 0) {
    console.log(`\n⚠️  Agents with errors:`)
    results
      .filter(r => r.errors.length > 0)
      .forEach(r => {
        console.log(`   ${r.name}: ${r.errors.join(', ')}`)
      })
  }
}

main().catch(console.error)
