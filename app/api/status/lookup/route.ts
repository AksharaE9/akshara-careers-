/**
 * app/api/status/lookup/route.ts
 *
 * Candidate self-serve status lookup endpoint.
 * Accepts publicId (e.g. APP-ORG-...) or emailNormalised.
 * Returns the opaque status token to redirect to /status/[token].
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { applications, candidates } from '@/lib/db/schema'
import { eq, or, sql } from 'drizzle-orm'
import { normaliseEmail } from '@/lib/validation/normalisers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = String(body.query || '').trim()

    if (!query) {
      return NextResponse.json(
        { error: 'Please enter your Application Reference ID or Email' },
        { status: 400 }
      )
    }

    const db = getDb()
    const cleanEmail = normaliseEmail(query)

    // Query application by publicId OR by candidate email
    const rows = await db
      .select({
        statusToken: applications.statusToken,
        publicId: applications.publicId,
      })
      .from(applications)
      .leftJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(
        or(
          sql`lower(${applications.publicId}) = ${query.toLowerCase()}`,
          eq(applications.statusToken, query),
          eq(candidates.emailNormalised, cleanEmail)
        )
      )
      .limit(1)

    if (!rows[0] || !rows[0].statusToken) {
      return NextResponse.json(
        { error: 'No application found with the provided Reference ID or Email.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      statusToken: rows[0].statusToken,
      publicId: rows[0].publicId,
    })
  } catch (err: any) {
    console.error('Status lookup error:', err)
    return NextResponse.json(
      { error: 'Unable to check application status. Please try again.' },
      { status: 500 }
    )
  }
}
