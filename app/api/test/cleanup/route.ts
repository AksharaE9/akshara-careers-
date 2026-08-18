/**
 * app/api/test/cleanup/route.ts
 *
 * Test-only endpoint to purge test data from the database.
 * Returns 404 in production to protect data-integrity.
 */

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import {
  applications,
  candidates,
  applicationNotes,
  auditLog,
  securityEvents,
  talentPool,
  candidateLoginAttempts,
  candidateSessions,
  applicationStageEvents,
  analyticsEvents,
  analyticsDaily,
  funnelDaily,
  fieldAnalyticsDaily,
  webVitals,
  emailOutbox,
} from '@/lib/db/schema'

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.PLAYWRIGHT_TEST !== 'true') {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    const db = getDb()

    await db.delete(emailOutbox)
    await db.delete(applicationStageEvents)
    await db.delete(applicationNotes)
    await db.delete(applications)
    await db.delete(candidateSessions)
    await db.delete(candidateLoginAttempts)
    await db.delete(candidates)
    await db.delete(talentPool)
    await db.delete(auditLog)
    await db.delete(securityEvents)
    await db.delete(analyticsEvents)
    await db.delete(analyticsDaily)
    await db.delete(funnelDaily)
    await db.delete(fieldAnalyticsDaily)
    await db.delete(webVitals)

    return NextResponse.json({ success: true, message: 'Test data purged' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Purge failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
