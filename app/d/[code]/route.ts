/**
 * app/d/[code]/route.ts
 *
 * Campus drive landing redirect route (D9 shortlink).
 * Increments view count analytics on the drive record and redirects to the careers board
 * with tracking parameters.
 *
 * Awaits params per Next.js 15 route handler specification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDriveByCode, incrementDriveViewCount } from '@/lib/db/queries/drives'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const resolvedParams = await params
  const { code } = resolvedParams

  const hasDb = Boolean(process.env.NEON_DATABASE_URL)
  let driveCode = code.toUpperCase().trim()

  if (hasDb) {
    try {
      const drive = await getDriveByCode(driveCode)
      if (drive) {
        // Increment view count atomically in Neon
        await incrementDriveViewCount(drive.id)
        
        // Redirect to careers page with drive tracking parameters
        const url = new URL('/careers', request.url)
        url.searchParams.set('drive', driveCode)
        url.searchParams.set('source', 'campus_drive')
        return NextResponse.redirect(url)
      }
    } catch (err) {
      console.error('Failed to log campus drive analytics redirect:', err)
    }
  }

  // Fallback fallback redirect if drive code not found or db down
  const fallbackUrl = new URL('/careers', request.url)
  if (driveCode) {
    fallbackUrl.searchParams.set('drive', driveCode)
    fallbackUrl.searchParams.set('source', 'campus_drive')
  }
  return NextResponse.redirect(fallbackUrl)
}
