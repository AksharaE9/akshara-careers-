/**
 * app/api/console/applications/[id]/route.ts
 *
 * Single application detail endpoint for console with full RBAC/IDOR scoping.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApplicationById } from '@/lib/db/queries/applications'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const application = await getApplicationById(id)
    if (!application) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // RBAC check with resource context scoping (IDOR prevention)
    const hasAccess = can(user, 'view_applications', {
      driveId: application.driveId,
      jobId: application.jobId,
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ application })
  } catch (err: any) {
    console.error('Failed to fetch application detail:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
