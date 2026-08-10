'use client'

/**
 * app/console/insight/jobs/page.tsx
 *
 * Screen 5 — Jobs Performance Intelligence (§14.9).
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { DataTable, ColumnDef } from '@/components/console/DataTable'

interface JobPerformanceRow {
  id: string
  title: string
  slug: string
  family: string
  status: string
  views: number
  clicks: number
  starts: number
  submits: number
  viewToApply: string
  startToSubmit: string
  medianTime: string
  diagnosis: { badge: string; badgeType: 'success' | 'warning' | 'info' }
}

export default function JobsPerformancePage() {
  const [jobs, setJobs] = useState<JobPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/console/insight/jobs')
      if (res.ok) {
        const json = await res.json()
        setJobs(json.jobs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const columns: ColumnDef<JobPerformanceRow>[] = [
    {
      id: 'title',
      header: 'Job Title & Family',
      accessor: (row) => (
        <div className="flex flex-col">
          <Link href={`/careers/${row.slug}`} target="_blank" className="font-semibold text-(--color-ink-900) hover:underline">
            {row.title}
          </Link>
          <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">{row.family}</span>
        </div>
      ),
    },
    {
      id: 'views',
      header: 'Views',
      accessor: (row) => <span className="font-mono tabular-nums">{row.views}</span>,
    },
    {
      id: 'viewToApply',
      header: 'View → Apply',
      accessor: (row) => (
        <span className="font-mono font-semibold text-(--color-ink-900)">{row.viewToApply}</span>
      ),
    },
    {
      id: 'startToSubmit',
      header: 'Start → Submit',
      accessor: (row) => (
        <span className="font-mono font-bold text-(--color-leaf)">{row.startToSubmit}</span>
      ),
    },
    {
      id: 'submits',
      header: 'Applications',
      accessor: (row) => (
        <span className="font-mono font-bold px-2 py-0.5 rounded bg-(--color-marigold)/15 text-(--color-ink-900)">
          {row.submits}
        </span>
      ),
    },
    {
      id: 'diagnosis',
      header: 'Diagnostic Badge',
      accessor: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-(--font-size-step--2) font-mono font-medium ${
            row.diagnosis.badgeType === 'warning'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : row.diagnosis.badgeType === 'info'
              ? 'bg-blue-100 text-blue-900 border border-blue-300'
              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
          }`}
        >
          {row.diagnosis.badge}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Requisition Analytics
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Jobs Performance & Conversion
          </h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        totalCount={jobs.length}
        loading={loading}
        emptyMessage="No jobs found."
      />
    </div>
  )
}
