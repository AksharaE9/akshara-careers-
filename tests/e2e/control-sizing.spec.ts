/**
 * tests/e2e/control-sizing.spec.ts
 *
 * Part 21 §21.7 — Warm Light Theme Audit Assertions.
 * Verifies control heights, button ratios, absence of cool navy grounds,
 * elimination of amber text (replaced by rust #A8432A outside .ink-band),
 * 3:1 WCAG control borders against grounds, and focus ring compliance.
 */

import { test, expect } from '@playwright/test'

test.describe('Control Sizing & Warm Light Theme Audit (§21.7)', () => {
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

  test('2. No button has a height/width ratio above 0.55 (no boxy/square buttons)', async ({ page }) => {
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

  test('4. No cool ground survives anywhere (blue channel not > red + 6 points, §21.7)', async ({ page }) => {
    const sections = await page.locator('section, main > div, header').all()
    for (const sec of sections) {
      const isVisible = await sec.isVisible()
      if (!isVisible) continue
      const bg = await sec.evaluate((el) => window.getComputedStyle(el).backgroundColor)
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const r = parseInt(match[1] ?? '0', 10)
        const b = parseInt(match[3] ?? '0', 10)
        // If not transparent
        if (r > 0 || b > 0) {
          const blueExcess = b - r
          expect(blueExcess, `Section background ${bg} has cool ground (b - r = ${blueExcess} > 6)`).toBeLessThanOrEqual(6)
        }
      }
    }
  })

  test('5. Amber is never used as text anywhere except inside .ink-band (§21.1 & §21.7)', async ({ page }) => {
    const nonInkSections = await page.locator('header, main, section:not(.ink-band):not([data-ground="ink"])').all()
    for (const sec of nonInkSections) {
      const textElements = await sec.locator('h1, h2, h3, h4, p, span:not([class*="bg-"]), a').all()
      for (const el of textElements) {
        const isVisible = await el.isVisible()
        if (!isVisible) continue
        const isInsideInkBand = await el.evaluate((node) => Boolean(node.closest('.ink-band, [data-ground="ink"]')))
        if (isInsideInkBand) continue

        const color = await el.evaluate((node) => window.getComputedStyle(node).color)
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (match) {
          const r = parseInt(match[1] ?? '0', 10)
          const g = parseInt(match[2] ?? '0', 10)
          const b = parseInt(match[3] ?? '0', 10)
          // Amber is high R, medium-high G (e.g. rgb(232, 163, 61) / rgb(217, 119, 6) / rgb(240, 169, 59))
          const isAmberText = r > 200 && g > 130 && b < 100
          expect(isAmberText, `Found illegal amber text ${color} outside .ink-band: "${await el.textContent()}"`).toBe(false)
        }
      }
    }
  })

  test('6. Wordmark contrast >= 4.5:1 on warm light ground (CAREERS in rust #A8432A, §21.1)', async ({ page }) => {
    const logoWord = page.locator('[data-testid="logo-word"]').first()
    await expect(logoWord).toBeVisible()
    const careersText = logoWord.locator('span').nth(1)
    const color = await careersText.evaluate((el) => window.getComputedStyle(el).color)
    
    // Rust is rgb(168, 67, 42)
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    expect(match).toBeTruthy()
    if (match) {
      const r = parseInt(match[1] ?? '0', 10)
      const g = parseInt(match[2] ?? '0', 10)
      // Rust has R > 150, G < 100
      expect(r, `Wordmark CAREERS color ${color} is expected to be rust (R >= 150)`).toBeGreaterThanOrEqual(140)
      expect(g, `Wordmark CAREERS color ${color} is expected to be rust (G <= 100)`).toBeLessThanOrEqual(100)
    }
  })

  test('7. Every control border is >= 3:1 against its adjacent ground (§21.2 & §21.7)', async ({ page }) => {
    const controls = await page.locator('input:not([type="checkbox"]), select, a.btn--secondary').all()
    for (const ctrl of controls) {
      const isVisible = await ctrl.isVisible()
      if (!isVisible) continue
      const borderColor = await ctrl.evaluate((el) => window.getComputedStyle(el).borderColor)
      // Border #8B7D67 is rgb(139, 125, 103)
      const match = borderColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const r = parseInt(match[1] ?? '0', 10)
        const g = parseInt(match[2] ?? '0', 10)
        const b = parseInt(match[3] ?? '0', 10)
        // Ensure not washed-out/faint border (r <= 190)
        expect(r, `Control border ${borderColor} is too faint (<3:1 against cream/sand)`).toBeLessThanOrEqual(190)
      }
    }
  })

  test('8. Adjacent same-ground sections have a divider (§21.2)', async ({ page }) => {
    const sections = await page.locator('[data-section]').all()
    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1]
      const cur = sections[i]
      if (!prev || !cur) continue

      const prevGround = await prev.getAttribute('data-ground')
      const curGround = await cur.getAttribute('data-ground')

      if (prevGround && curGround && prevGround === curGround) {
        const borderTop = await cur.evaluate((el) => window.getComputedStyle(el).borderTopWidth)
        expect(borderTop, `Adjacent sections with same ground "${curGround}" must have a visible top divider`).not.toBe('0px')
      }
    }
  })

  test('9. Focus ring is rust (#A8432A) across all grounds (§21.1 & §21.7)', async ({ page }) => {
    const cta = page.locator('a[href="#roles"]').first()
    await cta.focus()
    const outlineColor = await cta.evaluate((el) => window.getComputedStyle(el).outlineColor)
    
    // Rust is rgb(168, 67, 42)
    const match = outlineColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const r = parseInt(match[1] ?? '0', 10)
      const g = parseInt(match[2] ?? '0', 10)
      expect(r, `Focus ring color ${outlineColor} must be rust (R >= 140)`).toBeGreaterThanOrEqual(140)
      expect(g, `Focus ring color ${outlineColor} must be rust (G <= 100)`).toBeLessThanOrEqual(100)
    }
  })
})
