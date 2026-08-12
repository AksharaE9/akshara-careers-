/**
 * app/api/test/seed-application/route.ts
 *
 * Test-only endpoint to seed a single application into the database (Task 6).
 * Must return 404 when NODE_ENV === 'production' to prevent data-integrity holes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { candidates, applications, jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.PLAYWRIGHT_TEST !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const fullName = body.fullName || 'Test Candidate'
    const email = (body.email || `candidate-${Date.now()}@example.com`).toLowerCase().trim()
    const phone = body.phone || `+9198765${Math.floor(10000 + Math.random() * 90000)}`
    const stage = body.stage || 'received'
    const submittedAt = body.submittedAt ? new Date(body.submittedAt) : new Date()

    const db = getDb()

    // 1. Ensure or find job
    const jobSlug = body.jobSlug || 'business-development-executive'
    let jobList = await db.select().from(jobs).where(eq(jobs.slug, jobSlug)).limit(1)
    let jobId: string

    if (jobList.length === 0) {
      const [newJob] = await db
        .insert(jobs)
        .values({
          slug: jobSlug,
          title: 'Business Development Executive',
          family: 'Sales',
          summary: 'Sales and business development requisition.',
          descriptionHtml: '<p>Job description</p>',
          employmentType: 'FULL_TIME',
          workMode: 'field',
          locationCity: 'Bengaluru',
          locationState: 'Karnataka',
        })
        .returning({ id: jobs.id })
      jobId = newJob!.id
    } else {
      jobId = jobList[0]!.id
    }

    // 2. Ensure candidate
    let candList = await db
      .select()
      .from(candidates)
      .where(eq(candidates.emailNormalised, email))
      .limit(1)

    let candidateId: string
    if (candList.length === 0) {
      const [newCand] = await db
        .insert(candidates)
        .values({
          fullName,
          emailNormalised: email,
          phoneE164: phone,
          passwordHash: 'test-hash',
        })
        .returning({ id: candidates.id })
      candidateId = newCand!.id
    } else {
      candidateId = candList[0]!.id
    }

    // 3. Create application
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase()
    const publicId = body.publicId || `AKS-2608-${randomHex}`
    const statusToken = crypto.randomBytes(16).toString('hex')

    const idempotencyKey = `test-${publicId}-${Date.now()}`

    const [newApp] = await db
      .insert(applications)
      .values({
        publicId,
        statusToken,
        candidateId,
        jobId,
        collegeRaw: body.collegeName || 'GFGC Yelahanka',
        courseRaw: body.courseName || 'B.Com',
        academicStatus: 'graduated',
        experienceType: 'fresher',
        hasDrivingLicence: false,
        hasTwoWheeler: 'no',
        resumeKey: 'test/placeholder.pdf',
        resumeFilename: 'placeholder.pdf',
        resumeSizeBytes: 0,
        resumeMime: 'application/pdf',
        stage,
        submittedAt,
        source: body.source || 'organic',
        consentGivenAt: new Date(),
        consentVersion: 'v1',
        idempotencyKey,
      })
      .returning({
        id: applications.id,
        publicId: applications.publicId,
        statusToken: applications.statusToken,
      })

    return NextResponse.json({
      success: true,
      id: newApp!.id,
      publicId: newApp!.publicId,
      statusToken: newApp!.statusToken,
    })
  } catch (err: any) {
    console.error('Failed to seed test application:', err)
    return NextResponse.json({ error: err.message || 'Seed failed' }, { status: 500 })
  }
}
