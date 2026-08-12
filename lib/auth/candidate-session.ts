/**
 * lib/auth/candidate-session.ts
 *
 * Cryptographically secure candidate session management.
 * Candidate sessions are distinct and separate from console recruiter sessions.
 * Cookies: akshara_cand_session (HttpOnly, SameSite=Lax, Secure in prod).
 */

import { getDb } from '@/lib/db/client'
import { candidateSessions, candidates } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export const CANDIDATE_SESSION_COOKIE = 'akshara_cand_session'
const SESSION_TTL_DAYS = 30

function hashToken(rawToken: string): string {
  return crypto
    .createHash('sha256')
    .update(`${rawToken}:${process.env.SESSION_SECRET || 'akshara-cand-secret'}`)
    .digest('hex')
}

export async function createCandidateSession(candidateId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  const db = getDb()
  await db.insert(candidateSessions).values({
    candidateId,
    tokenHash,
    expiresAt,
  })

  // Set HTTP-only cookie
  try {
    const cookieStore = await cookies()
    cookieStore.set({
      name: CANDIDATE_SESSION_COOKIE,
      value: rawToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })
  } catch {
    // Silence error outside request context (e.g. scripts/CLI)
  }

  return rawToken
}

export interface CurrentCandidate {
  id: string
  fullName: string
  phoneE164: string
  emailNormalised: string
  homeCity: string | null
  homeState: string | null
  createdAt: Date
}

export async function getCurrentCandidate(): Promise<CurrentCandidate | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(CANDIDATE_SESSION_COOKIE)
    if (!sessionCookie || !sessionCookie.value) {
      return null
    }

    const rawToken = sessionCookie.value
    const tokenHash = hashToken(rawToken)
    const db = getDb()
    const now = new Date()

    const rows = await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        phoneE164: candidates.phoneE164,
        emailNormalised: candidates.emailNormalised,
        homeCity: candidates.homeCity,
        homeState: candidates.homeState,
        createdAt: candidates.createdAt,
      })
      .from(candidateSessions)
      .innerJoin(candidates, eq(candidateSessions.candidateId, candidates.id))
      .where(
        and(
          eq(candidateSessions.tokenHash, tokenHash),
          gt(candidateSessions.expiresAt, now)
        )
      )
      .limit(1)

    return rows[0] || null
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      (err as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw err
    }
    console.error('Error in getCurrentCandidate:', err)
    return null
  }
}

export async function destroyCandidateSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(CANDIDATE_SESSION_COOKIE)
    if (sessionCookie && sessionCookie.value) {
      const tokenHash = hashToken(sessionCookie.value)
      const db = getDb()
      await db
        .delete(candidateSessions)
        .where(eq(candidateSessions.tokenHash, tokenHash))
    }

    cookieStore.delete(CANDIDATE_SESSION_COOKIE)
  } catch (err) {
    console.error('Error destroying candidate session:', err)
  }
}
