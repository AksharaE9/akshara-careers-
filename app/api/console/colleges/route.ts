/**
 * app/api/console/colleges/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { listAllCollegesAdmin, addCollegeAlias } from '@/lib/db/queries/colleges'

export async function GET() {
  try {
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
