import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db/client'
import { sql } from 'drizzle-orm'
import { getErrorMessage } from '../lib/errors'

async function fixIndices() {
  const db = getDb()
  console.log('Dropping legacy static unique constraint apps_candidate_job_recent...')
  
  try {
    await db.execute(sql`DROP INDEX IF EXISTS apps_candidate_job_recent;`)
    console.log('✓ Dropped index apps_candidate_job_recent')
  } catch (e) {
    console.log('Index drop info:', getErrorMessage(e))
  }

  try {
    await db.execute(sql`ALTER TABLE applications DROP CONSTRAINT IF EXISTS apps_candidate_job_recent;`)
    console.log('✓ Dropped constraint apps_candidate_job_recent if was a table constraint')
  } catch (e) {
    console.log('Constraint drop info:', getErrorMessage(e))
  }

  // Ensure correct partial index exists
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_application_per_candidate
    ON applications (candidate_id)
    WHERE stage NOT IN ('rejected', 'withdrawn', 'duplicate');
  `)
  console.log('✓ Verified one_active_application_per_candidate partial unique index')
}

fixIndices().catch(console.error)
