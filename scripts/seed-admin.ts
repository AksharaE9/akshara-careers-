/**
 * scripts/seed-admin.ts
 *
 * Seed the super_admin account (§14.1.2).
 * Reads:
 *   SEED_ADMIN_EMAIL (default: admin@gmail.com)
 *   SEED_ADMIN_PASSWORD (default: Admin@123)
 *   SEED_ADMIN_FORCE_ROTATE (default: true)
 *
 * Enforces Argon2id hashing and idempotent insertion.
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from '../lib/db/client'
import { users } from '../lib/db/schema'
import { hashPassword } from '../lib/auth/password'
import { eq } from 'drizzle-orm'

export async function seedAdmin() {
  console.log('Seeding super_admin account...')
  const db = getDb()

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123'
  const forceRotate = process.env.SEED_ADMIN_FORCE_ROTATE !== 'false'

  // Check if admin already exists
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1)

  if (existing) {
    console.log(`Admin account [${adminEmail}] already exists (ID: ${existing.id}).`)
    return existing
  }

  const passwordHash = await hashPassword(adminPassword)

  const [created] = await db
    .insert(users)
    .values({
      email: adminEmail,
      name: 'System Super Admin',
      passwordHash,
      role: 'super_admin',
      isActive: true,
      mustChangePassword: forceRotate,
      prefs: { theme: 'light', density: 'comfortable' },
    })
    .returning()

  console.log(`Successfully seeded super_admin: ${created?.email} (mustChangePassword: ${created?.mustChangePassword})`)
  return created
}

// Direct execution
if (require.main === module || process.argv[1]?.includes('seed-admin')) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error seeding admin:', err)
      process.exit(1)
    })
}
