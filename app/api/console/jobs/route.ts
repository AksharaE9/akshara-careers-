import { NextRequest, NextResponse } from 'next/server'
import { listAllJobsAdmin, createJobPosting } from '@/lib/db/queries/jobs'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'view_applications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!can(user, 'manage_jobs')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
