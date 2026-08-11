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
  // Reuse the already-running dev server.
  // FOOTGUN (hit during the 2026-08-11 verification campaign, F14): if a
  // `npm start` (production) server is left running on :3000 from unrelated
  // manual testing, reuseExistingServer silently attaches to it instead of
  // spawning `npm run dev`. Since `next start` always sets
  // NODE_ENV=production, app/api/console/qa-fixtures/route.ts's "404 in
  // production" guard then fires for real, and 4 of the P0 IDOR tests that
  // depend on that endpoint fail — looking exactly like a security
  // regression when it's actually a stale process. Before running
  // `npm run test:security`, confirm nothing else is already bound to :3000
  // in production mode.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
