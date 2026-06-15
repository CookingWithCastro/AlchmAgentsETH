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

  let totalErrors = 0

  for (const route of routes) {
    console.log(`\nNavigating to ${route}...`)
    const errors = []

    // Listen for console errors
    const onConsole = msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`)
      }
    }
    page.on('console', onConsole)

    // Listen for uncaught exceptions
    const onError = err => {
      errors.push(`Page Error: ${err.message}`)
    }
    page.on('pageerror', onError)

    try {
      const response = await page.goto(`http://localhost:3000${route}`, {
        waitUntil: 'networkidle',
        timeout: 120000,
      })
      if (!response.ok()) {
        errors.push(`HTTP Error: ${response.status()} ${response.statusText()}`)
      }

      // Look for React error overlays
      const hasErrorOverlay = await page.evaluate(() => {
        return !!document.querySelector('nextjs-portal')
      })
      if (hasErrorOverlay) {
        errors.push('React Error Boundary triggered (Next.js overlay visible).')
      }
    } catch (e) {
      errors.push(`Navigation failed: ${e.message}`)
    }

    page.off('console', onConsole)
    page.off('pageerror', onError)

    if (errors.length > 0) {
      console.log(`❌ Errors found on ${route}:`)
      errors.forEach(e => console.log(`   - ${e}`))
      totalErrors += errors.length
    } else {
      console.log(`✅ ${route} loaded cleanly.`)
    }
  }

  await browser.close()
  console.log(`\nScan complete. Total errors found: ${totalErrors}`)
  process.exit(totalErrors > 0 ? 1 : 0)
}

run().catch(console.error)
