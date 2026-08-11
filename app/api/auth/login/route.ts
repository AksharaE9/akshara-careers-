/**
 * app/api/auth/login/route.ts
 *
 * Console login API route (§14.1.3).
 * Enforces:
 *   - Argon2id password verification
 *   - Generic error response: 'Email or password is incorrect.'
 *   - 5 attempts / 15 min rate limiting & lockout
 *   - Audit logging of every login / failed attempt
 *   - must_change_password flag propagation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { users, auditLog, securityEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { setSessionCookie, createSessionToken } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { getClientIp } from '@/lib/security/client-ip'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const GENERIC_ERROR = 'Email or password is incorrect.'
    const ip = getClientIp(request.headers)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
    const ua = request.headers.get('user-agent') || ''
    const uaHash = crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16)

    if (!email || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const emailNormalised = email.toLowerCase().trim()
    const db = getDb()

    // 1. Query database for user
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalised))
      .limit(1)

    const user = dbUsers[0]

    if (!user || !user.isActive) {
      // ── TIMING ORACLE FIX ─────────────────────────────────────────────────
      // For unknown/inactive accounts, perform a dummy Argon2id comparison so
      // response time is indistinguishable from a valid-account wrong-password.
      // Uses a valid Argon2id hash format to ensure the full derivation executes.
      const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$fzrJapWQKvDhRpURLv4EtA$48McOJnSPFXCaGxJUs+mXZX5bzAQ/r7Kf2U8sg1SZ58'
      await verifyPassword(password, DUMMY_HASH).catch(() => {})

      // F15 fix: the wrong-password branch below (for a *known* account)
      // performs a second sequential DB write — updating failedLoginCount /
      // lockedUntil — that this unknown-account branch otherwise doesn't
      // have. Without a matching write, this branch is consistently faster
      // and leaks account existence via response timing (confirmed
      // empirically: 331ms average delta against a 300ms oracle threshold —
      // see reports/TRIAGE.md F15). Pay the same DB round-trip here against
      // a UUID that can never match a real row, so it always affects 0 rows.
      try {
        await db
          .update(users)
          .set({ lockedUntil: null })
          .where(eq(users.id, '00000000-0000-0000-0000-000000000000'))
      } catch {}
      // ─────────────────────────────────────────────────────────────────────

      try {
        await db.insert(securityEvents).values({
          layer: 'login',
          outcome: 'blocked',
          reason: 'invalid_credentials_unknown_account',
          path: '/console/login',
          ipHash,
          uaHash,
          emailAttempted: emailNormalised,
        })
      } catch {}

      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    // 2. Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Account temporarily locked due to failed attempts. Try again in ${remainingMinutes} minutes.` },
        { status: 429, headers: { 'Retry-After': String(remainingMinutes * 60) } }
      )
    }

    // 3. Verify password hash using Argon2id
    let passwordValid = false
    try {
      passwordValid = await verifyPassword(password, user.passwordHash)
    } catch {
      passwordValid = false
    }

    if (!passwordValid) {
      const newCount = (user.failedLoginCount || 0) + 1
      const isLockout = newCount >= 5
      const lockedUntilDate = isLockout ? new Date(Date.now() + 30 * 60 * 1000) : null

      await db
        .update(users)
        .set({
          failedLoginCount: newCount,
          lockedUntil: lockedUntilDate,
        })
        .where(eq(users.id, user.id))

      try {
        await db.insert(securityEvents).values({
          layer: 'login',
          outcome: isLockout ? 'blocked' : 'flagged',
          reason: isLockout ? 'account_lockout_exceeded_attempts' : 'incorrect_password',
          path: '/console/login',
          ipHash,
          uaHash,
          emailAttempted: emailNormalised,
        })
      } catch {}

      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    // 4. Successful login: reset failed count and update lastLoginAt
    await db
      .update(users)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword),
      assignedDriveIds: user.assignedDriveIds || [],
    }

    const sessionToken = createSessionToken(sessionUser)
    await setSessionCookie(sessionUser)

    // Write audit log
    try {
      await db.insert(auditLog).values({
        actorId: user.id,
        action: 'login',
        entityType: 'session',
        entityId: user.id,
        after: { role: user.role, mustChangePassword: user.mustChangePassword },
        ipHash,
      })
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      mustChangePassword: user.mustChangePassword,
    })

    response.cookies.set('akshara_console_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !process.env.PLAYWRIGHT_TEST,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (err: any) {
    console.error('Console login error:', err)
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 })
  }
}
