/**
 * app/api/console/insight/traffic/route.ts
 *
 * Query-backed Traffic, Attribution and Real-User Core Web Vitals endpoint (§14.12).
 * Strictly maps database tables (analyticsDaily, webVitals) without simulated fallbacks.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { analyticsDaily, webVitals } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    // 1. Fetch total summaries from analyticsDaily rollup table
    const [summaryRes] = await db
      .select({
        visitors: sql<number>`coalesce(sum(visitors), 0)::int`,
        sessions: sql<number>`coalesce(sum(sessions), 0)::int`,
        pageViews: sql<number>`coalesce(sum(page_views), 0)::int`,
      })
      .from(analyticsDaily)

    const visitors = summaryRes?.visitors || 0
    const sessions = summaryRes?.sessions || 0
    const pageViews = summaryRes?.pageViews || 0

    // 2. Query top paths from analyticsDaily (dimension = 'path')
    const topPagesData = await db
      .select({
        path: analyticsDaily.dimensionId,
        views: sql<number>`sum(page_views)::int`,
      })
      .from(analyticsDaily)
      .where(sql`dimension = 'path'`)
      .groupBy(analyticsDaily.dimensionId)
      .orderBy(sql`sum(page_views) desc`)
      .limit(5)

    const totalViews = topPagesData.reduce((sum, p) => sum + p.views, 0) || 1
    const topPages = topPagesData.map((p) => ({
      path: p.path,
      views: p.views,
      share: `${((p.views / totalViews) * 100).toFixed(1)}%`,
    }))

    // 3. Query Device distribution from analyticsDaily (dimension = 'device')
    const deviceData = await db
      .select({
        device: analyticsDaily.dimensionId,
        count: sql<number>`sum(sessions)::int`,
      })
      .from(analyticsDaily)
      .where(sql`dimension = 'device'`)
      .groupBy(analyticsDaily.dimensionId)

    const totalDeviceSessions = deviceData.reduce((sum, d) => sum + d.count, 0) || 1
    const devices: Record<string, string> = { mobile: '0.0%', desktop: '0.0%', tablet: '0.0%' }
    deviceData.forEach((d) => {
      if (['mobile', 'desktop', 'tablet'].includes(d.device)) {
        devices[d.device] = `${((d.count / totalDeviceSessions) * 100).toFixed(1)}%`
      }
    })

    // 4. Query Connection distribution from analyticsDaily (dimension = 'connection')
    const connectionData = await db
      .select({
        connection: analyticsDaily.dimensionId,
        count: sql<number>`sum(sessions)::int`,
      })
      .from(analyticsDaily)
      .where(sql`dimension = 'connection'`)
      .groupBy(analyticsDaily.dimensionId)

    const totalConnectionSessions = connectionData.reduce((sum, c) => sum + c.count, 0) || 1
    const connections: Record<string, string> = { fourG: '0.0%', threeG: '0.0%', twoG: '0.0%', wifi: '0.0%' }
    connectionData.forEach((c) => {
      const key = c.connection === '4g' ? 'fourG' : c.connection === '3g' ? 'threeG' : c.connection === '2g' ? 'twoG' : 'wifi'
      connections[key] = `${((c.count / totalConnectionSessions) * 100).toFixed(1)}%`
    })

    // 5. Fetch actual p75 Core Web Vitals from webVitals table using pg percentile_cont
    const vitalsData = await db
      .select({
        metric: webVitals.metric,
        p75: sql<number>`percentile_cont(0.75) within group (order by value::numeric)`,
        count: sql<number>`count(*)::int`,
      })
      .from(webVitals)
      .groupBy(webVitals.metric)

    const vitalsMap = new Map<string, { p75: number; count: number }>()
    vitalsData.forEach((v) => {
      vitalsMap.set(v.metric.toUpperCase(), { p75: Number(v.p75), count: v.count })
    })

    const targetMetrics = [
      { key: 'LCP', label: 'LCP (Largest Contentful Paint)', limit: 2.5, unit: 's' },
      { key: 'INP', label: 'INP (Interaction to Next Paint)', limit: 200, unit: 'ms' },
      { key: 'CLS', label: 'CLS (Cumulative Layout Shift)', limit: 0.1, unit: '' },
      { key: 'TTFB', label: 'TTFB (Time to First Byte)', limit: 800, unit: 'ms' },
    ]

    const webVitalsFormatted = targetMetrics.map((tm) => {
      const stats = vitalsMap.get(tm.key)
      if (!stats || stats.count < 5) {
        return {
          metric: tm.label,
          p75: '—',
          target: tm.key === 'CLS' ? `< ${tm.limit}` : `< ${tm.limit}${tm.unit}`,
          status: 'insufficient',
        }
      }

      const p75Val = stats.p75
      let displayP75 = p75Val.toFixed(tm.key === 'CLS' ? 3 : 2) + tm.unit
      let status = 'good'

      if (p75Val > tm.limit) {
        status = 'poor'
      } else if (p75Val > tm.limit * 0.7) {
        status = 'needs_improvement'
      }

      return {
        metric: tm.label,
        p75: displayP75,
        target: tm.key === 'CLS' ? `< ${tm.limit}` : `< ${tm.limit}${tm.unit}`,
        status,
      }
    })

    return NextResponse.json({
      summary: {
        visitors,
        sessions,
        pageViews,
        bounceRate: sessions > 0 ? '—' : '—', // requires session tracking page count, fallback to empty
        medianSessionDuration: '—',
      },
      topPages,
      devices,
      connections,
      webVitals: webVitalsFormatted,
    })
  } catch (err) {
    console.error('Traffic insight error:', err)
    return NextResponse.json({ error: 'Failed to query traffic analytics' }, { status: 500 })
  }
}
