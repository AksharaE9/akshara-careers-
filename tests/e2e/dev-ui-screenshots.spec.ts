import { test } from '@playwright/test'
import { join } from 'path'

test.describe('Dev UI Gallery Screenshots', () => {
  // We specify the brain directory as the output target for screenshots
  // so they are treated as conversation artifacts and can be embedded in reports.
  const artifactDir = 'C:/Users/jishn/.gemini/antigravity-ide/brain/16f8e5b3-31e0-46db-b908-7e3a64cac70d/reports'

  test('Capture Mobile 390px Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1800 })
    await page.goto('/dev/ui')
    
    // Wait for the fonts and layout to settle
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    
    await page.screenshot({
      path: join(artifactDir, 'dev-ui-390.png'),
      fullPage: true,
    })
    console.log('Mobile 390px screenshot captured.')
  })

  test('Capture Desktop 1440px Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1800 })
    await page.goto('/dev/ui')
    
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    
    await page.screenshot({
      path: join(artifactDir, 'dev-ui-1440.png'),
      fullPage: true,
    })
    console.log('Desktop 1440px screenshot captured.')
  })
})
