/**
 * app/api/console/exports/route.ts
 *
 * DPDP-compliant CSV candidate data export with audit trail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApplicationsList } from '@/lib/db/queries/applications'
import { getDb } from '@/lib/db/client'
import { auditLog } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') || undefined
    const jobId = searchParams.get('jobId') || undefined

    const apps = await getApplicationsList({ stage, jobId })

    // Log export event into audit_log
    const db = getDb()
    await db.insert(auditLog).values({
      actorId: user?.id || null,
      action: 'export_csv',
      entityType: 'applications',
      after: {
        recordCount: apps.length,
        exportedAt: new Date().toISOString(),
        filters: { stage, jobId },
      },
    })

    // Construct CSV
    const headers = [
      'Application ID',
      'Candidate Name',
      'Email',
      'Phone (E.164)',
      'Job Title',
      'Campus Drive Code',
      'College',
      'Course',
      'Academic Status',
      'Experience Level',
      'Two Wheeler',
      'Driving Licence',
      'Pipeline Stage',
      'Submitted Date',
    ]

    const csvRows = [
      headers.join(','),
      ...apps.map((a) =>
        [
          JSON.stringify(a.publicId),
          JSON.stringify(a.candidateName),
          JSON.stringify(a.candidateEmail),
          JSON.stringify(a.candidatePhone),
          JSON.stringify(a.jobTitle),
          JSON.stringify(a.driveCode || ''),
          JSON.stringify(a.collegeName),
          JSON.stringify(a.courseName),
          JSON.stringify(a.academicStatus),
          JSON.stringify(a.experienceType),
          JSON.stringify(a.hasTwoWheeler),
          JSON.stringify(a.hasDrivingLicence ? 'Yes' : 'No'),
          JSON.stringify(a.stage),
          JSON.stringify(new Date(a.submittedAt).toISOString()),
        ].join(',')
      ),
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="akshara-candidates-${Date.now()}.csv"`,
      },
    })
  } catch (err: any) {
    console.error('Failed to generate CSV export:', err)
    return NextResponse.json(
      { error: err.message || 'Export failed' },
      { status: 500 }
    )
  }
}
