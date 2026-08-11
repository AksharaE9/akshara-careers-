/**
 * app/api/console/qa-fixtures/route.ts
 *
 * Test-only endpoint that returns seeded entity IDs for authz-matrix tests.
 * Returns 404 in production to prevent info disclosure.
 *
 * Required by tests/security/authz-matrix.spec.ts.
 * super_admin only (checked via session cookie).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { users, applications, campusDrives, jobs, candidates, applicationNotes } from '@/lib/db/schema'

import { parseSessionToken } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  // Hard 404 in production — no secrets in prod responses
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  // Check next/headers first, then fallback to request Cookie header
  let user = await getCurrentUser()
  if (!user) {
    const rawCookie = request.headers.get('cookie') || ''
    const match = rawCookie.match(/akshara_console_session=([^;]+)/)
    if (match?.[1]) {
      user = parseSessionToken(match[1])
    }
  }

  if (!user || user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()

  // Fetch seeded entities
  const [allUsers, allApps, allDrives, allJobs, allCandidates] = await Promise.all([
    db.select({ id: users.id, email: users.email, role: users.role, assignedDriveIds: users.assignedDriveIds }).from(users),
    db.select({ id: applications.id, candidateId: applications.candidateId, jobId: applications.jobId, driveId: applications.driveId, statusToken: applications.statusToken, stage: applications.stage }).from(applications).limit(10),
    db.select({ id: campusDrives.id, code: campusDrives.code, title: campusDrives.notes }).from(campusDrives),
    db.select({ id: jobs.id, slug: jobs.slug, title: jobs.title }).from(jobs),
    db.select({ id: candidates.id, email: candidates.emailNormalised }).from(candidates).limit(5),
  ])

  const recruiter1 = allUsers.find(u => u.role === 'recruiter')
  const recruiter2 = allUsers.find(u => u.role === 'recruiter' && u.id !== recruiter1?.id)
  const adminUser = allUsers.find(u => u.role === 'admin')
  const superAdminUser = allUsers.find(u => u.role === 'super_admin')

  // First application that has a drive
  const appWithDrive = allApps.find(a => a.driveId)
  const appWithoutDrive = allApps.find(a => !a.driveId)

  // Fetch a note for IDOR note tests
  const notes = appWithDrive
    ? await db
        .select({ id: applicationNotes.id, applicationId: applicationNotes.applicationId })
        .from(applicationNotes)
        .limit(1)
    : []

  return NextResponse.json({
    users: {
      recruiter1: recruiter1 ?? null,
      recruiter2: recruiter2 ?? null,
      admin: adminUser ?? null,
      superAdmin: superAdminUser ?? null,
    },
    applications: {
      any: allApps[0] ?? null,
      withDrive: appWithDrive ?? null,
      withoutDrive: appWithoutDrive ?? null,
    },
    candidates: {
      any: allCandidates[0] ?? null,
      list: allCandidates,
    },
    drives: allDrives,
    jobs: allJobs,
    notes: notes,
  })
}
