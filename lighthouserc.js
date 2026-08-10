/**
 * lighthouserc.js
 *
 * Part 16 §16.5.1 — lab performance budgets.
 *
 * Throttled to a Moto G Power on 4G-slow (1.6 Mbps / 400ms RTT / 4× CPU
 * slowdown) — the median device+connection for a commerce student applying
 * from a college corridor, not the laptop-on-fibre connection this runs on.
 *
 * Usage:
 *   npx lhci autorun                                          # localhost
 *   LHCI_TARGET_URL=https://akshara-careers.vercel.app npx lhci autorun
 */

const target = process.env.LHCI_TARGET_URL || 'http://localhost:3000'

module.exports = {
  ci: {
    collect: {
      url: [
        `${target}/careers`,
        `${target}/careers/business-development-executive`,
        `${target}/apply/business-development-executive`,
      ],
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        throttling: {
          // Moto G Power on 4G-slow (§16.5.1)
          rttMs: 400,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 400 * 3.75,
          downloadThroughputKbps: 1600,
          uploadThroughputKbps: 750,
        },
        throttlingMethod: 'simulate',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
      // Server must already be started on `target` (production build —
      // never the dev server) by scripts/qa.sh before this runs.
      startServerCommand: process.env.LHCI_TARGET_URL ? undefined : 'npm start',
      startServerReadyPattern: process.env.LHCI_TARGET_URL ? undefined : 'Ready',
      startServerReadyTimeout: 60000,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.92 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Largest Contentful Paint — §16.8 launch blocker (≤2.0s)
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        // Interaction to Next Paint — Core Web Vital "good" threshold
        'interactive': ['warn', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],

        // Total JS transferred — Document 4 §15.1 budget
        'resource-summary:script:size': ['error', { maxNumericValue: 130 * 1024 }],
        'resource-summary:total:size': ['warn', { maxNumericValue: 500 * 1024 }],

        // Font loading discipline — no invisible-text flash
        'font-display': ['error', {}],
        'unsized-images': ['error', {}],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse',
    },
  },
}
