/**
 * app/api/applications/route.ts
 *
 * Public application submission API route.
 * Handles candidate identity resolution by phone_e164,
 * active application constraint enforcement (§4.a),
 * 30-day reapply cooldown check (§4.b),
 * and creates application with initial stage event in application_stage_events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { publicApplicationSchema } from '@/lib/validation/application'
import { getDb } from '@/lib/db/client'
import { applications, applicationStageEvents, jobs } from '@/lib/db/schema'
import { upsertCandidate, checkApplicationEligibility } from '@/lib/db/queries/candidates'
import { getDriveByCode } from '@/lib/db/queries/drives'
import { randomUUID } from 'crypto'
import { getErrorMessage, isPostgresError } from '@/lib/errors'
import { eq } from 'drizzle-orm'
import {
  sendApplicationConfirmationEmail,
  enqueueHrNotification,
  drainOutbox,
} from '@/lib/email/application-email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Application Submit] Received body keys:', Object.keys(body))
    console.log('[Application Submit] Sample values:', {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      academicStatus: body.academicStatus,
      jobId: body.jobId,
    })
    
    // Normalize payload: support both nested (legacy) and flat (current) structures.
    // Nested payload has body.personalDetails as an object (with fullName inside).
    // Flat payload has body.fullName directly at the top level.
    const isNestedPayload =
      body.personalDetails !== null &&
      typeof body.personalDetails === 'object' &&
      'fullName' in body.personalDetails

    const payload = isNestedPayload
      ? {
          ...(body.personalDetails || {}),
          ...(body.academicStatus || {}),
          ...(body.resumeReview || {}),
          jobId: body.jobId,
          driveCode: body.driveCode,
          source: body.source,
          idempotencyKey: body.idempotencyKey,
        }
      : body

    // 1. Zod schema validation
    const parsed = publicApplicationSchema.safeParse(payload)
    if (!parsed.success) {
      console.error('[Application Submit] Validation errors:', parsed.error.format())
      const errorMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') || 'Validation failed'
      return NextResponse.json(
        { error: errorMsg, details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const hasDb = Boolean(process.env.NEON_DATABASE_URL)

    if (!hasDb) {
      console.warn('[MOCK SUBMIT] Database not configured. Simulating application insert.')
      const mockId = `APP-MOCK-${Math.floor(10000 + Math.random() * 90000)}`
      return NextResponse.json({
        success: true,
        applicationId: mockId,
        isMock: true,
      })
    }

    // ── LIVE MODE ────────────────────────────────────────────────────────────
    const db = getDb()

    // A. Upsert / resolve candidate identity by phone_e164
    const candidate = await upsertCandidate({
      emailNormalised: data.email,
      phoneE164: data.phone,
      fullName: data.fullName,
      languages: [],
      whatsappOptIn: data.whatsappOptIn,
    })

    if (!candidate) {
      throw new Error('Failed to resolve candidate record')
    }

    // B. Check 30-day cooldown and active application constraints per role
    const eligibility = await checkApplicationEligibility(candidate.id, data.jobId)
    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          error: eligibility.reason || 'ELIGIBILITY_BLOCKED',
          message: eligibility.message,
          reapplyAvailableAt: eligibility.reapplyAvailableAt?.toISOString(),
          daysRemaining: eligibility.daysRemaining,
          activeApplicationId: eligibility.activeApplicationId,
        },
        { status: 400 }
      )
    }

    // C. Lookup drive if driveCode is supplied
    let driveId: string | null = null
    const driveCodeUpper = data.driveCode?.toUpperCase().trim() || null
    if (driveCodeUpper) {
      const drive = await getDriveByCode(driveCodeUpper)
      if (drive) {
        driveId = drive.id
      }
    }

    // D. Generate publicId structure (APP-{DRIVE_CODE|ORG}-{RANDOM})
    const randPart = Math.floor(10000 + Math.random() * 90000)
    const publicId = driveCodeUpper 
      ? `APP-${driveCodeUpper}-${randPart}`
      : `APP-ORG-${randPart}`

    const statusToken = randomUUID()

    // E + F + outbox: all three commit atomically.
    // The candidate is safe as soon as the transaction commits,
    // regardless of whether the mail provider is reachable.
    const insertedApp = await db.transaction(async (tx) => {
      // E. Insert application
      const [app] = await tx
        .insert(applications)
        .values({
          publicId,
          statusToken,
          candidateId: candidate.id,
          jobId: data.jobId,
          driveId,
          collegeId: data.collegeId || null,
          collegeRaw: data.collegeRaw,
          courseId: data.courseId || null,
          courseRaw: data.courseRaw,
          academicStatus: data.academicStatus,
          academicNote: data.academicNote || null,
          experienceType: data.experienceType,
          hasDrivingLicence: data.hasDrivingLicence ?? false,
          hasTwoWheeler: data.hasTwoWheeler,
          resumeKey: data.resumeKey,
          resumeFilename: data.resumeFilename,
          resumeSizeBytes: data.resumeSizeBytes,
          resumeMime: data.resumeMime,
          source: data.source || 'organic',
          stage: 'received' as const,
          consentGivenAt: new Date(),
          consentVersion: '1.0',
          idempotencyKey: data.idempotencyKey,
        })
        .returning()

      if (!app) throw new Error('Failed to insert application')

      // F. Initial stage event
      await tx.insert(applicationStageEvents).values({
        applicationId: app.id,
        stage: 'received',
        note: 'Application submitted by candidate via online portal.',
        occurredAt: new Date(),
      })

      // G. Enqueue HR notification — same transaction, same commit
      await enqueueHrNotification(app.id, tx)

      return app
    })

    // Opportunistic drain — fire-and-forget, never awaited.
    // The cron at /api/cron/drain-outbox picks up anything missed here.
    drainOutbox().catch((e) => console.error('[outbox] opportunistic drain error:', e))

    // H. Candidate confirmation email (not in transaction — failure is non-blocking)
    try {
      const [job] = await db
        .select({ title: jobs.title })
        .from(jobs)
        .where(eq(jobs.id, data.jobId))
        .limit(1)
      const jobTitle = job?.title || 'Applied Position'
      const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/status/${statusToken}`
      await sendApplicationConfirmationEmail({
        to: data.email,
        candidateName: data.fullName,
        jobTitle,
        applicationId: publicId,
        statusUrl,
        submittedAt: new Date(),
      })
    } catch (emailErr) {
      console.warn('[Application Submit] Candidate confirmation email failed (non-blocking):', emailErr)
    }

    // I. Broadcast realtime event
    try {
      const { invalidateStatsCache } = await import('@/lib/db/queries/applications')
      const { broadcastConsoleEvent } = await import('@/lib/realtime/broadcast')
      invalidateStatsCache()
      broadcastConsoleEvent({
        type: 'application:created',
        data: {
          id: insertedApp.id,
          publicId: insertedApp.publicId,
          stage: insertedApp.stage,
          jobTitle: data.jobId,
        },
      })
    } catch (broadcastErr) {
      console.error('Failed to broadcast realtime application event:', broadcastErr)
    }

    return NextResponse.json({
      success: true,
      applicationId: publicId,
      statusToken,
      isMock: false,
    })
  } catch (err: unknown) {
    console.error('Error processing application submission:', err)

    // Handle postgres unique constraint key violations (e.g. idempotencyKey, one_active_application_per_candidate_and_job)
    const pgErr = isPostgresError(err)
      ? err
      : (err && typeof err === 'object' && 'cause' in err && isPostgresError((err as { cause: unknown }).cause))
        ? ((err as { cause: unknown }).cause as { code: string; constraint?: string })
        : null

    if (pgErr && pgErr.code === '23505') {
      if (pgErr.constraint?.includes('candidate') || pgErr.constraint?.includes('one_active')) {
        return NextResponse.json(
          {
            error: 'ACTIVE_APPLICATION_EXISTS',
            message: 'You already have an active application under review for this specific role.',
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'This application has already been submitted.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: getErrorMessage(err) || 'Internal server error' },
      { status: 500 }
    )
  }
}
