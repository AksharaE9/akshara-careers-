/**
 * lib/auth/candidate-password.ts
 *
 * Password-based candidate authentication.
 * Uses Argon2id via lib/auth/password.ts for hashing.
 * Implements brute-force rate-limiting using candidate_login_attempts.
 */

import { getDb } from '@/lib/db/client'
import { candidates, candidateLoginAttempts } from '@/lib/db/schema'
import { eq, and, gt, desc, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createCandidateSession } from '@/lib/auth/candidate-session'
import crypto from 'crypto'

const LOCKOUT_WINDOW_MINUTES = 15
const MAX_FAILED_ATTEMPTS = 5

/**
 * Normalizes input 10-digit Indian phone to E.164 (+91XXXXXXXXXX)
 */
export function normalizePhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91${digits}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }
  return `+${digits}`
}

/**
 * Validates 10-digit phone format (optionally checks starts with 6-9 for India)
 */
export function isValidPhone(phoneRaw: string): boolean {
  const digits = phoneRaw.replace(/\D/g, '')
  return /^[6-9]\d{9}$/.test(digits)
}

interface AuthResult {
  success: boolean
  error?: string
  message?: string
  candidate?: {
    id: string
    fullName: string
    phoneE164: string
    emailNormalised: string
  }
  sessionToken?: string
  retryAfterSeconds?: number
}

/**
 * Handles new candidate signup
 */
export async function signupCandidate(
  phoneRaw: string,
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  if (!isValidPhone(phoneRaw)) {
    return {
      success: false,
      error: 'INVALID_PHONE',
      message: 'Please enter a valid 10-digit mobile number.',
    }
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Password must be at least 6 characters long.',
    }
  }

  const phoneE164 = normalizePhone(phoneRaw)
  const emailNormalised = email.toLowerCase().trim()

  const db = getDb()

  // Check if candidate already exists
  const existing = await db
    .select()
    .from(candidates)
    .where(eq(candidates.phoneE164, phoneE164))
    .limit(1)

  if (existing[0]) {
    return {
      success: false,
      error: 'ALREADY_EXISTS',
      message: 'This phone number is already registered. Please log in instead.',
    }
  }

  // Hash password with Argon2id
  const pwdHash = await hashPassword(password)

  // Insert candidate record
  const [cand] = await db
    .insert(candidates)
    .values({
      phoneE164,
      emailNormalised,
      fullName: name.trim(),
      passwordHash: pwdHash,
      languages: [],
    })
    .returning()

  // Generate session cookie
  const sessionToken = await createCandidateSession(cand.id)

  return {
    success: true,
    candidate: {
      id: cand.id,
      fullName: cand.fullName,
      phoneE164: cand.phoneE164,
      emailNormalised: cand.emailNormalised,
    },
    sessionToken,
  }
}

/**
 * Handles candidate login with brute-force protection
 */
export async function loginCandidate(
  phoneRaw: string,
  password: string,
  ipAddress: string
): Promise<AuthResult> {
  const phoneE164 = normalizePhone(phoneRaw)
  const db = getDb()
  const now = new Date()
  const windowStart = new Date(now.getTime() - LOCKOUT_WINDOW_MINUTES * 60 * 1000)

  // 1. Rate Limiting Check (§2.loginCandidate)
  const failures = await db
    .select()
    .from(candidateLoginAttempts)
    .where(
      and(
        eq(candidateLoginAttempts.phoneE164, phoneE164),
        eq(candidateLoginAttempts.ipAddress, ipAddress),
        eq(candidateLoginAttempts.succeeded, false),
        gt(candidateLoginAttempts.attemptedAt, windowStart)
      )
    )
    .orderBy(desc(candidateLoginAttempts.attemptedAt))

  if (failures.length >= MAX_FAILED_ATTEMPTS) {
    // Find the 5th most recent failure (at index 4) to calculate remaining lockout time
    const fifthFailure = failures[MAX_FAILED_ATTEMPTS - 1]
    const lockoutExpiry = new Date(fifthFailure.attemptedAt.getTime() + LOCKOUT_WINDOW_MINUTES * 60 * 1000)
    const retryAfterSeconds = Math.max(0, Math.ceil((lockoutExpiry.getTime() - now.getTime()) / 1000))

    if (retryAfterSeconds > 0) {
      return {
        success: false,
        error: 'RATE_LIMITED',
        message: `Too many failed login attempts. Please try again after ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        retryAfterSeconds,
      }
    }
  }

  // 2. Look up Candidate
  const candRows = await db
    .select()
    .from(candidates)
    .where(eq(candidates.phoneE164, phoneE164))
    .limit(1)

  const candidate = candRows[0]
  let loginSucceeded = false

  if (candidate) {
    // 3. Verify Password using Argon2id
    loginSucceeded = await verifyPassword(password, candidate.passwordHash)
  } else {
    // Timing oracle mitigation: compute dummy verify cost
    const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$fzrJapWQKvDhRpURLv4EtA$48McOJnSPFXCaGxJUs+mXZX5bzAQ/r7Kf2U8sg1SZ58'
    await verifyPassword(password, DUMMY_HASH)
  }

  // 4. Log attempt (always log successes and failures)
  await db.insert(candidateLoginAttempts).values({
    phoneE164,
    ipAddress,
    succeeded: loginSucceeded,
  })

  if (!loginSucceeded) {
    return {
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid phone number or password.',
    }
  }

  // 5. Generate Session
  const sessionToken = await createCandidateSession(candidate.id)

  return {
    success: true,
    candidate: {
      id: candidate.id,
      fullName: candidate.fullName,
      phoneE164: candidate.phoneE164,
      emailNormalised: candidate.emailNormalised,
    },
    sessionToken,
  }
}
