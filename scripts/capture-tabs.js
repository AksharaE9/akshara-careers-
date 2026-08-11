import { chromium } from '@playwright/test'

async function captureTabs() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto('http://localhost:3000/apply/operations-associate')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'public/images/screenshot-apply-register-tab.png' })
  console.log('Captured screenshot-apply-register-tab.png')

  // Click on "Check Status / Login"
  await page.getByRole('button', { name: /Check Status \/ Login/i }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'public/images/screenshot-apply-login-tab.png' })
  console.log('Captured screenshot-apply-login-tab.png')

  await browser.close()
}

captureTabs().catch(console.error)
