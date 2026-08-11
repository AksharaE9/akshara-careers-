/**
 * app/api/console/pulse/route.ts
 *
 * Single-request Pulse dashboard data endpoint (§14.5 & §14.24).
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPulseData } from '@/lib/db/queries/pulse'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await getPulseData(user)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Pulse API error:', err)
    return NextResponse.json({ error: 'Failed to fetch Pulse metrics' }, { status: 500 })
  }
}
