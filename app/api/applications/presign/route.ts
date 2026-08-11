/**
 * app/api/applications/presign/route.ts
 *
 * API endpoint to generate a presigned PUT URL for Cloudflare R2 resume uploads (§4.3).
 * If R2 credentials are not set, falls back to a mock simulation mode to keep the form functional.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getR2Client, getR2BucketName } from '@/lib/storage/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Custom UUID generator since we don't have crypto.randomUUID in older Node.js on some engines,
// though Node 20+ has it. We can use standard crypto.randomUUID().
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, contentType, fileSize } = body

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename and contentType are required' },
        { status: 400 }
      )
    }

    // Client-side file size verification fallback (5 MB max)
    if (fileSize !== undefined && fileSize <= 0) {
      return NextResponse.json(
        { error: 'File cannot be empty' },
        { status: 400 }
      )
    }

    if (fileSize && fileSize > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds the 5 MB limit' },
        { status: 400 }
      )
    }

    const hasR2 =
      Boolean(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
      Boolean(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) &&
      Boolean(process.env.CLOUDFLARE_R2_ENDPOINT) &&
      Boolean(process.env.CLOUDFLARE_R2_BUCKET_NAME)

    const fileId = randomUUID()
    // Strip dangerous extensions — keep only the final safe extension.
    // Blocklist covers webshells, scripts, executables, and markup that can be served.
    const DANGEROUS_EXT = /\.(php|phtml|exe|sh|bash|zsh|cmd|bat|com|msi|jar|war|js|ts|mjs|cjs|html|htm|svg|xml|py|rb|pl|asp|aspx|cfm)$/i

    // Clean unsafe path characters
    let cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Strip any dangerous extension from intermediate components and the final extension
    // e.g. "resume.php.pdf" → "resume__pdf", "evil.exe" → "evil"
    const parts = cleanFilename.split('.')
    // Always keep the first part (basename)
    const safeParts = [parts[0]]
    for (let i = 1; i < parts.length; i++) {
      const ext = parts[i].toLowerCase()
      if (DANGEROUS_EXT.test(`.${ext}`)) {
        // Replace dangerous extension with double-underscore separator
        safeParts.push('_')  // separator, not the ext
      } else {
        safeParts.push(parts[i])
      }
    }
    cleanFilename = safeParts.join('_')

    const key = `resumes/${fileId}-${cleanFilename}`

    if (!hasR2) {
      // ── MOCK FALLBACK MODE ──────────────────────────────────────────────────
      // Keep the frontend 100% testable and functional without R2 credentials.
      console.warn('R2 credentials not set. Generating mock upload configuration.')
      
      // We point the uploadUrl to a mock upload route we will create below!
      const mockUploadUrl = new URL('/api/applications/mock-upload', request.url).toString()
      
      return NextResponse.json({
        uploadUrl: mockUploadUrl,
        key,
        filename,
        isMock: true,
      })
    }

    // ── R2 LIVE MODE ────────────────────────────────────────────────────────
    const s3Client = getR2Client()
    const bucket = getR2BucketName()

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // Force download rather than browser inline render on retrieve
      ContentDisposition: `attachment; filename="${cleanFilename}"`,
    })

    // Presign URL with 5 minutes (300 seconds) expiry
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })

    return NextResponse.json({
      uploadUrl,
      key,
      filename,
      isMock: false,
    })
  } catch (err: any) {
    console.error('Error generating presigned URL:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
