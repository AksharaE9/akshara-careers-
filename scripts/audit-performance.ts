/**
 * scripts/audit-performance.ts
 *
 * Production Performance Audit Script.
 * Benchmarks response times, TTFB, payload sizes, and validates sub-3-second load performance.
 */

import http from 'http'
import https from 'https'
import { performance } from 'perf_hooks'

interface BenchmarkResult {
  url: string
  status: number
  ttfbMs: number
  totalMs: number
  sizeBytes: number
  passed: boolean
}

const TARGET_PAGES = [
  { path: '/careers', name: 'Careers Home Board' },
  { path: '/apply/business-development-executive', name: 'Application Wizard Portal' },
  { path: '/login', name: 'Unified Authentication Portal' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/api/lookup/courses?q=bba', name: 'Courses Lookup API (Test Data)' },
  { path: '/api/lookup/colleges?q=bangalore', name: 'Colleges Lookup API (Test Data)' },
]


const PERFORMANCE_THRESHOLD_MS = 3000 // 3 seconds maximum allowed

async function measureRoute(baseUrl: string, path: string): Promise<BenchmarkResult> {
  const url = `${baseUrl}${path}`
  const startTime = performance.now()
  let ttfbTime = 0
  let totalBytes = 0

  return new Promise((resolve) => {
    const isHttps = url.startsWith('https')
    const client = isHttps ? https : http

    const req = client.get(url, { headers: { 'User-Agent': 'Akshara-Performance-Auditor/1.0' } }, (res) => {
      ttfbTime = performance.now() - startTime

      res.on('data', (chunk) => {
        totalBytes += chunk.length
      })

      res.on('end', () => {
        const totalMs = Math.round(performance.now() - startTime)
        const ttfbMs = Math.round(ttfbTime)
        const passed = totalMs < PERFORMANCE_THRESHOLD_MS && (res.statusCode ?? 500) < 400

        resolve({
          url: path,
          status: res.statusCode ?? 0,
          ttfbMs,
          totalMs,
          sizeBytes: totalBytes,
          passed,
        })
      })
    })

    req.on('error', (err) => {
      const totalMs = Math.round(performance.now() - startTime)
      resolve({
        url: path,
        status: 0,
        ttfbMs: totalMs,
        totalMs,
        sizeBytes: 0,
        passed: false,
      })
    })

    req.setTimeout(5000, () => {
      req.destroy()
      resolve({
        url: path,
        status: 408,
        ttfbMs: 5000,
        totalMs: 5000,
        sizeBytes: 0,
        passed: false,
      })
    })
  })
}

async function runAudit() {
  const PORT = process.env.PORT || '3000'
  const BASE_URL = `http://localhost:${PORT}`

  console.log('\n======================================================')
  console.log('  AKSHARA CAREERS — PRODUCTION PERFORMANCE AUDIT')
  console.log('======================================================')
  console.log(`Target: ${BASE_URL}`)
  console.log(`Performance Threshold: < ${PERFORMANCE_THRESHOLD_MS}ms (3.0s)\n`)

  const results: BenchmarkResult[] = []

  for (const target of TARGET_PAGES) {
    process.stdout.write(`Benchmarking ${target.name.padEnd(32)} (${target.path})... `)
    const result = await measureRoute(BASE_URL, target.path)
    results.push(result)
    
    if (result.passed) {
      console.log(`[PASS] ${result.totalMs}ms | TTFB: ${result.ttfbMs}ms | Size: ${(result.sizeBytes / 1024).toFixed(1)} KB`)
    } else {
      console.log(`[FAIL] ${result.totalMs}ms (Status: ${result.status})`)
    }
  }

  console.log('\n------------------------------------------------------')
  console.log('  SUMMARY AUDIT REPORT')
  console.log('------------------------------------------------------')

  let allPassed = true
  let avgLatency = 0

  results.forEach((r) => {
    if (!r.passed) allPassed = false
    avgLatency += r.totalMs
  })

  avgLatency = Math.round(avgLatency / results.length)

  console.log(`Routes Audited:  ${results.length}`)
  console.log(`Average Latency: ${avgLatency}ms`)
  console.log(`Status:          ${allPassed ? 'ALL PASS (LOADS UNDER 3 SECONDS)' : 'SOME ROUTES EXCEEDED THRESHOLD'}`)
  console.log('======================================================\n')

  if (!allPassed) {
    process.exit(1)
  }
}

runAudit()
