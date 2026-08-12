import { test, expect } from '@playwright/test'

test.describe('Operations Pulse Honesty & Real-Time Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Debug logging listeners
    page.on('console', (msg) => {
      console.log(`[PAGE LOG] ${msg.type().toUpperCase()}: ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      console.error(`[PAGE EXCEPTION]: ${err.message}\n${err.stack}`)
    })
    page.on('response', async (res) => {
      if (res.url().includes('/api/console/pulse')) {
        console.log(`[API RESPONSE] /api/console/pulse status=${res.status()} body=${await res.text().catch(() => '')}`)
      }
      if (res.url().includes('/api/auth/login')) {
        console.log(`[API RESPONSE] /api/auth/login status=${res.status()} body=${await res.text().catch(() => '')}`)
      }
    })

    // 1. Purge the database first
    const cleanupRes = await page.request.post('http://localhost:3000/api/test/cleanup')
    if (!cleanupRes.ok()) {
      console.error(`CLEANUP FAILED: Status=${cleanupRes.status()}, Body=${await cleanupRes.text()}`)
    }
    expect(cleanupRes.ok()).toBe(true)

    // 2. Authenticate session as recruiter
    await page.goto('http://localhost:3000/console/login')
    await page.click('[data-testid="demo-recruiter-login"]')
    await page.waitForURL('**/console')
  })

  test('P1: Empty DB shows no simulated numbers', async ({ page }) => {
    await page.goto('http://localhost:3000/console')
    await page.waitForLoadState('networkidle')

    // KPI tile checks
    const appsValue = page.locator('[data-testid="pulse-tile-applications"] [data-testid="pulse-tile-value"]')
    await expect(appsValue).toHaveText('0')

    const resumeValue = page.locator('[data-testid="pulse-tile-resume"] [data-testid="pulse-tile-value"]')
    await expect(resumeValue).toHaveText('0.0%')

    // Funnel, Visitors, Job Views, Avg Completion should read "Not yet tracked"
    const conversionTile = page.locator('[data-testid="pulse-tile-conversion"]')
    await expect(conversionTile).toContainText('Not yet tracked')

    const visitorsTile = page.locator('[data-testid="pulse-tile-visitors"]')
    await expect(visitorsTile).toContainText('Not yet tracked')

    const viewsTile = page.locator('[data-testid="pulse-tile-views"]')
    await expect(viewsTile).toContainText('Not yet tracked')

    const avgtimeTile = page.locator('[data-testid="pulse-tile-avgtime"]')
    await expect(avgtimeTile).toContainText('Not yet tracked')

    // Channel breakdown should show 0 apps
    const breakdown = page.locator('[data-testid="channel-breakdown"]')
    await expect(breakdown).toContainText('0 apps')
  })

  test('P2: Single seeded record shows correct metrics and sample size guard', async ({ page }) => {
    // Seed 1 application
    const seedRes = await page.request.post('http://localhost:3000/api/test/seed-application', {
      data: {
        fullName: 'Test Candidate',
        email: 'test@akshara.in',
        phone: '+919876543210',
        stage: 'received',
      },
    })
    expect(seedRes.ok()).toBe(true)

    await page.goto('http://localhost:3000/console')
    await page.waitForLoadState('networkidle')

    // KPI values
    const appsValue = page.locator('[data-testid="pulse-tile-applications"] [data-testid="pulse-tile-value"]')
    await expect(appsValue).toHaveText('1')

    const resumeValue = page.locator('[data-testid="pulse-tile-resume"] [data-testid="pulse-tile-value"]')
    await expect(resumeValue).toHaveText('100.0%')

    // Delta checks: sample size is 1 (< 20 threshold), so delta should display "—"
    const appsDelta = page.locator('[data-testid="pulse-tile-applications"] [data-testid="pulse-tile-delta"]')
    await expect(appsDelta).toHaveText('—')

    const resumeDelta = page.locator('[data-testid="pulse-tile-resume"] [data-testid="pulse-tile-delta"]')
    await expect(resumeDelta).toHaveText('—')
  })

  test('P3: Channel distribution matches counts', async ({ page }) => {
    // Seed 3 Campus Drive + 1 Organic applications
    // Campus Drive:
    for (let i = 0; i < 3; i++) {
      const res = await page.request.post('http://localhost:3000/api/test/seed-application', {
        data: {
          fullName: `Campus Student ${i}`,
          email: `campus${i}@akshara.in`,
          phone: `+91900000000${i}`,
          stage: 'received',
          source: 'campus_drive',
        },
      })
      expect(res.ok()).toBe(true)
    }

    // Organic:
    const resOrg = await page.request.post('http://localhost:3000/api/test/seed-application', {
      data: {
        fullName: 'Organic Applicant',
        email: 'organic@akshara.in',
        phone: '+919111111111',
        stage: 'received',
        source: 'organic',
      },
    })
    expect(resOrg.ok()).toBe(true)

    await page.goto('http://localhost:3000/console')
    await page.waitForLoadState('networkidle')

    // Total applications
    const appsValue = page.locator('[data-testid="pulse-tile-applications"] [data-testid="pulse-tile-value"]')
    await expect(appsValue).toHaveText('4')

    // Channel breakdown percentages
    const breakdown = page.locator('[data-testid="channel-breakdown"]')
    await expect(breakdown).toContainText('75.0% · 3 apps')
    await expect(breakdown).toContainText('25.0% · 1 apps')
  })

  test('P4: Loop guard and no history write loops', async ({ page }) => {
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

    await page.goto('http://localhost:3000/console')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Verify replaceState is not called continuously in loops
    expect(replaceCount).toBeLessThanOrEqual(5)
  })
})
