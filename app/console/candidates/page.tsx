'use client'

/**
 * app/console/candidates/page.tsx
 *
 * Screen 4 — Candidates 360 Directory (§14.8).
 * Displays candidate individuals rather than single application rows (fixes D7).
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { DataTable, ColumnDef } from '@/components/console/DataTable'

interface CandidateRow {
  id: string
  fullName: string
  email: string
  phone: string
  languages: string[]
  homeCity: string | null
  totalApplications: number
  latestStage: string | null
  createdAt: string
}

export default function CandidatesDirectoryPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/console/candidates')
        if (res.ok) {
          const json = await res.json()
          if (!ignore) {
            setCandidates(json.candidates || [])
            setTotalCount(json.totalCount || 0)
          }
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

  const columns: ColumnDef<CandidateRow>[] = [
    {
      id: 'fullName',
      header: 'Candidate Name',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-(--color-ink-900)">{row.fullName}</span>
          <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">{row.email}</span>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone (E.164)',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono">{row.phone}</span>
          <a
            href={`https://wa.me/${row.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="text-(--font-size-step--2) text-(--color-leaf) font-semibold hover:underline"
          >
            WhatsApp
          </a>
        </div>
      ),
    },
    {
      id: 'totalApplications',
      header: 'Applications',
      accessor: (row) => (
        <span className="font-mono font-bold px-2 py-0.5 rounded bg-(--color-marigold)/15 text-(--color-ink-900)">
          {row.totalApplications}
        </span>
      ),
    },
    {
      id: 'latestStage',
      header: 'Furthest Stage',
      accessor: (row) => (
        <span className="font-mono text-(--font-size-step--2) uppercase px-2 py-0.5 rounded bg-(--color-ink-900)/5 text-(--color-ink-900)">
          {row.latestStage?.replace(/_/g, ' ') || 'None'}
        </span>
      ),
    },
    {
      id: 'languages',
      header: 'Languages',
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.languages?.map((l) => (
            <span key={l} className="px-1.5 py-0.5 text-(--font-size-step--2) bg-(--color-chalk) border border-(--color-ink-900)/10 rounded">
              {l}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/console/applications?q=${encodeURIComponent(row.email)}`}
            className="px-2.5 py-1 rounded bg-(--color-ink-900)/5 hover:bg-(--color-ink-900)/10 text-(--font-size-step--2) font-semibold text-(--color-ink-900)"
          >
            View Applications &rarr;
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
            Talent Roster · 360° View
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Candidate Profiles
          </h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={candidates}
        totalCount={totalCount}
        loading={loading}
        emptyMessage="No candidates found."
      />
    </div>
  )
}
