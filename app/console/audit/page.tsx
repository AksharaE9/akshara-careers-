'use client'

/**
 * app/console/audit/page.tsx
 *
 * Screen 13 — Immutable Audit Log & JSON Diff Viewer (§14.17).
 */

import React, { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/console/DataTable'

interface AuditLogRow {
  id: string
  action: string
  entityType: string
  entityId: string | null
  before: any
  after: any
  ipHash: string | null
  createdAt: string
  actorName: string | null
  actorEmail: string | null
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDiff, setSelectedDiff] = useState<AuditLogRow | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/console/audit')
      if (res.ok) {
        const json = await res.json()
        setLogs(json.logs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const columns: ColumnDef<AuditLogRow>[] = [
    {
      id: 'createdAt',
      header: 'Timestamp',
      accessor: (row) => (
        <span className="font-mono text-[--font-size-step--2] text-[--color-graphite]">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[--color-ink-900]">{row.actorName || 'System'}</span>
          <span className="font-mono text-[--font-size-step--2] text-[--color-graphite]">{row.actorEmail || 'automated'}</span>
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      accessor: (row) => (
        <span className="font-mono font-bold text-[--font-size-step--2] px-2 py-0.5 rounded bg-[--color-marigold]/15 text-[--color-ink-900]">
          {row.action}
        </span>
      ),
    },
    {
      id: 'entity',
      header: 'Target Entity',
      accessor: (row) => (
        <span className="font-mono text-[--font-size-step--2] text-[--color-ink-900]">
          {row.entityType} {row.entityId ? `(${row.entityId.substring(0, 8)}…)` : ''}
        </span>
      ),
    },
    {
      id: 'diff',
      header: 'Diff Viewer',
      accessor: (row) => (
        <button
          type="button"
          data-testid="audit-diff"
          onClick={() => setSelectedDiff(row)}
          className="px-2 py-1 rounded bg-[--color-ink-900]/5 hover:bg-[--color-ink-900]/10 text-[--font-size-step--2] font-mono font-semibold"
        >
          View JSON Diff &rarr;
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[--color-ink-900]/10">
        <div>
          <span className="font-mono text-[--font-size-step--2] uppercase text-[--color-graphite] font-semibold tracking-wider">
            DPDP Compliance · Immutable Ledger
          </span>
          <h1 className="text-[--font-size-step-2] font-bold text-[--color-ink-900] tracking-tight">
            System Audit Trail
          </h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        totalCount={logs.length}
        loading={loading}
        emptyMessage="No audit logs recorded yet."
      />

      {/* JSON Diff Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-[--color-ink-900]/10 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[--color-ink-900]/10 pb-3">
              <div>
                <h2 className="text-[--font-size-step-1] font-bold text-[--color-ink-900]">Mutation Diff Inspection</h2>
                <span className="font-mono text-[--font-size-step--2] text-[--color-graphite]">Action: {selectedDiff.action}</span>
              </div>
              <button type="button" onClick={() => setSelectedDiff(null)} className="text-xl">×</button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[--font-size-step--2]">
              <div>
                <span className="font-bold text-[--color-graphite] block mb-1">Before State</span>
                <pre className="p-3 rounded-lg bg-[--color-chalk] border border-[--color-ink-900]/10 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedDiff.before || {}, null, 2)}
                </pre>
              </div>
              <div>
                <span className="font-bold text-[--color-leaf] block mb-1">After State</span>
                <pre className="p-3 rounded-lg bg-[--color-chalk] border border-[--color-ink-900]/10 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedDiff.after || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDiff(null)}
                className="px-4 py-1.5 bg-[--color-ink-900] text-white rounded-lg text-[--font-size-step--1]"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
