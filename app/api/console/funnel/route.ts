/**
 * app/api/console/funnel/route.ts
 *
 * Funnel and Form Analytics query endpoint (§14.6 & §14.24).
 * Query-backed implementation reading from funnelDaily, fieldAnalyticsDaily.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { funnelDaily, fieldAnalyticsDaily, applications } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionFilter = searchParams.get('connection') || 'all'

    const db = getDb()

    // 1. Fetch real application count
    const [appCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
    const realSubmits = appCountRes?.count || 0

    // 2. Query funnel steps from funnelDaily rollup table
    const funnelRows = await db
      .select({
        step: funnelDaily.step,
        entered: sql<number>`sum(entered)::int`,
        completed: sql<number>`sum(completed)::int`,
        medianMs: sql<number>`avg(median_ms)::int`,
      })
      .from(funnelDaily)
      .where(sql`segment = 'connection' and (segment_value = ${connectionFilter} or ${connectionFilter} = 'all')`)
      .groupBy(funnelDaily.step)

    const funnelMap = new Map<string, typeof funnelRows[0]>()
    funnelRows.forEach((r) => {
      funnelMap.set(r.step, r)
    })

    const targetSteps = [
      { key: 'board_view', label: 'Careers Board Views' },
      { key: 'job_view', label: 'Job Detail Viewed' },
      { key: 'apply_click', label: 'Apply CTA Clicked' },
      { key: 'step_1_start', label: 'Step 1 Started (Personal)' },
      { key: 'step_1_done', label: 'Step 1 Completed' },
      { key: 'step_2_done', label: 'Step 2 Completed (Academic)' },
      { key: 'step_3_done', label: 'Step 3 Completed (Resume)' },
      { key: 'submitted', label: 'Application Submitted' },
    ]

    const baseEntered = funnelMap.get('board_view')?.entered || 0

    const funnelSteps = targetSteps.map((ts) => {
      const stats = funnelMap.get(ts.key)
      const count = ts.key === 'submitted' ? Math.max(realSubmits, stats?.completed || 0) : (stats?.completed || 0)
      const pctNum = baseEntered > 0 ? (count / baseEntered) * 100 : 0
      const pct = baseEntered > 0 ? `${pctNum.toFixed(1)}%` : '—'

      const medianSec = stats?.medianMs ? (stats.medianMs / 1000) : 0
      const medianMs = medianSec > 0
        ? medianSec >= 60
          ? `${Math.floor(medianSec / 60)}m ${Math.round(medianSec % 60)}s`
          : `${medianSec.toFixed(1)}s`
        : '—'

      return {
        name: ts.label,
        count,
        pct,
        medianMs,
      }
    })

    // 3. Query Field Drop-offs from fieldAnalyticsDaily
    const fieldRows = await db
      .select({
        field: fieldAnalyticsDaily.field,
        focused: sql<number>`sum(focused)::int`,
        completed: sql<number>`sum(completed)::int`,
        abandoned: sql<number>`sum(abandoned)::int`,
        errored: sql<number>`sum(errored)::int`,
        medianFocusMs: sql<number>`avg(median_focus_ms)::int`,
        topErrorCode: fieldAnalyticsDaily.topErrorCode,
      })
      .from(fieldAnalyticsDaily)
      .groupBy(fieldAnalyticsDaily.field, fieldAnalyticsDaily.topErrorCode)

    const fieldDropoffs = fieldRows.map((fr) => {
      const total = fr.focused || 1
      const abandonRate = `${((fr.abandoned / total) * 100).toFixed(1)}%`
      const errorRate = `${((fr.errored / total) * 100).toFixed(1)}%`
      const medianSec = fr.medianFocusMs ? fr.medianFocusMs / 1000 : 0
      const medianMs = medianSec > 0 ? `${medianSec.toFixed(1)}s` : '—'

      return {
        field: fr.field,
        focused: fr.focused,
        completed: fr.completed,
        abandonRate,
        medianMs,
        errorRate,
        topError: fr.topErrorCode || '—',
      }
    })

    // 4. Query Error Leaderboard
    const errorLeaderboard = fieldRows
      .filter((fr) => fr.errored > 0)
      .map((fr) => ({
        field: fr.field,
        count: fr.errored,
        message: fr.topErrorCode || 'Validation failure',
      }))
      .sort((a, b) => b.count - a.count)

    // 5. Query Resume health
    const resumeStats = fieldRows.find((fr) => fr.field === 'resume_upload')
    const successRate = resumeStats && resumeStats.focused > 0
      ? `${((resumeStats.completed / resumeStats.focused) * 100).toFixed(1)}%`
      : '—'

    const resumeHealth = {
      successRate,
      medianUploadMs: resumeStats?.medianFocusMs || 0,
      totalUploads: resumeStats?.completed || 0,
      failureBreakdown: resumeStats?.errored
        ? [{ reason: resumeStats.topErrorCode || 'Upload error', count: resumeStats.errored }]
        : [],
    }

    return NextResponse.json({
      funnelSteps,
      fieldDropoffs,
      errorLeaderboard,
      resumeHealth,
    })
  } catch (err) {
    console.error('Funnel API error:', err)
    return NextResponse.json({ error: 'Failed to query funnel data' }, { status: 500 })
  }
}
