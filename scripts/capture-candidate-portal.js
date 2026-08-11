import { chromium } from '@playwright/test'

async function captureCandidatePortal() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. Candidate Login Page
  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'public/images/screenshot-candidate-login.png' })
  console.log('Captured screenshot-candidate-login.png')

  // 2. Perform Login
  const testPhone = '9876543299'
  await page.fill('input#phone', testPhone)
  await page.fill('input#password', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)

  // 3. Candidate Dashboard
  await page.screenshot({ path: 'public/images/screenshot-candidate-dashboard.png' })
  console.log('Captured screenshot-candidate-dashboard.png')

  await browser.close()
}

captureCandidatePortal().catch(console.error)
