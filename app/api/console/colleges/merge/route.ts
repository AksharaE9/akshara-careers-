/**
 * app/api/console/colleges/merge/route.ts
 *
 * D4 College Deduplication & Merge Tool.
 */

import { NextRequest, NextResponse } from 'next/server'
import { mergeColleges } from '@/lib/db/queries/colleges'

export async function POST(request: NextRequest) {
  try {
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
