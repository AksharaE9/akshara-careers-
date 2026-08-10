/**
 * app/api/vitals/route.ts
 *
 * Real-user Core Web Vitals (RUM) beacon receiver (§14.12 & §14.23).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { webVitals } from '@/lib/db/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metric, value, path } = body

    if (!metric || value === undefined || !path) {
      return new NextResponse(null, { status: 204 })
    }

    const ua = request.headers.get('user-agent') || ''
    const isMobile = /mobile|iphone|android|ipad/i.test(ua)
    const deviceType = isMobile ? 'mobile' : 'desktop'
    const ect = request.headers.get('ect') || '4g'

    const db = getDb()
    await db.insert(webVitals).values({
      metric: String(metric).toUpperCase(),
      value: String(value),
      path: String(path),
      deviceType,
      connectionType: ect,
      ts: new Date(),
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
