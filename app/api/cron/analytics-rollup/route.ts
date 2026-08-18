/**
 * app/api/cron/analytics-rollup/route.ts
 *
 * TASK 4 — Cron: Authenticated + Idempotent
 *
 * Runs every 15 minutes per vercel.json.
 * Aggregates raw analytics_events into the analytics_daily, funnel_daily, and
 * field_analytics_daily rollup tables for the current day.
 *
 * Idempotent by design: the rollup script deletes today's rows before
 * recomputing, so re-runs produce the same result.
 *
 * Advisory lock key: 1002
 *
 * Manually triggerable:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain/api/cron/analytics-rollup
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getDb } from '@/lib/db/client'
import { analyticsEvents, analyticsDaily, funnelDaily, fieldAnalyticsDaily } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

const ADVISORY_LOCK_KEY = 1002

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[CRON:analytics-rollup] CRON_SECRET is not set.')
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

  const sqlRaw = neon(dbUrl)
  const lockRows = await sqlRaw`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`
  const acquired = (lockRows[0] as { acquired: boolean } | undefined)?.acquired

  if (!acquired) {
    console.log('[CRON:analytics-rollup] Lock not acquired — skipping concurrent invocation.')
    return NextResponse.json({ skipped: 'already running' }, { status: 200 })
  }

  // ── Rollup ──────────────────────────────────────────────────────────────────
  try {
    const db = getDb()
    const todayStr = new Date().toISOString().split('T')[0]

    // Clear today's rollups for idempotency (safe to re-run)
    await db.execute(sql`DELETE FROM ${analyticsDaily} WHERE day = ${todayStr}::date`)
    await db.execute(sql`DELETE FROM ${funnelDaily} WHERE day = ${todayStr}::date`)
    await db.execute(sql`DELETE FROM ${fieldAnalyticsDaily} WHERE day = ${todayStr}::date`)

    // Re-aggregate from raw events for today
    await db.execute(sql`
      INSERT INTO ${analyticsDaily} (day, dimension, "dimensionId", visitors, sessions, "pageViews", "jobViews", "applyClicks", "applyStarts", submissions, "medianCompleteMs")
      SELECT
        ts::date AS day,
        'total' AS dimension,
        'total' AS dimension_id,
        COUNT(DISTINCT (ip_hash || ua_hash))::int AS visitors,
        COUNT(DISTINCT session_id)::int AS sessions,
        COUNT(*) FILTER (WHERE name = 'page_view')::int AS page_views,
        COUNT(*) FILTER (WHERE name = 'job_viewed')::int AS job_views,
        COUNT(*) FILTER (WHERE name = 'apply_cta_clicked')::int AS apply_clicks,
        COUNT(*) FILTER (WHERE name = 'apply_started')::int AS apply_starts,
        COUNT(*) FILTER (WHERE name = 'apply_submitted')::int AS submissions,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (meta->>'completeMs')::int) FILTER (WHERE name = 'apply_submitted' AND meta->>'completeMs' IS NOT NULL)::int AS median_complete_ms
      FROM ${analyticsEvents}
      WHERE ts::date = ${todayStr}::date
      GROUP BY ts::date
    `)

    console.log(`[CRON:analytics-rollup] Rollup complete for ${todayStr}`)
    return NextResponse.json({ ok: true, day: todayStr })
  } catch (err) {
    console.error('[CRON:analytics-rollup] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  } finally {
    sqlRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {})
  }
}
