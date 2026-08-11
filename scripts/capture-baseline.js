import { chromium } from '@playwright/test'
import fs from 'fs'

async function captureBaseline() {
  if (!fs.existsSync('reports/baseline')) {
    fs.mkdirSync('reports/baseline', { recursive: true })
  }
  const browser = await chromium.launch()
  
  // Desktop 1440x900
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageDesktop = await contextDesktop.newPage()
  await pageDesktop.goto('http://localhost:3000/careers')
  await pageDesktop.waitForLoadState('networkidle')
  await pageDesktop.screenshot({ path: 'reports/baseline/careers-1440-baseline.png', fullPage: true })

  // Mobile 390x844
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pageMobile = await contextMobile.newPage()
  await pageMobile.goto('http://localhost:3000/careers')
  await pageMobile.waitForLoadState('networkidle')
  await pageMobile.screenshot({ path: 'reports/baseline/careers-390-baseline.png', fullPage: true })

  await browser.close()
  console.log('Baseline screenshots captured.')
}

captureBaseline().catch(console.error)
