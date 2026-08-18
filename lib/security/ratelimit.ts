/**
 * lib/security/ratelimit.ts
 *
 * TASK 2 — Distributed Rate Limiting
 *
 * Provides a Redis-backed rate limiter using @upstash/ratelimit + @upstash/redis.
 * Under Vercel's multi-instance serverless model, in-memory Maps are per-instance
 * and become no-ops under real concurrent load. This module is the single source
 * of truth for all rate-limiting in the application.
 *
 * In production (NODE_ENV=production), UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN MUST be set — if they are missing, this module throws
 * at import time and the server refuses to start. A rate limiter that can
 * silently stop working is worse than none.
 *
 * In non-production environments (dev, test), the Upstash SDK's ephemeralCache
 * option provides a single-process in-memory fallback — correct for test
 * isolation, expected not to work across instances.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Redis singleton ────────────────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      // Hard fail in production — a silent no-op limiter is a security hole.
      throw new Error(
        '[ratelimit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production. ' +
          'The server will not start without a working distributed rate-limit store.',
      )
    }
    // In development/test: warn loudly, return a no-op stub that lets all requests through.
    // Tests that need real limit behaviour should set the env vars or mock this module.
    console.warn('[ratelimit] WARNING: UPSTASH_REDIS_REST_URL not set — rate limiting is disabled (dev/test only).')
    // Return a fake Redis that makes Upstash SDK use ephemeral (in-process) cache
    return new Redis({ url: 'https://fake.upstash.io', token: 'fake' })
  }

  _redis = new Redis({ url, token })
  return _redis
}

// ── Limiter factory ───────────────────────────────────────────────────────────

let _exportLimiter: Ratelimit | null = null
let _loginLimiter: Ratelimit | null = null

/**
 * Export rate limiter: 10 exports per user per hour (§20.2.4).
 * Keyed by userId.
 */
export function getExportRateLimiter(): Ratelimit {
  if (_exportLimiter) return _exportLimiter
  _exportLimiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'akshara:rl:export',
    analytics: false,
    ...(process.env.NODE_ENV !== 'production'
      ? { ephemeralCache: new Map() }
      : {}),
  })
  return _exportLimiter
}

/**
 * Login rate limiter: 5 attempts per IP per 15 minutes.
 * Keyed by IP address.
 */
export function getLoginRateLimiter(): Ratelimit {
  if (_loginLimiter) return _loginLimiter
  _loginLimiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'akshara:rl:login',
    analytics: false,
    ...(process.env.NODE_ENV !== 'production'
      ? { ephemeralCache: new Map() }
      : {}),
  })
  return _loginLimiter
}

// ── Health probe ──────────────────────────────────────────────────────────────

/**
 * verifyRateLimitStore() — ping Redis and return latency.
 * Wire this into /api/health so the health check proves the Redis
 * round-trip works, not just that env vars are present.
 */
export async function verifyRateLimitStore(): Promise<{
  ok: boolean
  latencyMs: number
  error?: string
}> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return { ok: false, latencyMs: 0, error: 'UPSTASH_REDIS_REST_URL / _TOKEN not set' }
  }

  const start = Date.now()
  try {
    const redis = getRedis()
    await redis.ping()
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
