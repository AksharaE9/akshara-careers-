import { test } from '@playwright/test'
import { join } from 'path'

test.describe('Public Careers Board Page Screenshots', () => {
  const reportsDir = 'C:/Users/jishn/.gemini/antigravity-ide/brain/16f8e5b3-31e0-46db-b908-7e3a64cac70d/reports'

  test('Capture Careers Board - Mobile 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 2200 })
    await page.goto('/careers')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(reportsDir, 'careers-390.png'),
      fullPage: true,
    })
  })

  test('Capture Careers Board - Desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 2200 })
    await page.goto('/careers')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(reportsDir, 'careers-1440.png'),
      fullPage: true,
    })
  })

  test('Capture Job Detail - Mobile 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1600 })
    await page.goto('/careers/business-development-executive')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(reportsDir, 'job-detail-390.png'),
      fullPage: true,
    })
  })

  test('Capture Job Detail - Desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1600 })
    await page.goto('/careers/business-development-executive')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(reportsDir, 'job-detail-1440.png'),
      fullPage: true,
    })
  })

  test('Capture Drive Landing Redirect Destination - Desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 2000 })
    // Navigate directly to the drive shortlink code, which should redirect
    await page.goto('/d/GFGC-YLK-0726')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(reportsDir, 'drive-redirect-1440.png'),
      fullPage: true,
    })
  })
})
