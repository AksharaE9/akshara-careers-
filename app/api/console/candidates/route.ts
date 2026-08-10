/**
 * app/api/console/candidates/route.ts
 *
 * Candidates 360 directory endpoint (§14.8).
 * Groups by unique candidate human (fixes D7).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { candidates, applications, colleges, jobs } from '@/lib/db/schema'
import { desc, sql, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    const candidateRows = await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.emailNormalised,
        phone: candidates.phoneE164,
        languages: candidates.languages,
        homeCity: candidates.homeCity,
        homeState: candidates.homeState,
        createdAt: candidates.createdAt,
        totalApplications: sql<number>`count(${applications.id})::int`,
        latestStage: sql<string>`max(${applications.stage})`,
      })
      .from(candidates)
      .leftJoin(applications, eq(candidates.id, applications.candidateId))
      .groupBy(candidates.id)
      .orderBy(desc(candidates.createdAt))
      .limit(25)

    return NextResponse.json({
      candidates: candidateRows,
      totalCount: candidateRows.length,
    })
  } catch (err: any) {
    console.error('Candidates 360 error:', err)
    return NextResponse.json({ error: 'Failed to query candidates' }, { status: 500 })
  }
}
