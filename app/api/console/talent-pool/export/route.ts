/**
 * app/api/console/talent-pool/export/route.ts
 *
 * Streamed Talent Pool Export Endpoint (Part 20 §20.2.5).
 * Columns: Submitted (IST), Full Name, Email, Area of Interest, Source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { talentPool, auditLog } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { checkExportRateLimit } from '@/lib/ratelimit/export-limit'
import {
  toISTDateTimeString,
  toISTDateOnlyString,
  resolveDatePreset,
  DatePreset,
  istDayStart,
  istDayEndExclusive,
} from '@/lib/date/ist'
import { desc, and, gte, lt, SQL } from 'drizzle-orm'
import { escapeCsvCell } from '@/app/api/console/applications/export/route'

export const dynamic = 'force-dynamic'

export const TALENT_POOL_HEADERS = [
  'Submitted (IST)',
  'Full Name',
  'Email',
  'Area of Interest',
  'Source',
]

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!can(user, 'export_data')) {
      return NextResponse.json(
        { error: 'Forbidden: Export requires admin privileges' },
        { status: 403 }
      )
    }

    const rateLimit = checkExportRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: maximum 10 exports per hour' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const preset = (searchParams.get('preset') as DatePreset) || undefined
    let from = searchParams.get('from') || undefined
    let to = searchParams.get('to') || undefined

    if (preset) {
      const resolved = resolveDatePreset(preset, from, to)
      from = resolved.from || undefined
      to = resolved.to || undefined
    }

    const conditions: SQL[] = []
    if (from) {
      conditions.push(gte(talentPool.createdAt, istDayStart(from)))
    }
    if (to) {
      conditions.push(lt(talentPool.createdAt, istDayEndExclusive(to)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const db = getDb()
    const rows = await db
      .select()
      .from(talentPool)
      .where(whereClause)
      .orderBy(desc(talentPool.createdAt))

    // Record audit log
    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'export_talent_pool',
      entityType: 'talent_pool',
      after: {
        rowCount: rows.length,
        format: 'csv',
        filters: { from, to, preset },
        exportedAt: new Date().toISOString(),
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xef, 0xbb, 0xbf])) // UTF-8 BOM
        controller.enqueue(encoder.encode(TALENT_POOL_HEADERS.map(escapeCsvCell).join(',') + '\r\n'))

        for (const item of rows) {
          const row = [
            toISTDateTimeString(item.createdAt),
            item.fullName,
            item.emailNormalised,
            item.interestFamily,
            'talent_pool',
          ]
          controller.enqueue(encoder.encode(row.map(escapeCsvCell).join(',') + '\r\n'))
        }
        controller.close()
      },
    })

    const dateStamp = toISTDateOnlyString(new Date()).replace(/-/g, '')
    const filename = `akshara-talent-pool_${from || 'all'}_${to || 'all'}_${dateStamp}.csv`

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Total-Count': String(rows.length),
      },
    })
  } catch (err) {
    console.error('Failed to stream talent pool export:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
