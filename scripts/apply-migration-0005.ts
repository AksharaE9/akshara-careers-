import { getDb } from '../lib/db/client'
import { sql } from 'drizzle-orm'

async function runMigration() {
  const db = getDb()
  console.log('Applying Migration 0005: candidate-job unique index...')

  await db.execute(sql`
    DROP INDEX IF EXISTS one_active_application_per_candidate;
  `)
  console.log('✓ Dropped one_active_application_per_candidate')

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_application_per_candidate_and_job
      ON applications (candidate_id, job_id)
      WHERE stage NOT IN ('rejected', 'withdrawn', 'duplicate');
  `)
  console.log('✓ Created one_active_application_per_candidate_and_job (candidate_id, job_id)')
}

runMigration()
  .then(() => {
    console.log('Migration 0005 applied successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
