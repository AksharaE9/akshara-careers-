/**
 * lib/db/queries/applications.ts
 *
 * Database queries for the Recruiter Pipeline & Application detail view.
 */

import { getDb } from '@/lib/db/client'
import {
  applications,
  candidates,
  jobs,
  campusDrives,
  colleges,
  courses,
  applicationNotes,
  users,
  auditLog,
} from '@/lib/db/schema'
import { eq, and, desc, sql, or, like } from 'drizzle-orm'

export interface ApplicationFilterOptions {
  stage?: string | undefined
  jobId?: string | undefined
  driveId?: string | undefined
  query?: string | undefined
}

export async function getApplicationsList(filters: ApplicationFilterOptions = {}) {
  const db = getDb()

  const query = db
    .select({
      id: applications.id,
      publicId: applications.publicId,
      statusToken: applications.statusToken,
      stage: applications.stage,
      academicStatus: applications.academicStatus,
      experienceType: applications.experienceType,
      hasTwoWheeler: applications.hasTwoWheeler,
      hasDrivingLicence: applications.hasDrivingLicence,
      source: applications.source,
      submittedAt: applications.submittedAt,
      // Candidate
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateEmail: candidates.emailNormalised,
      candidatePhone: candidates.phoneE164,
      // Job
      jobId: applications.jobId,
      jobTitle: sql<string>`coalesce(${jobs.title}, 'Business Development Executive')`,
      jobSlug: sql<string>`coalesce(${jobs.slug}, 'business-development-executive')`,
      // Drive
      driveId: campusDrives.id,
      driveCode: campusDrives.code,
      // College & Course
      collegeName: sql<string>`coalesce(${colleges.name}, ${applications.collegeRaw})`,
      courseName: sql<string>`coalesce(${courses.name}, ${applications.courseRaw})`,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(campusDrives, eq(applications.driveId, campusDrives.id))
    .leftJoin(colleges, eq(applications.collegeId, colleges.id))
    .leftJoin(courses, eq(applications.courseId, courses.id))
    .orderBy(desc(applications.submittedAt))

  return query
}

export async function getApplicationStats() {
  const db = getDb()

  const stageCounts = await db
    .select({
      stage: applications.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(applications)
    .groupBy(applications.stage)

  const statsMap: Record<string, number> = {
    total: 0,
    received: 0,
    under_review: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    interviewed: 0,
    offered: 0,
    hired: 0,
    rejected: 0,
  }

  let total = 0
  stageCounts.forEach((sc) => {
    statsMap[sc.stage] = sc.count
    total += sc.count
  })
  statsMap.total = total

  return statsMap
}

export async function getApplicationById(id: string) {
  const db = getDb()

  const rows = await db
    .select({
      id: applications.id,
      publicId: applications.publicId,
      statusToken: applications.statusToken,
      stage: applications.stage,
      academicStatus: applications.academicStatus,
      academicNote: applications.academicNote,
      experienceType: applications.experienceType,
      experienceNote: applications.experienceNote,
      hasTwoWheeler: applications.hasTwoWheeler,
      hasDrivingLicence: applications.hasDrivingLicence,
      resumeKey: applications.resumeKey,
      resumeFilename: applications.resumeFilename,
      resumeSizeBytes: applications.resumeSizeBytes,
      resumeMime: applications.resumeMime,
      source: applications.source,
      consentGivenAt: applications.consentGivenAt,
      submittedAt: applications.submittedAt,
      // Candidate
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateEmail: candidates.emailNormalised,
      candidatePhone: candidates.phoneE164,
      candidateLanguages: candidates.languages,
      whatsappOptIn: candidates.whatsappOptIn,
      // Job
      jobId: applications.jobId,
      jobTitle: sql<string>`coalesce(${jobs.title}, 'Business Development Executive')`,
      jobSlug: sql<string>`coalesce(${jobs.slug}, 'business-development-executive')`,
      jobFamily: sql<string>`coalesce(${jobs.family}, 'Sales')`,
      // Drive
      driveId: campusDrives.id,
      driveCode: campusDrives.code,
      driveVenue: campusDrives.venue,
      // College & Course
      collegeId: applications.collegeId,
      collegeRaw: applications.collegeRaw,
      collegeCanonicalName: colleges.name,
      courseId: applications.courseId,
      courseRaw: applications.courseRaw,
      courseCanonicalName: courses.name,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(campusDrives, eq(applications.driveId, campusDrives.id))
    .leftJoin(colleges, eq(applications.collegeId, colleges.id))
    .leftJoin(courses, eq(applications.courseId, courses.id))
    .where(eq(applications.id, id))
    .limit(1)

  if (!rows[0]) return null

  // Fetch interview / recruiter notes
  const notes = await db
    .select({
      id: applicationNotes.id,
      body: applicationNotes.body,
      createdAt: applicationNotes.createdAt,
      authorName: users.name,
      authorEmail: users.email,
      authorRole: users.role,
    })
    .from(applicationNotes)
    .innerJoin(users, eq(applicationNotes.authorId, users.id))
    .where(eq(applicationNotes.applicationId, id))
    .orderBy(desc(applicationNotes.createdAt))

  return {
    ...rows[0],
    notes,
  }
}

export async function updateApplicationStage(
  applicationId: string,
  newStage: string,
  actorId?: string
) {
  const db = getDb()

  const prev = await db
    .select({ stage: applications.stage })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1)

  if (!prev[0]) throw new Error('Application not found')

  const validStages = [
    'received',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'interviewed',
    'offered',
    'hired',
    'rejected',
    'withdrawn',
    'duplicate',
  ] as const

  if (!validStages.includes(newStage as any)) {
    throw new Error(`Invalid stage: ${newStage}`)
  }

  await db
    .update(applications)
    .set({
      stage: newStage as any,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))

  // Record audit log
  await db.insert(auditLog).values({
    actorId: actorId || null,
    action: 'update_stage',
    entityType: 'application',
    entityId: applicationId,
    before: { stage: prev[0].stage },
    after: { stage: newStage },
  })

  return { success: true, oldStage: prev[0].stage, newStage }
}

export async function addApplicationNote(
  applicationId: string,
  authorId: string,
  body: string
) {
  const db = getDb()

  const [note] = await db
    .insert(applicationNotes)
    .values({
      applicationId,
      authorId,
      body: body.trim(),
    })
    .returning()

  if (!note) {
    throw new Error('Failed to create application note')
  }

  // Record audit log
  await db.insert(auditLog).values({
    actorId: authorId,
    action: 'add_note',
    entityType: 'application',
    entityId: applicationId,
    after: { noteId: note.id, bodyLength: body.length },
  })

  return note
}

export async function getApplicationByToken(token: string) {
  const db = getDb()

  const rows = await db
    .select({
      publicId: applications.publicId,
      stage: applications.stage,
      submittedAt: applications.submittedAt,
      jobTitle: jobs.title,
      jobFamily: jobs.family,
      candidateFirstName: sql<string>`split_part(${candidates.fullName}, ' ', 1)`,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .where(eq(applications.statusToken, token))
    .limit(1)

  return rows[0] || null
}
