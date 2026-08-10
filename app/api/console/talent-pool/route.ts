/**
 * app/api/console/talent-pool/route.ts
 *
 * Talent pool candidates endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { talentPool } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const entries = await db.select().from(talentPool).orderBy(desc(talentPool.createdAt)).limit(50)

    return NextResponse.json({ talentPool: entries })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to query talent pool' }, { status: 500 })
  }
}
