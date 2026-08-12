'use client'

/**
 * components/analytics/AnalyticsTracker.tsx
 *
 * Client component to fire analytics events on mount (Task 5).
 * Enables first-party tracking on Server Component pages.
 */

import { useEffect } from 'react'
import { trackEvent, type AnalyticsEventName } from '@/lib/analytics/track'
import { useSearchParams } from 'next/navigation'

interface AnalyticsTrackerProps {
  name: AnalyticsEventName
  path?: string
  jobId?: string
  driveId?: string
  props?: Record<string, unknown>
}

export function AnalyticsTracker({
  name,
  path,
  jobId,
  driveId,
  props,
}: AnalyticsTrackerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Derive UTM params from searchParams
    const utm: Record<string, string> = {}
    if (searchParams) {
      for (const [k, v] of searchParams.entries()) {
        if (k.startsWith('utm_') || k === 'ref') {
          utm[k] = v
        }
      }
    }

    trackEvent(name, {
      path: path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      jobId,
      driveId,
      utm,
      props: props || {},
    })
  }, [name, path, jobId, driveId, props, searchParams])

  return null
}
