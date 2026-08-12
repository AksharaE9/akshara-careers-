'use client'

/**
 * app/console/page.tsx
 *
 * Screen 1 — Pulse Dashboard (§14.5).
 * Safe, loop-free, real-data-only implementation of the recruiter dashboard.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { getFreshnessLabel, useRealtime } from '@/lib/console/use-realtime'
import { type Metric, type DistributionItem } from '@/lib/console/metrics'

interface PulseData {
  kpis: {
    applications: Metric<number>
    applyConversionRate: Metric<string>
    uniqueVisitors: Metric<number>
    jobViews: Metric<number>
    avgTimeToComplete: Metric<string>
    resumeSuccessRate: Metric<string>
    appSparkline: number[] | null
    conversionSparkline: number[] | null
    visitorsSparkline: number[] | null
    viewsSparkline: number[] | null
    timeSparkline: number[] | null
    resumeSparkline: number[] | null
  }
  pipelineSnapshot: Record<string, number>
  channelBreakdown: DistributionItem[]
  liveFeed: Array<{
    id: string
    publicId: string
    candidateName: string
    jobTitle: string
    collegeName: string
    stage: string
    submittedAt: string
  }>
  liveDrives: Array<{
    id: string
    code: string
    venue: string | null
    driveDate: string
    seats: number | null
    status: string
    viewCount: number | null
    collegeName: string
  }>
  attentionItems: Array<{
    id: string
    severity: 'P1' | 'P2' | 'P3'
    message: string
    href: string
  }>
  lastUpdated: string
}

function MiniSparkline({ data, color }: { data: number[] | null; color?: string | undefined }) {
  if (!data || data.length === 0) return null
  const strokeColor = color ?? 'var(--color-marigold)'
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 24
  const width = 80
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function PulseTile({
  title,
  metric,
  sparklineData,
  sparklineColor,
  testId,
}: {
  title: string
  metric: Metric<any>
  sparklineData: number[] | null
  sparklineColor?: string
  testId: string
}) {
  const isUnavailable = Boolean(metric.unavailable)
  const isInsufficient = metric.comparison.status === 'insufficient'

  return (
    <div
      data-testid={testId}
      className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
    >
      <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">{title}</span>
      <div className="my-1.5 flex items-baseline justify-between gap-1">
        {isUnavailable ? (
          <span className="text-(--font-size-step--1) text-(--color-muted) font-medium italic">
            Not yet tracked
          </span>
        ) : (
          <span
            data-testid="pulse-tile-value"
            className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)"
          >
            {metric.value}
          </span>
        )}
        {!isUnavailable && sparklineData && (
          <MiniSparkline data={sparklineData} color={sparklineColor} />
        )}
      </div>
      
      {isUnavailable ? (
        <span
          data-testid="pulse-tile-delta"
          className="text-(--font-size-step--2) font-mono text-(--color-ink-400)"
        >
          —
        </span>
      ) : isInsufficient ? (
        <span
          data-testid="pulse-tile-delta"
          className="text-(--font-size-step--2) font-mono text-(--color-ink-400) cursor-help"
          title={`Insufficient data: ${metric.comparison.reason}`}
        >
          —
        </span>
      ) : (
        <span
          data-testid="pulse-tile-delta"
          className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium"
        >
          {metric.comparison.delta} vs prev 7d
        </span>
      )}
    </div>
  )
}

export default function PulseDashboardPage() {
  const [data, setData] = useState<PulseData | null>(null)
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date | null>(null)
  const [freshnessText, setFreshnessText] = useState('Offline')

  const lastFetchTimeRef = useRef<number>(0)
  const fetchActiveControllerRef = useRef<AbortController | null>(null)

  const fetchPulse = useCallback(async (options?: { silent?: boolean }) => {
    const nowMs = Date.now()
    // Coalesce refetches to max once per 10s unless manual force
    if (options?.silent && nowMs - lastFetchTimeRef.current < 10000) {
      return
    }

    if (fetchActiveControllerRef.current) {
      fetchActiveControllerRef.current.abort()
    }
    fetchActiveControllerRef.current = new AbortController()

    try {
      const res = await fetch('/api/console/pulse', {
        signal: fetchActiveControllerRef.current.signal,
      })
      if (res.ok) {
        const pulse = await res.json()
        setData(pulse)
        setDataUpdatedAt(new Date())
        lastFetchTimeRef.current = Date.now()
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Pulse fetch error:', err)
    }
  }, [])

  // Subscribe to real-time events without navigation refresh loop
  const { status } = useRealtime({
    onEvent: (type) => {
      // Trigger a silent refetch of the dashboard metrics
      fetchPulse({ silent: true })
    },
  })

  // Poll as absolute backup transport (every 60s when connected, 20s when not)
  useEffect(() => {
    fetchPulse()

    const interval = setInterval(
      () => {
        fetchPulse({ silent: true })
      },
      status === 'connected' ? 60000 : 20000
    )

    return () => {
      clearInterval(interval)
    }
  }, [fetchPulse, status])

  // Update freshness text on a 1-second ticker
  useEffect(() => {
    const updateFreshness = () => {
      setFreshnessText(getFreshnessLabel(dataUpdatedAt, status))
    }
    updateFreshness()

    const ticker = setInterval(updateFreshness, 1000)
    return () => clearInterval(ticker)
  }, [dataUpdatedAt, status])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-(--color-graphite)">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-(--color-ink-900) border-t-transparent animate-spin" />
          Loading Operations Pulse...
        </div>
      </div>
    )
  }

  const stagesList = [
    { key: 'received', label: 'Received', color: 'bg-blue-500' },
    { key: 'under_review', label: 'Review', color: 'bg-amber-500' },
    { key: 'shortlisted', label: 'Shortlist', color: 'bg-purple-500' },
    { key: 'interview_scheduled', label: 'Interview', color: 'bg-indigo-500' },
    { key: 'offered', label: 'Offered', color: 'bg-emerald-500' },
    { key: 'hired', label: 'Hired', color: 'bg-green-600' },
  ]

  const totalPipeline = Object.values(data.pipelineSnapshot).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-6">
      {/* Header & Live Freshness Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) tracking-wider font-semibold">
            System Overview · Real-Time
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Operations Pulse
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-(--font-size-step--2) font-mono text-(--color-graphite)">
            Last updated: <strong className="text-(--color-ink-900)" data-testid="pulse-freshness">{freshnessText}</strong>
          </span>
          <button
            type="button"
            onClick={() => fetchPulse()}
            className="px-2.5 py-1 bg-white border border-(--color-ink-900)/15 rounded text-(--font-size-step--2) font-mono hover:bg-(--color-ink-900)/5 text-(--color-ink-900)"
          >
            Refresh ⟳
          </button>
        </div>
      </div>

      {/* Row 1 — Six KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <PulseTile
          title="Applications"
          metric={data.kpis.applications}
          sparklineData={data.kpis.appSparkline}
          testId="pulse-tile-applications"
        />

        <PulseTile
          title="Start ➔ Submit"
          metric={data.kpis.applyConversionRate}
          sparklineData={data.kpis.conversionSparkline}
          sparklineColor="#059669"
          testId="pulse-tile-conversion"
        />

        <PulseTile
          title="Unique Visitors"
          metric={data.kpis.uniqueVisitors}
          sparklineData={data.kpis.visitorsSparkline}
          sparklineColor="#2563eb"
          testId="pulse-tile-visitors"
        />

        <PulseTile
          title="Job Views"
          metric={data.kpis.jobViews}
          sparklineData={data.kpis.viewsSparkline}
          sparklineColor="#7c3aed"
          testId="pulse-tile-views"
        />

        <PulseTile
          title="Avg. Completion"
          metric={data.kpis.avgTimeToComplete}
          sparklineData={data.kpis.timeSparkline}
          sparklineColor="#0d9488"
          testId="pulse-tile-avgtime"
        />

        <PulseTile
          title="Resume Uploads"
          metric={data.kpis.resumeSuccessRate}
          sparklineData={data.kpis.resumeSparkline}
          sparklineColor="#16a34a"
          testId="pulse-tile-resume"
        />
      </div>

      {/* Row 2 — Applications Over Time & Breakdown */}
      <div className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900)">
              Application Velocity by Channel
            </h2>
            <p className="text-(--font-size-step--2) text-(--color-graphite)">
              Volume breakdown across Campus Drives, Organic Search, Referrals & Direct QR
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-(--font-size-step--2) font-mono font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300">
              Live Distribution
            </span>
          </div>
        </div>

        {/* Visual Channel Breakdown Bars */}
        <div className="space-y-3 pt-2" data-testid="channel-breakdown">
          {data.channelBreakdown.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-(--font-size-step--2) font-mono">
                <span className="font-medium text-(--color-ink-900)">
                  {item.key === 'campus_drive' ? '🎓' : item.key === 'organic' ? '🔍' : item.key === 'referral' ? '🤝' : item.key === 'job_board' ? '💼' : '🌐'} {item.label}
                </span>
                <span className="text-(--color-graphite) tabular-nums font-bold">
                  {item.share} · {item.count} apps
                </span>
              </div>
              <div className="h-3 bg-(--color-ink-900)/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.key === 'campus_drive'
                      ? 'bg-(--color-marigold)'
                      : item.key === 'organic'
                      ? 'bg-blue-600'
                      : item.key === 'referral'
                      ? 'bg-purple-600'
                      : item.key === 'job_board'
                      ? 'bg-indigo-600'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: item.share }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Accessible Data Table Alternative (§14.21) */}
        <details className="mt-4 pt-3 border-t border-(--color-ink-900)/10 text-(--font-size-step--2)">
          <summary className="cursor-pointer text-(--color-graphite) hover:text-(--color-ink-900) font-mono">
            View Accessible Data Table
          </summary>
          <table className="w-full mt-2 text-left border-collapse">
            <thead>
              <tr className="border-b border-(--color-ink-900)/10 text-(--color-graphite)">
                <th className="py-1">Channel</th>
                <th className="py-1">Share</th>
                <th className="py-1 text-right">Volume</th>
              </tr>
            </thead>
            <tbody>
              {data.channelBreakdown.map((item) => (
                <tr key={item.key} className="border-b border-(--color-ink-900)/5 last:border-0">
                  <td className="py-1">{item.label}</td>
                  <td className="py-1">{item.share}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      {/* Row 3 — Three Panels (Live Feed, Pipeline Snapshot, Today's Drives) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Live Activity Feed */}
        <div
          data-testid="live-feed"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs flex flex-col h-[340px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900)">
              Live Activity Stream
            </h2>
            {status === 'connected' ? (
              <span className="w-2 h-2 rounded-full bg-(--color-leaf) animate-pulse" title="Live connection active" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-(--color-ink-300)" title="Offline / Polling mode active" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-(--color-ink-900)/5">
            {data.liveFeed.length === 0 ? (
              <p className="text-(--font-size-step--1) text-(--color-graphite) py-8 text-center" data-testid="empty-state">No activity recorded yet.</p>
            ) : (
              data.liveFeed.map((item) => (
                <div
                  key={item.id}
                  data-testid="live-feed-row"
                  className="pt-2 first:pt-0 flex flex-col text-(--font-size-step--1)"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-(--color-ink-900)">{item.candidateName}</span>
                    <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">
                      {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-(--font-size-step--2) text-(--color-graphite)">
                    Applied for <strong className="text-(--color-ink-900)">{item.jobTitle}</strong>
                  </span>
                  <span className="text-(--font-size-step--2) text-(--color-ink-400) truncate">
                    🏛️ {item.collegeName}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Pipeline Funnel Snapshot */}
        <div className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-1">
              Active Pipeline Snapshot
            </h2>
            <p className="text-(--font-size-step--2) text-(--color-graphite) mb-4">
              Current candidate distribution across hiring stages
            </p>

            {/* Funnel Progress Distribution Bar */}
            <div className="h-4 w-full bg-(--color-ink-900)/5 rounded-full overflow-hidden flex mb-4">
              {stagesList.map((st) => {
                const count = data.pipelineSnapshot[st.key] || 0
                const widthPct = (count / totalPipeline) * 100
                if (widthPct === 0) return null
                return (
                  <div
                    key={st.key}
                    title={`${st.label}: ${count}`}
                    style={{ width: `${widthPct}%` }}
                    className={`${st.color} h-full transition-all`}
                  />
                )
              })}
            </div>

            {/* Stage Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2 text-(--font-size-step--1)">
              {stagesList.map((st) => {
                const count = data.pipelineSnapshot[st.key] || 0
                return (
                  <Link
                    key={st.key}
                    href={`/console/applications?stage=${st.key}`}
                    className="p-2 rounded-lg bg-(--color-chalk) hover:bg-(--color-marigold)/10 flex items-center justify-between transition-colors border border-(--color-ink-900)/5"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                      <span className="text-(--color-graphite) font-medium">{st.label}</span>
                    </div>
                    <span className="font-mono font-bold text-(--color-ink-900) tabular-nums">
                      {count}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <Link
            href="/console/applications"
            className="mt-4 text-center py-2 rounded-lg bg-(--color-ink-900)/5 hover:bg-(--color-ink-900)/10 text-(--font-size-step--1) font-medium text-(--color-ink-900) transition-colors"
          >
            Open Kanban Pipeline &rarr;
          </Link>
        </div>

        {/* Panel 3: Today's Drives */}
        <div className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900)">
                Campus Hiring Drives
              </h2>
              <Link href="/console/drives" className="text-(--font-size-step--2) text-(--color-marigold) underline font-medium">
                Manage
              </Link>
            </div>
            <p className="text-(--font-size-step--2) text-(--color-graphite) mb-3">
              Active schedules, QR allocations & attendance
            </p>

            <div className="space-y-2.5" data-testid="live-drives">
              {data.liveDrives.length === 0 ? (
                <div className="p-6 text-center text-(--font-size-step--1) text-(--color-graphite)">
                  No live drives scheduled today.
                </div>
              ) : (
                data.liveDrives.slice(0, 3).map((drv) => (
                  <div key={drv.id} className="p-2.5 rounded-lg border border-(--color-ink-900)/10 bg-(--color-chalk) text-(--font-size-step--1)">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-(--color-ink-900)">{drv.code}</span>
                      <span className="font-mono text-(--font-size-step--2) px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold uppercase">
                        {drv.status}
                      </span>
                    </div>
                    <p className="font-medium text-(--color-ink-900) truncate mt-0.5">{drv.collegeName}</p>
                    <div className="flex items-center justify-between text-(--font-size-step--2) text-(--color-graphite) mt-1 font-mono">
                      <span>Seats: {drv.seats || 50}</span>
                      <span>QR Scans: {drv.viewCount || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/console/insight/drives"
            className="mt-4 text-center py-2 rounded-lg bg-(--color-ink-900)/5 hover:bg-(--color-ink-900)/10 text-(--font-size-step--1) font-medium text-(--color-ink-900) transition-colors"
          >
            View Drives Analytics &rarr;
          </Link>
        </div>
      </div>

      {/* Row 4 — Attention Required (§14.5) */}
      <div className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs">
        <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-2 flex items-center gap-2">
          <span>🚨</span> Attention Required
        </h2>

        {data.attentionItems.length === 0 ? (
          <p className="text-(--font-size-step--1) text-(--color-leaf) font-medium py-2">
            ✓ Nothing needs attention. All systems, drives, and data pipelines are healthy.
          </p>
        ) : (
          <div className="space-y-2">
            {data.attentionItems.map((item) => (
              <div
                key={item.id}
                data-testid={`pulse-attention-${item.severity}`}
                className={`p-3 rounded-lg flex items-center justify-between border ${
                  item.severity === 'P1'
                    ? 'bg-(--color-kumkum)/10 border-(--color-kumkum)/20 text-(--color-kumkum)'
                    : item.severity === 'P2'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-(--font-size-step--2) px-1.5 py-0.5 rounded bg-white/60">
                    {item.severity}
                  </span>
                  <span className="text-(--font-size-step--1) font-medium">{item.message}</span>
                </div>
                <Link
                  href={item.href}
                  className="text-(--font-size-step--1) font-semibold underline ml-4 hover:opacity-80"
                >
                  Resolve &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
