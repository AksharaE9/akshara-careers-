/**
 * lib/db/queries/candidates.ts
 *
 * Database queries for candidate operations, including upsertion and D7 deduplication.
 */

import { getDb } from '../client'
import { candidates, applications } from '../schema'
import { eq, and, or, sql, desc } from 'drizzle-orm'

export type CandidateInsert = typeof candidates.$inferInsert

/**
 * Searches for an existing candidate by normalised email OR E.164 phone.
 * D7 candidate deduplication key.
 */
export async function findCandidate(
  emailNormalised: string,
  phoneE164: string
) {
  const db = getDb()
  const results = await db
    .select()
    .from(candidates)
    .where(
      or(
        eq(candidates.emailNormalised, emailNormalised),
        eq(candidates.phoneE164, phoneE164)
      )
    )
    .limit(1)
  return results[0] ?? null
}

/**
 * Inserts or updates candidate information (D7 upsert).
 * Normalised email + phone E.164 are canonical unique identifiers.
 */
export async function upsertCandidate(data: CandidateInsert) {
  const db = getDb()
  const results = await db
    .insert(candidates)
    .values(data)
    .onConflictDoUpdate({
      target: [candidates.emailNormalised], // upsert on unique email
      set: {
        fullName: data.fullName,
        phoneE164: data.phoneE164, // update phone if changed
        gender: data.gender ?? null,
        homeCity: data.homeCity ?? null,
        homeState: data.homeState ?? null,
        languages: data.languages,
        whatsappOptIn: data.whatsappOptIn,
        updatedAt: new Date(),
      },
    })
    .returning()
  
  return results[0] ?? null
}

/**
 * Check if candidate has applied to the same job within 90 days.
 * Returns true if a match is found, matching the D7 duplicate check block.
 */
export async function hasAppliedRecently(
  candidateId: string,
  jobId: string,
  days = 90
): Promise<boolean> {
  const db = getDb()
  const ninetyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const results = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.candidateId, candidateId),
        eq(applications.jobId, jobId),
        sql`${applications.submittedAt} >= ${ninetyDaysAgo}`
      )
    )
    .limit(1)

  return results.length > 0
}
