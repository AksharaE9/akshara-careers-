/**
 * lib/analytics/track.ts
 *
 * First-party cookieless analytics SDK (§14.4.1).
 * - ≤ 3 KB gzipped, 0 external dependencies.
 * - Flushes via navigator.sendBeacon on 5s timer and visibilitychange.
 * - sessionStorage session_id rotating every 30 minutes.
 * - Respects DNT & Global Privacy Control.
 * - Fails silently; never blocks interaction or breaks candidate forms.
 */

export type AnalyticsEventName =
  | 'page_view'
  | 'job_list_filtered'
  | 'job_viewed'
  | 'apply_cta_clicked'
  | 'apply_started'
  | 'apply_step_completed'
  | 'apply_step_blocked'
  | 'apply_field_error'
  | 'apply_field_focus'
  | 'apply_field_blur'
  | 'resume_upload_started'
  | 'resume_upload_succeeded'
  | 'resume_upload_failed'
  | 'apply_abandoned'
  | 'apply_resumed'
  | 'apply_submitted'
  | 'apply_submit_failed'
  | 'talent_pool_submitted'
  | 'drive_board_row_clicked'
  | 'status_page_viewed'
  | 'outbound_click'

interface QueuedEvent {
  name: AnalyticsEventName
  sessionId: string
  path: string
  props: Record<string, unknown>
  jobId?: string | undefined
  driveId?: string | undefined
  referrer?: string | undefined
  utm?: Record<string, string> | undefined
  ts: string
}

// navigator.doNotTrack is already declared (deprecated but typed) in
// lib.dom.d.ts. globalPrivacyControl and window.doNotTrack are real,
// widely-implemented signals with no lib types at all — narrow, local
// extensions instead of casting through `any`.
interface NavigatorWithPrivacySignals extends Navigator {
  globalPrivacyControl?: boolean
}
interface WindowWithDoNotTrack extends Window {
  doNotTrack?: string | null
}

let eventQueue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const key = 'akshara_analytics_session'
    const stored = sessionStorage.getItem(key)
    const now = Date.now()

    if (stored) {
      const { id, lastActivity } = JSON.parse(stored)
      if (now - lastActivity < 30 * 60 * 1000) {
        sessionStorage.setItem(key, JSON.stringify({ id, lastActivity: now }))
        return id
      }
    }

    const newId = `s_${Math.random().toString(36).substring(2, 11)}_${now}`
    sessionStorage.setItem(key, JSON.stringify({ id: newId, lastActivity: now }))
    return newId
  } catch {
    return 'fallback_session'
  }
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const params = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const [k, v] of params.entries()) {
      if (k.startsWith('utm_') || k === 'ref') {
        utm[k] = v
      }
    }
    return utm
  } catch {
    return {}
  }
}

export function trackEvent(
  name: AnalyticsEventName,
  props: Record<string, unknown> = {},
  context?: { jobId?: string; driveId?: string }
) {
  if (typeof window === 'undefined') return

  try {
    // Respect Do Not Track / Global Privacy Control
    const isDNT =
      navigator.doNotTrack === '1' ||
      (window as WindowWithDoNotTrack).doNotTrack === '1' ||
      (navigator as NavigatorWithPrivacySignals).globalPrivacyControl === true

    if (isDNT && name !== 'page_view') {
      return
    }

    const sessionId = getSessionId()
    const path = window.location.pathname
    const referrer = document.referrer || undefined
    const utm = getUtmParams()

    const event: QueuedEvent = {
      name,
      sessionId,
      path,
      props,
      jobId: context?.jobId,
      driveId: context?.driveId,
      referrer,
      utm,
      ts: new Date().toISOString(),
    }

    eventQueue.push(event)

    if (eventQueue.length >= 20) {
      flushAnalytics()
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushAnalytics, 5000)
    }
  } catch {
    // Fail completely silently
  }
}

export function flushAnalytics() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (eventQueue.length === 0) return

  const eventsToSend = [...eventQueue]
  eventQueue = []

  try {
    const payload = JSON.stringify({ events: eventsToSend })
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/track', blob)
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Fails silently
  }
}

// Lifecycle listeners
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAnalytics()
    }
  })
  window.addEventListener('pagehide', flushAnalytics)
}
