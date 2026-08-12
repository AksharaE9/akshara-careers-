/**
 * scripts/run-analytics-rollup.ts
 *
 * Daily Rollup Aggregator for Analytics and Funnels (Task 5).
 * Computes visitors, sessions, pageviews, conversion rates, and completion times
 * from raw analytics_events, writing output to rollup tables.
 */

import { getDb } from '../lib/db/client.js'
import { analyticsEvents, analyticsDaily, funnelDaily, fieldAnalyticsDaily } from '../lib/db/schema.js'
import { sql } from 'drizzle-orm'

async function main() {
  const db = getDb()

  console.log('[Rollup] Starting analytics rollup computations...')

  try {
    // 1. Clear today's rollups for idempotency (so we can re-run)
    const todayStr = new Date().toISOString().split('T')[0]
    await db.execute(sql`DELETE FROM ${analyticsDaily} WHERE day = ${todayStr}::date`)
    await db.execute(sql`DELETE FROM ${funnelDaily} WHERE day = ${todayStr}::date`)
    await db.execute(sql`DELETE FROM ${fieldAnalyticsDaily} WHERE day = ${todayStr}::date`)

    console.log(`[Rollup] Cleared rollups for today: ${todayStr}`)

    // 2. Perform analytics_daily 'total' dimension rollup
    await db.execute(sql`
      INSERT INTO ${analyticsDaily} (day, dimension, dimensionId, visitors, sessions, pageViews, jobViews, applyClicks, applyStarts, submissions, medianCompleteMs)
      SELECT
        ts::date as day,
        'total' as dimension,
        'total' as dimension_id,
        count(distinct (ip_hash || ua_hash))::int as visitors,
        count(distinct session_id)::int as sessions,
        count(*) FILTER (WHERE name = 'page_view')::int as page_views,
        count(*) FILTER (WHERE name = 'job_viewed')::int as job_views,
        count(*) FILTER (WHERE name = 'apply_cta_clicked')::int as apply_clicks,
        count(*) FILTER (WHERE name = 'apply_started')::int as apply_starts,
        count(*) FILTER (WHERE name = 'apply_submitted')::int as submissions,
        percentile_cont(0.5) within group (order by duration_ms)::int as median_complete_ms
      FROM ${analyticsEvents}
      LEFT JOIN LATERAL (
        SELECT extract(epoch from (sub.ts - start.ts)) * 1000 as duration_ms
        FROM ${analyticsEvents} start
        JOIN ${analyticsEvents} sub ON start.session_id = sub.session_id
        WHERE start.name = 'apply_started' AND sub.name = 'apply_submitted'
          AND start.session_id = ${analyticsEvents}.session_id
        LIMIT 1
      ) d ON true
      WHERE ts::date = ${todayStr}::date
      GROUP BY ts::date;
    `)

    // 3. Perform analytics_daily 'job' dimension rollup
    await db.execute(sql`
      INSERT INTO ${analyticsDaily} (day, dimension, dimensionId, visitors, sessions, pageViews, jobViews, applyClicks, applyStarts, submissions)
      SELECT
        ts::date as day,
        'job' as dimension,
        job_id::text as dimension_id,
        count(distinct (ip_hash || ua_hash))::int as visitors,
        count(distinct session_id)::int as sessions,
        count(*) FILTER (WHERE name = 'page_view')::int as page_views,
        count(*) FILTER (WHERE name = 'job_viewed')::int as job_views,
        count(*) FILTER (WHERE name = 'apply_cta_clicked')::int as apply_clicks,
        count(*) FILTER (WHERE name = 'apply_started')::int as apply_starts,
        count(*) FILTER (WHERE name = 'apply_submitted')::int as submissions
      FROM ${analyticsEvents}
      WHERE ts::date = ${todayStr}::date AND job_id IS NOT NULL
      GROUP BY ts::date, job_id;
    `)

    // 4. Perform analytics_daily 'source' / 'device' / 'connection' dimension rollup
    await db.execute(sql`
      INSERT INTO ${analyticsDaily} (day, dimension, dimensionId, visitors, sessions, pageViews, jobViews, applyClicks, applyStarts, submissions)
      SELECT
        ts::date as day,
        'connection' as dimension,
        connection_type as dimension_id,
        count(distinct (ip_hash || ua_hash))::int as visitors,
        count(distinct session_id)::int as sessions,
        count(*) FILTER (WHERE name = 'page_view')::int as page_views,
        count(*) FILTER (WHERE name = 'job_viewed')::int as job_views,
        count(*) FILTER (WHERE name = 'apply_cta_clicked')::int as apply_clicks,
        count(*) FILTER (WHERE name = 'apply_started')::int as apply_starts,
        count(*) FILTER (WHERE name = 'apply_submitted')::int as submissions
      FROM ${analyticsEvents}
      WHERE ts::date = ${todayStr}::date AND connection_type IS NOT NULL
      GROUP BY ts::date, connection_type;
    `)

    // 5. Funnel Steps daily rollup (funnel_daily)
    // Steps: board_view, job_view, apply_click, step_1_start, step_1_done, step_2_done, step_3_done, submitted
    const steps = [
      { key: 'board_view', event: 'page_view' },
      { key: 'job_view', event: 'job_viewed' },
      { key: 'apply_click', event: 'apply_cta_clicked' },
      { key: 'step_1_start', event: 'apply_started' },
      { key: 'step_1_done', event: 'apply_step_completed', checkPropStep: 1 },
      { key: 'step_2_done', event: 'apply_step_completed', checkPropStep: 2 },
      { key: 'step_3_done', event: 'resume_upload_succeeded' },
      { key: 'submitted', event: 'apply_submitted' },
    ]

    for (const stepInfo of steps) {
      const propFilter = stepInfo.checkPropStep
        ? sql`AND (props->>'step')::int = ${stepInfo.checkPropStep}`
        : sql``

      await db.execute(sql`
        INSERT INTO ${funnelDaily} (day, step, segment, segmentValue, entered, completed)
        SELECT
          ts::date as day,
          ${stepInfo.key} as step,
          'connection' as segment,
          coalesce(connection_type, 'all') as segment_value,
          count(distinct session_id)::int as entered,
          count(distinct session_id) FILTER (WHERE name = ${stepInfo.event} ${propFilter})::int as completed
        FROM ${analyticsEvents}
        WHERE ts::date = ${todayStr}::date
        GROUP BY ts::date, connection_type;
      `)
    }

    // 6. Field Drop-offs (field_analytics_daily)
    await db.execute(sql`
      INSERT INTO ${fieldAnalyticsDaily} (day, field, focused, completed, abandoned, errored)
      SELECT
        ts::date as day,
        (props->>'field') as field,
        count(*) FILTER (WHERE name = 'apply_field_focus')::int as focused,
        count(*) FILTER (WHERE name = 'apply_field_blur')::int as completed,
        count(*) FILTER (WHERE name = 'apply_abandoned')::int as abandoned,
        count(*) FILTER (WHERE name = 'apply_field_error')::int as errored
      FROM ${analyticsEvents}
      WHERE ts::date = ${todayStr}::date AND (props->>'field') IS NOT NULL
      GROUP BY ts::date, (props->>'field');
    `)

    console.log('[Rollup] Daily analytics rollups computed successfully!')
  } catch (err) {
    console.error('[Rollup] Error running daily rollup:', err)
    process.exit(1)
  }
}

main()
