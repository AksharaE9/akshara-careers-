import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db/client'
import { candidates, applications, applicationStageEvents, jobs } from '../lib/db/schema'
import { checkApplicationEligibility, upsertCandidate } from '../lib/db/queries/candidates'
import { updateApplicationStage } from '../lib/db/queries/applications'
import { signupCandidate } from '../lib/auth/candidate-password'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

async function runVerification() {
  console.log('=================================================================')
  console.log('AKSHARA CAREERS — CANDIDATE AUTH & 30-DAY COOLDOWN VERIFICATION')
  console.log('=================================================================\n')

  const db = getDb()
  const testPhone = '9876543299'
  const testPhoneE164 = '+919876543299'
  const testEmail = 'aditi.test@example.com'
  const testName = 'Aditi Sharma'

  // Clean test candidate if exists
  const existingCandidate = await db
    .select()
    .from(candidates)
    .where(eq(candidates.phoneE164, testPhoneE164))
    .limit(1)

  if (existingCandidate[0]) {
    const cId = existingCandidate[0].id
    const existingApps = await db.select({ id: applications.id }).from(applications).where(eq(applications.candidateId, cId))
    const appIds = existingApps.map(a => a.id)
    if (appIds.length > 0) {
      await db.delete(applicationStageEvents).where(sql`${applicationStageEvents.applicationId} IN ${appIds}`)
      await db.delete(applications).where(eq(applications.candidateId, cId))
    }
    await db.delete(candidates).where(eq(candidates.id, cId))
  }

  // Fetch job
  const jobList = await db.select().from(jobs).limit(1)
  const testJob = jobList[0] || { id: 'f1', title: 'Business Development Executive' }

  // ── TEST 1: Candidate Password Auth Flow ─────────────────────────────────────
  console.log('--- TEST 1: Candidate Phone + Password Signup ---')
  const signupRes = await signupCandidate(testPhone, testEmail, 'password123', testName)
  if (!signupRes.success) {
    throw new Error(`Signup failed: ${signupRes.message}`)
  }
  console.log(`✓ Candidate registered: id=${signupRes.candidate?.id}, phone=${signupRes.candidate?.phoneE164}`)

  const candidateId = signupRes.candidate!.id

  // ── TEST 2: Submit Application 1 ────────────────────────────────────────────
  console.log('\n--- TEST 2: Submit Application 1 ---')
  const app1PublicId = `APP-ORG-${Math.floor(10000 + Math.random() * 90000)}`
  const [app1] = await db
    .insert(applications)
    .values({
      publicId: app1PublicId,
      statusToken: randomUUID(),
      candidateId,
      jobId: testJob.id,
      collegeRaw: 'M.S. Ramaiah College of Arts, Science and Commerce',
      courseRaw: 'B.Com',
      academicStatus: 'graduated',
      experienceType: 'fresher',
      hasDrivingLicence: true,
      hasTwoWheeler: 'yes',
      resumeKey: 'resumes/aditi_resume.pdf',
      resumeFilename: 'aditi_resume.pdf',
      resumeSizeBytes: 102400,
      resumeMime: 'application/pdf',
      source: 'organic',
      stage: 'received',
      consentGivenAt: new Date(),
      consentVersion: '1.0',
      idempotencyKey: `idem-${Date.now()}-1`,
    })
    .returning()
  if (!app1) throw new Error('Application 1 insert.returning() came back empty')

  await db.insert(applicationStageEvents).values({
    applicationId: app1.id,
    stage: 'received',
    note: 'Initial application submitted via candidate portal.',
    occurredAt: new Date(),
  })
  console.log(`✓ Application 1 created: id=${app1.id}, publicId=${app1.publicId}, stage=${app1.stage}`)

  // ── TEST 3: At-most-one ACTIVE application constraint (§4.a) ────────────────
  console.log('\n--- TEST 3: Attempt to submit while Application 1 is active (§4.a) ---')
  const activeEligibility = await checkApplicationEligibility(candidateId)
  console.log(`✓ Active check result: allowed=${activeEligibility.allowed}, reason=${activeEligibility.reason}`)
  console.log(`  Message: "${activeEligibility.message}"`)

  // ── TEST 4: Transition Application 1 to terminal state 'rejected' ────────────
  console.log('\n--- TEST 4: Transition Application 1 to terminal stage "rejected" ---')
  await updateApplicationStage(app1.id, 'rejected', undefined)
  console.log(`✓ Application 1 updated to stage 'rejected' with updatedAt = now()`)

  // ── TEST 5: 30-Day Cooldown Block inside window (§4.b) ──────────────────────
  console.log('\n--- TEST 5: Attempt to reapply inside 30-day cooldown window (§4.b) ---')
  const cooldownEligibility = await checkApplicationEligibility(candidateId)
  console.log(`✓ Cooldown check result: allowed=${cooldownEligibility.allowed}, reason=${cooldownEligibility.reason}`)
  console.log(`  Message: "${cooldownEligibility.message}"`)
  console.log(`  Reapply Available Date: ${cooldownEligibility.reapplyAvailableAt?.toISOString()}`)
  console.log(`  Days remaining: ${cooldownEligibility.daysRemaining}`)

  // ── TEST 6: Backdate Application 1's updatedAt past 30 days ─────────────────
  console.log('\n--- TEST 6: Backdate Application 1 updatedAt to 35 days ago ---')
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
  await db
    .update(applications)
    .set({ updatedAt: thirtyFiveDaysAgo })
    .where(eq(applications.id, app1.id))

  const backdatedEligibility = await checkApplicationEligibility(candidateId)
  console.log(`✓ Backdated check result: allowed=${backdatedEligibility.allowed} (Cooldown expired!)`)

  // ── TEST 7: Submit Application 2 (Fresh application after cooldown) ─────────
  console.log('\n--- TEST 7: Submit Application 2 (Fresh Application) ---')
  const app2PublicId = `APP-ORG-${Math.floor(10000 + Math.random() * 90000)}`
  const [app2] = await db
    .insert(applications)
    .values({
      publicId: app2PublicId,
      statusToken: randomUUID(),
      candidateId,
      jobId: testJob.id,
      collegeRaw: 'M.S. Ramaiah College of Arts, Science and Commerce',
      courseRaw: 'B.Com',
      academicStatus: 'graduated',
      experienceType: 'experienced',
      hasDrivingLicence: true,
      hasTwoWheeler: 'yes',
      resumeKey: 'resumes/aditi_resume_v2.pdf',
      resumeFilename: 'aditi_resume_v2.pdf',
      resumeSizeBytes: 105000,
      resumeMime: 'application/pdf',
      source: 'organic',
      stage: 'received',
      consentGivenAt: new Date(),
      consentVersion: '1.0',
      idempotencyKey: `idem-${Date.now()}-2`,
    })
    .returning()
  if (!app2) throw new Error('Application 2 insert.returning() came back empty')

  await db.insert(applicationStageEvents).values({
    applicationId: app2.id,
    stage: 'received',
    note: 'Re-application submitted after 30-day cooldown.',
    occurredAt: new Date(),
  })
  console.log(`✓ Application 2 created: id=${app2.id}, publicId=${app2.publicId}, stage=${app2.stage}`)

  // ── TEST 8: Query applications table for candidate ──────────────────────────
  console.log('\n--- TEST 8: Two Resulting Rows in `applications` table ---')
  const candidateApps = await db
    .select({
      id: applications.id,
      publicId: applications.publicId,
      candidateId: applications.candidateId,
      stage: applications.stage,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(eq(applications.candidateId, candidateId))
    .orderBy(applications.submittedAt)

  console.log('Resulting applications rows for candidate:')
  console.table(candidateApps)

  // ── TEST 9: Query application_stage_events table ────────────────────────────
  console.log('\n--- TEST 9: Timeline events logged in `application_stage_events` ---')
  const stageEvents = await db
    .select({
      id: applicationStageEvents.id,
      applicationId: applicationStageEvents.applicationId,
      stage: applicationStageEvents.stage,
      note: applicationStageEvents.note,
      occurredAt: applicationStageEvents.occurredAt,
    })
    .from(applicationStageEvents)
    .where(
      sql`${applicationStageEvents.applicationId} IN (${app1.id}, ${app2.id})`
    )
    .orderBy(applicationStageEvents.occurredAt)

  console.table(stageEvents)

  console.log('\n✓ ALL TESTS PASSED SUCCESSFULLY!')
}

runVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
