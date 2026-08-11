/**
 * app/api/console/audit/route.ts
 *
 * Audit trail query endpoint (§14.17).
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { getDb } from '@/lib/db/client'
import { auditLog, users } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !can(user, 'view_audit')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const db = getDb()

    const logs = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        before: auditLog.before,
        after: auditLog.after,
        ipHash: auditLog.ipHash,
        createdAt: auditLog.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(50)

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: 'Failed to query audit log' }, { status: 500 })
  }
}
