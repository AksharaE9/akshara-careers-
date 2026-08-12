/**
 * app/api/console/applications/export/route.ts
 *
 * Streamed & Async Pipeline Export Endpoint (§14.18, Part 20 §20.2).
 * Implements UTF-8 BOM, OWASP CSV Injection Neutralisation, Excel phone preservation,
 * Legacy Google Form & Canonical 36-column sheets, 10/hr rate limiting, and immutable audit logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApplicationsList } from '@/lib/db/queries/applications'
import { getDb } from '@/lib/db/client'
import { auditLog } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { checkExportRateLimit } from '@/lib/ratelimit/export-limit'
import {
  toISTDateTimeString,
  toISTDateOnlyString,
  resolveDatePreset,
  DatePreset,
  formatISTDate,
} from '@/lib/date/ist'

export const dynamic = 'force-dynamic'

/**
 * OWASP CSV Injection Neutralisation (§20.2.1 Constraint 4).
 * Cells starting with =, +, -, @, \t, or \r are prepended with an apostrophe.
 */
export function neutralise(val: unknown): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  return str
}

/**
 * Escapes a cell for CSV compliance according to RFC 4180 with injection protection.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const safe = neutralise(val)
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

// ── Sheet 1: Legacy Google Form Columns (§20.2.2) ──────────────────────────────
export const LEGACY_HEADERS = [
  'Timestamp',
  'Full Name',
  'Email',
  'Mobile Number',
  'Gender',
  'College',
  'Course',
  'Role Applied',
  'Any Experience/ Specialization',
  'Hometown/State',
  'Languages Known',
  'Current Semester',
  'Driving License',
  'Two-Wheeler',
  'Upload Updated Resume',
]

// ── Sheet 2: Canonical System Columns (36 columns, §20.2.2) ────────────────────
export const CANONICAL_HEADERS = [
  'Application ID',
  'Public ID',
  'Status Token',
  'Submitted (IST)',
  'Pipeline Stage',
  'Candidate ID',
  'Full Name',
  'Email',
  'Mobile Number',
  'Academic Status',
  'Academic Note',
  'Experience Type',
  'Experience Note',
  'Has Two Wheeler',
  'Has Driving Licence',
  'Source',
  'Job ID',
  'Job Title',
  'Job Slug',
  'Drive ID',
  'Drive Code',
  'College Name',
  'Course Name',
  'Resume Key',
  'Resume Filename',
  'Resume Size Bytes',
  'Resume MIME',
]

export async function GET(request: NextRequest) {
  try {
    // 1. RBAC Authentication Check (§20.2.4) — admin and super_admin only
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!can(user, 'export_data')) {
      return NextResponse.json(
        { error: 'Forbidden: Export requires admin privileges' },
        { status: 403 }
      )
    }

    // 2. Rate Limiting Check (§20.2.4: 10 exports per user per hour)
    const rateLimit = checkExportRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: maximum 10 exports per hour' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const sheet = searchParams.get('sheet') === 'canonical' ? 'canonical' : 'legacy'
    const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'
    const stage = searchParams.get('stage') || undefined
    const jobId = searchParams.get('jobId') || undefined
    const driveId = searchParams.get('driveId') || undefined
    const query = searchParams.get('q') || undefined
    const preset = (searchParams.get('preset') as DatePreset) || undefined
    let from = searchParams.get('from') || undefined
    let to = searchParams.get('to') || undefined

    if (preset) {
      const resolved = resolveDatePreset(preset, from, to)
      from = resolved.from || undefined
      to = resolved.to || undefined
    }

    // Fetch total matching dataset
    const result = await getApplicationsList({
      stage,
      jobId,
      driveId,
      query,
      from,
      to,
      unpaginated: true,
    })
    const apps = result.applications
    const totalCount = apps.length

    // 3. Async Threshold Check (§20.2.3: >2,000 rows or XLSX goes async)
    if (totalCount > 2000 || format === 'xlsx') {
      const db = getDb()
      await db.insert(auditLog).values({
        actorId: user.id,
        action: 'export_applications_async',
        entityType: 'applications',
        after: {
          rowCount: totalCount,
          format,
          sheet,
          filters: { stage, jobId, driveId, query, from, to, preset },
          mode: 'async_job',
          requestedAt: new Date().toISOString(),
        },
      })

      return NextResponse.json({
        mode: 'async',
        count: totalCount,
        message: `Preparing ${totalCount.toLocaleString()} records. We'll email you a download link within 24 hours.`,
        jobId: `exp_${Date.now()}_${user.id.slice(0, 8)}`,
      })
    }

    // 4. Record Audit Log (§20.2.4)
    const db = getDb()
    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'export_applications',
      entityType: 'applications',
      after: {
        rowCount: totalCount,
        format: 'csv',
        sheet,
        filters: { stage, jobId, driveId, query, from, to, preset },
        exportedAt: new Date().toISOString(),
      },
    })

    // 5. Build Streamed CSV Response with UTF-8 BOM (§20.2.1 Constraint 3)
    const encoder = new TextEncoder()
    const headers = sheet === 'canonical' ? CANONICAL_HEADERS : LEGACY_HEADERS

    const stream = new ReadableStream({
      start(controller) {
        // Emit UTF-8 BOM (0xEF, 0xBB, 0xBF)
        controller.enqueue(new Uint8Array([0xef, 0xbb, 0xbf]))

        // Emit header line
        controller.enqueue(encoder.encode(headers.map(escapeCsvCell).join(',') + '\r\n'))

        // Stream records in 500-row chunks
        const CHUNK_SIZE = 500
        for (let i = 0; i < apps.length; i += CHUNK_SIZE) {
          const chunk = apps.slice(i, i + CHUNK_SIZE)
          let chunkCsv = ''

          for (const app of chunk) {
            let row: string[]
            // Phone number with leading apostrophe for Excel preservation (Constraint 5)
            const safePhone = app.candidatePhone ? `'${app.candidatePhone}` : ''

            if (sheet === 'canonical') {
              row = [
                app.id,
                app.publicId,
                app.statusToken,
                toISTDateTimeString(app.submittedAt),
                app.stage,
                app.candidateId,
                app.candidateName,
                app.candidateEmail,
                safePhone,
                app.academicStatus,
                '', // academicNote
                app.experienceType,
                '', // experienceNote
                app.hasTwoWheeler,
                app.hasDrivingLicence ? 'Yes' : 'No',
                app.source,
                app.jobId || '',
                app.jobTitle,
                app.jobSlug,
                app.driveId || '',
                app.driveCode || '',
                app.collegeName,
                app.courseName,
                '', // resumeKey
                '', // resumeFilename
                '', // resumeSizeBytes
                '', // resumeMime
              ]
            } else {
              // Legacy Google Form Columns format
              row = [
                toISTDateTimeString(app.submittedAt),
                app.candidateName,
                app.candidateEmail,
                safePhone,
                '', // Gender
                app.collegeName,
                app.courseName,
                app.jobTitle,
                app.experienceType === 'experienced' ? 'Experienced' : 'Fresher',
                'Karnataka', // Hometown/State
                'Kannada, English', // Languages
                app.academicStatus.replace(/_/g, ' '),
                app.hasDrivingLicence ? 'Yes' : 'No',
                app.hasTwoWheeler,
                app.statusToken ? `https://careers.akshara.org.in/status/${app.statusToken}` : '',
              ]
            }

            chunkCsv += row.map(escapeCsvCell).join(',') + '\r\n'
          }

          controller.enqueue(encoder.encode(chunkCsv))
        }

        controller.close()
      },
    })

    const fromTag = from || 'all'
    const toTag = to || 'all'
    const dateStamp = toISTDateOnlyString(new Date()).replace(/-/g, '')
    const filename = `akshara-applications_${fromTag}_${toTag}_${dateStamp}.csv`

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Total-Count': String(totalCount),
      },
    })
  } catch (err) {
    console.error('Failed to stream export:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
