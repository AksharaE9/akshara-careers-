import { NextRequest, NextResponse } from 'next/server'
import { listAllDrives, createDrive } from '@/lib/db/queries/drives'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'view_applications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const drives = await listAllDrives()
    return NextResponse.json({ drives })
  } catch (err: any) {
    console.error('Failed to list drives:', err)
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
    if (!can(user, 'manage_drives')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { code, collegeId, driveDate, venue, seats, notes } = body

    if (!code || !collegeId || !driveDate) {
      return NextResponse.json(
        { error: 'Code, college, and drive date are required' },
        { status: 400 }
      )
    }

    const drive = await createDrive({
      code,
      collegeId,
      driveDate,
      venue,
      seats: seats ? Number(seats) : undefined,
      notes,
    })

    return NextResponse.json({ success: true, drive })
  } catch (err: any) {
    console.error('Failed to create drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create drive' },
      { status: 500 }
    )
  }
}
