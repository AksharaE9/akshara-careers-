/**
 * app/api/console/applications/[id]/notes/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { addApplicationNote } from '@/lib/db/queries/applications'
import { getCurrentUser } from '@/lib/auth/session'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { body } = await request.json()
    const user = await getCurrentUser()

    if (!body || !body.trim()) {
      return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
    }

    const authorId = user?.id || '00000000-0000-0000-0000-000000000099'
    const note = await addApplicationNote(id, authorId, body)

    return NextResponse.json({ success: true, note })
  } catch (err: any) {
    console.error('Failed to add note:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to add note' },
      { status: 500 }
    )
  }
}
