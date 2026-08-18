/**
 * app/api/console/jobs/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
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

    // ISR cache invalidation: when a job is published or closed, immediately
    // bust /careers (jobs list) and /careers/[slug] (job detail) so candidates
    // see the correct open/closed state without waiting out the revalidate window.
    if (status === 'open' || status === 'closed' || status === 'paused') {
      revalidateTag('jobs', 'max')
      // Also bust the per-slug cache if we can read the slug
      if (job && 'slug' in job && typeof job.slug === 'string') {
        revalidateTag(`job-${job.slug}`, 'max')
      }
    }

    return NextResponse.json({ success: true, job })
  } catch (err) {
    console.error('Failed to update job:', err)
    return NextResponse.json(
      { error: getErrorMessage(err) || 'Failed to update job' },
      { status: 500 }
    )
  }
}
