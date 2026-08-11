/**
 * app/api/console/jobs/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateJobStatus } from '@/lib/db/queries/jobs'
import { getErrorMessage } from '@/lib/errors'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const job = await updateJobStatus(id, status)
    return NextResponse.json({ success: true, job })
  } catch (err) {
    console.error('Failed to update job:', err)
    return NextResponse.json(
      { error: getErrorMessage(err) || 'Failed to update job' },
      { status: 500 }
    )
  }
}
