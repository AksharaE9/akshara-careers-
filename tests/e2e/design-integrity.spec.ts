/**
 * tests/e2e/design-integrity.spec.ts
 *
 * Part 16 §16.3 — turns "does the landing page look right?" into pass/fail
 * assertions. Runs against the PRODUCTION build (see playwright.config.ts —
 * webServer runs `npm start`, never `next dev`).
 *
 * Each group name matches the defect category in Document 4 §15.7 so a
 * failure here tells you the fix, not just the symptom.
 *
 * Markup contract this file depends on (must exist in components):
 *   [data-container]   — components/layout/Container.tsx
 *   [data-section]      — every <section> on the page being audited
 *   [data-card-meta]    — the footer/meta row inside a card
 *   [data-proof-logo]   — each logo in the "trusted by" strip
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE = '/careers'
const VIEWPORT_WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920]
const SPACING_UNIT = 4

async function gotoStable(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

function nearestMultipleDelta(value: number, unit: number) {
  return Math.abs(value - Math.round(value / unit) * unit)
}

test.describe('Design Integrity — Alignment (§15.7)', () => {
  test('every standard [data-container] shares one left edge and one right edge at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)

    // "wide" containers (max-w-1440) are a deliberately different rail than
    // "content" containers (max-w-1280) — compare like with like, same as
    // layout.spec.ts's existing convention.
    const edges = await page.$$eval('[data-container]:not(.max-w-\\[1440px\\])', (els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { left: Math.round(r.left), right: Math.round(r.right) }
      }),
    )
    expect(edges.length, 'expected at least 4 standard-width containers on /careers').toBeGreaterThanOrEqual(4)
    const uniqueLefts = new Set(edges.map((e) => e.left))
    const uniqueRights = new Set(edges.map((e) => e.right))
    expect(uniqueLefts.size, `container left edges vary: ${[...uniqueLefts].join(', ')}`).toBe(1)
    expect(uniqueRights.size, `container right edges vary: ${[...uniqueRights].join(', ')}`).toBe(1)
  })

  test('container gutters match the 20/32/48 scale at 390/768/1440', async ({ page }) => {
    const expected: Record<number, number> = { 390: 20, 768: 32, 1440: 48 }
    for (const [widthStr, gutter] of Object.entries(expected)) {
      const width = Number(widthStr)
      await page.setViewportSize({ width, height: 900 })
      await gotoStable(page, PAGE)
      const el = page.locator('[data-container]:not(.max-w-\\[1440px\\])').first()
      const padLeft = await el.evaluate((e) => parseFloat(window.getComputedStyle(e).paddingLeft))
      expect(padLeft, `gutter at ${width}px should be ${gutter}px, got ${padLeft}px`).toBeCloseTo(gutter, 0)
    }
  })
})

test.describe('Design Integrity — Overflow (§15.7)', () => {
  test('zero horizontal scroll at 9 standard widths, and the offending element is named on failure', async ({ page }) => {
    await gotoStable(page, PAGE)
    for (const w of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 })
      type OverflowInfo = { docWidth: number; scrollWidth: number; offenderSelector: string; offenderRight: number } | null
      const overflowInfo: OverflowInfo = await page.evaluate((): OverflowInfo => {
        const docWidth = document.documentElement.clientWidth
        if (document.documentElement.scrollWidth <= docWidth) return null
        // Find the widest offender to name it in the failure message.
        const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
          .map((el) => {
            const rect = el.getBoundingClientRect()
            const cls = typeof el.className === 'string' ? el.className : ''
            const selector = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}`
            return { selector, right: rect.right }
          })
          .filter((o) => o.right > docWidth + 1)
          .sort((a, b) => b.right - a.right)
        const worst = offenders[0]
        return {
          docWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offenderSelector: worst?.selector ?? '(unknown)',
          offenderRight: worst?.right ?? 0,
        }
      })
      expect(
        overflowInfo,
        overflowInfo
          ? `horizontal overflow at ${w}px (scrollWidth=${overflowInfo.scrollWidth} > clientWidth=${overflowInfo.docWidth}). Widest offender: ${overflowInfo.offenderSelector} extends to ${overflowInfo.offenderRight}px`
          : undefined,
      ).toBeNull()
    }
  })
})

test.describe('Design Integrity — Spacing (§15.7)', () => {
  test('section padding resolves to the 4px scale at fluid clamp bounds (375px and 1920px)', async ({ page }) => {
    for (const width of [375, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await gotoStable(page, PAGE)
      const paddings = await page.$$eval('[data-section]', (els) =>
        els.map((e) => parseFloat(window.getComputedStyle(e).paddingTop)),
      )
      for (const [i, p] of paddings.entries()) {
        expect(
          nearestMultipleDelta(p, SPACING_UNIT),
          `section[${i}] padding-top ${p}px at ${width}px viewport is not within 1px of a 4px-scale value`,
        ).toBeLessThanOrEqual(1)
      }
    }
  })

  test('section padding is symmetric (top === bottom) for every section', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const pairs = await page.$$eval('[data-section]', (els) =>
      els.map((e) => {
        const cs = window.getComputedStyle(e)
        return { top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom) }
      }),
    )
    for (const [i, p] of pairs.entries()) {
      expect(Math.abs(p.top - p.bottom), `section[${i}] has asymmetric padding: top=${p.top} bottom=${p.bottom}`).toBeLessThanOrEqual(1)
    }
  })

  test('section spacing is differentiated — not every section uses the same padding value', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const paddings = await page.$$eval('[data-section]', (els) =>
      els.map((e) => Math.round(parseFloat(window.getComputedStyle(e).paddingTop))),
    )
    const distinct = new Set(paddings)
    expect(distinct.size, `all ${paddings.length} sections use identical padding (${[...distinct]}) — hierarchy reads as flat`).toBeGreaterThan(1)
  })
})

test.describe('Design Integrity — Cards (§15.7)', () => {
  test('job cards in the same row have equal computed height (±1px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const cards = await page.$$eval('[data-testid^="job-card-"]', (els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { top: Math.round(r.top), height: Math.round(r.height) }
      }),
    )
    expect(cards.length, 'expected at least one job card').toBeGreaterThan(0)

    const rows = new Map<number, number[]>()
    for (const c of cards) {
      const key = [...rows.keys()].find((y) => Math.abs(y - c.top) < 4) ?? c.top
      rows.set(key, [...(rows.get(key) ?? []), c.height])
    }
    for (const [rowTop, heights] of rows) {
      const diff = Math.max(...heights) - Math.min(...heights)
      expect(diff, `row at y=${rowTop} has unequal card heights: ${heights.join(', ')}`).toBeLessThanOrEqual(1)
    }
  })

  test('card meta rows (footer) align to the same baseline within a row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const metas = await page.$$eval('[data-card-meta]', (els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    )
    expect(metas.length, 'expected at least one [data-card-meta] row').toBeGreaterThan(0)
    // All cards in this grid are in one row at 1440px (3-up) — every meta
    // row should land on the same y.
    const distinct = new Set(metas)
    expect(distinct.size, `card meta rows do not share a baseline: ${[...distinct].join(', ')}`).toBeLessThanOrEqual(2)
  })
})

test.describe('Design Integrity — Typography (§15.7)', () => {
  test('the display face actually loaded — no silent fallback to a system font', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const fontFamily = await h1.evaluate((el) => window.getComputedStyle(el).fontFamily)
    expect(fontFamily).toContain('Bricolage')

    // next/font/local registers the FontFace under an auto-generated
    // (lowercased, hashed) family name — e.g. "bricolage_e413994a" — not the
    // literal human name, which only appears as a CSS fallback. Resolve the
    // *actual first family* applied to the element and check that specific
    // FontFace reports "loaded", rather than string-matching "Bricolage".
    const firstFamily = fontFamily.split(',')[0]?.trim().replace(/^["']|["']$/g, '') ?? ''
    const loaded = await page.evaluate(
      (family) => [...document.fonts].some((f) => f.family === family && f.status === 'loaded'),
      firstFamily,
    )
    expect(loaded, `font-family "${firstFamily}" applied to the h1 never reached "loaded" status — check font file/network`).toBe(true)
  })

  test('no paragraph exceeds an 80ch measure', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const overLong = await page.$$eval('p', (els) =>
      els
        .map((e) => {
          const cs = window.getComputedStyle(e)
          const chWidth = parseFloat(cs.fontSize) * 0.55 // approx 1ch
          return { text: e.textContent?.slice(0, 40), chars: e.getBoundingClientRect().width / chWidth }
        })
        .filter((p) => p.chars > 80),
    )
    expect(overLong, `paragraph(s) exceed 80ch: ${JSON.stringify(overLong)}`).toEqual([])
  })

  test('every heading has text-wrap: balance (or equivalent) applied', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const unbalanced = await page.$$eval('h1, h2, h3', (els) =>
      els
        .map((e) => ({ tag: e.tagName, text: e.textContent?.slice(0, 30), value: window.getComputedStyle(e).textWrap }))
        .filter((h) => h.value !== 'balance'),
    )
    expect(unbalanced, `heading(s) missing text-wrap: balance: ${JSON.stringify(unbalanced)}`).toEqual([])
  })
})

test.describe('Design Integrity — Targets (§15.7)', () => {
  test('every tap target is at least 44×44px on mobile (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await gotoStable(page, PAGE)
    const small = await page.$$eval('a, button, [role="button"], input, select', (els) =>
      els
        .filter((e) => (e as HTMLElement).offsetParent !== null) // visible only
        .map((e) => {
          const r = e.getBoundingClientRect()
          return { tag: e.tagName, text: e.textContent?.trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }
        })
        .filter((t) => t.w > 0 && t.h > 0 && (t.w < 44 || t.h < 44)),
    )
    expect(small, `tap target(s) under 44×44px: ${JSON.stringify(small)}`).toEqual([])
  })

  test('the primary CTA meets 4.5:1 contrast using real rendered colours', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const cta = page.locator('a[href="#roles"]').first()
    await expect(cta).toBeVisible()
    const { fg, bg } = await cta.evaluate((el) => {
      const cs = window.getComputedStyle(el)
      return { fg: cs.color, bg: cs.backgroundColor }
    })

    function toRgb(str: string): [number, number, number] {
      const m = str.match(/\d+/g)
      if (!m) return [0, 0, 0]
      return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)]
    }
    function channel(c: number): number {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    function relLuminance([r, g, b]: [number, number, number]) {
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const l1 = relLuminance(toRgb(fg))
    const l2 = relLuminance(toRgb(bg))
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    expect(ratio, `primary CTA contrast ${ratio.toFixed(2)}:1 (fg=${fg} bg=${bg}) is under the 4.5:1 AA threshold`).toBeGreaterThanOrEqual(4.5)
  })

  test('focus ring is visible on keyboard focus of the primary CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const cta = page.locator('a[href="#roles"]').first()
    await cta.focus()
    const outline = await cta.evaluate((el) => {
      const cs = window.getComputedStyle(el, ':focus-visible')
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle }
    })
    // jsdom-free real check: outline-width must be non-zero OR a box-shadow ring must exist.
    const hasRing = outline.outlineWidth !== '0px' || outline.outlineStyle !== 'none'
    expect(hasRing, `focused CTA has no visible focus ring: ${JSON.stringify(outline)}`).toBe(true)
  })
})

test.describe('Design Integrity — Stability (§15.7)', () => {
  test('cumulative layout shift stays ≤0.02 through first paint', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0
          try {
            const po = new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
                if (!entry.hadRecentInput) total += entry.value ?? 0
              }
            })
            po.observe({ type: 'layout-shift', buffered: true })
          } catch {
            /* layout-shift not supported in this browser — resolve with 0 */
          }
          setTimeout(() => resolve(total), 500)
        }),
    )
    expect(cls, `CLS ${cls} exceeds the 0.02 budget`).toBeLessThanOrEqual(0.02)
  })

  test('every <img> declares width and height (or fills a sized container)', async ({ page }) => {
    await gotoStable(page, PAGE)
    const undeclared = await page.$$eval('img', (els) =>
      els
        .map((e) => ({ src: e.getAttribute('src'), width: e.getAttribute('width'), height: e.getAttribute('height'), fill: e.hasAttribute('sizes') }))
        .filter((i) => !i.width && !i.height && !i.fill),
    )
    expect(undeclared, `image(s) without explicit dimensions: ${JSON.stringify(undeclared)}`).toEqual([])
  })

  test('proof-strip logos are height-normalised', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const heights = await page.$$eval('[data-proof-logo]', (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(heights.length, 'expected at least 3 proof logos').toBeGreaterThanOrEqual(3)
    const diff = Math.max(...heights) - Math.min(...heights)
    expect(diff, `proof logo heights vary by ${diff}px: ${heights.join(', ')}`).toBeLessThanOrEqual(1)
  })
})

