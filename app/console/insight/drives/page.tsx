'use client'

/**
 * app/console/insight/drives/page.tsx
 *
 * Screen 6 — Campus Drives Performance Intelligence (§14.10).
 * Makes the 28-sheet spreadsheet obsolete. Highlights zero-application drives in red.
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { DataTable, ColumnDef } from '@/components/console/DataTable'

interface DrivePerformanceRow {
  id: string
  code: string
  venue: string | null
  driveDate: string
  seats: number | null
  status: string
  collegeName: string
  collegeCity: string | null
  scans: number
  starts: number
  submits: number
  conversion: string
  isZeroYield: boolean
}

export default function DrivesPerformancePage() {
  const [drives, setDrives] = useState<DrivePerformanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/console/insight/drives')
        if (res.ok) {
          const json = await res.json()
          if (!ignore) setDrives(json.drives || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const columns: ColumnDef<DrivePerformanceRow>[] = [
    {
      id: 'code',
      header: 'Drive Code',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-(--color-ink-900)">{row.code}</span>
          <span className="text-(--font-size-step--2) text-(--color-graphite)">{row.driveDate}</span>
        </div>
      ),
    },
    {
      id: 'collegeName',
      header: 'Partner College & City',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-(--color-ink-900)">{row.collegeName}</span>
          <span className="text-(--font-size-step--2) text-(--color-graphite)">{row.collegeCity || 'Bengaluru'}</span>
        </div>
      ),
    },
    {
      id: 'scans',
      header: 'QR Scans',
      accessor: (row) => <span className="font-mono tabular-nums">{row.scans}</span>,
    },
    {
      id: 'submits',
      header: 'Submissions',
      accessor: (row) => (
        <span
          className={`font-mono font-bold px-2 py-0.5 rounded ${
            row.isZeroYield
              ? 'bg-(--color-kumkum)/15 text-(--color-kumkum)'
              : 'bg-(--color-leaf)/15 text-(--color-leaf)'
          }`}
        >
          {row.submits} {row.isZeroYield ? '⚠️ 0 Apps' : 'apps'}
        </span>
      ),
    },
    {
      id: 'conversion',
      header: 'Scan → Submit',
      accessor: (row) => (
        <span className={`font-mono font-semibold ${row.isZeroYield ? 'text-(--color-kumkum)' : 'text-(--color-ink-900)'}`}>
          {row.conversion}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/d/${row.code}`}
            target="_blank"
            className="px-2 py-1 rounded bg-(--color-ink-900)/5 hover:bg-(--color-ink-900)/10 text-(--font-size-step--2) font-semibold text-(--color-ink-900)"
          >
            Open QR Link &rarr;
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Campus Recruitment Intelligence
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Campus Drives Yield & QR Conversion
          </h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={drives}
        totalCount={drives.length}
        loading={loading}
        emptyMessage="No campus drives scheduled."
      />
    </div>
  )
}
