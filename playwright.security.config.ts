/**
 * playwright.security.config.ts
 *
 * Playwright config for the security test suite (Part 17).
 * Tests live in tests/security/ and run against the dev server (reuse existing).
 * API-heavy tests so we only need Chromium (no browser UI rendering required).
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/security',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,   // Security tests are sequential to avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report/security', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'security-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reuse the already-running dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
