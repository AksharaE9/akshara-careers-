/**
 * app/api/console/colleges/merge/route.ts
 *
 * D4 College Deduplication & Merge Tool.
 * Requires: admin or super_admin role (merge_colleges capability).
 */

import { NextRequest, NextResponse } from 'next/server'
import { mergeColleges } from '@/lib/db/queries/colleges'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'merge_colleges')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { duplicateId, canonicalId } = await request.json()

    if (!duplicateId || !canonicalId) {
      return NextResponse.json(
        { error: 'duplicateId and canonicalId are required' },
        { status: 400 }
      )
    }

    await mergeColleges(duplicateId, canonicalId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to merge colleges:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to merge colleges' },
      { status: 500 }
    )
  }
}
