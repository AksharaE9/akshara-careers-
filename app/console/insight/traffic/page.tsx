'use client'

/**
 * app/console/insight/traffic/page.tsx
 *
 * Screen 8 — Traffic & Real-User Core Web Vitals Attribution (§14.12).
 */

import React, { useState, useEffect } from 'react'

export default function TrafficAttributionPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchTraffic = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/console/insight/traffic')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTraffic()
  }, [])

  if (loading || !data) {
    return <div className="animate-pulse h-96 bg-white border border-[--color-ink-900]/10 rounded-xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[--color-ink-900]/10">
        <div>
          <span className="font-mono text-[--font-size-step--2] uppercase text-[--color-graphite] font-semibold tracking-wider">
            Audience & Performance RUM
          </span>
          <h1 className="text-[--font-size-step-2] font-bold text-[--color-ink-900] tracking-tight">
            Traffic, Devices & Core Web Vitals
          </h1>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-[--color-ink-900]/10">
          <span className="text-[--font-size-step--2] text-[--color-graphite]">Unique Visitors</span>
          <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-ink-900]">{data.summary.visitors}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-[--color-ink-900]/10">
          <span className="text-[--font-size-step--2] text-[--color-graphite]">Sessions</span>
          <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-ink-900]">{data.summary.sessions}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-[--color-ink-900]/10">
          <span className="text-[--font-size-step--2] text-[--color-graphite]">Page Views</span>
          <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-ink-900]">{data.summary.pageViews}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-[--color-ink-900]/10">
          <span className="text-[--font-size-step--2] text-[--color-graphite]">Bounce Rate</span>
          <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-ink-900]">{data.summary.bounceRate}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-[--color-ink-900]/10">
          <span className="text-[--font-size-step--2] text-[--color-graphite]">Median Session</span>
          <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-ink-900]">{data.summary.medianSessionDuration}</div>
        </div>
      </div>

      {/* Real-User Core Web Vitals Panel */}
      <div className="bg-white border border-[--color-ink-900]/10 rounded-xl p-5 shadow-xs">
        <h2 className="text-[--font-size-step-0] font-bold text-[--color-ink-900] mb-1">
          Real-User Core Web Vitals (p75 Field Metrics)
        </h2>
        <p className="text-[--font-size-step--2] text-[--color-graphite] mb-4">
          Measured from real candidate mobile devices across 4G & 3G networks (§14.12)
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.webVitals.map((wv: any) => (
            <div key={wv.metric} className="p-3.5 rounded-lg bg-[--color-chalk] border border-[--color-ink-900]/10">
              <span className="text-[--font-size-step--2] text-[--color-graphite] font-mono">{wv.metric}</span>
              <div className="text-[--font-size-step-2] font-mono font-bold text-[--color-leaf] my-1">{wv.p75}</div>
              <span className="text-[--font-size-step--2] font-mono text-[--color-ink-400]">Target: {wv.target} · Pass</span>
            </div>
          ))}
        </div>
      </div>

      {/* Devices & Network Connections Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Breakdown */}
        <div className="bg-white border border-[--color-ink-900]/10 rounded-xl p-4 shadow-xs">
          <h3 className="text-[--font-size-step-0] font-bold text-[--color-ink-900] mb-3">Device Distribution</h3>
          <div className="space-y-2 text-[--font-size-step--1]">
            <div className="flex justify-between font-mono">
              <span>📱 Mobile (Android & iOS)</span>
              <strong className="text-[--color-leaf]">{data.devices.mobile}</strong>
            </div>
            <div className="h-2.5 bg-[--color-ink-900]/5 rounded-full overflow-hidden">
              <div className="h-full bg-[--color-leaf] rounded-full" style={{ width: data.devices.mobile }} />
            </div>

            <div className="flex justify-between font-mono pt-2">
              <span>💻 Desktop</span>
              <strong>{data.devices.desktop}</strong>
            </div>
            <div className="h-2.5 bg-[--color-ink-900]/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: data.devices.desktop }} />
            </div>
          </div>
        </div>

        {/* Top Routes */}
        <div className="bg-white border border-[--color-ink-900]/10 rounded-xl p-4 shadow-xs">
          <h3 className="text-[--font-size-step-0] font-bold text-[--color-ink-900] mb-3">Top Visited Routes</h3>
          <div className="space-y-2">
            {data.topPages.map((p: any) => (
              <div key={p.path} className="flex justify-between text-[--font-size-step--1] font-mono py-1 border-b border-[--color-ink-900]/5">
                <span className="truncate max-w-[280px] text-[--color-ink-900]">{p.path}</span>
                <span className="text-[--color-graphite] tabular-nums font-bold">{p.views} ({p.share})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
