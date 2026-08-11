/**
 * scripts/set-admin-password.ts
 *
 * Sets admin credentials:
 * Email: admin@gmail.com
 * Password: $SEED_ADMIN_PASSWORD, or 'admin123' if unset (dev-only default —
 * ALWAYS set SEED_ADMIN_PASSWORD before running this against a real database).
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from '../lib/db/client'
import { users } from '../lib/db/schema'
import { hashPassword } from '../lib/auth/password'
import { eq } from 'drizzle-orm'

async function setAdmin() {
  console.log('\n🔐 Setting admin credentials...')
  const db = getDb()

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123'
  const passwordHash = await hashPassword(adminPassword)
  const email = 'admin@gmail.com'

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    await db
      .update(users)
      .set({
        passwordHash,
        name: 'System Super Admin',
        role: 'super_admin',
        isActive: true,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.email, email))
    console.log(`✅ Updated password for existing user: ${email}`)
  } else {
    await db.insert(users).values({
      email,
      name: 'System Super Admin',
      passwordHash,
      role: 'super_admin',
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    })
    console.log(`✅ Created user: ${email}`)
  }

  console.log(`\n======================================================`)
  console.log(`👑 ADMIN CREDENTIALS CONFIGURED`)
  console.log(`======================================================`)
  console.log(`Email:    admin@gmail.com`)
  console.log(`Password: ${adminPassword}`)
  console.log(`Role:     super_admin`)
  console.log(`======================================================\n`)
}

setAdmin().catch((err) => {
  console.error('Failed to set admin password:', err)
  process.exit(1)
})
