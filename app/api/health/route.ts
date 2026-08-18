/**
 * GET /api/health
 *
 * TASK 2 + TASK 7 — Health probe updated to include Redis and Resend checks.
 *
 * Probes:
 *   - Neon Postgres (live query)
 *   - Cloudflare R2 (credentials presence + live HEAD)
 *   - Resend (non-destructive API call)
 *   - Upstash Redis (live PING via verifyRateLimitStore)
 *   - Turnstile (key presence)
 *
 * Returns real latency for each probe, not just a boolean.
 * Returns 200 only when ALL production-required probes pass.
 *
 * NOTE: This route intentionally uses the Node.js runtime (not 'edge') because
 * @upstash/redis requires Node.js APIs. The health endpoint is not on any hot
 * path — the minor cold-start difference versus edge is irrelevant here.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { verifyRateLimitStore } from '@/lib/security/ratelimit'

export async function GET() {
  const results: Record<string, unknown> = {
    ok: false,
    timestamp: new Date().toISOString(),
    build_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  }

  // ── Neon Postgres ────────────────────────────────────────────────────────────
  const dbStart = Date.now()
  try {
    if (!process.env.NEON_DATABASE_URL) {
      results['db'] = { ok: false, error: 'NEON_DATABASE_URL not set', latencyMs: 0 }
    } else {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(process.env.NEON_DATABASE_URL)
      const rows = await sql`SELECT version() AS v`
      results['db'] = {
        ok: true,
        latencyMs: Date.now() - dbStart,
        version: (rows[0] as { v: string } | undefined)?.v?.split(' ').slice(0, 2).join(' ') ?? 'unknown',
      }
    }
  } catch (err) {
    results['db'] = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Cloudflare R2 ────────────────────────────────────────────────────────────
  const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ENDPOINT']
  const missingR2 = r2Vars.filter((v) => !process.env[v])
  const r2Start = Date.now()
  if (missingR2.length > 0) {
    results['r2'] = { ok: false, latencyMs: 0, error: `Missing: ${missingR2.join(', ')}` }
  } else {
    // Live HEAD probe: list bucket root (no object created, no side effects)
    try {
      const endpoint = process.env.R2_ENDPOINT!
      const bucket = process.env.R2_BUCKET_NAME!
      // Use pre-signed auth via AWS SDK for a HEAD request to confirm credentials
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      })
      await s3.send(new HeadBucketCommand({ Bucket: bucket }))
      results['r2'] = { ok: true, latencyMs: Date.now() - r2Start }
    } catch (err) {
      results['r2'] = {
        ok: false,
        latencyMs: Date.now() - r2Start,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ── Resend ───────────────────────────────────────────────────────────────────
  const resendStart = Date.now()
  if (!process.env.RESEND_API_KEY) {
    results['resend'] = { ok: false, latencyMs: 0, error: 'RESEND_API_KEY not set' }
  } else {
    try {
      // Non-destructive: list domains (GET /domains) to verify the API key is valid
      const resendRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
      if (resendRes.ok) {
        results['resend'] = { ok: true, latencyMs: Date.now() - resendStart }
      } else {
        results['resend'] = {
          ok: false,
          latencyMs: Date.now() - resendStart,
          error: `HTTP ${resendRes.status}`,
        }
      }
    } catch (err) {
      results['resend'] = {
        ok: false,
        latencyMs: Date.now() - resendStart,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ── Upstash Redis (rate-limit store) ─────────────────────────────────────────
  try {
    const redisProbe = await verifyRateLimitStore()
    results['redis'] = redisProbe
  } catch (err) {
    results['redis'] = {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Turnstile ────────────────────────────────────────────────────────────────
  results['turnstile'] = {
    ok: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.TURNSTILE_SECRET_KEY,
    site_key_set: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secret_set: !!process.env.TURNSTILE_SECRET_KEY,
  }

  // ── Overall status ───────────────────────────────────────────────────────────
  const dbOk = Boolean((results['db'] as { ok?: boolean })?.ok)
  const r2Ok = Boolean((results['r2'] as { ok?: boolean })?.ok)
  const resendOk = Boolean((results['resend'] as { ok?: boolean })?.ok)
  const redisOk = Boolean((results['redis'] as { ok?: boolean })?.ok)
  const turnstileOk = Boolean((results['turnstile'] as { ok?: boolean })?.ok)
  const isProd = process.env.NODE_ENV === 'production'

  const allOk = isProd
    ? dbOk && r2Ok && resendOk && redisOk && turnstileOk
    : dbOk

  results['ok'] = allOk
  results['mode'] = isProd ? 'production' : 'development'

  return Response.json(results, { status: allOk ? 200 : 503 })
}
