/**
 * app/api/applications/route.ts
 *
 * Public application submission API route.
 * Handles candidate upsert (D7), 90-day duplicate checking (D7),
 * drive code validation (D9), and creates the application.
 *
 * Falls back to mock submission if database is not configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { publicApplicationSchema } from '@/lib/validation/application'
import { getDb } from '@/lib/db/client'
import { candidates, applications, campusDrives } from '@/lib/db/schema'
import { findCandidate, upsertCandidate, hasAppliedRecently } from '@/lib/db/queries/candidates'
import { getDriveByCode } from '@/lib/db/queries/drives'
import { eq, sql } from 'drizzle-orm'
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
      // ── MOCK SUBMISSION FALLBACK ──────────────────────────────────────────
      // Simulates successful database insert to keep form wizard testable by Playwright.
      console.warn('[MOCK SUBMIT] Database not configured. Simulating application insert.')
      
      const mockId = `APP-MOCK-${Math.floor(10000 + Math.random() * 90000)}`
      
      return NextResponse.json({
        success: true,
        applicationId: mockId,
        isMock: true,
      })
    }

    // ── LIVE MODE (Neon DB transactions) ────────────────────────────────────
    const db = getDb()

    // A. Check if candidate already exists
    let candidate = await findCandidate(data.email, data.phone)

    if (candidate) {
      // D7: Check if the candidate has applied to this specific role in last 90 days
      const isDuplicate = await hasAppliedRecently(candidate.id, data.jobId)
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'You have already submitted an application for this role in the last 90 days.' },
          { status: 400 }
        )
      }
    }

    // B. Upsert candidate (D7)
    candidate = await upsertCandidate({
      emailNormalised: data.email,
      phoneE164: data.phone,
      fullName: data.fullName,
      languages: [], // MultiChip values mapping can be attached here
      whatsappOptIn: data.whatsappOptIn,
    })

    if (!candidate) {
      throw new Error('Failed to upsert candidate record')
    }

    // C. Lookup drive if driveCode is supplied
    let driveId: string | null = null
    let driveCodeUpper = data.driveCode?.toUpperCase().trim() || null
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
    // Wrap details in values mapping to applications schema
    await db.insert(applications).values({
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

    return NextResponse.json({
      success: true,
      applicationId: publicId,
      isMock: false,
    })
  } catch (err: any) {
    console.error('Error processing application submission:', err)

    // Handle postgres unique constraint key violations (e.g. idempotencyKey)
    if (err.code === '23505') {
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
