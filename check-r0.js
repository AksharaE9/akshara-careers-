import { chromium } from 'playwright'

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const errors = []
  const failedRequests = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('response', resp => {
    if (!resp.ok()) failedRequests.push({ url: resp.url(), status: resp.status() })
  })

  const res = await page.goto('http://localhost:3000/careers', { waitUntil: 'domcontentloaded' })
  console.log('Page HTTP status:', res?.status())
  console.log('Page title:', await page.title())
  const bodyText = await page.locator('body').innerText()
  console.log('Body preview:', bodyText.slice(0, 300))

  const links = await page.$$eval('link[rel="stylesheet"]', els => els.map(e => e.href))
  console.log('Stylesheet links:', links)
  const h1Count = await page.locator('h1').count()
  console.log('H1 count:', h1Count)

  const heading = await page.locator('section h2').first()
  const headingStyles = await heading.evaluate(el => {
    const c = window.getComputedStyle(el)
    return {
      fontFamily: c.fontFamily,
      fontSize: c.fontSize,
      margin: c.margin,
      maxWidth: c.maxWidth,
      color: c.color,
    }
  })
  console.log('(c) Hero Heading Computed Styles:', headingStyles)
  console.log('(d) Failed Network Requests (404s):', failedRequests)

  await browser.close()
}

run().catch(console.error)
