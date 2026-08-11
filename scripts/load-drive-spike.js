/**
 * scripts/load-drive-spike.js
 *
 * k6 load test — Campus Drive Spike (§17.5)
 *
 * Four profiles selectable via K6_PROFILE env var:
 *   drive      — realistic drive registration spike: 0→60 VUs over 1 min, hold 5 min
 *   double     — double-drive spike: 0→120 VUs, hold 5 min
 *   soak       — stability soak: 20 VUs for 60 min
 *   breakpoint — stress: ramp to 500 VUs to find the breaking point
 *
 * Run examples:
 *   k6 run scripts/load-drive-spike.js
 *   K6_PROFILE=double k6 run scripts/load-drive-spike.js
 *   K6_PROFILE=soak k6 run scripts/load-drive-spike.js
 *   K6_PROFILE=breakpoint k6 run scripts/load-drive-spike.js --out json=reports/load-breakpoint.json
 *
 * Failure conditions:
 *   - Any db_connection_errors > 0 (Neon connection exhaustion)
 *   - p95 response time > 2000ms (§17.5.3)
 *   - Error rate > 1% on critical endpoints
 *   - /api/health status != 200 during hold phase
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ─── Custom metrics ────────────────────────────────────────────────────────────

const dbConnectionErrors = new Counter('db_connection_errors')
const careersPageDuration = new Trend('careers_page_duration', true)
const applyPageDuration = new Trend('apply_page_duration', true)
const healthCheckDuration = new Trend('health_check_duration', true)
const presignDuration = new Trend('presign_duration', true)
const errorRate = new Rate('error_rate')

// ─── Stage profiles ────────────────────────────────────────────────────────────

const PROFILES = {
  drive: {
    stages: [
      { duration: '1m', target: 60 },    // Ramp up: 0 → 60 VUs
      { duration: '5m', target: 60 },    // Hold: simulate 5-min registration window
      { duration: '30s', target: 0 },    // Ramp down
    ],
  },
  double: {
    stages: [
      { duration: '1m', target: 120 },   // Ramp up: 0 → 120 VUs (two concurrent drives)
      { duration: '5m', target: 120 },   // Hold
      { duration: '30s', target: 0 },
    ],
  },
  soak: {
    stages: [
      { duration: '2m', target: 20 },    // Ramp to steady state
      { duration: '56m', target: 20 },   // Hold for soak duration
      { duration: '2m', target: 0 },
    ],
  },
  breakpoint: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 400 },
      { duration: '2m', target: 500 },
      { duration: '2m', target: 0 },
    ],
  },
  scale1k: {
    stages: [
      { duration: '30s', target: 200 },
      { duration: '1m', target: 500 },
      { duration: '2m', target: 1000 },
      { duration: '1m', target: 1000 },
      { duration: '30s', target: 0 },
    ],
  },
}

const profile = __ENV.K6_PROFILE || 'drive'
const selectedProfile = PROFILES[profile] || PROFILES.drive

export const options = {
  stages: selectedProfile.stages,
  thresholds: {
    // P0: No database connection errors at all
    db_connection_errors: ['count<1'],

    // P95 latency SLOs
    http_req_duration: ['p(95)<2000'],
    careers_page_duration: ['p(95)<1500'],
    health_check_duration: ['p(95)<500'],
    presign_duration: ['p(95)<1000'],

    // Error rate
    error_rate: ['rate<0.01'],                     // < 1% errors overall
    http_req_failed: ['rate<0.01'],

    // Availability during hold phase
    'http_req_duration{endpoint:health}': ['p(99)<1000'],
  },
}

// ─── Scenarios ─────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// DB error signatures — Neon connection exhaustion / edge function errors
const DB_ERROR_PATTERNS = [
  'connection pool',
  'too many connections',
  'connection timeout',
  'NEON_DATABASE_URL',
  'connection exhausted',
  'NeonDbError',
  'connect ETIMEDOUT',
]

function checkForDbError(body) {
  if (!body) return false
  const lower = body.toLowerCase()
  return DB_ERROR_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()))
}

// ─── VU main function ──────────────────────────────────────────────────────────

export default function () {
  // Distribute traffic across representative user flows

  // 40% — Public careers page (highest traffic)
  if (Math.random() < 0.40) {
    group('public_careers_page', () => {
      const res = http.get(`${BASE_URL}/careers`, {
        tags: { endpoint: 'careers' },
      })

      careersPageDuration.add(res.timings.duration)
      const ok = check(res, {
        'careers page 200': (r) => r.status === 200,
        'careers page no db error': (r) => !checkForDbError(r.body),
        'careers page has content': (r) => r.body && r.body.length > 500,
      })
      if (!ok) errorRate.add(1)
      else errorRate.add(0)

      if (checkForDbError(res.body)) dbConnectionErrors.add(1)
    })
    sleep(0.5 + Math.random() * 1.5)
  }

  // 25% — Health check / API availability
  else if (Math.random() < 0.65) {
    group('health_check', () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { endpoint: 'health' },
      })

      healthCheckDuration.add(res.timings.duration)
      const ok = check(res, {
        'health 200': (r) => r.status === 200,
        'health has db': (r) => {
          try {
            const body = JSON.parse(r.body || '{}')
            return body.db !== undefined
          } catch {
            return false
          }
        },
        'health no error': (r) => !checkForDbError(r.body),
      })
      if (!ok) errorRate.add(1)
      else errorRate.add(0)

      if (checkForDbError(res.body)) dbConnectionErrors.add(1)
    })
    sleep(0.2 + Math.random() * 0.5)
  }

  // 20% — Application form page (simulates drive traffic)
  else if (Math.random() < 0.85) {
    group('apply_page', () => {
      const res = http.get(`${BASE_URL}/apply`, {
        tags: { endpoint: 'apply' },
      })

      applyPageDuration.add(res.timings.duration)
      const ok = check(res, {
        'apply page 200 or 302': (r) => r.status === 200 || r.status === 302,
        'apply page no db error': (r) => !checkForDbError(r.body),
      })
      if (!ok) errorRate.add(1)
      else errorRate.add(0)

      if (checkForDbError(res.body)) dbConnectionErrors.add(1)
    })
    sleep(2 + Math.random() * 5)  // Users spend time on form
  }

  // 15% — Presign API (simulates file uploads during submission)
  else {
    group('presign_api', () => {
      const payload = JSON.stringify({
        filename: `resume-${__VU}-${__ITER}.pdf`,
        contentType: 'application/pdf',
        fileSize: Math.floor(100 * 1024 + Math.random() * 4 * 1024 * 1024),
      })

      const res = http.post(`${BASE_URL}/api/applications/presign`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'presign' },
      })

      presignDuration.add(res.timings.duration)
      const ok = check(res, {
        'presign 200': (r) => r.status === 200,
        'presign has key': (r) => {
          try {
            const body = JSON.parse(r.body || '{}')
            return typeof body.key === 'string' && body.key.startsWith('resumes/')
          } catch {
            return false
          }
        },
        'presign no db error': (r) => !checkForDbError(r.body),
      })
      if (!ok) errorRate.add(1)
      else errorRate.add(0)

      if (checkForDbError(res.body)) dbConnectionErrors.add(1)
    })
    sleep(1 + Math.random() * 2)
  }
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🚀 Load profile: ${profile.toUpperCase()}`)
  console.log(`📍 Target: ${BASE_URL}`)
  console.log(`📊 Stages: ${JSON.stringify(selectedProfile.stages)}\n`)

  // Verify baseline before load
  const health = http.get(`${BASE_URL}/api/health`)
  if (health.status !== 200) {
    throw new Error(`Server not ready — health check returned ${health.status}. Aborting load test.`)
  }
  console.log(`✅ Server healthy, starting load test...\n`)
}

export function handleSummary(data) {
  const dbErrors = data.metrics.db_connection_errors?.values?.count || 0
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0
  const errRate = data.metrics.error_rate?.values?.rate || 0

  const status = dbErrors === 0 && p95 < 2000 && errRate < 0.01 ? 'PASS' : 'FAIL'
  
  const summary = {
    profile,
    status,
    timestamp: new Date().toISOString(),
    metrics: {
      db_connection_errors: dbErrors,
      p95_latency_ms: Math.round(p95),
      error_rate_pct: (errRate * 100).toFixed(2),
      total_requests: data.metrics.http_reqs?.values?.count || 0,
      careers_p95_ms: Math.round(data.metrics.careers_page_duration?.values?.['p(95)'] || 0),
      health_p95_ms: Math.round(data.metrics.health_check_duration?.values?.['p(95)'] || 0),
      presign_p95_ms: Math.round(data.metrics.presign_duration?.values?.['p(95)'] || 0),
    },
    thresholds_passed: status === 'PASS',
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`LOAD TEST ${status}: ${profile.toUpperCase()} profile`)
  console.log('═'.repeat(60))
  console.log(JSON.stringify(summary.metrics, null, 2))
  if (status === 'FAIL') {
    if (dbErrors > 0) console.log(`❌ DB CONNECTION ERRORS: ${dbErrors} (Neon pool exhausted?)`)
    if (p95 > 2000) console.log(`❌ P95 LATENCY: ${Math.round(p95)}ms > 2000ms threshold`)
    if (errRate > 0.01) console.log(`❌ ERROR RATE: ${(errRate * 100).toFixed(2)}% > 1% threshold`)
  }

  return {
    [`reports/load-${profile}-${Date.now()}.json`]: JSON.stringify(summary, null, 2),
    stdout: `\nLoad test ${status} — see reports/ for details\n`,
  }
}
