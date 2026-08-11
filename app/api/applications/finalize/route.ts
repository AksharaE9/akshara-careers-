/**
 * app/api/applications/finalize/route.ts
 *
 * Finalize endpoint for resume uploads (§4.3, L6).
 * Sniffs the file magic bytes (via S3 range query) to verify it is a real PDF/DOC/DOCX,
 * preventing fake extension spoofing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getR2Client, getR2BucketName } from '@/lib/storage/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getErrorMessage } from '@/lib/errors'

/**
 * Sniffs the magic bytes of a buffer to verify its real MIME type.
 * Supported: PDF, DOCX (ZIP), and DOC (OLE CFB).
 */
function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null

  // 1. PDF: %PDF- (hex: 25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf'
  }

  // 2. DOCX / ZIP: PK.. (hex: 50 4B 03 04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  // 3. DOC / OLE CFB: (hex: D0 CF 11 E0)
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return 'application/msword'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key } = body

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      )
    }

    const hasR2 =
      Boolean(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
      Boolean(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) &&
      Boolean(process.env.CLOUDFLARE_R2_ENDPOINT) &&
      Boolean(process.env.CLOUDFLARE_R2_BUCKET_NAME)

    if (!hasR2) {
      // ── MOCK FALLBACK MODE ──────────────────────────────────────────────────
      console.warn('[MOCK FINALIZE] Cloudflare R2 credentials missing. Simulating magic bytes verification.')
      return NextResponse.json({
        valid: true,
        mimeType: 'application/pdf',
        sizeBytes: 124000,
        isMock: true,
      })
    }

    // ── R2 LIVE MODE ────────────────────────────────────────────────────────
    const s3Client = getR2Client()
    const bucket = getR2BucketName()

    // Retrieve only the first 512 bytes (range query) to check magic bytes
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: 'bytes=0-511',
    })

    const response = await s3Client.send(command)
    const streamToBuffer = async (stream: AsyncIterable<Uint8Array>): Promise<Buffer> => {
      const chunks: Uint8Array[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    }

    if (!response.Body) {
      throw new Error('Empty response body returned from storage')
    }

    // Read the stream. @aws-sdk/client-s3 types response.Body as a union
    // covering both browser (ReadableStream) and Node (Readable) runtimes;
    // TS can't see that the Node build always implements async iteration,
    // so this narrows to what we actually get at runtime here (a Next.js
    // API route always runs on Node), rather than typing the parameter
    // itself as `any`.
    const buffer = await streamToBuffer(response.Body as unknown as AsyncIterable<Uint8Array>)
    const mimeType = sniffMimeType(buffer)

    if (!mimeType) {
      return NextResponse.json(
        { error: 'Invalid file header: Must be a valid PDF, DOC, or DOCX document.' },
        { status: 400 }
      )
    }

    // Get the full content-length from response headers if returned,
    // or fallback to query meta
    const totalSize = response.ContentRange
      ? parseInt(response.ContentRange.split('/')[1] || '0', 10)
      : buffer.length

    return NextResponse.json({
      valid: true,
      mimeType,
      sizeBytes: totalSize,
      isMock: false,
    })
  } catch (err) {
    console.error('Error finalizing resume upload:', err)
    return NextResponse.json(
      { error: getErrorMessage(err) || 'Internal server error' },
      { status: 500 }
    )
  }
}
