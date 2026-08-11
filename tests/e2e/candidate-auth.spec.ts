/**
 * tests/e2e/candidate-auth.spec.ts
 *
 * E2E tests for Password-based Candidate Authentication and Brute-force Lockout.
 */

import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '@/lib/db/client'
import { candidates, applications, applicationStageEvents, candidateSessions, candidateLoginAttempts } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

test.describe('Candidate Password-Based Auth & Security E2E', () => {
  const testPhone = '9876543000'
  const testPhoneE164 = '+919876543000'
  const testEmail = 'pass.candidate@example.com'
  const testName = 'Password Candidate'
  const testPassword = 'candidatepass123'

  test.beforeAll(async () => {
    const db = getDb()

    // Clean test candidate and login attempts
    const existing = await db
      .select()
      .from(candidates)
      .where(eq(candidates.phoneE164, testPhoneE164))
      .limit(1)

    if (existing[0]) {
      const cId = existing[0].id
      const existingApps = await db
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.candidateId, cId))
      const appIds = existingApps.map((a) => a.id)
      if (appIds.length > 0) {
        await db
          .delete(applicationStageEvents)
          .where(sql`${applicationStageEvents.applicationId} IN ${appIds}`)
        await db.delete(applications).where(eq(applications.candidateId, cId))
      }
      await db.delete(candidateSessions).where(eq(candidateSessions.candidateId, cId))
      await db.delete(candidates).where(eq(candidates.id, cId))
    }

    await db.delete(candidateLoginAttempts).where(eq(candidateLoginAttempts.phoneE164, testPhoneE164))
  })

  test('Valid signup, duplicate signup auto-redirect, and login lockout', async ({ page }) => {
    // ── 1. Client-Side Format Validation ──────────────────────────────────────
    await page.goto('http://localhost:3000/login')
    await page.click('button:has-text("Register")')

    // Try submitting with invalid inputs
    await page.fill('input#fullName', testName)
    await page.fill('input#email', testEmail)
    await page.fill('input#phone', '98765') // Invalid 5-digit number
    await page.fill('input#password', testPassword)
    await page.click('button[type="submit"]')

    const errorMsg = page.locator('[data-testid="auth-error-message"]')
    await expect(errorMsg).toBeVisible()
    await expect(errorMsg).toContainText('Please enter a valid 10-digit mobile number')

    // ── 2. Server-Side Format Validation ──────────────────────────────────────
    const invalidSignupRes = await page.request.post('http://localhost:3000/api/auth/candidate/signup', {
      data: {
        phone: '+91987',
        email: testEmail,
        password: testPassword,
        name: testName,
      }
    })
    expect(invalidSignupRes.status()).toBe(400)

    // ── 3. Valid Signup Flow ──────────────────────────────────────────────────
    await page.fill('input#phone', testPhone)
    await page.click('button[type="submit"]')

    // Candidate should now be redirected to the /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')

    // Sign out to test duplicate detection and login
    await page.click('button:has-text("Sign Out")')
    await page.waitForURL('**/login')

    // ── 4. Duplicate Signup Auto-Tab Switch ──────────────────────────────────
    await page.click('button:has-text("Register")')
    await page.fill('input#fullName', testName)
    await page.fill('input#email', 'another@example.com')
    await page.fill('input#phone', testPhone)
    await page.fill('input#password', testPassword)
    await page.click('button[type="submit"]')

    // It should switch to Sign In mode automatically, prefill phone, and show msg
    const infoMsg = page.locator('[data-testid="auth-info-message"]')
    await expect(infoMsg).toBeVisible()
    await expect(infoMsg).toContainText('already registered. Please log in instead')

    // Tab active should be "Sign In"
    const signInTab = page.locator('button', { hasText: /^Sign In$/ })
    await expect(signInTab).toHaveClass(/bg-\(--color-amber-400\)/)

    // Prefilled phone number should be correct
    const phoneInputVal = await page.inputValue('input#phone')
    expect(phoneInputVal).toBe(testPhone)

    // ── 5. Brute-Force Rate Limiting (Lockout) ────────────────────────────────
    // Submit 5 incorrect password attempts
    for (let i = 1; i <= 5; i++) {
      await page.fill('input#password', `wrongpass${i}`)
      await page.click('button[type="submit"]')
      await expect(errorMsg).toBeVisible()
      await expect(errorMsg).toContainText('Invalid phone number or password')
    }

    // 6th attempt (even with correct password) must trigger 429 lockout
    await page.fill('input#password', testPassword) // correct password
    await page.click('button[type="submit"]')

    await expect(errorMsg).toBeVisible()
    await expect(errorMsg).toContainText('Too many failed login attempts')

    // Verify 429 status code from API directly
    const apiLockoutRes = await page.request.post('http://localhost:3000/api/auth/candidate/login', {
      data: {
        phone: testPhone,
        password: testPassword,
      }
    })
    expect(apiLockoutRes.status()).toBe(429)
  })
})
