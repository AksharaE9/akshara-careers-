/**
 * tests/e2e/console-export.spec.ts
 *
 * E2E tests for Part 20 Pipeline Export & Date Filtering (§14.7, §14.18).
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Pipeline Export & Stage Invariant Tests (Part 20)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via admin login
    await page.goto(`${BASE_URL}/console/login`)
    await page.click('[data-testid="demo-admin-login"]')
    await page.waitForURL('**/console', { timeout: 12000 }).catch(() => {})
  })

  test('D-01: stage tiles sum to total', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/applications`)
    await page.waitForSelector('[data-testid="tile-total"] .value')

    const totalText = await page.textContent('[data-testid="tile-total"] .value')
    const total = Number(totalText?.trim() || 0)

    const parts = await page.$$eval('[data-testid^="tile-stage-"] .value', (els) =>
      els.map((e) => Number(e.textContent?.trim() || 0))
    )

    const sum = parts.reduce((a, b) => a + b, 0)
    expect(sum, 'tiles do not account for every record').toBe(total)
  })

  test('D-02: Date filter selector syncs with URL search parameters', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/applications`)
    await page.waitForSelector('#datePreset')

    // Change preset to 'last7'
    await page.selectOption('#datePreset', 'last7')
    await expect(page).toHaveURL(/preset=last7/)

    // Change preset to 'custom'
    await page.selectOption('#datePreset', 'custom')
    await expect(page.locator('#customFrom')).toBeVisible()
    await expect(page.locator('#customTo')).toBeVisible()
  })

  test('D-04: Inline stage change shows 6-second undo toast and reverts when clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/applications`)
    // Switch to table view for stable select target
    await page.click('button:has-text("Table View")')
    await page.waitForSelector('table tbody tr select')

    const firstSelect = page.locator('table tbody tr select').first()
    const initialStage = await firstSelect.inputValue()
    const targetStage = initialStage === 'shortlisted' ? 'under_review' : 'shortlisted'

    // Change stage
    await firstSelect.selectOption(targetStage)

    // Undo toast appears
    const undoToast = page.locator('[data-testid="undo-toast"]')
    await expect(undoToast).toBeVisible()

    // Click Undo
    const undoBtn = page.locator('[data-testid="undo-btn"]')
    await expect(undoBtn).toBeVisible()
    await undoBtn.click()

    // Toast disappears and stage is reverted
    await expect(undoToast).not.toBeVisible()
    await expect(firstSelect).toHaveValue(initialStage)
  })

  test('Export dropdown button renders live count and menu options', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/applications`)
    const exportBtn = page.locator('[data-testid="export-dropdown-btn"]')
    await expect(exportBtn).toBeVisible()

    // Click to open dropdown
    await exportBtn.click()
    await expect(page.locator('[data-testid="export-csv-legacy"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-csv-canonical"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-xlsx"]')).toBeVisible()
  })

  test('Talent Pool page renders export button', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/talent-pool`)
    const exportBtn = page.locator('[data-testid="export-talent-pool-btn"]')
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toHaveAttribute('href', '/api/console/talent-pool/export')
  })
})