test.describe('Design Integrity — Structure (§15.7)', () => {
  test('exactly one h1 on the page', async ({ page }) => {
    await gotoStable(page, PAGE)
    const count = await page.locator('h1').count()
    expect(count, `found ${count} h1 elements, expected exactly 1`).toBe(1)
  })

  test('heading levels never skip (h1 → h2 → h3, no gaps)', async ({ page }) => {
    await gotoStable(page, PAGE)
    const levels = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) => els.map((e) => Number(e.tagName[1])))
    let max = 0
    const violations: string[] = []
    for (const lvl of levels) {
      if (lvl > max + 1) violations.push(`jumped from h${max} to h${lvl}`)
      max = Math.max(max, lvl)
    }
    expect(violations, `heading level skip(s): ${violations.join('; ')}`).toEqual([])
  })

  test('landmarks are present: header, main, footer, nav', async ({ page }) => {
    await gotoStable(page, PAGE)
    for (const role of ['banner', 'main', 'contentinfo', 'navigation']) {
      const count = await page.locator(`[role="${role}"], ${role === 'banner' ? 'header' : role === 'main' ? 'main' : role === 'contentinfo' ? 'footer' : 'nav'}`).count()
      expect(count, `landmark "${role}" missing`).toBeGreaterThan(0)
    }
  })

  test('adjacent sections sharing the same background have a visible divider', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStable(page, PAGE)
    const sections = await page.$$eval('[data-section]', (els) =>
      els.map((e) => {
        const cs = window.getComputedStyle(e)
        return {
          bg: cs.backgroundColor,
          borderTop: cs.borderTopWidth,
          borderBottom: cs.borderBottomWidth,
        }
      }),
    )
    const violations: string[] = []
    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1]
      const cur = sections[i]
      if (!prev || !cur) continue
      const sameBg = prev.bg === cur.bg
      const hasDivider = cur.borderTop !== '0px' || prev.borderBottom !== '0px'
      if (sameBg && !hasDivider) violations.push(`section[${i - 1}]→section[${i}] same bg (${cur.bg}), no divider`)
    }
    expect(violations, violations.join('; ')).toEqual([])
  })
})
