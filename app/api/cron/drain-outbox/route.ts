/**
 * app/api/cron/drain-outbox/route.ts
 *
 * TASK 4 — Cron: Authenticated + Idempotent
 *
 * Called every 60 seconds by Vercel Cron.
 * Protected by the CRON_SECRET bearer token.
 * Idempotent via pg_try_advisory_lock(1001) — if a previous invocation is still
 * running when the next tick fires, the new call returns { skipped: "already running" }
 * rather than contending for the same rows and potentially double-sending emails.
 *
 * Advisory lock key: 1001
 *
 * Manually triggerable:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain/api/cron/drain-outbox
 */

import { NextRequest, NextResponse } from 'next/server'
import { drainOutbox } from '@/lib/email/application-email'
import { neon } from '@neondatabase/serverless'

const ADVISORY_LOCK_KEY = 1001

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[CRON:drain-outbox] CRON_SECRET is not set. Endpoint is unauthenticated.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Idempotency via pg_try_advisory_lock ────────────────────────────────────
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json({ error: 'NEON_DATABASE_URL not set' }, { status: 500 })
  }

  const sql = neon(dbUrl)

  // Try to acquire a session-level advisory lock. Returns true if acquired,
  // false if another invocation already holds it.
  const lockRows = await sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`
  const acquired = (lockRows[0] as { acquired: boolean } | undefined)?.acquired

  if (!acquired) {
    console.log('[CRON:drain-outbox] Lock not acquired — previous invocation still running. Skipping.')
    return NextResponse.json({ skipped: 'already running' }, { status: 200 })
  }

  // ── Drain ───────────────────────────────────────────────────────────────────
  try {
    const result = await drainOutbox()
    console.log('[CRON:drain-outbox] Drain complete:', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[CRON:drain-outbox] drainOutbox threw:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  } finally {
    // Always release the lock, even on error, so the next tick isn't blocked.
    // pg_advisory_unlock returns void from the HTTP driver — fire and forget.
    sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {})
  }
}
