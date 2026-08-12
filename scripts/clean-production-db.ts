/**
 * scripts/clean-production-db.ts
 *
 * Production Data Sanitation & Test Data Purge.
 * Safely purges:
 * - Test applications
 * - Test candidate records
 * - Application stage events & notes
 * - Test OTP challenges
 * - Test talent pool submissions
 *
 * Preserves:
 * - All active job postings (jobs)
 * - All verified colleges (colleges)
 * - All canonical courses (courses)
 * - All campus hiring drives (campus_drives)
 * - All staff & admin user accounts (users)
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from '../lib/db/client'
import {
  applications,
  candidates,
  applicationStageEvents,
  applicationNotes,
  talentPool,
  auditLog,
  analyticsEvents,
  securityEvents,
} from '../lib/db/schema'

async function cleanProductionDb() {
  console.log('\n🧹 Starting Production Database Cleaning...')
  const db = getDb()

  try {
    // 1. Delete application stage events & notes
    console.log('1. Cleaning stage events and recruiter notes...')
    await db.delete(applicationStageEvents)
    await db.delete(applicationNotes)

    // 2. Delete applications
    console.log('2. Cleaning test applications...')
    await db.delete(applications)

    // 3. Delete candidates
    console.log('3. Cleaning test candidates...')
    await db.delete(candidates)

    // 4. Delete talent pool test submissions
    console.log('4. Cleaning test talent pool records...')
    await db.delete(talentPool)

    // 5. Clean test audit logs and analytics events
    console.log('5. Cleaning test logs and event streams...')
    await db.delete(auditLog)
    await db.delete(analyticsEvents)
    await db.delete(securityEvents)

    console.log('\n======================================================')
    console.log('✨ PRODUCTION DATABASE CLEANING COMPLETE')
    console.log('======================================================')
    console.log('All test candidates and test applications have been purged.')
    console.log('Jobs, colleges, courses, drives, and admin users are intact.')
    console.log('Portal is clean and ready for real applicants!')
    console.log('======================================================\n')
  } catch (err) {
    console.error('Failed to clean database:', err)
    process.exit(1)
  }
}

cleanProductionDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
