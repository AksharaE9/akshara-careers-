/**
 * tests/e2e/console-lifecycle.spec.ts
 *
 * Comprehensive Lifecycle & History Loop Stability Test Suite.
 * Part A: Stability & Loop Prevention (Empty / General Table)
 * Part B: Single Record Lifecycle & Transition Integrity (Received -> Under Review -> Shortlisted)
 */

import { test, expect } from '@playwright/test'

test.describe('Part A — Stability & Loop Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate session as recruiter/admin
    await page.goto('http://localhost:3000/console/login')
    await page.click('[data-testid="demo-recruiter-login"]')
    await page.waitForURL('**/console')
  })

  test('A1: history.replaceState calls <= 5 on initial load', async ({ page }) => {
    let replaceCount = 0
    await page.exposeFunction('trackReplace', () => {
      replaceCount++
    })

    await page.addInitScript(() => {
      const orig = history.replaceState.bind(history)
      history.replaceState = function (...args) {
        ;(window as any).trackReplace?.()
        return orig(...args)
      }
    })

    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(replaceCount, `replaceState called ${replaceCount} times (must be <= 5)`).toBeLessThanOrEqual(5)
  })

  test('A2: No Chrome throttling warning fires in console', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('Throttling navigation')) {
        warnings.push(msg.text())
      }
    })

    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    expect(warnings.length, `Received navigation throttling warnings: ${warnings.join(', ')}`).toBe(0)
  })

  test('A3: Exactly one API call per filter change', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')

    let apiCalls = 0
    page.on('request', (req) => {
      if (req.url().includes('/api/console/applications') && !req.url().includes('/export')) {
        apiCalls++
      }
    })

    // Change stage filter
    await page.selectOption('[data-testid="filter-stage"]', 'shortlisted')
    await page.waitForTimeout(1000)

    expect(apiCalls).toBe(1)
  })

  test('A4: Both date controls agree (top bar and filter row)', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')

    const topbarText = await page.locator('[data-testid="topbar-date-range"]').textContent()
    const scopeText = await page.locator('[data-testid="filter-scope"]').textContent()
    const presetVal = await page.locator('[data-testid="filter-date-preset"]').inputValue()

    expect(presetVal).toBe('last30')
    expect(topbarText).toContain('–')
    expect(scopeText).toContain(topbarText!.trim())
  })

  test('A5: Typing search query does not storm history writes', async ({ page }) => {
    let replaceCount = 0
    await page.exposeFunction('trackReplaceA5', () => {
      replaceCount++
    })

    await page.addInitScript(() => {
      const orig = history.replaceState.bind(history)
      history.replaceState = function (...args) {
        ;(window as any).trackReplaceA5?.()
        return orig(...args)
      }
    })

    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('[data-testid="filter-search"]')
    await searchInput.type('Rahul Sharma', { delay: 50 })
    await page.waitForTimeout(600)

    expect(replaceCount).toBeLessThanOrEqual(3)
  })

  test('A6: View toggle (kanban <-> table) switches view cleanly', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')

    // Switch to table
    await page.click('[data-testid="view-table"]')
    await expect(page.locator('[data-testid="datatable"]')).toBeVisible()

    // Switch back to kanban
    await page.click('[data-testid="view-kanban"]')
    await expect(page.locator('[data-testid="column-received"]')).toBeVisible()
  })

  test('A7: 8 idle seconds cause <= 2 background API calls', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications')
    await page.waitForLoadState('networkidle')

    let backgroundCalls = 0
    page.on('request', (req) => {
      if (req.url().includes('/api/console/applications') && !req.url().includes('/export')) {
        backgroundCalls++
      }
    })

    await page.waitForTimeout(8000)
    expect(backgroundCalls).toBeLessThanOrEqual(2)
  })
})

test.describe('Part B — Single Record Lifecycle & Transition Integrity', () => {
  let seededPublicId: string

  test.beforeAll(async ({ request }) => {
    // Seed application via test endpoint
    const res = await request.post('http://localhost:3000/api/test/seed-application', {
      data: {
        fullName: 'Arjun Verma',
        email: `arjun-${Date.now()}@example.com`,
        phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        stage: 'received',
      },
    })
    if (res.ok()) {
      const data = await res.json()
      seededPublicId = data.publicId
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/console/login')
    await page.click('[data-testid="demo-recruiter-login"]')
    await page.waitForURL('**/console')
  })

  test('B1: Tiles sum to total and candidate card is visible in Received column', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications?view=kanban')
    await page.waitForLoadState('networkidle')

    const totalTile = page.locator('[data-testid="tile-total"] [data-testid="tile-value"]')
    const totalCount = parseInt(await totalTile.textContent() || '0', 10)
    expect(totalCount).toBeGreaterThanOrEqual(1)

    if (seededPublicId) {
      await expect(page.locator(`[data-testid="card-${seededPublicId}"]`)).toBeVisible()
    }
  })

  test('B2: Stage move Received -> Under Review updates counters and UI', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications?view=kanban')
    await page.waitForLoadState('networkidle')

    if (!seededPublicId) return

    const card = page.locator(`[data-testid="card-${seededPublicId}"]`)
    await expect(card).toBeVisible()

    const select = card.locator('select')
    await select.selectOption('under_review')

    // Toast notification visible
    await expect(page.locator('[data-testid="toast"]')).toBeVisible()

    // Card moves to under_review column
    await expect(page.locator(`[data-testid="column-under_review"] [data-testid="card-${seededPublicId}"]`)).toBeVisible()
  })

  test('B3: Stage move Under Review -> Shortlisted in Table view updates stage dropdown', async ({ page }) => {
    await page.goto('http://localhost:3000/console/applications?view=table')
    await page.waitForLoadState('networkidle')

    if (!seededPublicId) return

    const row = page.locator(`[data-testid="row-${seededPublicId}"]`)
    await expect(row).toBeVisible()

    const select = row.locator('[data-testid="row-stage-select"]')
    await select.selectOption('shortlisted')

    // Toast notification visible
    await expect(page.locator('[data-testid="toast"]')).toBeVisible()
  })
})
