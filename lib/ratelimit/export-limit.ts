/**
 * lib/ratelimit/export-limit.ts
 *
 * TASK 2 — Distributed Rate Limiting
 *
 * Rate limiter for console data exports: 10 exports per user per hour (§20.2.4).
 *
 * Previously backed by a plain in-memory Map<> — correct for single-process
 * tests, but a no-op under Vercel's multi-instance serverless model where each
 * cold-start has a fresh, empty Map and instances cannot see each other's state.
 *
 * Now delegates to lib/security/ratelimit.ts which uses Upstash Redis
 * (distributed, persistent across instances). The public API surface is
 * unchanged so call sites in app/api/console/{applications,talent-pool}/export/route.ts need no edits.
 */

import { getExportRateLimiter } from '@/lib/security/ratelimit'

export interface ExportRateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // Unix ms
}

/**
 * Check whether userId is allowed to perform an export right now.
 * Returns the same shape as the old Map-backed implementation.
 */
export async function checkExportRateLimit(userId: string): Promise<ExportRateLimitResult> {
  const limiter = getExportRateLimiter()
  const result = await limiter.limit(userId)

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset, // Upstash returns Unix ms
  }
}
