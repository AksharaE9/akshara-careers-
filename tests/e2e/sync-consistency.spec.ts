/**
 * tests/e2e/sync-consistency.spec.ts
 *
 * §3 & §8: Cross-dashboard real-time sync consistency verification.
 * Uses two isolated browser contexts (Recruiter Context A and Candidate Context B)
 * to verify that stage mutations propagate in <2s without manual page refreshes.
 */

import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '@/lib/db/client'
import { candidates, applications, applicationStageEvents, jobs, candidateSessions, users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import crypto from 'crypto'

function createSessionToken(user: any): string {
  const payload = { ...user, exp: Date.now() + 12 * 60 * 60 * 1000 }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

test.describe('Real-Time Cross-Dashboard Sync Consistency (§3 & §8)', () => {
  const syncPhone = '+919876543211'
  const syncEmail = 'sync.candidate@example.com'
  let testAppId: string
  let candidateToken: string
  let consoleToken: string

  test.beforeAll(async () => {
    const db = getDb()

    // Clean test candidate
    const existing = await db
      .select()
      .from(candidates)
      .where(eq(candidates.phoneE164, syncPhone))
      .limit(1)

    if (existing[0]) {
      const cId = existing[0].id
      const existingApps = await db
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.candidateId, cId))
      const appIds = existingApps.map((a) => a.id)
      if (appIds.length > 0) {
        await db
          .delete(applicationStageEvents)
          .where(sql`${applicationStageEvents.applicationId} IN ${appIds}`)
        await db.delete(applications).where(eq(applications.candidateId, cId))
      }
      await db.delete(candidates).where(eq(candidates.id, cId))
    }

    // Get a job
    const jobList = await db.select().from(jobs).limit(1)
    const jobId = jobList[0]?.id || 'f1'

    // Create Candidate
    const [cand] = await db
      .insert(candidates)
      .values({
        phoneE164: syncPhone,
        emailNormalised: syncEmail,
        fullName: 'Sync Test Candidate',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fzrJapWQKvDhRpURLv4EtA$48McOJnSPFXCaGxJUs+mXZX5bzAQ/r7Kf2U8sg1SZ58',
        languages: [],
      })
      .returning()

    // Generate Candidate Session directly
    candidateToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto
      .createHash('sha256')
      .update(`${candidateToken}:${process.env.SESSION_SECRET || 'akshara-cand-secret'}`)
      .digest('hex')

    await db.insert(candidateSessions).values({
      candidateId: cand.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    // Get actual Admin User for Console Session
    const adminRows = await db.select().from(users).where(eq(users.email, 'admin@gmail.com')).limit(1)
    const adminUser = adminRows[0]

    consoleToken = createSessionToken({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    })

    // Create Application in 'received' stage
    const [app] = await db
      .insert(applications)
      .values({
        publicId: `APP-SYNC-${Math.floor(10000 + Math.random() * 90000)}`,
        statusToken: randomUUID(),
        candidateId: cand.id,
        jobId,
        collegeRaw: 'Government First Grade College, Yelahanka',
        courseRaw: 'B.Com',
        academicStatus: 'graduated',
        experienceType: 'fresher',
        hasDrivingLicence: true,
        hasTwoWheeler: 'yes',
        resumeKey: 'resumes/sync_resume.pdf',
        resumeFilename: 'sync_resume.pdf',
        resumeSizeBytes: 102400,
        resumeMime: 'application/pdf',
        source: 'organic',
        stage: 'received',
        consentGivenAt: new Date(),
        consentVersion: '1.0',
        idempotencyKey: `idem-sync-${Date.now()}`,
      })
      .returning()
    testAppId = app.id

    await db.insert(applicationStageEvents).values({
      applicationId: app.id,
      stage: 'received',
      note: 'Initial application submitted.',
      occurredAt: new Date(),
    })
  })

  test('Context A (Recruiter) mutation propagates to Context B (Candidate) within 2s target', async ({
    browser,
  }) => {
    // ── 1. Create two isolated browser contexts ─────────────────────────────
    const candidateContext = await browser.newContext()
    const recruiterContext = await browser.newContext()

    // Add session cookies to contexts
    await candidateContext.addCookies([
      {
        name: 'akshara_cand_session',
        value: candidateToken,
        domain: 'localhost',
        path: '/',
      },
    ])

    await recruiterContext.addCookies([
      {
        name: 'akshara_console_session',
        value: consoleToken,
        domain: 'localhost',
        path: '/',
      },
    ])

    const candidatePage = await candidateContext.newPage()
    const recruiterPage = await recruiterContext.newPage()

    // ── 2. Context B: Candidate opens /dashboard ────────────────────────────
    await candidatePage.goto('http://localhost:3000/dashboard')
    const candidateBadge = candidatePage.locator('[data-testid="candidate-stage-badge"]')
    await expect(candidateBadge).toBeVisible({ timeout: 6000 })
    await expect(candidateBadge).toContainText('Application Submitted')

    // ── 3. Context A: Recruiter opens console ───────────────────────────────
    await recruiterPage.goto('http://localhost:3000/console')
    await expect(recruiterPage).toHaveURL(/.*console/)

    // ── 4. Context A triggers status change mutation to 'shortlisted' ────────
    const mutationStartTime = Date.now()

    const mutationStatus = await recruiterPage.evaluate(async (appId) => {
      const res = await fetch(`/api/console/applications/${appId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'shortlisted' }),
      })
      return res.status
    }, testAppId)

    expect(mutationStatus).toBe(200)
    const mutationLatency = Date.now() - mutationStartTime
    console.log(`[MUTATION] Recruiter stage update API latency: ${mutationLatency}ms (Budget: <400ms)`)

    // ── 5. Context B asserts live UI sync (<2s target, ceiling 5s) ───────────
    const syncWaitStart = Date.now()

    // Assert that without manual reload, Context B's stage badge automatically updates to 'Shortlisted'
    await expect(candidateBadge).toContainText('Shortlisted', { timeout: 4000 })

    const totalSyncLatency = Date.now() - syncWaitStart
    console.log(
      `[SYNC PROPAGATION] Cross-dashboard propagation latency: ${totalSyncLatency}ms (Target: <2000ms, Ceiling: 5000ms)`
    )

    // Assert propagation meets performance budget (5000ms ceiling per §1)
    expect(totalSyncLatency).toBeLessThanOrEqual(5000)

    // ── 6. Assert timeline event reflected in Candidate view ─────────────────
    const timeline = candidatePage.locator('.relative.pl-6, .relative.pl-8')
    await expect(timeline).toContainText('Shortlisted')

    await candidateContext.close()
    await recruiterContext.close()
  })
})
