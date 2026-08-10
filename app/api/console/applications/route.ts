/**
 * app/api/console/applications/route.ts
 *
 * Recruiter pipeline API: lists applications with filters, stats, and search.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApplicationsList, getApplicationStats } from '@/lib/db/queries/applications'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') || undefined
    const jobId = searchParams.get('jobId') || undefined
    const driveId = searchParams.get('driveId') || undefined
    const query = searchParams.get('q') || undefined

    const [applications, stats] = await Promise.all([
      getApplicationsList({ stage, jobId, driveId, query }),
      getApplicationStats(),
    ])

    return NextResponse.json({
      applications,
      stats,
    })
  } catch (err: any) {
    console.error('Failed to fetch console applications:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
