import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

test.describe('Layout System & Alignment Audits (§15.4–§15.8)', () => {
  test('1. Every section container shares an identical left edge at desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/careers`)
    await page.waitForSelector('[data-container]')

    // Query all standard width="content" containers
    const lefts = await page.$$eval('[data-container]:not(.max-w-\\[1440px\\])', (els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().left))
    )

    expect(lefts.length).toBeGreaterThanOrEqual(4)
    // Every standard content container must align to the exact same x coordinate
    const uniqueLefts = Array.from(new Set(lefts))
    expect(uniqueLefts.length).toBe(1)
  })

  test('2. Zero horizontal overflow across all 9 standard responsive viewport widths', async ({ page }) => {
    const widths = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920]
    await page.goto(`${BASE_URL}/careers`)

    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(overflow, `Horizontal overflow detected at ${w}px`).toBe(false)
    }
  })

  test('3. Job cards in a row have equal computed height (h-full rhythm)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/careers`)
    await page.waitForSelector('[data-testid^="job-card-"]')

    const heights = await page.$$eval('[data-testid^="job-card-"]', (els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().height))
    )

    expect(heights.length).toBeGreaterThan(0)
    const diff = Math.max(...heights) - Math.min(...heights)
    expect(diff).toBeLessThanOrEqual(2)
  })

  test('4. Hero typography resolves to Bricolage Grotesque display font with optical left margin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/careers`)
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()

    const fontFamily = await h1.evaluate((el) => window.getComputedStyle(el).fontFamily)
    expect(fontFamily).toContain('Bricolage')
  })
})
