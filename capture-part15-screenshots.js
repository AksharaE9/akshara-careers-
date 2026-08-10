import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const REPORT_DIR = path.join(process.cwd(), 'reports')
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })

async function run() {
  const browser = await chromium.launch()
  
  // 1. Full-page at 1440px
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000/careers', { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(REPORT_DIR, 'careers-full-1440.png'), fullPage: true })
    console.log('✓ Captured careers-full-1440.png')
    await page.close()
  }

  // 2. Full-page at 768px (tablet)
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } })
    await page.goto('http://localhost:3000/careers', { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(REPORT_DIR, 'careers-full-768.png'), fullPage: true })
    console.log('✓ Captured careers-full-768.png')
    await page.close()
  }

  // 3. Full-page at 390px (mobile)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto('http://localhost:3000/careers', { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(REPORT_DIR, 'careers-full-390.png'), fullPage: true })
    console.log('✓ Captured careers-full-390.png')
    await page.close()
  }

  // 4. Alignment Guide Line Overlay at 1440px
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000/careers', { waitUntil: 'networkidle' })
    
    // Find container left position
    const containerLeft = await page.$eval('[data-container]:not(.max-w-\\[1440px\\])', el => el.getBoundingClientRect().left)

    // Inject red vertical alignment guide line
    await page.evaluate((left) => {
      const line = document.createElement('div')
      line.style.position = 'fixed'
      line.style.top = '0'
      line.style.bottom = '0'
      line.style.left = `${left}px`
      line.style.width = '2px'
      line.style.backgroundColor = '#FF0000'
      line.style.zIndex = '999999'
      line.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.8)'
      document.body.appendChild(line)
    }, containerLeft)

    await page.screenshot({ path: path.join(REPORT_DIR, 'careers-alignment-guide-1440.png'), fullPage: true })
    console.log('✓ Captured careers-alignment-guide-1440.png')
    await page.close()
  }

  // 5. Spacing Box Overlay Screenshot at 1440px
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000/careers', { waitUntil: 'networkidle' })

    await page.addStyleTag({
      content: `* { outline: 1px solid rgba(255, 0, 0, 0.25) !important; }`
    })

    await page.screenshot({ path: path.join(REPORT_DIR, 'careers-spacing-overlay-1440.png'), fullPage: true })
    console.log('✓ Captured careers-spacing-overlay-1440.png')
    await page.close()
  }

  await browser.close()
  console.log('All visual alignment proofs captured successfully!')
}

run().catch(console.error)
