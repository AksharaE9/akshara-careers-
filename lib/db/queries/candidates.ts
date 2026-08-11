/**
 * lib/db/queries/candidates.ts
 *
 * Candidate operations, phone_e164 identity resolution, active application checks,
 * and 30-day reapply cooldown enforcement.
 */

import { getDb } from '../client'
import { candidates, applications, applicationStageEvents } from '../schema'
import { eq, or, sql, desc } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'
import crypto from 'crypto'

export type CandidateInsert = typeof candidates.$inferInsert

/**
 * Searches for an existing candidate by phone_e164 (primary identity) OR normalised email.
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
        eq(candidates.phoneE164, phoneE164),
        eq(candidates.emailNormalised, emailNormalised)
      )
    )
    .limit(1)
  return results[0] ?? null
}

/**
 * Upserts candidate by phone_e164 / email without creating duplicate candidates.
 */
export async function upsertCandidate(data: Omit<CandidateInsert, 'passwordHash'> & { passwordHash?: string }) {
  const db = getDb()

  // First look up by phone_e164
  const existing = await db
    .select()
    .from(candidates)
    .where(
      or(
        eq(candidates.phoneE164, data.phoneE164),
        eq(candidates.emailNormalised, data.emailNormalised)
      )
    )
    .limit(1)

  if (existing[0]) {
    const updated = await db
      .update(candidates)
      .set({
        fullName: data.fullName,
        emailNormalised: data.emailNormalised,
        phoneE164: data.phoneE164,
        gender: data.gender ?? existing[0].gender,
        homeCity: data.homeCity ?? existing[0].homeCity,
        homeState: data.homeState ?? existing[0].homeState,
        whatsappOptIn: data.whatsappOptIn,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, existing[0].id))
      .returning()

    return updated[0] ?? null
  }

  // Generate random password hash if candidate registers via public application wizard without a password
  const pwd = data.passwordHash || await hashPassword(crypto.randomBytes(16).toString('hex'))

  const inserted = await db
    .insert(candidates)
    .values({
      ...data,
      passwordHash: pwd,
    })
    .returning()

  return inserted[0] ?? null
}

export interface CooldownCheckResult {
  allowed: boolean
  reason?: 'ACTIVE_APPLICATION_EXISTS' | 'COOLDOWN_ACTIVE'
  message?: string
  activeApplicationId?: string
  reapplyAvailableAt?: Date
  daysRemaining?: number
}

/**
 * Enforces §4:
 * a) At most one active application per candidate.
 * b) 30-day reapply cooldown starting from terminal decision timestamp (updated_at).
 */
export async function checkApplicationEligibility(candidateId: string): Promise<CooldownCheckResult> {
  const db = getDb()
  const TERMINAL_STAGES = ['rejected', 'withdrawn', 'duplicate']
  const COOLDOWN_DAYS = 30

  // Query most recent application for this candidate with row-level locking
  const rows = await db
    .select({
      id: applications.id,
      publicId: applications.publicId,
      stage: applications.stage,
      updatedAt: applications.updatedAt,
      submittedAt: applications.submittedAt,
    })
    .from(applications)
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.updatedAt))
    .limit(1)

  if (!rows[0]) {
    return { allowed: true }
  }

  const latest = rows[0]

  // a) Check if active application exists (not in terminal stages)
  if (!TERMINAL_STAGES.includes(latest.stage)) {
    return {
      allowed: false,
      reason: 'ACTIVE_APPLICATION_EXISTS',
      message: 'You currently have an active application under review. You can apply again once your active application concludes.',
      activeApplicationId: latest.publicId,
    }
  }

  // b) 30-day cooldown starting from decision timestamp (updatedAt)
  const decisionTime = latest.updatedAt ? new Date(latest.updatedAt).getTime() : new Date(latest.submittedAt).getTime()
  const cooldownEndsAt = new Date(decisionTime + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  const now = Date.now()

  if (now < cooldownEndsAt.getTime()) {
    const diffMs = cooldownEndsAt.getTime() - now
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
    const dateFormatted = cooldownEndsAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return {
      allowed: false,
      reason: 'COOLDOWN_ACTIVE',
      message: `You can apply again on ${dateFormatted} (${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining).`,
      reapplyAvailableAt: cooldownEndsAt,
      daysRemaining,
    }
  }

  return { allowed: true }
}
