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
import { candidates, applications, campusDrives, applicationStageEvents } from '@/lib/db/schema'
import { findCandidate, upsertCandidate, checkApplicationEligibility } from '@/lib/db/queries/candidates'
import { getDriveByCode } from '@/lib/db/queries/drives'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 1. Zod schema validation
    const parsed = publicApplicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
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
    let candidate = await upsertCandidate({
      emailNormalised: data.email,
      phoneE164: data.phone,
      fullName: data.fullName,
      languages: [],
      whatsappOptIn: data.whatsappOptIn,
    })

    if (!candidate) {
      throw new Error('Failed to resolve candidate record')
    }

    // B. Check 30-day cooldown and active application constraints (§4)
    const eligibility = await checkApplicationEligibility(candidate.id)
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

    // E. Insert application
    const [insertedApp] = await db
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
        hasDrivingLicence: data.hasDrivingLicence,
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

    if (!insertedApp) {
      throw new Error('Failed to insert application')
    }

    // F. Write initial stage event to application_stage_events (§3)
    await db.insert(applicationStageEvents).values({
      applicationId: insertedApp.id,
      stage: 'received',
      note: 'Application submitted by candidate via online portal.',
      occurredAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      applicationId: publicId,
      statusToken,
      isMock: false,
    })
  } catch (err: any) {
    console.error('Error processing application submission:', err)

    // Handle postgres unique constraint key violations (e.g. idempotencyKey, one_active_application)
    if (err.code === '23505') {
      if (err.constraint === 'one_active_application_per_candidate') {
        return NextResponse.json(
          {
            error: 'ACTIVE_APPLICATION_EXISTS',
            message: 'You already have an active application under review in our system.',
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
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
