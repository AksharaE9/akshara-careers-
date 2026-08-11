/**
 * app/api/auth/candidate/signup/route.ts
 *
 * Candidate signup API route.
 * Accepts: { phone, email, password, name }
 * normalizes to E.164 and creates new candidate record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { signupCandidate } from '@/lib/auth/candidate-password'
import { CANDIDATE_SESSION_COOKIE } from '@/lib/auth/candidate-session'
import { getErrorMessage } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, password, name } = body

    if (!phone || !email || !password || !name) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'All fields (Name, Email, Phone, Password) are required.' },
        { status: 400 }
      )
    }

    const result = await signupCandidate(phone, email, password, name)

    if (!result.success) {
      const status = result.error === 'ALREADY_EXISTS' ? 409 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status }
      )
    }

    const response = NextResponse.json({
      success: true,
      candidate: result.candidate,
    })

    // Set cookie explicitly on response
    response.cookies.set({
      name: CANDIDATE_SESSION_COOKIE,
      value: result.sessionToken!,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (err) {
    console.error('Candidate Signup Error:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: getErrorMessage(err) || 'Failed to complete registration.' },
      { status: 500 }
    )
  }
}
