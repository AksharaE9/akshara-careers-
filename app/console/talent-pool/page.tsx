'use client'

/**
 * app/console/talent-pool/page.tsx
 *
 * Talent Pool Roster (§14.3.2).
 */

import React, { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/console/DataTable'
import { formatISTDate } from '@/lib/date/ist'

interface TalentPoolRow {
  id: string
  fullName: string
  emailNormalised: string
  interestFamily: string
  createdAt: string
}

export default function TalentPoolPage() {
  const [entries, setEntries] = useState<TalentPoolRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/console/talent-pool')
        if (res.ok) {
          const json = await res.json()
          if (!ignore) setEntries(json.talentPool || [])
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

  const columns: ColumnDef<TalentPoolRow>[] = [
    {
      id: 'fullName',
      header: 'Candidate Name',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-(--color-ink-900)">{row.fullName}</span>
          <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">{row.emailNormalised}</span>
        </div>
      ),
    },
    {
      id: 'interestFamily',
      header: 'Interest Domain',
      accessor: (row) => (
        <span className="font-mono text-(--font-size-step--2) px-2 py-0.5 rounded bg-(--color-marigold)/15 text-(--color-ink-900) font-semibold">
          {row.interestFamily}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Joined At',
      accessor: (row) => (
        <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">
          {formatISTDate(row.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Passive Candidate Pipeline
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Talent Pool Registry
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/console/talent-pool/export"
            download
            data-testid="export-talent-pool-btn"
            className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2 rounded-(--radius-sm) border border-(--color-ink-900)/15 bg-(--color-chalk) text-(--color-ink-900) font-medium text-(--font-size-step--1) shadow-xs hover:bg-(--color-ink-900)/5 transition-colors"
          >
            <span>↓ Export Talent Pool ({entries.length})</span>
          </a>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        totalCount={entries.length}
        loading={loading}
        emptyMessage="No talent pool submissions yet."
      />
    </div>
  )
}
