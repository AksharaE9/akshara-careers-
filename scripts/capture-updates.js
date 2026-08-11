import { chromium } from '@playwright/test'

async function captureScreens() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. Careers Landing Page with Hero Background Image
  await page.goto('http://localhost:3000/careers')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'public/images/screenshot-careers-hero.png' })
  console.log('Captured screenshot-careers-hero.png')

  // 2. Application Form Wizard
  await page.goto('http://localhost:3000/apply/operations-associate')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'public/images/screenshot-apply-wizard.png' })
  console.log('Captured screenshot-apply-wizard.png')

  await browser.close()
}

captureScreens().catch(console.error)
