/**
 * lib/db/queries/applications.ts
 *
 * High-performance database queries for the Recruiter Pipeline & Application detail view.
 * Optimized for 100,000+ records and 1,000+ concurrent users with indexed pagination and search.
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
  applicationStageEvents,
} from '@/lib/db/schema'
import { eq, and, desc, sql, or, ilike, SQL } from 'drizzle-orm'

export interface ApplicationFilterOptions {
  stage?: string | undefined
  jobId?: string | undefined
  driveId?: string | undefined
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  /**
   * F8: the console pipeline UI wants a page at a time (hence the 200-row
   * cap below), but CSV export wants every row matching the filter. Without
   * this flag, the exports route silently got page 1 of 50 and called it a
   * complete export. Setting this bypasses both the cap and the offset —
   * only use it for genuine full-dataset reads (exports, reports), not
   * anything rendering a paginated UI.
   */
  unpaginated?: boolean | undefined
}

export interface PaginatedApplicationsResult {
  applications: any[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export async function getApplicationsList(filters: ApplicationFilterOptions = {}): Promise<PaginatedApplicationsResult> {
  const db = getDb()

  // F8: export mode gets a much higher ceiling (10,000, not the UI's 200)
  // and always starts at offset 0 — it's reading the whole filtered set in
  // one shot, not paging through it.
  const EXPORT_MAX_ROWS = 10_000
  const limit = filters.unpaginated
    ? EXPORT_MAX_ROWS
    : Math.min(Math.max(Number(filters.limit) || 50, 1), 200)
  const offset = filters.unpaginated ? 0 : Math.max(Number(filters.offset) || 0, 0)
  const page = Math.floor(offset / limit) + 1

  // Dynamic parameterized filter conditions
  const conditions: SQL[] = []

  if (filters.stage && filters.stage !== 'all') {
    conditions.push(eq(applications.stage, filters.stage as any))
  }

  if (filters.jobId) {
    conditions.push(eq(applications.jobId, filters.jobId))
  }

  if (filters.driveId) {
    conditions.push(eq(applications.driveId, filters.driveId))
  }

  if (filters.query && filters.query.trim()) {
    const q = `%${filters.query.trim()}%`
    conditions.push(
      or(
        ilike(candidates.fullName, q),
        ilike(candidates.emailNormalised, q),
        ilike(candidates.phoneE164, q),
        ilike(applications.publicId, q)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Run data query and total count query in parallel
  const [dataRows, countRows] = await Promise.all([
    db
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
      .where(whereClause)
      .orderBy(desc(applications.submittedAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(whereClause),
  ])

  const totalCount = countRows[0]?.count || 0
  const totalPages = Math.ceil(totalCount / limit)
  const hasMore = offset + dataRows.length < totalCount

  return {
    applications: dataRows,
    totalCount,
    page,
    pageSize: limit,
    totalPages,
    hasMore,
  }
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

  // Record stage event in timeline
  try {
    await db.insert(applicationStageEvents).values({
      applicationId,
      stage: newStage,
      note: null,
      occurredAt: new Date(),
    })
  } catch (err) {
    console.error('Failed to insert application stage event:', err)
  }

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
      id: applications.id,
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

  if (!rows[0]) return null

  // Fetch timeline events
  const events = await db
    .select({
      stage: applicationStageEvents.stage,
      occurredAt: applicationStageEvents.occurredAt,
    })
    .from(applicationStageEvents)
    .where(eq(applicationStageEvents.applicationId, rows[0].id))
    .orderBy(desc(applicationStageEvents.occurredAt))

  return {
    ...rows[0],
    events,
  }
}

/**
 * Candidate-scoped query: returns applications for the authenticated candidate only.
 * Enforces §6 (filtered at SQL layer, zero client-side leakage).
 */
export async function getCandidateApplications(candidateId: string) {
  const db = getDb()

  const apps = await db
    .select({
      id: applications.id,
      publicId: applications.publicId,
      stage: applications.stage,
      statusToken: applications.statusToken,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      jobFamily: jobs.family,
      locationCity: jobs.locationCity,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.submittedAt))

  if (apps.length === 0) {
    return []
  }

  // Fetch timeline events for candidate applications
  const appIds = apps.map((a) => a.id)
  const events = await db
    .select({
      applicationId: applicationStageEvents.applicationId,
      stage: applicationStageEvents.stage,
      note: applicationStageEvents.note,
      occurredAt: applicationStageEvents.occurredAt,
    })
    .from(applicationStageEvents)
    .where(sql`${applicationStageEvents.applicationId} IN ${appIds}`)
    .orderBy(desc(applicationStageEvents.occurredAt))

  return apps.map((app) => ({
    ...app,
    timeline: events.filter((e) => e.applicationId === app.id),
  }))
}
