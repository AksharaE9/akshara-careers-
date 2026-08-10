/**
 * app/api/console/jobs/route.ts
 *
 * Console Jobs management API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listAllJobsAdmin, createJobPosting } from '@/lib/db/queries/jobs'

export async function GET() {
  try {
    const jobs = await listAllJobsAdmin()
    return NextResponse.json({ jobs })
  } catch (err: any) {
    console.error('Failed to list console jobs:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, slug, family, summary, descriptionHtml, locationCity, salaryMin, salaryMax } = body

    if (!title || !slug || !family || !summary) {
      return NextResponse.json(
        { error: 'Title, slug, family, and summary are required' },
        { status: 400 }
      )
    }

    const job = await createJobPosting({
      title,
      slug,
      family,
      summary,
      descriptionHtml: descriptionHtml || `<p>${summary}</p>`,
      locationCity: locationCity || 'Bengaluru',
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      status: 'open',
    })

    return NextResponse.json({ success: true, job })
  } catch (err: any) {
    console.error('Failed to create job:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create job' },
      { status: 500 }
    )
  }
}
