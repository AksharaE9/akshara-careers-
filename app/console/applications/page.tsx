/**
 * app/console/applications/page.tsx
 *
 * Recruiter Candidate Pipeline & Kanban Stage Manager.
 * Implements Work Order Task 2-6:
 * - R1: The URL is the only source of truth. No useState mirror.
 * - R2: The URL is written only from an event handler. Never from useEffect.
 * - R3: Reads are derived during render from searchParams.toString() via useFilterState().
 * - R4: Exactly one component owns each param.
 * - D-01: Stage tiles sum to total derived strictly from lib/console/stages.ts
 * - D-02: IST date formatting sitewide
 * - D-04: 6-second Undo Toast on inline stage change
 * - Full test IDs per Task 6
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  ALL_STAGES,
  STAGE_CONFIGS,
  ApplicationStage,
} from '@/lib/console/stages'
import {
  formatISTDate,
  DatePresetId,
  toISTDateOnlyString,
} from '@/lib/date/ist'
import { useFilterState, useDebouncedParam } from '@/lib/console/use-filter-state'

interface ApplicationItem {
  id: string
  publicId: string
  statusToken: string
  stage: ApplicationStage
  academicStatus: string
  experienceType: string
  hasTwoWheeler: string
  hasDrivingLicence: boolean
  source: string
  submittedAt: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  jobId: string
  jobTitle: string
  jobSlug: string
  driveCode: string | null
  collegeName: string
  courseName: string
}

interface UndoToastState {
  id: string
  appId: string
  candidateName: string
  oldStage: ApplicationStage
  newStage: ApplicationStage
  timer: NodeJS.Timeout
}

export default function ApplicationsPipelinePage() {
  const { filters, range, setFilters, key } = useFilterState()

  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(false)

  // Local ephemeral state for search input text
  const [searchInput, setSearchInput] = useState(filters.q)
  useEffect(() => {
    setSearchInput(filters.q)
  }, [filters.q])

  const { onChange: onSearchChange, flush: flushSearch } = useDebouncedParam(
    (nextQ: string) => setFilters({ q: nextQ }),
    300
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null)

  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  const activeFetchController = useRef<AbortController | null>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pure fetch function — reads entirely from the URL state key
  const fetchApplications = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true)
        }

        if (activeFetchController.current) {
          activeFetchController.current.abort()
        }
        activeFetchController.current = new AbortController()

        const params = new URLSearchParams()
        if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
        if (filters.q) params.set('q', filters.q)
        if (filters.jobId) params.set('jobId', filters.jobId)
        if (filters.driveId) params.set('driveId', filters.driveId)
        if (range.from) params.set('from', range.from)
        if (range.to) params.set('to', range.to)
        if (filters.preset) params.set('preset', filters.preset)
        params.set('page', String(filters.page))
        params.set('limit', String(pageSize))

        const res = await fetch(`/api/console/applications?${params.toString()}`, {
          signal: activeFetchController.current.signal,
        })
        const data = await res.json()
        if (res.ok) {
          setApplications(data.applications || [])
          setStats(data.stats || {})
          setTotalCount(data.totalCount || 0)
          setTotalPages(data.totalPages || 1)
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to fetch applications:', err)
      } finally {
        if (!options?.silent) {
          setLoading(false)
        }
      }
    },
    [filters.stage, filters.q, filters.jobId, filters.driveId, filters.preset, filters.page, range.from, range.to]
  )

  // Fetch only when URL filter key actually changes (R3)
  useEffect(() => {
    fetchApplications()
  }, [key, fetchApplications])

  // Real-time synchronization via SSE (debounced to avoid loop storms)
  useEffect(() => {
    let eventSource: EventSource | null = null
    let lastRefresh = 0

    try {
      eventSource = new EventSource('/api/console/stream')
      eventSource.onopen = () => setIsLiveConnected(true)
      eventSource.onerror = () => setIsLiveConnected(false)

      const handleRealtimeUpdate = () => {
        const now = Date.now()
        if (now - lastRefresh > 10000) {
          lastRefresh = now
          fetchApplications({ silent: true })
        }
      }

      eventSource.addEventListener('application_created', handleRealtimeUpdate)
      eventSource.addEventListener('application_stage_updated', handleRealtimeUpdate)
      eventSource.addEventListener('application_note_added', handleRealtimeUpdate)
      eventSource.addEventListener('pipeline_update', handleRealtimeUpdate)
    } catch {
      setIsLiveConnected(false)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchApplications])

  // Optimistic UI Stage Change with 6-Second Undo Toast (D-04)
  const handleStageChange = async (appId: string, newStage: ApplicationStage, isUndo = false) => {
    const targetApp = applications.find((a) => a.id === appId)
    if (!targetApp || targetApp.stage === newStage) return

    const oldStage = targetApp.stage
    const candidateName = targetApp.candidateName

    // Optimistically update local rows & stats
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, stage: newStage } : app))
    )
    setStats((prev) => {
      const next = { ...prev }
      if (next[oldStage] !== undefined && next[oldStage] > 0) next[oldStage]--
      if (next[newStage] !== undefined) next[newStage]++
      return next
    })

    if (!isUndo) {
      if (undoToast) clearTimeout(undoToast.timer)

      const timer = setTimeout(() => {
        setUndoToast(null)
      }, 6000)

      setUndoToast({
        id: `undo-${Date.now()}`,
        appId,
        candidateName,
        oldStage,
        newStage,
        timer,
      })
    }

    setUpdatingId(appId)

    try {
      const res = await fetch(`/api/console/applications/${appId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res.ok) {
        fetchApplications({ silent: true })
      }
    } catch (err) {
      console.error('Failed to change stage:', err)
      fetchApplications({ silent: true })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle Undo action
  const handleUndo = () => {
    if (!undoToast) return
    const { appId, oldStage, timer } = undoToast
    clearTimeout(timer)
    setUndoToast(null)
    handleStageChange(appId, oldStage, true)
  }

  // Handle Data Export (CSV / XLSX)
  const handleExport = async (sheet: 'legacy' | 'canonical', format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      setExportMessage(null)

      const params = new URLSearchParams()
      params.set('sheet', sheet)
      params.set('format', format)
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.q) params.set('q', filters.q)
      if (filters.jobId) params.set('jobId', filters.jobId)
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      if (filters.preset) params.set('preset', filters.preset)

      const res = await fetch(`/api/console/applications/export?${params.toString()}`)

      if (res.status === 429) {
        setExportMessage('Export rate limit reached (max 10/hr). Please wait.')
        return
      }

      if (res.status === 403) {
        setExportMessage('Export requires Admin privileges.')
        return
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        if (json.mode === 'async') {
          setExportMessage(json.message || `Preparing ${json.count} records. We'll email you a download link.`)
        } else if (json.error) {
          setExportMessage(json.error)
        }
        return
      }

      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch ? filenameMatch[1] : `akshara-applications_${toISTDateOnlyString(new Date())}.csv`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      setExportMessage('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Unique job titles & ids
  const uniqueJobs = Array.from(
    new Map(applications.map((a) => [a.jobId || a.jobTitle, { id: a.jobId, title: a.jobTitle }])).values()
  )

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="flex flex-col gap-(--spacing-s6)">
      {/* ── 6-Second Undo Toast Notification (D-04) ─────────────────────────── */}
      {undoToast && (
        <div
          data-testid="toast"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 px-4 py-3 bg-(--color-ink-900) text-(--color-chalk) rounded-(--radius-md) shadow-2xl border border-amber-400/30 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-center gap-2 text-(--font-size-step--1)">
            <span className="text-amber-400 font-bold">Stage Updated:</span>
            <span>
              Moved <strong className="text-(--color-chalk)">{undoToast.candidateName}</strong> to{' '}
              <span className="font-mono text-amber-300">{STAGE_CONFIGS[undoToast.newStage].label}</span>
            </span>
          </div>
          <button
            type="button"
            data-testid="undo-btn"
            onClick={handleUndo}
            className="px-3 py-1 text-(--font-size-step--1) font-bold bg-amber-400 text-(--color-ink-900) hover:bg-amber-300 rounded transition-colors shadow-xs"
          >
            Undo
          </button>
        </div>
      )}

      {/* ── Export Message Banner ───────────────────────────────────────────── */}
      {exportMessage && (
        <div className="p-3 bg-(--color-marigold)/15 border border-(--color-marigold) rounded-(--radius-sm) text-(--font-size-step--1) text-(--color-ink-900) flex items-center justify-between">
          <span>{exportMessage}</span>
          <button
            type="button"
            onClick={() => setExportMessage(null)}
            className="text-(--color-ink-400) hover:text-(--color-ink-900) font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header & View Toggle ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-(--spacing-s4)">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-(--color-rust)">Recruitment Pipeline</span>
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono text-(--color-ink-400) bg-(--color-ink-900)/5">
                Connecting...
              </span>
            )}
          </div>
          <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900)">
            Candidates & Applications
          </h1>
        </div>

        <div className="flex items-center gap-(--spacing-s2)">
          {/* View Toggle */}
          <div className="flex bg-(--color-ink-900)/5 p-1 rounded-(--radius-sm) border border-(--color-ink-900)/10">
            <button
              data-testid="view-kanban"
              onClick={() => setFilters({ view: 'kanban' })}
              className={`px-3 py-1 text-(--font-size-step--1) font-medium rounded-(--radius-xs) transition-colors ${
                filters.view === 'kanban'
                  ? 'bg-(--color-chalk) text-(--color-ink-900) shadow-xs'
                  : 'text-(--color-graphite) hover:text-(--color-ink-900)'
              }`}
            >
              Kanban Board
            </button>
            <button
              data-testid="view-table"
              onClick={() => setFilters({ view: 'table' })}
              className={`px-3 py-1 text-(--font-size-step--1) font-medium rounded-(--radius-xs) transition-colors ${
                filters.view === 'table'
                  ? 'bg-(--color-chalk) text-(--color-ink-900) shadow-xs'
                  : 'text-(--color-graphite) hover:text-(--color-ink-900)'
              }`}
            >
              Table View
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchApplications()}
            loading={loading && applications.length === 0}
          >
            Refresh
          </Button>

          {/* ── Export Dropdown Control (§20.3) ───────────────────────────────── */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              data-testid="export-button"
              disabled={totalCount === 0 || exporting}
              onClick={() => setShowExportMenu(!showExportMenu)}
              title={totalCount === 0 ? 'No records match these filters' : undefined}
              className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2 rounded-(--radius-sm) border border-(--color-ink-900)/15 bg-(--color-chalk) text-(--color-ink-900) font-medium text-(--font-size-step--1) shadow-xs hover:bg-(--color-ink-900)/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{exporting ? 'Preparing…' : `↓ Export ${totalCount.toLocaleString()} records`}</span>
              <span className="text-(--color-ink-400)">▾</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-(--color-chalk) border border-(--color-ink-900)/15 rounded-(--radius-md) shadow-xl z-50 py-1 flex flex-col text-(--font-size-step--1)">
                <button
                  type="button"
                  data-testid="export-csv-legacy"
                  onClick={() => handleExport('legacy', 'csv')}
                  className="px-4 py-2 text-left hover:bg-(--color-ink-900)/5 flex flex-col"
                >
                  <span className="font-semibold text-(--color-ink-900)">CSV — Original Sheet Format</span>
                  <span className="text-(--font-size-step--2) text-(--color-ink-400)">Legacy Google Form headers</span>
                </button>

                <button
                  type="button"
                  data-testid="export-csv-canonical"
                  onClick={() => handleExport('canonical', 'csv')}
                  className="px-4 py-2 text-left hover:bg-(--color-ink-900)/5 flex flex-col"
                >
                  <span className="font-semibold text-(--color-ink-900)">CSV — Full Detail</span>
                  <span className="text-(--font-size-step--2) text-(--color-ink-400)">Canonical 36-column schema</span>
                </button>

                <button
                  type="button"
                  data-testid="export-xlsx"
                  onClick={() => handleExport('canonical', 'xlsx')}
                  className="px-4 py-2 text-left hover:bg-(--color-ink-900)/5 flex flex-col"
                >
                  <span className="font-semibold text-(--color-ink-900)">Excel (.xlsx) — Both Sheets</span>
                  <span className="text-(--font-size-step--2) text-(--color-ink-400)">Multi-tab workbook</span>
                </button>

                {selectedIds.size > 0 && (
                  <>
                    <div className="border-t border-(--color-ink-900)/10 my-1" />
                    <button
                      type="button"
                      data-testid="export-selected"
                      onClick={() => handleExport('canonical', 'csv')}
                      className="px-4 py-2 text-left text-(--color-marigold) font-semibold hover:bg-(--color-ink-900)/5"
                    >
                      Export selected ({selectedIds.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Metrics Bar (D-01 Sum Invariant) ──────────────────────────────────── */}
      <div className="flex flex-col gap-(--spacing-s3)">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-(--spacing-s3)">
          <Card
            data-testid="tile-total"
            className="p-(--spacing-s3) bg-(--color-chalk) border-2 border-(--color-ink-900)/20 shadow-xs flex flex-col"
          >
            <span className="text-(--font-size-step--2) text-(--color-ink-600) uppercase font-mono font-bold tracking-wider">
              TOTAL
            </span>
            <span
              data-testid="tile-value"
              className="value text-(--font-size-step-2) font-bold text-(--color-ink-900) font-mono"
            >
              {stats.total || 0}
            </span>
          </Card>

          {PIPELINE_STAGES.map((stageId) => {
            const config = STAGE_CONFIGS[stageId]
            return (
              <Card
                key={stageId}
                data-testid={`tile-${stageId}`}
                className={`p-(--spacing-s3) bg-(--color-chalk) border ${config.borderColor} flex flex-col`}
              >
                <span
                  className={`text-(--font-size-step--2) ${config.textColor} uppercase font-mono tracking-wider font-semibold`}
                >
                  {config.shortLabel}
                </span>
                <span
                  data-testid="tile-value"
                  className={`value text-(--font-size-step-2) font-bold ${config.badgeColor} font-mono`}
                >
                  {stats[stageId] || 0}
                </span>
              </Card>
            )
          })}
        </div>

        {/* Terminal Stages Muted Summary */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-(--color-ink-900)/5">
          <span className="text-(--font-size-step--2) font-mono uppercase text-(--color-ink-400)">
            Terminal States:
          </span>
          {TERMINAL_STAGES.map((stageId) => {
            const config = STAGE_CONFIGS[stageId]
            return (
              <div
                key={stageId}
                data-testid={`tile-${stageId}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-(--color-ink-900)/4 border border-(--color-ink-900)/10 text-(--font-size-step--2)"
              >
                <span className="font-mono text-(--color-ink-600)">{config.label}:</span>
                <span data-testid="tile-value" className="value font-mono font-bold text-(--color-ink-900)">
                  {stats[stageId] || 0}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Filter Bar with Date Preset & Civil Boundaries (§20.1.4) ─────────── */}
      <Card className="p-(--spacing-s4) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s3)">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-(--spacing-s3)">
          {/* Candidate Search (R1 & Debounced) */}
          <div className="flex-1 min-w-[240px]">
            <input
              id="searchQuery"
              data-testid="filter-search"
              placeholder="Search candidate name, email, phone, college, or application ID..."
              value={searchInput}
              onChange={(e) => {
                const nextVal = e.target.value
                setSearchInput(nextVal)
                onSearchChange(nextVal)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  flushSearch(searchInput)
                }
              }}
              className="input-control w-full h-11"
            />
          </div>

          {/* Stage Filter */}
          <div className="w-full lg:w-48">
            <select
              id="filterStage"
              data-testid="filter-stage"
              value={filters.stage}
              onChange={(e) => setFilters({ stage: e.target.value })}
              className="select-control w-full h-11"
            >
              <option value="">All Pipeline Stages</option>
              {ALL_STAGES.map((stageId) => (
                <option key={stageId} value={stageId}>
                  {STAGE_CONFIGS[stageId].label}
                </option>
              ))}
            </select>
          </div>

          {/* Job Role Filter */}
          <div className="w-full lg:w-48">
            <select
              id="filterJob"
              value={filters.jobId}
              onChange={(e) => setFilters({ jobId: e.target.value })}
              className="select-control w-full h-11"
            >
              <option value="">All Job Roles</option>
              {uniqueJobs.map((job) => (
                <option key={job.id || job.title} value={job.id || ''}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Selector (§20.1.3 & R4 Single Owner) */}
          <div className="w-full lg:w-48">
            <select
              id="datePreset"
              data-testid="filter-date-preset"
              value={filters.preset}
              onChange={(e) => setFilters({ preset: e.target.value as DatePresetId })}
              className="select-control w-full h-11"
            >
              <option value="today">Today (IST)</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="all_time">All time</option>
              <option value="custom">Custom range…</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is selected */}
        {filters.preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-(--color-ink-900)/10">
            <span className="text-(--font-size-step--2) font-mono uppercase text-(--color-ink-600) font-bold">
              Custom Range (Max 366 days):
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="customFrom" className="text-(--font-size-step--2) text-(--color-ink-400)">
                From:
              </label>
              <input
                id="customFrom"
                type="date"
                value={filters.from || ''}
                onChange={(e) => setFilters({ from: e.target.value })}
                className="px-2 py-1 bg-(--color-paper) border border-(--color-ink-900)/20 rounded text-(--font-size-step--1) font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="customTo" className="text-(--font-size-step--2) text-(--color-ink-400)">
                To:
              </label>
              <input
                id="customTo"
                type="date"
                value={filters.to || ''}
                onChange={(e) => setFilters({ to: e.target.value })}
                className="px-2 py-1 bg-(--color-paper) border border-(--color-ink-900)/20 rounded text-(--font-size-step--1) font-mono"
              />
            </div>
          </div>
        )}

        {/* Resolved Range Scope Text (§20.1.4) */}
        <div className="flex items-center justify-between text-(--font-size-step--2) text-(--color-graphite)">
          <span data-testid="filter-scope">
            Scope: <strong className="text-(--color-ink-900)">{range.label}</strong> ·{' '}
            <strong className="text-(--color-ink-900)">{totalCount.toLocaleString()}</strong> records
          </span>
          {range.isCustom && (
            <span className="text-(--font-size-step--2) text-(--color-ink-400) italic">
              Civil dates in Asia/Kolkata (half-open [from, toExclusive))
            </span>
          )}
        </div>
      </Card>

      {/* ── Pagination Controls ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-(--font-size-step--1) text-(--color-graphite)">
        <div>
          Showing <span className="font-bold text-(--color-ink-900)">{applications.length}</span> of{' '}
          <span className="font-bold text-(--color-ink-900)">{totalCount}</span> records (Page {filters.page} of {totalPages || 1})
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={filters.page <= 1 || loading}
            onClick={() => setFilters({ page: Math.max(filters.page - 1, 1) })}
          >
            ← Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={filters.page >= totalPages || loading}
            onClick={() => setFilters({ page: Math.min(filters.page + 1, totalPages) })}
          >
            Next →
          </Button>
        </div>
      </div>

      {/* ── KANBAN BOARD VIEW ────────────────────────────────────────────────── */}
      {filters.view === 'kanban' ? (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-(--spacing-s4) min-w-[1300px]">
            {PIPELINE_STAGES.map((colId) => {
              const config = STAGE_CONFIGS[colId]
              const colApps = applications.filter((a) => a.stage === colId)

              return (
                <div
                  key={colId}
                  data-testid={`column-${colId}`}
                  className="flex-1 min-w-[280px] bg-(--color-ink-900)/3 rounded-(--radius-md) border border-(--color-ink-900)/10 p-(--spacing-s3) flex flex-col gap-(--spacing-s3)"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-(--color-ink-900)/10 pb-2">
                    <span className="text-(--font-size-step--1) font-bold text-(--color-ink-900)">
                      {config.label}
                    </span>
                    <span className="px-2 py-0.5 text-(--font-size-step--2) font-mono font-bold bg-(--color-chalk) text-(--color-graphite) rounded-full border border-(--color-ink-900)/10">
                      {stats[colId] !== undefined ? stats[colId] : colApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex flex-col gap-(--spacing-s3) flex-1 min-h-[350px]">
                    {loading && applications.length === 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="h-28 bg-(--color-ink-900)/5 rounded animate-pulse" />
                        <div className="h-28 bg-(--color-ink-900)/5 rounded animate-pulse" />
                      </div>
                    ) : colApps.length === 0 ? (
                      <div data-testid="empty-state" className="flex-1 flex items-center justify-center text-(--font-size-step--2) text-(--color-ink-400) italic border-2 border-dashed border-(--color-ink-900)/10 rounded-(--radius-sm)">
                        No applicants
                      </div>
                    ) : (
                      colApps.map((app) => (
                        <Card
                          key={app.id}
                          data-testid={`card-${app.publicId}`}
                          className="p-(--spacing-s3) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-(--spacing-s2)"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/console/applications/${app.id}`}
                              className="font-bold text-(--font-size-step-0) text-(--color-ink-900) hover:text-(--color-rust) transition-colors leading-tight"
                            >
                              {app.candidateName}
                            </Link>
                            <span className="text-(--font-size-step--2) font-mono text-(--color-ink-400)">
                              {app.publicId}
                            </span>
                          </div>

                          <div className="text-(--font-size-step--1) text-(--color-graphite) font-medium">
                            {app.jobTitle}
                          </div>

                          <div className="text-(--font-size-step--2) text-(--color-ink-600) flex flex-col gap-0.5">
                            <span>🏛 {app.collegeName}</span>
                            <span>🎓 {app.courseName} · {app.academicStatus.replace('_', ' ')}</span>
                          </div>

                          {app.driveCode && (
                            <div className="text-(--font-size-step--2) font-mono text-(--color-leaf) font-semibold">
                              Drive: {app.driveCode}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 border-t border-(--color-ink-900)/10 pt-2.5 mt-1">
                            <Link
                              href={`/console/applications/${app.id}`}
                              className="text-(--font-size-step--2) font-medium text-(--color-ink-600) hover:text-(--color-ink-900) hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                            >
                              <span>View Detail</span>
                              <span>&rarr;</span>
                            </Link>

                            {/* Quick Stage Move Dropdown */}
                            <select
                              value={app.stage}
                              data-testid="row-stage-select"
                              disabled={updatingId === app.id}
                              onChange={(e) => handleStageChange(app.id, e.target.value as ApplicationStage)}
                              className="text-(--font-size-step--2) font-mono bg-(--color-chalk) border border-(--color-ink-900)/20 rounded px-2 py-1 text-(--color-ink-800) hover:border-(--color-ink-900)/40 focus:outline-hidden focus:ring-1 focus:ring-(--color-ink-900) transition-colors max-w-[140px] truncate cursor-pointer shrink-0"
                              title="Change Stage"
                            >
                              {ALL_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {STAGE_CONFIGS[s].label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────────────────────── */
        <Card data-testid="datatable" className="overflow-hidden bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-(--font-size-step--1)">
              <thead className="bg-(--color-ink-900)/4 border-b border-(--color-ink-900)/10 font-mono text-(--font-size-step--2) uppercase tracking-wider text-(--color-graphite)">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selectedIds.size === applications.length}
                      onChange={toggleSelectAll}
                      className="rounded border-(--color-ink-900)/20"
                    />
                  </th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Job Role</th>
                  <th className="py-3 px-4">College & Course</th>
                  <th className="py-3 px-4">Drive</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-ink-900)/5">
                {loading && applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-(--color-ink-400)">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-(--color-ink-900) border-t-transparent animate-spin" />
                        Loading applications...
                      </div>
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} data-testid="empty-state" className="py-8 text-center text-(--color-ink-400) italic">
                      No applications found matching filters.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr
                      key={app.id}
                      data-testid={`row-${app.publicId}`}
                      className={`hover:bg-(--color-ink-900)/2 transition-colors ${
                        selectedIds.has(app.id) ? 'bg-(--color-marigold)/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => toggleSelectOne(app.id)}
                          className="rounded border-(--color-ink-900)/20"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/console/applications/${app.id}`}
                          className="font-bold text-(--color-ink-900) hover:underline"
                        >
                          {app.candidateName}
                        </Link>
                        <div className="text-(--font-size-step--2) text-(--color-ink-400)">
                          {app.candidateEmail} · {app.candidatePhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-(--color-graphite)">
                        {app.jobTitle}
                      </td>
                      <td className="py-3 px-4 text-(--font-size-step--2) text-(--color-ink-600)">
                        <div>{app.collegeName}</div>
                        <div className="text-(--color-ink-400)">{app.courseName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-(--font-size-step--2)">
                        {app.driveCode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={app.stage}
                          data-testid="row-stage-select"
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStageChange(app.id, e.target.value as ApplicationStage)}
                          className="text-(--font-size-step--2) font-medium bg-(--color-chalk) border border-(--color-ink-900)/20 rounded px-2 py-1"
                        >
                          {ALL_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_CONFIGS[s].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-(--font-size-step--2) text-(--color-ink-400) font-mono">
                        {formatISTDate(app.submittedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/console/applications/${app.id}`}
                          className="text-(--font-size-step--2) font-semibold text-(--color-rust) hover:underline"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
