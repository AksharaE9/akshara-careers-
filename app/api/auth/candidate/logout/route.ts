/**
 * app/api/auth/candidate/logout/route.ts
 *
 * Clears candidate session cookie and deletes session record.
 */

import { NextResponse } from 'next/server'
import { destroyCandidateSession } from '@/lib/auth/candidate-session'

export async function POST() {
  await destroyCandidateSession()
  return NextResponse.json({ success: true })
}
