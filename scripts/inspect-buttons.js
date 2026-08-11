import { chromium } from '@playwright/test'

async function checkButtons() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/careers')
  const buttons = await page.locator('button, a[class*="btn"], [data-testid="hero-cta-roles"], [data-testid="hero-cta-drives"]').all()
  for (const btn of buttons) {
    const isVisible = await btn.isVisible()
    if (!isVisible) continue
    const box = await btn.boundingBox()
    const text = (await btn.innerText()).trim()
    const outerHtml = await btn.evaluate(el => el.outerHTML)
    console.log(`BUTTON: "${text}" | box:`, box, `| HTML:`, outerHtml.slice(0, 100))
  }
  await browser.close()
}

checkButtons().catch(console.error)
