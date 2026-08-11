/**
 * app/api/auth/candidate/login/route.ts
 *
 * Candidate login API route.
 * Accepts: { phone, password }
 * Implements brute-force rate-limiting and lockout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginCandidate } from '@/lib/auth/candidate-password'
import { CANDIDATE_SESSION_COOKIE } from '@/lib/auth/candidate-session'
import { getClientIp } from '@/lib/security/client-ip'
import { getErrorMessage } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Phone number and password are required.' },
        { status: 400 }
      )
    }

    const ip = getClientIp(request.headers)
    const result = await loginCandidate(phone, password, ip)

    if (!result.success) {
      if (result.error === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { 
            status: 429, 
            headers: { 
              'Retry-After': String(result.retryAfterSeconds || 900) 
            } 
          }
        )
      }
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 401 }
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
    console.error('Candidate Login Error:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: getErrorMessage(err) || 'Failed to complete login.' },
      { status: 500 }
    )
  }
}
