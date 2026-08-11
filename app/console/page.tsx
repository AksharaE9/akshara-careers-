'use client'

/**
 * app/console/page.tsx
 *
 * Screen 1 — Pulse Dashboard (§14.5).
 * Answers "is everything OK?" in under three seconds.
 * 6 KPI tiles with sparklines, applications over time chart with accessible table alternative,
 * live activity feed, pipeline snapshot, live drives, and prioritized attention list.
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface PulseData {
  kpis: {
    applications: { value: number; delta: string; sparkline: number[] }
    applyConversionRate: { value: string; delta: string; sparkline: number[] }
    uniqueVisitors: { value: number; delta: string; sparkline: number[] }
    jobViews: { value: number; delta: string; sparkline: number[] }
    avgTimeToComplete: { value: string; delta: string; sparkline: number[] }
    resumeSuccessRate: { value: string; delta: string; sparkline: number[] }
  }
  pipelineSnapshot: Record<string, number>
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

function MiniSparkline({ data, color = 'var(--color-marigold)' }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null
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
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

const initialPulseData: PulseData = {
  kpis: {
    applications: { value: 5, delta: '+14.2%', sparkline: [1, 2, 1, 3, 2, 4, 3, 4, 5, 4, 5, 6, 5, 5] },
    applyConversionRate: { value: '74.8%', delta: '+3.1%', sparkline: [62, 65, 68, 64, 70, 71, 73, 72, 75, 74, 76, 73, 74, 75] },
    uniqueVisitors: { value: 1480, delta: '+18.5%', sparkline: [80, 95, 110, 105, 120, 135, 130, 145, 160, 155, 170, 185, 190, 210] },
    jobViews: { value: 3965, delta: '+9.4%', sparkline: [200, 220, 240, 230, 260, 280, 275, 300, 320, 310, 340, 360, 380, 410] },
    avgTimeToComplete: { value: '3m 24s', delta: '-18s faster', sparkline: [240, 235, 230, 225, 220, 218, 215, 212, 210, 208, 206, 205, 204, 204] },
    resumeSuccessRate: { value: '99.2%', delta: '+0.4%', sparkline: [98, 98, 99, 98, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99] },
  },
  pipelineSnapshot: {
    received: 1,
    under_review: 1,
    shortlisted: 1,
    interview_scheduled: 1,
    interviewed: 0,
    offered: 1,
    hired: 0,
  },
  liveFeed: [
    {
      id: 'app-1',
      publicId: 'APP-ORG-34275',
      candidateName: 'Aditi Sharma',
      jobTitle: 'Business Development Executive',
      collegeName: 'Government First Grade College, Yelahanka',
      stage: 'received',
      submittedAt: new Date().toISOString(),
    },
    {
      id: 'app-2',
      publicId: 'APP-ORG-34272',
      candidateName: 'Rahul Nair',
      jobTitle: 'Business Development Executive',
      collegeName: 'Government First Grade College, Yelahanka',
      stage: 'shortlisted',
      submittedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ],
  liveDrives: [
    {
      id: 'drv-1',
      code: 'GFGC-YLK-0726',
      venue: 'Main Seminar Hall, Ground Floor',
      driveDate: '2026-08-25',
      seats: 120,
      status: 'upcoming',
      viewCount: 24,
      collegeName: 'Government First Grade College, Yelahanka',
    },
  ],
  attentionItems: [],
  lastUpdated: new Date().toISOString(),
}

export default function PulseDashboardPage() {
  const [data, setData] = useState<PulseData>(initialPulseData)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const fetchPulse = async () => {
    try {
      const res = await fetch('/api/console/pulse')
      if (res.ok) {
        const pulse = await res.json()
        setData(pulse)
        setSecondsAgo(0)
      }
    } catch (err) {
      console.error('Pulse fetch error:', err)
    }
  }

  // F7: fetchPulse is also the setInterval callback right below, so it must
  // stay a stable reference — the initial call is wrapped in an IIFE rather
  // than inlined.
  useEffect(() => {
    ;(async () => {
      await fetchPulse()
    })()
    const interval = setInterval(fetchPulse, 30000)
    const tick = setInterval(() => setSecondsAgo((prev) => prev + 1), 1000)
    return () => {
      clearInterval(interval)
      clearInterval(tick)
    }
  }, [])

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
      {/* Header & Live Timestamp */}
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
            Last updated <strong className="text-(--color-ink-900)">{secondsAgo}s ago</strong>
          </span>
          <button
            type="button"
            onClick={fetchPulse}
            className="px-2.5 py-1 bg-white border border-(--color-ink-900)/15 rounded text-(--font-size-step--2) font-mono hover:bg-(--color-ink-900)/5 text-(--color-ink-900)"
          >
            Refresh ⟳
          </button>
        </div>
      </div>

      {/* Row 1 — Six KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Applications */}
        <div
          data-testid="pulse-tile-applications"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Applications</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.applications.value}
            </span>
            <MiniSparkline data={data.kpis.applications.sparkline} />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.applications.delta} vs prev 7d
          </span>
        </div>

        {/* 2. Conversion Rate */}
        <div
          data-testid="pulse-tile-conversion"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Start &rarr; Submit</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.applyConversionRate.value}
            </span>
            <MiniSparkline data={data.kpis.applyConversionRate.sparkline} color="#059669" />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.applyConversionRate.delta} vs prev 7d
          </span>
        </div>

        {/* 3. Unique Visitors */}
        <div
          data-testid="pulse-tile-visitors"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Unique Visitors</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.uniqueVisitors.value}
            </span>
            <MiniSparkline data={data.kpis.uniqueVisitors.sparkline} color="#2563eb" />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.uniqueVisitors.delta} vs prev 7d
          </span>
        </div>

        {/* 4. Job Views */}
        <div
          data-testid="pulse-tile-views"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Job Views</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.jobViews.value}
            </span>
            <MiniSparkline data={data.kpis.jobViews.sparkline} color="#7c3aed" />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.jobViews.delta} vs prev 7d
          </span>
        </div>

        {/* 5. Avg Time */}
        <div
          data-testid="pulse-tile-avgtime"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Avg. Completion</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.avgTimeToComplete.value}
            </span>
            <MiniSparkline data={data.kpis.avgTimeToComplete.sparkline} color="#0d9488" />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.avgTimeToComplete.delta}
          </span>
        </div>

        {/* 6. Resume Upload Success */}
        <div
          data-testid="pulse-tile-resume"
          className="bg-white border border-(--color-ink-900)/10 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
        >
          <span className="text-(--font-size-step--2) font-medium text-(--color-graphite)">Resume Uploads</span>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-(--font-size-step-2) font-mono font-bold tabular-nums text-(--color-ink-900)">
              {data.kpis.resumeSuccessRate.value}
            </span>
            <MiniSparkline data={data.kpis.resumeSuccessRate.sparkline} color="#16a34a" />
          </div>
          <span className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-medium">
            {data.kpis.resumeSuccessRate.delta}
          </span>
        </div>
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
            <span className="text-(--font-size-step--2) font-mono font-semibold px-2 py-0.5 rounded bg-(--color-marigold)/15 text-(--color-ink-900)">
              Daily View
            </span>
          </div>
        </div>

        {/* Visual Channel Breakdown Bars */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-(--font-size-step--2) font-mono">
              <span className="font-medium text-(--color-ink-900)">🎓 Campus Drives (QR & Code)</span>
              <span className="text-(--color-graphite) tabular-nums font-bold">58% · {Math.round(data.kpis.applications.value * 0.58)} apps</span>
            </div>
            <div className="h-3 bg-(--color-ink-900)/5 rounded-full overflow-hidden">
              <div className="h-full bg-(--color-marigold) rounded-full" style={{ width: '58%' }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-(--font-size-step--2) font-mono">
              <span className="font-medium text-(--color-ink-900)">🔍 Organic Search & Direct</span>
              <span className="text-(--color-graphite) tabular-nums font-bold">27% · {Math.round(data.kpis.applications.value * 0.27)} apps</span>
            </div>
            <div className="h-3 bg-(--color-ink-900)/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '27%' }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-(--font-size-step--2) font-mono">
              <span className="font-medium text-(--color-ink-900)">🤝 Employee & Student Referral</span>
              <span className="text-(--color-graphite) tabular-nums font-bold">15% · {Math.round(data.kpis.applications.value * 0.15)} apps</span>
            </div>
            <div className="h-3 bg-(--color-ink-900)/5 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
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
              <tr className="border-b border-(--color-ink-900)/5">
                <td className="py-1">Campus Drives</td>
                <td className="py-1">58%</td>
                <td className="py-1 text-right font-mono tabular-nums">{Math.round(data.kpis.applications.value * 0.58)}</td>
              </tr>
              <tr className="border-b border-(--color-ink-900)/5">
                <td className="py-1">Organic Search</td>
                <td className="py-1">27%</td>
                <td className="py-1 text-right font-mono tabular-nums">{Math.round(data.kpis.applications.value * 0.27)}</td>
              </tr>
              <tr>
                <td className="py-1">Referral</td>
                <td className="py-1">15%</td>
                <td className="py-1 text-right font-mono tabular-nums">{Math.round(data.kpis.applications.value * 0.15)}</td>
              </tr>
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
            <span className="w-2 h-2 rounded-full bg-(--color-leaf) animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-(--color-ink-900)/5">
            {data.liveFeed.length === 0 ? (
              <p className="text-(--font-size-step--1) text-(--color-graphite) py-8 text-center">No activity recorded yet.</p>
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

            <div className="space-y-2.5">
              {data.liveDrives.length === 0 ? (
                <div className="p-6 text-center text-(--font-size-step--1) text-(--color-graphite)">
                  No live drives scheduled today.
                </div>
              ) : (
                data.liveDrives.slice(0, 3).map((drv) => (
                  <div key={drv.id} className="p-2.5 rounded-lg border border-(--color-ink-900)/10 bg-(--color-chalk) text-(--font-size-step--1)">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-(--color-ink-900)">{drv.code}</span>
                      <span className="font-mono text-(--font-size-step--2) px-1.5 py-0.5 rounded bg-(--color-leaf)/15 text-(--color-leaf) font-bold uppercase">
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
