/**
 * lib/db/queries/jobs.ts
 *
 * Database queries for the jobs table (D10).
 * Handles job postings public boards and details.
 */

import { getDb } from '../client'
import { jobs } from '../schema'
import { eq, and, sql } from 'drizzle-orm'

export interface JobCardResult {
  id: string
  slug: string
  title: string
  family: string
  summary: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'INTERN' | 'CONTRACTOR'
  workMode: 'onsite' | 'hybrid' | 'remote' | 'field'
  locationCity: string
  locationState: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  salaryUnit: string
  salaryIsPublic: boolean
  requiresTwoWheeler: boolean
  requiresDrivingLicence: boolean
  postedAt: Date | null
}

/**
 * Returns all active, open job postings for display on the careers board.
 * Feeds the public /api/jobs endpoint.
 */
export async function getOpenJobs(): Promise<JobCardResult[]> {
  const db = getDb()
  return db
    .select({
      id: jobs.id,
      slug: jobs.slug,
      title: jobs.title,
      family: jobs.family,
      summary: jobs.summary,
      employmentType: jobs.employmentType,
      workMode: jobs.workMode,
      locationCity: jobs.locationCity,
      locationState: jobs.locationState,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      salaryUnit: jobs.salaryUnit,
      salaryIsPublic: jobs.salaryIsPublic,
      requiresTwoWheeler: jobs.requiresTwoWheeler,
      requiresDrivingLicence: jobs.requiresDrivingLicence,
      postedAt: jobs.postedAt,
    })
    .from(jobs)
    .where(eq(jobs.status, 'open'))
    .orderBy(sql`${jobs.postedAt} DESC`)
}

export async function getJobBySlug(slug: string) {
  const db = getDb()
  const results = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.slug, slug), eq(jobs.status, 'open')))
    .limit(1)
  return results[0] ?? null
}

export async function listAllJobsAdmin() {
  const db = getDb()
  return db
    .select()
    .from(jobs)
    .orderBy(sql`${jobs.createdAt} DESC`)
}

export async function updateJobStatus(jobId: string, status: 'draft' | 'open' | 'paused' | 'closed') {
  const db = getDb()
  const [updated] = await db
    .update(jobs)
    .set({
      status,
      postedAt: status === 'open' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning()
  return updated
}

export async function createJobPosting(data: {
  title: string
  slug: string
  family: string
  summary: string
  descriptionHtml: string
  locationCity: string
  locationState?: string | undefined
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'INTERN' | 'CONTRACTOR' | undefined
  workMode?: 'onsite' | 'hybrid' | 'remote' | 'field' | undefined
  salaryMin?: number | undefined
  salaryMax?: number | undefined
  requiresTwoWheeler?: boolean | undefined
  requiresDrivingLicence?: boolean | undefined
  openings?: number | undefined
  status?: 'draft' | 'open' | 'paused' | 'closed' | undefined
}) {
  const db = getDb()
  const [created] = await db
    .insert(jobs)
    .values({
      title: data.title,
      slug: data.slug.toLowerCase().trim(),
      family: data.family,
      summary: data.summary,
      descriptionHtml: data.descriptionHtml,
      locationCity: data.locationCity,
      locationState: data.locationState || 'Karnataka',
      employmentType: data.employmentType || 'FULL_TIME',
      workMode: data.workMode || 'field',
      salaryMin: data.salaryMin || null,
      salaryMax: data.salaryMax || null,
      salaryIsPublic: Boolean(data.salaryMin),
      requiresTwoWheeler: Boolean(data.requiresTwoWheeler),
      requiresDrivingLicence: Boolean(data.requiresDrivingLicence),
      openings: data.openings || 1,
      status: data.status || 'open',
      postedAt: data.status === 'open' ? new Date() : null,
    })
    .returning()
  return created
}

