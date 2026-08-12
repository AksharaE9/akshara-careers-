/**
 * app/api/cron/drain-outbox/route.ts
 *
 * Called every 60 seconds by Vercel Cron (or any external scheduler).
 * Protected by the CRON_SECRET bearer token.
 *
 * Manually triggerable:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain/api/cron/drain-outbox
 */

import { NextRequest, NextResponse } from 'next/server'
import { drainOutbox } from '@/lib/email/application-email'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET — reject any call that cannot present it
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[CRON] CRON_SECRET is not set. Drain endpoint is unauthenticated. Set the variable.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await drainOutbox()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[CRON] drain-outbox threw:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
