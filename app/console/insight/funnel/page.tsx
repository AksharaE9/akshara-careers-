'use client'

/**
 * app/console/insight/funnel/page.tsx
 *
 * Screen 2 — Funnel & Form Analytics (§14.6).
 * Panels:
 *   A. Conversion Funnel (Stepped progress bar with counts & drop percentages)
 *   B. Field-level Drop-off Table
 *   C. Error Leaderboard
 *   D. Resume Upload Health
 *   E. Consented Abandonment Recovery
 */

import React, { useState, useEffect } from 'react'

const initialFunnelData = {
  funnelSteps: [
    { name: 'Careers Board Views', count: 1840, pct: '100%', medianMs: '4.2s' },
    { name: 'Job Detail Viewed', count: 1120, pct: '60.8%', medianMs: '12.4s' },
    { name: 'Apply CTA Clicked', count: 480, pct: '26.1%', medianMs: '1.2s' },
    { name: 'Step 1 Started (Personal)', count: 420, pct: '22.8%', medianMs: '42s' },
    { name: 'Step 1 Completed', count: 340, pct: '18.5%', medianMs: '58s' },
    { name: 'Step 2 Completed (Academic)', count: 290, pct: '15.7%', medianMs: '45s' },
    { name: 'Step 3 Completed (Resume)', count: 245, pct: '13.3%', medianMs: '38s' },
    { name: 'Application Submitted', count: 230, pct: '12.5%', medianMs: '3m 24s' },
  ],
  fieldDropoffs: [
    { field: 'phone_e164', focused: 410, completed: 350, abandonRate: '14.6%', medianMs: '18s', errorRate: '11.2%', topError: 'Invalid Indian mobile number' },
    { field: 'resume_upload', focused: 280, completed: 245, abandonRate: '12.5%', medianMs: '34s', errorRate: '3.4%', topError: 'File exceeds 5MB size limit' },
    { field: 'college_lookup', focused: 330, completed: 305, abandonRate: '7.6%', medianMs: '15s', errorRate: '2.1%', topError: 'Please select from list or enter name' },
    { field: 'full_name', focused: 420, completed: 405, abandonRate: '3.5%', medianMs: '8s', errorRate: '1.2%', topError: 'Full name is required' },
    { field: 'email', focused: 415, completed: 402, abandonRate: '3.1%', medianMs: '10s', errorRate: '2.4%', topError: 'Invalid email format' },
  ],
  errorLeaderboard: [
    { field: 'phone_e164', count: 46, message: 'Please enter a valid 10-digit Indian phone number.' },
    { field: 'resume_file', count: 18, message: 'Resume file size cannot exceed 5 MB.' },
    { field: 'email', count: 12, message: 'Please provide a valid email address.' },
    { field: 'consent', count: 8, message: 'DPDP compliance consent is required to proceed.' },
  ],
  resumeHealth: {
    successRate: '98.8%',
    medianUploadMs: 1420,
    totalUploads: 245,
    failureBreakdown: [
      { reason: 'File Exceeds 5MB', count: 9 },
      { reason: 'Invalid MIME / Magic Bytes', count: 3 },
      { reason: 'Network Disconnection (4G/3G)', count: 2 },
    ],
  },
}

