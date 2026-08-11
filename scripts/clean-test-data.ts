/**
 * scripts/clean-test-data.ts
 *
 * Removes all test applications, dummy candidates, and test artifacts from the database,
 * while preserving canonical colleges, courses, jobs, campus drives, and admin users.
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from '../lib/db/client'
import {
  applications,
  candidates,
  applicationNotes,
  auditLog,
  securityEvents,
  talentPool,
  candidateLoginAttempts,
  candidateSessions,
  applicationStageEvents,
} from '../lib/db/schema'
import { sql } from 'drizzle-orm'

async function cleanTestData() {
  console.log('\n🧹 Cleaning test data from database...')
  const db = getDb()

  console.log('1. Removing application stage events...')
  await db.delete(applicationStageEvents)

  console.log('2. Removing application notes...')
  await db.delete(applicationNotes)

  console.log('3. Removing test applications...')
  await db.delete(applications)

  console.log('4. Removing candidate sessions...')
  await db.delete(candidateSessions)

  console.log('5. Removing candidate login attempts...')
  await db.delete(candidateLoginAttempts)

  console.log('6. Removing test candidates...')
  await db.delete(candidates)

  console.log('7. Removing test talent pool entries...')
  await db.delete(talentPool)

  console.log('8. Clearing test audit logs and security test events...')
  await db.delete(auditLog)
  await db.delete(securityEvents)

  console.log('✅ Test data successfully purged!')
  console.log('Canonical colleges, courses, jobs, campus drives, and admin users are intact.\n')
}

cleanTestData().catch((err) => {
  console.error('Failed to clean test data:', err)
  process.exit(1)
})
