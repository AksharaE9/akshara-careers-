/**
 * app/api/console/stream/route.ts
 *
 * Server-Sent Events (SSE) stream for real-time console updates (§14.19).
 * Authenticated, heartbeated every 25s, minimal payload (no full PII).
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection ACK
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
      )

      // 25-second heartbeat interval to survive proxy timeouts
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 25000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
