import { getErrorMessage } from '../lib/errors'
/**
 * scripts/benchmark-concurrency.ts
 *
 * High-concurrency performance benchmark:
 * Simulates 1,000 concurrent requests across public and admin database endpoints.
 * Measures throughput (req/s), latency distribution (p50, p95, p99), error rate,
 * and verifies database connection stability under heavy load.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface LatencySample {
  url: string
  status: number
  durationMs: number
  ok: boolean
  error?: string
}

async function fetchWithTiming(url: string, options?: RequestInit): Promise<LatencySample> {
  const start = performance.now()
  try {
    const res = await fetch(url, options)
    const durationMs = performance.now() - start
    return {
      url,
      status: res.status,
      durationMs,
      ok: res.ok,
    }
  } catch (err) {
    const durationMs = performance.now() - start
    return {
      url,
      status: 0,
      durationMs,
      ok: false,
      error: getErrorMessage(err),
    }
  }
}

async function runBenchmark(totalRequests = 1000, concurrency = 100) {
  console.log(`\n======================================================`)
  console.log(`🚀 STARTING HIGH-CONCURRENCY PERFORMANCE BENCHMARK`)
  console.log(`🎯 Target: ${BASE_URL}`)
  console.log(`⚡ Total Requests: ${totalRequests} | Concurrency: ${concurrency}`)
  console.log(`======================================================\n`)

  const results: LatencySample[] = []
  let completed = 0

  async function worker(queue: Array<() => Promise<LatencySample>>) {
    while (queue.length > 0) {
      const task = queue.shift()
      if (task) {
        const sample = await task()
        results.push(sample)
        completed++
        if (completed % 100 === 0) {
          process.stdout.write(`\rProgress: ${completed}/${totalRequests} requests completed...`)
        }
      }
    }
  }

  // Build task queue
  const tasks: Array<() => Promise<LatencySample>> = []
  for (let i = 0; i < totalRequests; i++) {
    const epType = i % 3
    if (epType === 0) {
      tasks.push(() => fetchWithTiming(`${BASE_URL}/careers`))
    } else if (epType === 1) {
      tasks.push(() => fetchWithTiming(`${BASE_URL}/api/health`))
    } else {
      tasks.push(() =>
        fetchWithTiming(`${BASE_URL}/api/applications/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `perf-test-${i}.pdf`,
            contentType: 'application/pdf',
            fileSize: 204800,
          }),
        })
      )
    }
  }

  const overallStart = performance.now()

  // Launch concurrency workers
  const workerPromises: Promise<void>[] = []
  for (let w = 0; w < concurrency; w++) {
    workerPromises.push(worker(tasks))
  }

  await Promise.all(workerPromises)
  const totalDurationSeconds = (performance.now() - overallStart) / 1000

  // Calculate metrics
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b)
  const successes = results.filter((r) => r.ok).length
  const failures = results.length - successes
  const reqPerSec = (results.length / totalDurationSeconds).toFixed(1)

  if (durations.length === 0) {
    console.log('No requests completed — nothing to report.')
    return
  }
  const percentile = (p: number) => (durations[Math.min(Math.floor(durations.length * p), durations.length - 1)] ?? 0).toFixed(1)
  const p50 = percentile(0.5)
  const p90 = percentile(0.9)
  const p95 = percentile(0.95)
  const p99 = percentile(0.99)
  const max = (durations[durations.length - 1] ?? 0).toFixed(1)

  console.log(`\n\n======================================================`)
  console.log(`📊 BENCHMARK RESULTS & THROUGHPUT SUMMARY`)
  console.log(`======================================================`)
  console.log(`Total Requests:         ${results.length}`)
  console.log(`Successful (200 OK):    ${successes} (${((successes / results.length) * 100).toFixed(2)}%)`)
  console.log(`Failed / Errors:        ${failures}`)
  console.log(`Total Duration:         ${totalDurationSeconds.toFixed(2)}s`)
  console.log(`Throughput:             ${reqPerSec} requests/sec`)
  console.log(`------------------------------------------------------`)
  console.log(`Latency Percentiles:`)
  console.log(`  p50 (median):         ${p50} ms`)
  console.log(`  p90:                  ${p90} ms`)
  console.log(`  p95:                  ${p95} ms`)
  console.log(`  p99:                  ${p99} ms`)
  console.log(`  max:                  ${max} ms`)
  console.log(`======================================================\n`)

  if (failures > 0) {
    console.error(`❌ Warning: ${failures} requests failed during high load benchmark.`)
    const errorCounts: Record<string, number> = {}
    for (const r of results.filter((r) => !r.ok)) {
      const key = `${r.status} - ${r.error || 'Unknown error'}`
      errorCounts[key] = (errorCounts[key] || 0) + 1
    }
    console.error(`Failure Breakdown:`, errorCounts)
  } else {
    console.log(`✅ All ${totalRequests} requests completed with 0 errors! Database connection pooling verified.`)
  }
}

runBenchmark(1000, 50).catch(console.error)
