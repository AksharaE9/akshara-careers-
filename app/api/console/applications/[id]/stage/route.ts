/**
 * app/api/console/applications/[id]/stage/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateApplicationStage } from '@/lib/db/queries/applications'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!can(user, 'change_stage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { stage } = await request.json()

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 })
    }

    const result = await updateApplicationStage(id, stage, user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Failed to update stage:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update stage' },
      { status: 500 }
    )
  }
}
