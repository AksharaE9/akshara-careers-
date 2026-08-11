import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db/client'
import { sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '../lib/errors'

async function run() {
  console.log('Applying migration 0004...')
  const db = getDb()
  const sqlContent = fs.readFileSync(
    path.join(process.cwd(), 'drizzle', '0004_candidate_auth_password.sql'),
    'utf-8'
  )

  // Split into executable statements
  const statements = sqlContent
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt))
      console.log('Executed statement successfully.')
    } catch (err) {
      console.error('Statement error:', getErrorMessage(err))
    }
  }

  console.log('Migration 0004 applied successfully!')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
