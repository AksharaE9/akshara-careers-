import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — runs against the BUILT production server (next build && next start),
 * never the dev server. Per Part 10 instructions.
 *
 * Targets (6, per Part 16 §16.1): Chromium, Firefox, WebKit, Mobile Chrome
 * (Pixel 7), Mobile Safari (iPhone 13), Tablet (iPad Mini).
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Never trust browser MIME — mirrors the server-side principle
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        // Simulate mid-range Android (§0.2)
      },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
    },
  ],
  // Run against production build, not dev server
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
