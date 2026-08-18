/**
 * app/api/cron/expire-export-links/route.ts
 *
 * TASK 4 — Cron: Authenticated + Idempotent
 *
 * Runs hourly per vercel.json.
 * Presigned R2 export links are time-limited at the S3 level, but the download
 * URLs stored in the database should also be nullified once they are past their
 * TTL so the console UI shows them as expired rather than presenting a dead link.
 *
 * This route marks any export record whose expires_at has passed as expired
 * in the database. The R2 presigned URL is already invalid by that point; this
 * is a UI hygiene operation only.
 *
 * If the schema does not yet have an exports / export_jobs table, this route
 * is a safe no-op (the query returns 0 rows).
 *
 * Advisory lock key: 1004
 *
 * Manually triggerable:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain/api/cron/expire-export-links
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const ADVISORY_LOCK_KEY = 1004

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[CRON:expire-export-links] CRON_SECRET is not set.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Idempotency ─────────────────────────────────────────────────────────────
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json({ error: 'NEON_DATABASE_URL not set' }, { status: 500 })
  }

  const sql = neon(dbUrl)
  const lockRows = await sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`
  const acquired = (lockRows[0] as { acquired: boolean } | undefined)?.acquired

  if (!acquired) {
    console.log('[CRON:expire-export-links] Lock not acquired — skipping.')
    return NextResponse.json({ skipped: 'already running' }, { status: 200 })
  }

  // ── Expire ─────────────────────────────────────────────────────────────────
  try {
    // Check if the export_jobs table exists before running — safe to skip if not
    const tableCheckRows = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'export_jobs'
      ) AS exists
    `
    const tableExists = (tableCheckRows[0] as { exists: boolean } | undefined)?.exists

    if (!tableExists) {
      return NextResponse.json({
        ok: true,
        expired: 0,
        message: 'export_jobs table not yet migrated — no-op',
      })
    }

    // Nullify download_url and set status='expired' for all past-TTL exports
    const result = await sql`
      UPDATE export_jobs
      SET
        status = 'expired',
        download_url = NULL,
        updated_at = now()
      WHERE
        status = 'ready'
        AND expires_at < now()
    `

    const count = (result as unknown as { rowCount: number }).rowCount ?? 0
    console.log(`[CRON:expire-export-links] Expired ${count} export links`)
    return NextResponse.json({ ok: true, expired: count })
  } catch (err) {
    console.error('[CRON:expire-export-links] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  } finally {
    sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {})
  }
}
