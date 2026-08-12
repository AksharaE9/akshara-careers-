/**
 * app/api/console/insight/jobs/route.ts
 *
 * Jobs Performance analytics endpoint (§14.9).
 * Query-backed implementation reading from analyticsDaily rollups.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { jobs, applications, analyticsDaily } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    const jobsData = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        family: jobs.family,
        status: jobs.status,
        openings: jobs.openings,
        postedAt: jobs.postedAt,
        applicationsCount: sql<number>`count(${applications.id})::int`,
        views: sql<number>`coalesce((select sum(job_views) from ${analyticsDaily} where dimension = 'job' and dimension_id = ${jobs.id}::text), 0)::int`,
        clicks: sql<number>`coalesce((select sum(apply_clicks) from ${analyticsDaily} where dimension = 'job' and dimension_id = ${jobs.id}::text), 0)::int`,
        starts: sql<number>`coalesce((select sum(apply_starts) from ${analyticsDaily} where dimension = 'job' and dimension_id = ${jobs.id}::text), 0)::int`,
      })
      .from(jobs)
      .leftJoin(applications, eq(jobs.id, applications.jobId))
      .groupBy(jobs.id)

    const formatted = jobsData.map((j) => {
      const views = j.views
      const clicks = j.clicks
      const starts = j.starts
      const submits = j.applicationsCount

      const viewToApply = views > 0 ? ((clicks / views) * 100).toFixed(1) + '%' : '—'
      const startToSubmit = starts > 0 ? ((submits / starts) * 100).toFixed(1) + '%' : '—'

      let badge = 'No Activity'
      let badgeType: 'success' | 'warning' | 'info' = 'info'

      if (views > 0) {
        const viewToApplyNum = (clicks / views) * 100
        if (viewToApplyNum < 15) {
          badge = 'Low Apply Rate (Check CTC / Copy)'
          badgeType = 'warning'
        } else {
          badge = 'Healthy Conversion'
          badgeType = 'success'
        }
      }

      if (starts > 0) {
        const startToSubmitNum = (submits / starts) * 100
        if (startToSubmitNum > 75) {
          badge = 'High Intent Pipeline'
          badgeType = 'info'
        }
      }

      return {
        ...j,
        views,
        clicks,
        starts,
        submits,
        viewToApply,
        startToSubmit,
        medianTime: '—', // Requires funnel daily median completers
        diagnosis: { badge, badgeType },
      }
    })

    return NextResponse.json({ jobs: formatted })
  } catch (err) {
    console.error('Jobs insight error:', err)
    return NextResponse.json({ error: 'Failed to query jobs performance' }, { status: 500 })
  }
}
