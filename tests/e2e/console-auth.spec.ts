/**
 * tests/e2e/console-auth.spec.ts
 *
 * E2E tests for console authentication, rate limiting, and password rotation (§14.1 & §14.26).
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Console Authentication & Password Rotation (§14.1)', () => {
  test('Wrong credentials show generic error message and never reveal account existence', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/login`)
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('[data-testid="console-login-email"]')
    await emailInput.click()
    await emailInput.fill('nonexistent@akshara.in')
    const passwordInput = page.locator('[data-testid="console-login-password"]')
    await passwordInput.click()
    await passwordInput.fill('WrongPassword!123')
    await page.locator('[data-testid="console-login-submit"]').click()

    const errorBox = page.locator('[data-testid="console-login-error"]')
    await expect(errorBox).toBeVisible({ timeout: 8000 })
    await expect(errorBox).toHaveText('Email or password is incorrect.')
  })

  test('Seeded super_admin logs in and handles password rotation redirect', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/login`)
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('[data-testid="console-login-email"]')
    await emailInput.click()
    await emailInput.fill('admin@gmail.com')
    const passwordInput = page.locator('[data-testid="console-login-password"]')
    await passwordInput.click()
    await passwordInput.fill('Admin@123')
    await page.locator('[data-testid="console-login-submit"]').click()
    await page.waitForURL('**/console/account/password', { timeout: 15000 }).catch(() => {})
    await expect(page.locator('[data-testid="force-rotate-form"]')).toBeVisible({ timeout: 15000 })
  })

  test('Fast demo recruiter login accesses candidate pipeline seamlessly', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/login`)
    await page.click('[data-testid="demo-recruiter-login"]')
    await page.waitForURL('**/console', { timeout: 8000 })
    await expect(page.locator('text=Operations Pulse')).toBeVisible()
  })
})
