/**
 * lib/console/use-realtime.ts
 *
 * Loop-free EventSource synchronization layer (Task 4).
 * Handles exponential backoff with jitter, stream resume, tab visibility change,
 * and data freshness calculations from query timestamps.
 */

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'

export type StreamStatus = 'connected' | 'reconnecting' | 'offline'

// Typed SSE event payload — type discriminated by the `type` field
export type RealtimeEventData = Record<string, unknown> | null

export interface RealtimeOptions {
  onEvent: (type: string, data: RealtimeEventData) => void
  disabled?: boolean
}

/**
 * Manages EventSource subscription with resume (?since=), visibility auto-reconnect,
 * and exponential backoff + jitter retry strategy.
 */
export function useRealtime({ onEvent, disabled = false }: RealtimeOptions) {
  const [status, setStatus] = useState<StreamStatus>('offline')

  const eventSourceRef = useRef<EventSource | null>(null)
  const lastEventIdRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  const connectRef = useRef<(() => void) | null>(null)

  const connect = useCallback(() => {
    if (disabled || typeof window === 'undefined') return

    // Clean up existing
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setStatus('reconnecting')

    const url = new URL('/api/console/stream', window.location.origin)
    if (lastEventIdRef.current) {
      url.searchParams.set('since', lastEventIdRef.current)
    }

    try {
      const es = new EventSource(url.toString())
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus('connected')
        retryCountRef.current = 0
      }

      es.onerror = () => {
        setStatus('reconnecting')
        es.close()
        eventSourceRef.current = null

        // Exponential backoff + jitter
        const baseDelay = 1000 // 1s
        const maxDelay = 30000 // 30s
        const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, retryCountRef.current))
        const jitter = Math.random() * 1000 // up to 1s random jitter
        const delay = backoff + jitter

        retryCountRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.()
        }, delay)
      }

      // Wildcard message listener or event-specific listeners
      es.addEventListener('message', (e) => {
        if (e.lastEventId) {
          lastEventIdRef.current = e.lastEventId
        }
        try {
          const payload = JSON.parse(e.data) as { type: string; data: RealtimeEventData }
          if (payload.type === 'ping') return // Keep-alive heartbeat
          onEventRef.current(payload.type, payload.data)
        } catch (err) {
          console.error('[SSE] Failed to parse event payload:', err)
        }
      })

      // Custom events allowlist
      const events = ['application_created', 'application_stage_updated', 'pipeline_update']
      events.forEach((evtName) => {
        es.addEventListener(evtName, (e) => {
          if (e.lastEventId) {
            lastEventIdRef.current = e.lastEventId
          }
          try {
            const data = e.data ? (JSON.parse(e.data) as RealtimeEventData) : null
            onEventRef.current(evtName, data)
          } catch {
            onEventRef.current(evtName, null)
          }
        })
      })
    } catch (err) {
      console.error('[SSE] Connection initialization failed:', err)
      setStatus('offline')
    }
  }, [disabled])

  // Keep the refs up to date without causing re-renders.
  // useLayoutEffect runs synchronously after DOM mutations, before paint,
  // so the ref is always current before any event fires.
  useLayoutEffect(() => {
    onEventRef.current = onEvent
    connectRef.current = connect
  })

  // Initial connect & cleanup
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        connect()
      }
    })

    return () => {
      active = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  // Handle visibility change: reconnect when page becomes active
  useEffect(() => {
    if (disabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connect, disabled])

  return { status }
}

/**
 * Returns an honest, dynamic freshness label derived from the data's update timestamp.
 */
export function getFreshnessLabel(
  dataUpdatedAt: Date | null,
  status: StreamStatus,
  nowInput = new Date()
): string {
  if (status === 'reconnecting') {
    return 'Reconnecting…'
  }

  if (!dataUpdatedAt) {
    return 'Offline'
  }

  const diffMs = nowInput.getTime() - dataUpdatedAt.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))

  if (status === 'offline') {
    const hh = String(dataUpdatedAt.getHours()).padStart(2, '0')
    const mm = String(dataUpdatedAt.getMinutes()).padStart(2, '0')
    return `Offline — showing data from ${hh}:${mm}`
  }

  if (diffSec < 5) {
    return 'Updated just now'
  }

  if (diffSec < 60) {
    return `Updated ${diffSec}s ago`
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 2) {
    return 'Updated 1m ago'
  }

  if (diffMin < 60) {
    return `Stale — last updated ${diffMin}m ago`
  }

  const hh = String(dataUpdatedAt.getHours()).padStart(2, '0')
  const mm = String(dataUpdatedAt.getMinutes()).padStart(2, '0')
  return `Stale — last updated ${hh}:${mm}`
}
