/**
 * app/api/candidate/applications/route.ts
 *
 * Candidate portal API: returns current candidate profile, applications,
 * stage event history timeline, and 30-day cooldown eligibility.
 * Enforces §6: scoped strictly to current candidate at SQL layer.
 * Supports conditional GET (§3) with ETag for 2s polling sync without data overhead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCandidate } from '@/lib/auth/candidate-session'
import { getCandidateApplications } from '@/lib/db/queries/applications'
import { checkApplicationEligibility } from '@/lib/db/queries/candidates'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const candidate = await getCurrentCandidate()
    if (!candidate) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login with your phone number.' },
        { status: 401 }
      )
    }

    // Scoped query at SQL layer
    const [apps, eligibility] = await Promise.all([
      getCandidateApplications(candidate.id),
      checkApplicationEligibility(candidate.id),
    ])

    // Generate content-addressed ETag from candidate state and applications updatedAt
    const stateFingerprint = apps
      .map((a) => `${a.id}:${a.stage}:${a.updatedAt ? new Date(a.updatedAt).getTime() : 0}`)
      .join('|')

    const etag = `W/"${crypto
      .createHash('md5')
      .update(`${candidate.id}:${stateFingerprint}:${eligibility.allowed}`)
      .digest('hex')}"`

    // Conditional GET check (304 Not Modified)
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, no-cache, no-transform',
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        candidate,
        applications: apps,
        eligibility,
        syncedAt: new Date().toISOString(),
      },
      {
        headers: {
          ETag: etag,
          'Cache-Control': 'private, no-cache, no-transform',
        },
      }
    )
  } catch (err: any) {
    console.error('Candidate Applications API Error:', err)
    return NextResponse.json(
      { error: 'Failed to load candidate applications' },
      { status: 500 }
    )
  }
}
