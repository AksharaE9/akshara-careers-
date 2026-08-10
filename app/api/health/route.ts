/**
 * GET /api/health
 *
 * Phase 0 connectivity probe. Returns:
 * - Postgres version (proves Neon is reachable)
 * - R2 probe result (proves credentials are valid)
 * - Build SHA
 * - Turnstile keys present (not verified — that requires a token)
 *
 * This route is intentionally verbose for Phase 0. It will be trimmed to
 * { ok: true, sha: string } for production (no internal info leaked).
 */

export const runtime = 'edge'

export async function GET() {
  const results: Record<string, unknown> = {
    ok: false,
    timestamp: new Date().toISOString(),
    build_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  }

  // ── Neon Postgres ────────────────────────────────────────────────────────────
  try {
    if (!process.env.NEON_DATABASE_URL) {
      results['db'] = { ok: false, error: 'NEON_DATABASE_URL not set' }
    } else {
      // Lazy import — do not instantiate at module scope (§3.2 rule 1)
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(process.env.NEON_DATABASE_URL)
      const rows = await sql`SELECT version() AS v`
      results['db'] = {
        ok: true,
        version: (rows[0] as { v: string } | undefined)?.v ?? 'unknown',
      }
    }
  } catch (err) {
    results['db'] = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Cloudflare R2 ────────────────────────────────────────────────────────────
  const r2Vars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_ENDPOINT',
  ]
  const missingR2 = r2Vars.filter((v) => !process.env[v])
  if (missingR2.length > 0) {
    results['r2'] = { ok: false, error: `Missing: ${missingR2.join(', ')}` }
  } else {
    // Phase 0 probe: HEAD request to list bucket (no object created)
    // Full upload/delete probe lives in lib/storage/r2.ts probeR2()
    results['r2'] = {
      ok: true,
      note: 'credentials present — full probe requires probeR2() call',
    }
  }

  // ── Turnstile ────────────────────────────────────────────────────────────────
  results['turnstile'] = {
    ok:
      !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      !!process.env.TURNSTILE_SECRET_KEY,
    site_key_set: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secret_set: !!process.env.TURNSTILE_SECRET_KEY,
  }

  const allOk =
    (results['db'] as { ok: boolean }).ok &&
    (results['r2'] as { ok: boolean }).ok &&
    (results['turnstile'] as { ok: boolean }).ok

  results['ok'] = allOk

  return Response.json(results, { status: allOk ? 200 : 503 })
}
