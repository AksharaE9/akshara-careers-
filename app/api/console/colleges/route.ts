import { NextRequest, NextResponse } from 'next/server'
import { listAllCollegesAdmin, addCollegeAlias } from '@/lib/db/queries/colleges'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'view_applications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const colleges = await listAllCollegesAdmin()
    return NextResponse.json({ colleges })
  } catch (err: any) {
    console.error('Failed to list colleges:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'merge_colleges')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { collegeId, alias } = await request.json()

    if (!collegeId || !alias) {
      return NextResponse.json(
        { error: 'collegeId and alias are required' },
        { status: 400 }
      )
    }

    const updated = await addCollegeAlias(collegeId, alias)
    return NextResponse.json({ success: true, college: updated })
  } catch (err: any) {
    console.error('Failed to add alias:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to add alias' },
      { status: 500 }
    )
  }
}
