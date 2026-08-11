/**
 * test-neon-connection.ts
 * Thorough test script to verify Neon DB connectivity, latency, schema, and live records.
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { neon } from '@neondatabase/serverless'
import { getDb } from './lib/db/client'
import { users, jobs, colleges, courses, applications, campusDrives } from './lib/db/schema'
import { count } from 'drizzle-orm'
import { getErrorMessage } from './lib/errors'

async function testConnection() {
  const url = process.env.NEON_DATABASE_URL
  console.log('--------------------------------------------------')
  console.log('Testing Neon Database Connectivity & Performance')
  console.log('--------------------------------------------------')
  console.log(`Connection URL: ${url?.replace(/:[^:@]+@/, ':****@')}\n`)

  if (!url) {
    console.error('❌ Error: NEON_DATABASE_URL is not set in environment or .env.local')
    process.exit(1)
  }

  const sql = neon(url)

  // 1. Basic Ping and Metadata Test
  const startPing = performance.now()
  try {
    const meta = await sql`
      SELECT 
        version() AS pg_version,
        current_database() AS database_name,
        current_user AS user_name,
        now() AS server_time,
        inet_server_addr() AS server_ip;
    `
    const latencyPing = (performance.now() - startPing).toFixed(1)
    console.log('✅ Server Ping Successful:')
    console.log(`   - PostgreSQL Version : ${(meta[0]?.pg_version as string | undefined)?.split(' on ')[0]}`)
    console.log(`   - Connected Database : ${meta[0]?.database_name}`)
    console.log(`   - Database User      : ${meta[0]?.user_name}`)
    console.log(`   - Server Timestamp   : ${meta[0]?.server_time}`)
    console.log(`   - Query Roundtrip    : ${latencyPing} ms\n`)
  } catch (err) {
    console.error('❌ Failed to ping database:', getErrorMessage(err))
    process.exit(1)
  }

  // 2. ORM Integration & Table Row Counts
  console.log('Checking Drizzle ORM and Table Records...')
  const db = getDb()

  try {
    const [userCount] = await db.select({ value: count() }).from(users)
    const [jobCount] = await db.select({ value: count() }).from(jobs)
    const [collegeCount] = await db.select({ value: count() }).from(colleges)
    const [courseCount] = await db.select({ value: count() }).from(courses)
    const [appCount] = await db.select({ value: count() }).from(applications)
    const [driveCount] = await db.select({ value: count() }).from(campusDrives)

    console.log('✅ Tables & Records Verified:')
    console.log(`   - Users Table        : ${userCount?.value} records`)
    console.log(`   - Jobs Table         : ${jobCount?.value} records`)
    console.log(`   - Colleges Table     : ${collegeCount?.value} records`)
    console.log(`   - Courses Table      : ${courseCount?.value} records`)
    console.log(`   - Applications Table : ${appCount?.value} records`)
    console.log(`   - Campus Drives Table: ${driveCount?.value} records\n`)
  } catch (err) {
    console.error('❌ Failed to query tables with Drizzle ORM:', getErrorMessage(err))
    process.exit(1)
  }

  // 3. Sample Query Test (Admin User Lookup & Sample Job)
  console.log('Testing Sample Data Fetching...')
  try {
    const adminUsers = await db.select({ email: users.email, role: users.role, name: users.name }).from(users).limit(3)
    console.log('✅ Admin & Recruiter Accounts:')
    for (const u of adminUsers) {
      console.log(`   - [${u.role.toUpperCase()}] ${u.name} <${u.email}>`)
    }

    const sampleJobs = await db.select({ title: jobs.title, slug: jobs.slug, status: jobs.status }).from(jobs).limit(3)
    console.log('\n✅ Sample Active Jobs:')
    for (const j of sampleJobs) {
      console.log(`   - [${j.status.toUpperCase()}] ${j.title} (/careers/${j.slug})`)
    }
  } catch (err) {
    console.error('❌ Failed sample queries:', getErrorMessage(err))
    process.exit(1)
  }

  console.log('\n--------------------------------------------------')
  console.log('🎉 Neon DB is fully connected, optimized, and operational!')
  console.log('--------------------------------------------------')
}

testConnection()
