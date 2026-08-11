/**
 * app/api/applications/mock-upload/route.ts
 *
 * Mock endpoint simulating Cloudflare R2 PUT file upload.
 * Receives the file binary via PUT, logs it, and returns 200 OK.
 * Keeps testing and demo flows functional without cloud credentials.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    // Read the binary stream or buffer
    const arrayBuffer = await request.arrayBuffer()
    const sizeBytes = arrayBuffer.byteLength

    console.log(`[MOCK UPLOAD] Successfully simulated R2 file PUT. Received ${sizeBytes} bytes.`)

    return new NextResponse(null, {
      status: 200,
      headers: {
        'ETag': '"mock-etag-value"',
      },
    })
  } catch (err) {
    console.error('Mock upload failed:', err)
    return NextResponse.json(
      { error: 'Mock upload failed' },
      { status: 500 }
    )
  }
}

// Support pre-flight OPTIONS request for CORS if necessary
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
