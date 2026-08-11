/**
 * app/api/console/users/route.ts
 *
 * User management endpoint (§14.16) — super_admin ONLY.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { getDb } from '@/lib/db/client'
import { users, auditLog } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !can(user, 'manage_users')) {
      return NextResponse.json({ error: 'Forbidden — super_admin role required' }, { status: 403 })
    }

    const db = getDb()
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        mustChangePassword: users.mustChangePassword,
      })
      .from(users)
      .orderBy(desc(users.lastLoginAt))

    return NextResponse.json({ users: allUsers })
  } catch {
    return NextResponse.json({ error: 'Failed to query users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !can(user, 'manage_users')) {
      return NextResponse.json({ error: 'Forbidden — super_admin role required' }, { status: 403 })
    }

    const { email, name, role, temporaryPassword } = await request.json()

    if (!email || !name || !role || !temporaryPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getDb()
    const passwordHash = await hashPassword(temporaryPassword)

    const [created] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
      })
      .returning()

    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'create_user',
      entityType: 'user',
      entityId: created!.id,
      after: { email: created!.email, role: created!.role },
    })

    return NextResponse.json({ success: true, user: created })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
