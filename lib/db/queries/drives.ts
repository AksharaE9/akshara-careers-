/**
 * lib/db/queries/drives.ts
 *
 * Database queries for the campus_drives table (D9 campus drives redirection & analytics).
 */

import { getDb } from '../client'
import { campusDrives, colleges } from '../schema'
import { eq, sql } from 'drizzle-orm'

export interface CampusDriveResult {
  id: string
  code: string
  driveDate: string
  venue: string | null
  status: 'upcoming' | 'live' | 'closed' | 'cancelled'
  viewCount: number
  college: {
    id: string
    name: string
    city: string | null
    state: string
  }
  jobIds: string[]
}

/**
 * Retrieves campus drive details based on its short code.
 * Joins the colleges table to get the canonical college name.
 */
export async function getDriveByCode(code: string): Promise<CampusDriveResult | null> {
  const db = getDb()
  const results = await db
    .select({
      id: campusDrives.id,
      code: campusDrives.code,
      driveDate: campusDrives.driveDate,
      venue: campusDrives.venue,
      status: campusDrives.status,
      viewCount: campusDrives.viewCount,
      jobIds: campusDrives.jobIds,
      college: {
        id: colleges.id,
        name: colleges.name,
        city: colleges.city,
        state: colleges.state,
      },
    })
    .from(campusDrives)
    .innerJoin(colleges, eq(campusDrives.collegeId, colleges.id))
    .where(eq(campusDrives.code, code.trim()))
    .limit(1)

  return results[0] ?? null
}

/**
 * Increments the view count of a campus drive by 1.
 * Feeds conversion analytics (D9 / D11 drive view tracking).
 */
export async function incrementDriveViewCount(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(campusDrives)
    .set({
      viewCount: sql`${campusDrives.viewCount} + 1`,
    })
    .where(eq(campusDrives.id, id))
}

export async function listAllDrives() {
  const db = getDb()
  return db
    .select({
      id: campusDrives.id,
      code: campusDrives.code,
      driveDate: campusDrives.driveDate,
      venue: campusDrives.venue,
      seats: campusDrives.seats,
      status: campusDrives.status,
      viewCount: campusDrives.viewCount,
      notes: campusDrives.notes,
      createdAt: campusDrives.createdAt,
      collegeId: colleges.id,
      collegeName: colleges.name,
      collegeCity: colleges.city,
    })
    .from(campusDrives)
    .innerJoin(colleges, eq(campusDrives.collegeId, colleges.id))
    .orderBy(sql`${campusDrives.driveDate} desc`)
}

export async function createDrive(data: {
  code: string
  collegeId: string
  driveDate: string
  venue?: string | undefined
  seats?: number | undefined
  notes?: string | undefined
}) {
  const db = getDb()
  const [created] = await db
    .insert(campusDrives)
    .values({
      code: data.code.toUpperCase().trim(),
      collegeId: data.collegeId,
      driveDate: data.driveDate,
      venue: data.venue || null,
      seats: data.seats || 50,
      notes: data.notes || null,
    })
    .returning()
  return created
}

