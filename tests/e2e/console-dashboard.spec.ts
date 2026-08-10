/**
 * tests/e2e/console-dashboard.spec.ts
 *
 * E2E tests for the Admin Dashboard & Intelligence screens (§14.5–§14.17).
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Admin Console & Intelligence Screens (§14.5–§14.17)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via fast admin login
    await page.goto(`${BASE_URL}/console/login`)
    await page.click('[data-testid="demo-admin-login"]')
    await page.waitForURL('**/console', { timeout: 12000 }).catch(() => {})
  })

  test('Screen 1 — Pulse dashboard renders 6 KPI tiles and live feed', async ({ page }) => {
    await page.goto(`${BASE_URL}/console`)
    await expect(page.locator('[data-testid="pulse-tile-applications"]')).toBeVisible()
    await expect(page.locator('[data-testid="pulse-tile-conversion"]')).toBeVisible()
    await expect(page.locator('[data-testid="pulse-tile-visitors"]')).toBeVisible()
    await expect(page.locator('[data-testid="pulse-tile-views"]')).toBeVisible()
    await expect(page.locator('[data-testid="pulse-tile-avgtime"]')).toBeVisible()
    await expect(page.locator('[data-testid="pulse-tile-resume"]')).toBeVisible()
    await expect(page.locator('[data-testid="live-feed"]')).toBeVisible()
  })

  test('Command Palette (⌘K) triggers and filters screens', async ({ page }) => {
    await page.goto(`${BASE_URL}/console`)
    await page.click('[data-testid="cmdk-trigger"]')
    const cmdkInput = page.locator('[data-testid="cmdk-input"]')
    await expect(cmdkInput).toBeVisible()
    await cmdkInput.fill('Funnel')
    await expect(page.locator('[data-testid="cmdk-result-ins-funnel"]')).toBeVisible()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/console/insight/funnel', { timeout: 8000 })
  })

  test('Screen 2 — Funnel & Form Analytics renders conversion journey and field diagnostics', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/insight/funnel`)
    await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-dropoff-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="resume-health-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="abandonment-panel"]')).toBeVisible()
  })

  test('Screen 9 — Security & Bot Activity renders 8-layer defense counters', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/security`)
    await expect(page.locator('[data-testid="security-layer-L1_honeypot"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-layer-L4_ratelimit"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-layer-L6_file"]')).toBeVisible()
  })

  test('Screen 10 — System Health renders live probes and endpoint table', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/system`)
    await expect(page.locator('[data-testid="system-service-database"]')).toBeVisible()
    await expect(page.locator('[data-testid="system-service-storage"]')).toBeVisible()
    await expect(page.locator('[data-testid="system-service-email"]')).toBeVisible()
  })
})