export default function FunnelAnalyticsPage() {
  const [data, setData] = useState<any>(initialFunnelData)
  const [loading, setLoading] = useState(false)
  const [connectionFilter, setConnectionFilter] = useState('all')

  const fetchFunnel = async (conn = connectionFilter) => {
    try {
      const res = await fetch(`/api/console/funnel?connection=${conn}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchFunnel(connectionFilter)
  }, [connectionFilter])

  return (
    <div className="space-y-6">
      {/* Page Title & Connection Segment Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Applicant Drop-Off Diagnostics
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Funnel & Form Analytics
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-(--font-size-step--2) font-mono text-(--color-graphite)">Segment by Connection:</label>
          <select
            data-testid="funnel-segment-select"
            value={connectionFilter}
            onChange={(e) => setConnectionFilter(e.target.value)}
            className="h-9 px-3 bg-white border border-(--color-ink-900)/15 rounded-lg text-(--font-size-step--1) font-mono focus:outline-none focus:border-(--color-marigold)"
          >
            <option value="all">All Connections (4G / 3G / Wifi)</option>
            <option value="4g">4G High-Speed</option>
            <option value="3g">3G Standard</option>
            <option value="slow-2g">Slow-2G Corridor Mobile</option>
          </select>
        </div>
      </div>

      {loading || !data ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-white border border-(--color-ink-900)/10 rounded-xl" />
          <div className="h-48 bg-white border border-(--color-ink-900)/10 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Panel A: The Conversion Funnel */}
          <div data-testid="funnel-chart" className="bg-white border border-(--color-ink-900)/10 rounded-xl p-5 shadow-xs">
            <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-1">
              End-to-End Application Journey
            </h2>
            <p className="text-(--font-size-step--2) text-(--color-graphite) mb-5">
              Progression rates and median step durations across the candidate funnel
            </p>

            <div className="space-y-3">
              {data.funnelSteps.map((step: any, idx: number) => {
                const widthPct = parseFloat(step.pct)
                return (
                  <div key={step.name} className="space-y-1">
                    <div className="flex items-center justify-between text-(--font-size-step--1)">
                      <span className="font-medium text-(--color-ink-900)">
                        {idx + 1}. {step.name}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-(--font-size-step--2)">
                        <span className="text-(--color-graphite)">⏱ {step.medianMs}</span>
                        <span className="text-(--color-ink-900) font-bold tabular-nums">{step.count} candidates ({step.pct})</span>
                      </div>
                    </div>
                    <div className="h-3.5 bg-(--color-ink-900)/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-(--color-marigold) rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, widthPct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel B: Field-level Drop-Off Table */}
          <div data-testid="field-dropoff-table" className="bg-white border border-(--color-ink-900)/10 rounded-xl p-5 shadow-xs">
            <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-1">
              Field-Level Drop-Off Diagnostics
            </h2>
            <p className="text-(--font-size-step--2) text-(--color-graphite) mb-4">
              Identify friction points where candidates pause, trigger validation errors, or abandon form inputs
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-(--font-size-step--1)">
                <thead>
                  <tr className="border-b border-(--color-ink-900)/10 font-mono text-(--font-size-step--2) uppercase text-(--color-graphite)">
                    <th className="py-2.5">Field</th>
                    <th className="py-2.5">Focused</th>
                    <th className="py-2.5">Completed</th>
                    <th className="py-2.5">Abandon Rate</th>
                    <th className="py-2.5">Median Time</th>
                    <th className="py-2.5">Error Rate</th>
                    <th className="py-2.5">Top Error Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-ink-900)/5">
                  {data.fieldDropoffs.map((f: any) => (
                    <tr key={f.field} className="hover:bg-(--color-chalk)">
                      <td className="py-3 font-mono font-medium text-(--color-ink-900)">{f.field}</td>
                      <td className="py-3 font-mono tabular-nums">{f.focused}</td>
                      <td className="py-3 font-mono tabular-nums">{f.completed}</td>
                      <td className="py-3 font-mono font-bold text-(--color-kumkum)">{f.abandonRate}</td>
                      <td className="py-3 font-mono">{f.medianMs}</td>
                      <td className="py-3 font-mono">{f.errorRate}</td>
                      <td className="py-3 text-(--color-graphite) italic">{f.topError}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panels C & D: Error Leaderboard & Resume Upload Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel C: Error Leaderboard */}
            <div className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs">
              <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-1">
                Top Form Validation Errors
              </h2>
              <p className="text-(--font-size-step--2) text-(--color-graphite) mb-3">
                Most frequent blocker messages shown to candidates
              </p>
              <div className="space-y-2">
                {data.errorLeaderboard.map((err: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-(--color-chalk) border border-(--color-ink-900)/5 flex items-start justify-between text-(--font-size-step--1)">
                    <div>
                      <span className="font-mono text-(--font-size-step--2) text-(--color-marigold) font-semibold uppercase">{err.field}</span>
                      <p className="text-(--color-ink-900) font-medium mt-0.5">{err.message}</p>
                    </div>
                    <span className="font-mono font-bold text-(--color-kumkum) px-2 py-0.5 rounded bg-(--color-kumkum)/10">
                      {err.count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel D: Resume Upload Health */}
            <div data-testid="resume-health-panel" className="bg-white border border-(--color-ink-900)/10 rounded-xl p-4 shadow-xs">
              <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900) mb-1">
                Resume Direct Upload Health
              </h2>
              <p className="text-(--font-size-step--2) text-(--color-graphite) mb-3">
                Cloudflare R2 pre-signed upload latency and MIME sniff checks
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 bg-(--color-chalk) rounded-lg">
                  <span className="text-(--font-size-step--2) text-(--color-graphite)">Success Rate</span>
                  <div className="text-(--font-size-step-1) font-mono font-bold text-(--color-leaf)">{data.resumeHealth.successRate}</div>
                </div>
                <div className="p-3 bg-(--color-chalk) rounded-lg">
                  <span className="text-(--font-size-step--2) text-(--color-graphite)">Median Duration</span>
                  <div className="text-(--font-size-step-1) font-mono font-bold text-(--color-ink-900)">{data.resumeHealth.medianUploadMs} ms</div>
                </div>
              </div>
              <div className="space-y-1.5 text-(--font-size-step--2)">
                <span className="font-semibold text-(--color-graphite) uppercase font-mono">Failure Breakdown</span>
                {data.resumeHealth.failureBreakdown.map((f: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-(--color-ink-900)/5 font-mono">
                    <span className="text-(--color-ink-900)">{f.reason}</span>
                    <span className="text-(--color-kumkum) font-bold">{f.count} incidents</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel E: Consented Abandonment Recovery */}
          <div data-testid="abandonment-panel" className="bg-white border border-(--color-ink-900)/10 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-(--font-size-step-0) font-bold text-(--color-ink-900)">
                  Abandonment Recovery (DPDP Consented Candidates)
                </h2>
                <p className="text-(--font-size-step--2) text-(--color-graphite)">
                  Candidates who completed Step 1 and accepted data consent but dropped off at Step 2 or 3
                </p>
              </div>
              <span className="font-mono text-(--font-size-step--2) px-2 py-1 rounded bg-(--color-leaf)/15 text-(--color-leaf) font-semibold">
                🔒 Gated by Consent Check
              </span>
            </div>

            <div className="p-4 bg-(--color-chalk) rounded-lg border border-(--color-ink-900)/5 text-(--font-size-step--1) text-(--color-graphite)">
              <p>
                No abandoned candidate sessions recorded in the current active date window.
                When candidates abandon unsubmitted forms after completing Step 1 consent, they appear here with 1-click WhatsApp recovery links.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
