/**
 * app/api/auth/candidate/me/route.ts
 *
 * Returns current authenticated candidate profile.
 */

import { NextResponse } from 'next/server'
import { getCurrentCandidate } from '@/lib/auth/candidate-session'

export async function GET() {
  try {
    const candidate = await getCurrentCandidate()
    if (!candidate) {
      return NextResponse.json({ authenticated: false, candidate: null })
    }
    return NextResponse.json({
      authenticated: true,
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.emailNormalised,
        phone: candidate.phoneE164,
      },
    })
  } catch (err) {
    console.error('Candidate Me Error:', err)
    return NextResponse.json({ authenticated: false, candidate: null }, { status: 500 })
  }
}
