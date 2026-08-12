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
import { eq, and, desc, sql, or, ilike, gte, lt, SQL } from 'drizzle-orm'
import { istDayStart, istDayEndExclusive } from '@/lib/date/ist'

import { ALL_STAGES, ApplicationStage } from '@/lib/console/stages'
export type { ApplicationStage }

export interface ApplicationFilterOptions {
  stage?: string | undefined
  jobId?: string | undefined
  driveId?: string | undefined
  query?: string | undefined
  from?: string | undefined // YYYY-MM-DD in IST
  to?: string | undefined // YYYY-MM-DD in IST
  startDate?: Date | null | undefined
  endDateExclusive?: Date | null | undefined
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

import { broadcastConsoleEvent } from '@/lib/realtime/broadcast'

// Short in-memory stats cache to prevent repeated database aggregation queries
let cachedStats: { data: Record<string, number>; timestamp: number } | null = null
const STATS_CACHE_TTL_MS = 3000

export function invalidateStatsCache() {
  cachedStats = null
}

export async function getApplicationsList(filters: ApplicationFilterOptions = {}) {
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
  const hasCandidateSearch = Boolean(filters.query && filters.query.trim())

  if (filters.stage && filters.stage !== 'all') {
    conditions.push(eq(applications.stage, filters.stage as ApplicationStage))
  }

  if (filters.jobId) {
    conditions.push(eq(applications.jobId, filters.jobId))
  }

  if (filters.driveId) {
    conditions.push(eq(applications.driveId, filters.driveId))
  }

  // IST Date range filtering with half-open interval [startDate, endDateExclusive) (§20.1.2)
  let startDate = filters.startDate
  let endDateExclusive = filters.endDateExclusive

  if (!startDate && filters.from) {
    startDate = istDayStart(filters.from)
  }
  if (!endDateExclusive && filters.to) {
    endDateExclusive = istDayEndExclusive(filters.to)
  }

  if (startDate) {
    conditions.push(gte(applications.submittedAt, startDate))
  }
  if (endDateExclusive) {
    conditions.push(lt(applications.submittedAt, endDateExclusive))
  }

  if (hasCandidateSearch) {
    const q = `%${filters.query!.trim()}%`
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

  // Run data query and total count query in parallel.
  // When no candidate text search is performed, count directly on applications for maximum speed.
  const countQuery = hasCandidateSearch
    ? db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(whereClause)
    : db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(whereClause)

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

    countQuery,
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

export async function getApplicationStats(dateFilter?: {
  from?: string | undefined
  to?: string | undefined
  startDate?: Date | null | undefined
  endDateExclusive?: Date | null | undefined
}) {
  const hasDateFilter = Boolean(
    dateFilter?.from || dateFilter?.to || dateFilter?.startDate || dateFilter?.endDateExclusive
  )

  if (!hasDateFilter && cachedStats && Date.now() - cachedStats.timestamp < STATS_CACHE_TTL_MS) {
    return cachedStats.data
  }

  const db = getDb()
  const conditions: SQL[] = []

  let startDate = dateFilter?.startDate
  let endDateExclusive = dateFilter?.endDateExclusive

  if (!startDate && dateFilter?.from) {
    startDate = istDayStart(dateFilter.from)
  }
  if (!endDateExclusive && dateFilter?.to) {
    endDateExclusive = istDayEndExclusive(dateFilter.to)
  }

  if (startDate) {
    conditions.push(gte(applications.submittedAt, startDate))
  }
  if (endDateExclusive) {
    conditions.push(lt(applications.submittedAt, endDateExclusive))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const stageCounts = await db
    .select({
      stage: applications.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(applications)
    .where(whereClause)
    .groupBy(applications.stage)

  const statsMap: Record<string, number> = {
    total: 0,
  }
  for (const s of ALL_STAGES) {
    statsMap[s] = 0
  }

  let total = 0
  stageCounts.forEach((sc) => {
    statsMap[sc.stage] = sc.count
    total += sc.count
  })
  statsMap.total = total

  if (!hasDateFilter) {
    cachedStats = { data: statsMap, timestamp: Date.now() }
  }
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
      consentVersion: applications.consentVersion,
      submittedAt: applications.submittedAt,
      // Candidate
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateEmail: candidates.emailNormalised,
      candidatePhone: candidates.phoneE164,
      gender: candidates.gender,
      homeCity: candidates.homeCity,
      homeState: candidates.homeState,
      candidateLanguages: candidates.languages,
      languages: candidates.languages,
      whatsappOptIn: candidates.whatsappOptIn,
      // Job
      jobId: applications.jobId,
      jobTitle: sql<string>`coalesce(${jobs.title}, 'Business Development Executive')`,
      jobSlug: sql<string>`coalesce(${jobs.slug}, 'business-development-executive')`,
      jobFamily: sql<string>`coalesce(${jobs.family}, 'Operations')`,
      // Drive
      driveId: campusDrives.id,
      driveCode: campusDrives.code,
      // College & Course
      collegeId: applications.collegeId,
      collegeName: sql<string>`coalesce(${colleges.name}, ${applications.collegeRaw})`,
      collegeCanonicalName: colleges.name,
      collegeRaw: applications.collegeRaw,
      collegeCity: colleges.city,
      courseId: applications.courseId,
      courseName: sql<string>`coalesce(${courses.name}, ${applications.courseRaw})`,
      courseCanonicalName: courses.name,
      courseRaw: applications.courseRaw,
      courseSpecialisation: courses.specialisation,
      courseLevel: courses.level,
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

  // Fetch application notes
  const notes = await db
    .select({
      id: applicationNotes.id,
      body: applicationNotes.body,
      createdAt: applicationNotes.createdAt,
      authorId: applicationNotes.authorId,
      authorName: sql<string>`coalesce(${users.name}, 'Recruiter')`,
      authorRole: users.role,
    })
    .from(applicationNotes)
    .leftJoin(users, eq(applicationNotes.authorId, users.id))
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

  const isValidStage = (s: string): s is ApplicationStage =>
    (ALL_STAGES as readonly string[]).includes(s)

  if (!isValidStage(newStage)) {
    throw new Error(`Invalid stage: ${newStage}`)
  }

  await db
    .update(applications)
    .set({
      stage: newStage,
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

  // Invalidate in-memory cache and broadcast real-time SSE event to all recruiters
  invalidateStatsCache()
  broadcastConsoleEvent({
    type: 'application:stage_updated',
    data: { id: applicationId, stage: newStage, actorId: actorId ?? null },
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

  // Broadcast real-time note event
  broadcastConsoleEvent({
    type: 'application:note_added',
    data: { id: applicationId, noteId: note.id },
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
