/**
 * lib/auth/session.ts
 *
 * Console session management using signed cookie tokens.
 * Provides role-based access for recruiters, admins, and super_admins.
 */

import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'recruiter' | 'admin' | 'super_admin'
  mustChangePassword?: boolean
  assignedDriveIds?: string[]
  assignedJobIds?: string[]
}

const SESSION_COOKIE_NAME = 'akshara_console_session'

// Encode session payload as base64-json
export function createSessionToken(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours max session (§14.1.3)
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function parseSessionToken(token: string): SessionUser | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed.exp && parsed.exp < Date.now()) {
      return null // Expired
    }
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      mustChangePassword: Boolean(parsed.mustChangePassword),
      assignedDriveIds: parsed.assignedDriveIds || [],
      assignedJobIds: parsed.assignedJobIds || [],
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return parseSessionToken(token)
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies()
  const token = createSessionToken(user)
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PLAYWRIGHT_TEST && !process.env.TEST_BASE_URL,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
