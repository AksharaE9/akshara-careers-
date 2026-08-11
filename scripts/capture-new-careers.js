import { chromium } from '@playwright/test'

async function captureNewCareers() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto('http://localhost:3000/careers')
  await page.waitForTimeout(1000)

  // 1. Hero with generated workspace picture
  await page.screenshot({ path: 'public/images/screenshot-careers-hero-new.png' })
  console.log('Captured screenshot-careers-hero-new.png')

  // 2. Scroll to Hiring Process Carousel
  const processSec = page.locator('#process')
  await processSec.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'public/images/screenshot-hiring-carousel.png' })
  console.log('Captured screenshot-hiring-carousel.png')

  await browser.close()
}

captureNewCareers().catch(console.error)
