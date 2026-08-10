/**
 * app/api/console/drives/route.ts
 *
 * Console Campus Drives API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listAllDrives, createDrive } from '@/lib/db/queries/drives'

export async function GET() {
  try {
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
