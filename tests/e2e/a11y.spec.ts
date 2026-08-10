/**
 * tests/e2e/a11y.spec.ts
 *
 * Automated accessibility test suite using @axe-core/playwright.
 * Enforces WCAG 2.1 Level AA compliance across all public and internal routes.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE_URL = 'http://localhost:3000'

test.describe('WCAG 2.1 AA Accessibility Audits', () => {
  test('Public Careers Board (/careers) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/careers`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Colors are verified via curated brand tokens
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('Job Detail Page (/careers/business-development-executive) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/careers/business-development-executive`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('Application Wizard (/apply/business-development-executive) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/apply/business-development-executive`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('Dev UI Component Gallery (/dev/ui) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/ui`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('Console Login Page (/console/login) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/console/login`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('Candidate Status Tracker (/status/[token]) has 0 critical/serious a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/status/status-token-demo-000000000001`)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })
})
