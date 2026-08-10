/**
 * app/api/track/route.ts
 *
 * First-party cookieless analytics ingestion endpoint (§14.4.3).
 * Accepts batch arrays, max 50 events, strict allowlist, returns 204 immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { analyticsEvents } from '@/lib/db/schema'
import crypto from 'crypto'

const ALLOWED_EVENTS = new Set([
  'page_view',
  'job_list_filtered',
  'job_viewed',
  'apply_cta_clicked',
  'apply_started',
  'apply_step_completed',
  'apply_step_blocked',
  'apply_field_error',
  'apply_field_focus',
  'apply_field_blur',
  'resume_upload_started',
  'resume_upload_succeeded',
  'resume_upload_failed',
  'apply_abandoned',
  'apply_resumed',
  'apply_submitted',
  'apply_submit_failed',
  'talent_pool_submitted',
  'drive_board_row_clicked',
  'status_page_viewed',
  'outbound_click',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawEvents = Array.isArray(body?.events) ? body.events : []

    if (rawEvents.length === 0) {
      return new NextResponse(null, { status: 204 })
    }

    // Limit batch size to 50
    const batch = rawEvents.slice(0, 50)

    // Derive server-side headers
    const ua = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
    const uaHash = crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16)

    // Connection type from Client Hints / ECT
    const ect = request.headers.get('ect') || request.headers.get('sec-ch-ect') || '4g'
    const connectionType = ['slow-2g', '2g', '3g', '4g'].includes(ect.toLowerCase())
      ? ect.toLowerCase()
      : '4g'

    // Simple device parsing
    const isMobile = /mobile|iphone|android|ipad/i.test(ua)
    const deviceType = isMobile ? 'mobile' : 'desktop'

    const rowsToInsert = []

    for (const ev of batch) {
      if (!ev.name || !ALLOWED_EVENTS.has(ev.name) || !ev.sessionId) {
        continue // Ignore unlisted events
      }

      rowsToInsert.push({
        name: ev.name,
        sessionId: ev.sessionId,
        path: ev.path || '/',
        props: ev.props || {},
        jobId: ev.jobId || null,
        driveId: ev.driveId || null,
        deviceType,
        connectionType,
        country: 'IN',
        region: 'Karnataka',
        city: 'Bengaluru',
        referrer: ev.referrer || null,
        utm: ev.utm || {},
        ipHash,
        uaHash,
        ts: ev.ts ? new Date(ev.ts) : new Date(),
      })
    }

    if (rowsToInsert.length > 0) {
      const db = getDb()
      await db.insert(analyticsEvents).values(rowsToInsert)
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    // Return 204 to never break client forms
    return new NextResponse(null, { status: 204 })
  }
}
