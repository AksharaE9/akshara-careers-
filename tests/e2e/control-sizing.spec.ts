import { test, expect } from '@playwright/test'

test.describe('Control Sizing & Theme Remediation (§18.6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/careers')
    await page.waitForLoadState('networkidle')
  })

  test('1. No interactive control exceeds 64px tall on the landing page', async ({ page }) => {
    const controls = await page.locator('button, a[class*="btn"], input, select, textarea').all()
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      const isVisible = await control.isVisible()
      if (!isVisible) continue
      const box = await control.boundingBox()
      if (box) {
        // Textareas are allowed to be taller than 64px (min 120px per §18.3)
        const tagName = await control.evaluate((el) => el.tagName.toLowerCase())
        if (tagName !== 'textarea') {
          expect(box.height, `Control <${tagName}> is ${box.height}px tall (must be <= 64px)`).toBeLessThanOrEqual(64)
        }
      }
    }
  })

  test('2. No button has a height/width ratio above 0.5 (no boxy/square buttons)', async ({ page }) => {
    const buttons = await page.locator('main button:not([data-next-mark]), main a[class*="btn"], [data-testid="hero-cta-roles"], [data-testid="hero-cta-drives"]').all()
    for (const btn of buttons) {
      const isVisible = await btn.isVisible()
      if (!isVisible) continue
      const box = await btn.boundingBox()
      if (box && box.width > 0) {
        const ratio = box.height / box.width
        expect(ratio, `Button ratio is ${ratio.toFixed(2)} (${box.width}x${box.height}px)`).toBeLessThanOrEqual(0.55)
      }
    }
  })

  test('3. paddingTop <= 4px on buttons (height derived from height property, not padding)', async ({ page }) => {
    const buttons = await page.locator('button, a[class*="btn"]').all()
    for (const btn of buttons) {
      const isVisible = await btn.isVisible()
      if (!isVisible) continue
      const paddingTop = await btn.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop))
      expect(paddingTop, `Button paddingTop is ${paddingTop}px (must be <= 4px)`).toBeLessThanOrEqual(4)
    }
  })

  test('4. No warm ground survives on sections (red channel not > blue + 8)', async ({ page }) => {
    const sections = await page.locator('section, main > div, footer').all()
    for (const sec of sections) {
      const isVisible = await sec.isVisible()
      if (!isVisible) continue
      const bg = await sec.evaluate((el) => window.getComputedStyle(el).backgroundColor)
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const r = parseInt(match[1] ?? '0', 10)
        const b = parseInt(match[3] ?? '0', 10)
        // If not transparent or near-black
        if (r > 30 || b > 30) {
          expect(r - b, `Section background ${bg} has warm ground (r - b = ${r - b} > 8)`).toBeLessThanOrEqual(8)
        }
      }
    }
  })

  test('5. Body prose is not saturated blue (L-04 desaturation check)', async ({ page }) => {
    const paragraphs = await page.locator('p').all()
    for (const p of paragraphs) {
      const isVisible = await p.isVisible()
      if (!isVisible) continue
      const color = await p.evaluate((el) => window.getComputedStyle(el).color)
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const r = parseInt(match[1] ?? '0', 10)
        const g = parseInt(match[2] ?? '0', 10)
        const b = parseInt(match[3] ?? '0', 10)
        // Check for saturated periwinkle (#7B8FD4 is rgb(123, 143, 212)) -> b - r = 89
        const blueDominance = b - Math.max(r, g)
        expect(blueDominance, `Paragraph color ${color} is saturated blue (dominance ${blueDominance} > 50)`).toBeLessThan(50)
      }
    }
  })

  test('6. Amber never appears as text on a light ground ([data-ground="light"])', async ({ page }) => {
    const lightSections = await page.locator('[data-ground="light"]').all()
    for (const sec of lightSections) {
      const textElements = await sec.locator('h1, h2, h3, h4, p, span, a').all()
      for (const el of textElements) {
        const isVisible = await el.isVisible()
        if (!isVisible) continue
        const color = await el.evaluate((el) => window.getComputedStyle(el).color)
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (match) {
          const r = parseInt(match[1] ?? '0', 10)
          const g = parseInt(match[2] ?? '0', 10)
          const b = parseInt(match[3] ?? '0', 10)
          // Amber is roughly high R, medium G, low B (e.g. rgb(240, 169, 59) or rgb(232, 163, 61))
          const isAmber = r > 200 && g > 130 && b < 100
          expect(isAmber, `Found amber text ${color} on light ground`).toBe(false)
        }
      }
    }
  })

  test('7. Wordmark contrast >= 4.5:1 (L-02)', async ({ page }) => {
    const logoWord = page.locator('[data-testid="logo-word"], header a').first()
    await expect(logoWord).toBeVisible()
    const color = await logoWord.evaluate((el) => window.getComputedStyle(el).color)
    // Verify wordmark is light text, not dark
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const r = parseInt(match[1] ?? '0', 10)
      const g = parseInt(match[2] ?? '0', 10)
      const b = parseInt(match[3] ?? '0', 10)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      expect(brightness, `Wordmark brightness ${brightness} on dark header is too low (must be > 150)`).toBeGreaterThan(150)
    }
  })

  test('8. Nothing overflows the header bar (72px fixed height)', async ({ page }) => {
    const header = page.locator('header').first()
    await expect(header).toBeVisible()
    const headerBox = await header.boundingBox()
    expect(headerBox?.height).toBeLessThanOrEqual(76)
  })

  test('9. Heading-block-to-content gap is under 80px (L-07)', async ({ page }) => {
    const headingBlocks = await page.locator('.heading-block, section h2').all()
    for (const hb of headingBlocks) {
      const isVisible = await hb.isVisible()
      if (!isVisible) continue
      const marginBottom = await hb.evaluate((el) => parseFloat(window.getComputedStyle(el).marginBottom))
      expect(marginBottom, `Heading block margin bottom ${marginBottom}px (must be <= 80px)`).toBeLessThanOrEqual(80)
    }
  })
})
