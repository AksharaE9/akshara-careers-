import { NextRequest, NextResponse } from 'next/server'
import { getApplicationsList, getApplicationStats } from '@/lib/db/queries/applications'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'view_applications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') || undefined
    const jobId = searchParams.get('jobId') || undefined
    const driveId = searchParams.get('driveId') || undefined
    const query = searchParams.get('q') || undefined
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const offset = searchParams.get('offset')
      ? Number(searchParams.get('offset'))
      : (page - 1) * limit

    const [paginatedResult, stats] = await Promise.all([
      getApplicationsList({ stage, jobId, driveId, query, limit, offset }),
      getApplicationStats(),
    ])

    return NextResponse.json({
      applications: paginatedResult.applications,
      totalCount: paginatedResult.totalCount,
      page: paginatedResult.page,
      pageSize: paginatedResult.pageSize,
      totalPages: paginatedResult.totalPages,
      hasMore: paginatedResult.hasMore,
      stats,
    })
  } catch (err) {
    console.error('Failed to fetch console applications:', err)
    return NextResponse.json(
      { error: getErrorMessage(err) || 'Internal server error' },
      { status: 500 }
    )
  }
}
