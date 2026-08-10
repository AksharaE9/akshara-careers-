import { chromium } from 'playwright'

const reportsDir = 'C:/Users/jishn/.gemini/antigravity-ide/brain/16f8e5b3-31e0-46db-b908-7e3a64cac70d/reports'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('1. Capturing Password Rotation Screen...')
  await page.goto('http://localhost:3000/console/account/password')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-force-rotate-1440.png` })

  console.log('Logging in as Admin...')
  await page.goto('http://localhost:3000/console/login')
  await page.click('[data-testid="demo-admin-login"]')
  await page.waitForURL('**/console', { timeout: 8000 })
  await page.waitForTimeout(1000)

  console.log('2. Capturing Pulse Dashboard (Desktop)...')
  await page.screenshot({ path: `${reportsDir}/console-pulse-1440.png` })

  console.log('3. Capturing Pulse Dashboard (Mobile)...')
  await page.setViewportSize({ width: 390, height: 900 })
  await page.screenshot({ path: `${reportsDir}/console-pulse-390.png` })
  await page.setViewportSize({ width: 1440, height: 900 })

  console.log('4. Capturing Funnel & Form Analytics...')
  await page.goto('http://localhost:3000/console/insight/funnel')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-funnel-1440.png` })

  console.log('5. Capturing Candidates 360...')
  await page.goto('http://localhost:3000/console/candidates')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-candidates-1440.png` })

  console.log('6. Capturing Jobs Performance Insight...')
  await page.goto('http://localhost:3000/console/insight/jobs')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-insight-jobs-1440.png` })

  console.log('7. Capturing Campus Drives Insight...')
  await page.goto('http://localhost:3000/console/insight/drives')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-insight-drives-1440.png` })

  console.log('8. Capturing Traffic & Attribution...')
  await page.goto('http://localhost:3000/console/insight/traffic')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-traffic-1440.png` })

  console.log('9. Capturing Security & Bot Activity...')
  await page.goto('http://localhost:3000/console/security')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-security-1440.png` })

  console.log('10. Capturing System Health Probes...')
  await page.goto('http://localhost:3000/console/system')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-system-1440.png` })

  console.log('11. Capturing Content Blocks CMS...')
  await page.goto('http://localhost:3000/console/content')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-content-1440.png` })

  console.log('12. Capturing Users Management...')
  await page.goto('http://localhost:3000/console/users')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-users-1440.png` })

  console.log('13. Capturing Audit Log...')
  await page.goto('http://localhost:3000/console/audit')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-audit-1440.png` })

  console.log('14. Capturing Talent Pool...')
  await page.goto('http://localhost:3000/console/talent-pool')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${reportsDir}/console-talent-pool-1440.png` })

  console.log('All Part 14 live screenshots captured successfully!')
  await browser.close()
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
