import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db/client'
import { sql } from 'drizzle-orm'

async function check() {
  const db = getDb()

  // Ensure constraint
  try {
    await db.execute(sql`
      ALTER TABLE candidates
      ADD CONSTRAINT candidates_phone_e164_unique UNIQUE (phone_e164);
    `)
    console.log('candidates_phone_e164_unique constraint added.')
  } catch (e: any) {
    console.log('candidates_phone_e164_unique constraint check:', e.message)
  }

  // Ensure unique index
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_application_per_candidate
      ON applications (candidate_id)
      WHERE stage NOT IN ('rejected', 'withdrawn', 'duplicate');
    `)
    console.log('one_active_application_per_candidate index verified.')
  } catch (e: any) {
    console.log('Index error:', e.message)
  }

  // Check tables
  const tables = await db.execute(sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  `)
  console.log('Tables in DB:', tables.rows.map((r: any) => r.table_name))
}

check().catch(console.error)
