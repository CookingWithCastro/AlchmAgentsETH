import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

const pages = [
  { name: 'landing', url: 'https://alchm-agents-eth.vercel.app/' },
  { name: 'pentacles', url: 'https://alchm-agents-eth.vercel.app/pentacles' },
  { name: 'erc8004', url: 'https://alchm-agents-eth.vercel.app/erc8004' },
]

async function capture() {
  console.log('🚀 Starting screenshot capture...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina resolution for crisp screenshots
  })

  const outputDir = path.join(process.cwd(), 'submission-screenshots')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  for (const pageInfo of pages) {
    console.log(`\n📸 Capturing ${pageInfo.name} from ${pageInfo.url}...`)
    const page = await context.newPage()

    try {
      // Navigate and wait until network is idle
      await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 })

      // Wait an extra 3 seconds for animations/charts to settle
      await page.waitForTimeout(3000)

      const outputPath = path.join(outputDir, `${pageInfo.name}.png`)
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`✅ Saved screenshot to ${outputPath}`)
    } catch (error) {
      console.error(`❌ Failed to capture ${pageInfo.name}:`, error.message)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  console.log('\n🏁 Screenshot capture process finished.')
}

capture().catch(console.error)
