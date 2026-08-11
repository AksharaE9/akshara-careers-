import { chromium } from '@playwright/test'
import fs from 'fs'

async function captureHeroD1() {
  if (!fs.existsSync('reports/phase-d1')) {
    fs.mkdirSync('reports/phase-d1', { recursive: true })
  }
  const browser = await chromium.launch()
  
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto('http://localhost:3000/careers')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'reports/phase-d1/hero-d1.png' })
  await page.screenshot({ path: 'reports/phase-d1/careers-fullpage-d1.png', fullPage: true })

  await browser.close()
  console.log('D1 screenshots captured.')
}

captureHeroD1().catch(console.error)
