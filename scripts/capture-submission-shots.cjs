const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:3200'
const DIR = 'submission-screenshots'

async function settle(page, ms) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForTimeout(ms)
}

// Hide Next.js dev-mode overlay (the "N · 1 issue" badge) so it stays out of shots.
async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }`,
  }).catch(() => {})
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('[pageerror]', e.message))

  // 1) Main / landing page ------------------------------------------------
  console.log('-> /')
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await settle(page, 3500)
  await hideDevChrome(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${DIR}/main.png`, fullPage: true })
  console.log('   saved main.png')

  // 2) Star staking (/pentacles) -----------------------------------------
  console.log('-> /pentacles')
  await page.goto(`${BASE}/pentacles`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await settle(page, 6000) // let sky-map + ephemeris hydrate
  await hideDevChrome(page)

  // Select the highest-APY star via the "Brightest yields (risen now)" list so
  // the stake panel populates with a real yield breakdown. A native Playwright
  // click is required — an in-page .click() does not reliably fire React's handler.
  try {
    const handle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b =>
        /\d+\s*%/.test(b.textContent || '')
      )
      const wp = btns
        .map(b => ({ b, pct: parseInt((b.textContent.match(/(\d+)\s*%/) || [])[1] || '0', 10) }))
        .sort((a, b) => b.pct - a.pct)
      return wp[0] ? wp[0].b : null
    })
    const el = handle.asElement()
    if (el) {
      const label = (await el.textContent()).replace(/\s+/g, ' ').trim().slice(0, 40)
      await el.scrollIntoViewIfNeeded()
      await el.click()
      await page.waitForTimeout(2000)
      console.log('   selected star:', label)
    } else {
      console.log('   no yield button found to select a star')
    }
  } catch (e) {
    console.log('   star-select skipped:', e.message)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${DIR}/star-staking.png` })
  console.log('   saved star-staking.png')

  // 3) ESMS pools — scroll to the zone pool / LP section ------------------
  const scrolled = await page.evaluate(() => {
    const el = document.getElementById('zone-pool-lp-section')
    if (el) {
      el.scrollIntoView({ block: 'center' })
      return true
    }
    return false
  })
  console.log('   pools section found:', scrolled)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${DIR}/esms-pools.png` })
  console.log('   saved esms-pools.png')

  // Also a full-page pentacles capture for reference.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/pentacles-full.png`, fullPage: true })
  console.log('   saved pentacles-full.png')

  await browser.close()
  console.log('done')
})().catch(e => {
  console.error('FAILED', e)
  process.exit(1)
})
