import { chromium } from 'playwright'

const routes = [
  '/',
  '/dashboard',
  '/planetary-council',
  '/astrological-agents',
  '/gallery',
  '/philosophers-stone',
  '/rune-forge',
  '/runes',
  '/synthesis-chamber',
  '/tarot-dashboard',
  '/universe-learning',
  '/character-vectors',
  '/transits',
  '/moon-phases',
  '/chart-of-the-moment',
  '/elemental-chart',
]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('🤖 Starting route accessibility scan...\n')

  for (const route of routes) {
    const url = `http://localhost:3000${route}`
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const status = response ? response.status() : 'N/A'
      const title = await page.title()

      if (status === 200) {
        console.log(`✅ ${route.padEnd(25)} -> Status 200 OK | Title: "${title}"`)
      } else {
        console.log(`❌ ${route.padEnd(25)} -> Status ${status} | Title: "${title}"`)
      }
    } catch (e: any) {
      console.log(`💥 ${route.padEnd(25)} -> Navigation failed: ${e.message}`)
    }
  }

  await browser.close()
}

run().catch(console.error)
