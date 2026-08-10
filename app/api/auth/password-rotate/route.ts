/**
 * app/api/auth/password-rotate/route.ts
 *
 * Password rotation endpoint (§14.1.2).
 * Required when must_change_password is true.
 * Enforces >= 12 characters, Argon2id hashing, and session update.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, setSessionCookie } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { users, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    if (!newPassword || newPassword.length < 12) {
      return NextResponse.json(
        { error: 'New password must be at least 12 characters long.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password if provided
    if (currentPassword) {
      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash)
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      }
    }

    // Check if new password is identical to old password
    const isSameAsOld = await verifyPassword(newPassword, dbUser.passwordHash)
    if (isSameAsOld) {
      return NextResponse.json(
        { error: 'New password cannot be the same as your previous password.' },
        { status: 400 }
      )
    }

    // Hash new password with Argon2id
    const newHash = await hashPassword(newPassword)

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Update active session cookie
    const updatedSession = {
      ...user,
      mustChangePassword: false,
    }
    await setSessionCookie(updatedSession)

    // Write audit log
    try {
      await db.insert(auditLog).values({
        actorId: user.id,
        action: 'password_rotated',
        entityType: 'user',
        entityId: user.id,
        after: { mustChangePassword: false },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Password rotated successfully.' })
  } catch (err: any) {
    console.error('Password rotation error:', err)
    return NextResponse.json({ error: 'Failed to rotate password' }, { status: 500 })
  }
}
