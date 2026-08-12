/**
 * app/api/console/stream/route.ts
 *
 * Server-Sent Events (SSE) stream for real-time console updates (§14.19).
 * Authenticated, heartbeated every 25s, pushes real-time pipeline and candidate events.
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { realtimeBroadcaster, ConsoleRealtimeEvent } from '@/lib/realtime/broadcast'

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

      // Listener for real-time console events
      const handleEvent = (event: ConsoleRealtimeEvent) => {
        try {
          const eventName = event.type.replace(':', '_')
          controller.enqueue(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(event.data || {})}\n\n`)
          )
        } catch {
          // Client stream closed
        }
      }

      realtimeBroadcaster.on('console:event', handleEvent)

      // 25-second heartbeat interval to survive proxy timeouts
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 25000)

      request.signal.addEventListener('abort', () => {
        realtimeBroadcaster.off('console:event', handleEvent)
        clearInterval(heartbeatInterval)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
