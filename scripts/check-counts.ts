try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from '../lib/db/client'
import { applications, candidates, colleges, jobs, campusDrives, users } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

async function checkCounts() {
  const db = getDb()
  const [appCount] = await db.select({ count: sql<number>`count(*)::int` }).from(applications)
  const [candCount] = await db.select({ count: sql<number>`count(*)::int` }).from(candidates)
  const [colCount] = await db.select({ count: sql<number>`count(*)::int` }).from(colleges)
  const [jobCount] = await db.select({ count: sql<number>`count(*)::int` }).from(jobs)
  const [driveCount] = await db.select({ count: sql<number>`count(*)::int` }).from(campusDrives)
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users)

  console.log(`\n===================================`)
  console.log(`📊 CURRENT DATABASE RECORD COUNTS`)
  console.log(`===================================`)
  console.log(`Applications:   ${appCount?.count} (Clean / Ready for live applicants)`)
  console.log(`Candidates:     ${candCount?.count} (Clean / Ready for live leads)`)
  console.log(`Colleges:       ${colCount?.count} (Canonical partner institutions)`)
  console.log(`Open Jobs:      ${jobCount?.count} (Business Development Executive, Operations Associate)`)
  console.log(`Campus Drives:  ${driveCount?.count} (Upcoming campus drives)`)
  console.log(`System Users:   ${userCount?.count} (Super Admin & Recruiters)`)
  console.log(`===================================\n`)
}

checkCounts().catch(console.error)
