/**
 * app/console/applications/page.tsx
 *
 * Recruiter Candidate Pipeline & Kanban Stage Manager.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const STAGES = [
  { id: 'received', label: 'Received', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  { id: 'under_review', label: 'Under Review', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  { id: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
  { id: 'interviewed', label: 'Interviewed', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-200' },
  { id: 'offered', label: 'Offered', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  { id: 'hired', label: 'Hired', color: 'bg-green-600/15 text-green-800 border-green-300' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500/10 text-red-700 border-red-200' },
] as const

interface ApplicationItem {
  id: string
  publicId: string
  statusToken: string
  stage: string
  academicStatus: string
  experienceType: string
  hasTwoWheeler: string
  hasDrivingLicence: boolean
  source: string
  submittedAt: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  jobTitle: string
  jobSlug: string
  driveCode: string | null
  collegeName: string
  courseName: string
}

export default function ApplicationsPipelinePage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStage) params.set('stage', filterStage)
      if (searchQuery) params.set('q', searchQuery)

      const res = await fetch(`/api/console/applications?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setApplications(data.applications || [])
        setStats(data.stats || {})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filterStage])

  const handleStageChange = async (appId: string, newStage: string) => {
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/console/applications/${appId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? { ...app, stage: newStage } : app))
        )
        // Refresh stats
        fetchApplications()
      }
    } catch (err) {
      console.error('Failed to change stage:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidatePhone.includes(searchQuery) ||
      app.publicId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.collegeName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesJob = !filterJob || app.jobTitle === filterJob
    return matchesSearch && matchesJob
  })

  // Unique job titles for filter dropdown
  const uniqueJobs = Array.from(new Set(applications.map((a) => a.jobTitle)))

  return (
    <div className="flex flex-col gap-[--spacing-s6]">
      {/* Page Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[--spacing-s4]">
        <div>
          <span className="eyebrow text-[--color-marigold]">Recruitment Pipeline</span>
          <h1 className="display text-[--font-size-step-3] font-bold text-[--color-ink-900]">
            Candidates & Applications
          </h1>
        </div>

        <div className="flex items-center gap-[--spacing-s2]">
          <div className="flex bg-[--color-ink-900]/5 p-1 rounded-[--radius-sm] border border-[--color-ink-900]/10">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 text-[--font-size-step--1] font-medium rounded-[--radius-xs] transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[--color-chalk] text-[--color-ink-900] shadow-xs'
                  : 'text-[--color-graphite] hover:text-[--color-ink-900]'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-[--font-size-step--1] font-medium rounded-[--radius-xs] transition-colors ${
                viewMode === 'table'
                  ? 'bg-[--color-chalk] text-[--color-ink-900] shadow-xs'
                  : 'text-[--color-graphite] hover:text-[--color-ink-900]'
              }`}
            >
              Table View
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchApplications}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-[--spacing-s3]">
        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-[--color-ink-900]/10 flex flex-col">
          <span className="text-[--font-size-step--2] text-[--color-ink-400] uppercase font-mono tracking-wider">
            Total
          </span>
          <span className="text-[--font-size-step-2] font-bold text-[--color-ink-900] font-mono">
            {stats.total || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-blue-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-blue-700 uppercase font-mono tracking-wider">
            Received
          </span>
          <span className="text-[--font-size-step-2] font-bold text-blue-800 font-mono">
            {stats.received || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-amber-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-amber-700 uppercase font-mono tracking-wider">
            In Review
          </span>
          <span className="text-[--font-size-step-2] font-bold text-amber-800 font-mono">
            {stats.under_review || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-purple-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-purple-700 uppercase font-mono tracking-wider">
            Shortlisted
          </span>
          <span className="text-[--font-size-step-2] font-bold text-purple-800 font-mono">
            {stats.shortlisted || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-cyan-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-cyan-700 uppercase font-mono tracking-wider">
            Interviewed
          </span>
          <span className="text-[--font-size-step-2] font-bold text-cyan-800 font-mono">
            {stats.interviewed || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-emerald-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-emerald-700 uppercase font-mono tracking-wider">
            Offered
          </span>
          <span className="text-[--font-size-step-2] font-bold text-emerald-800 font-mono">
            {stats.offered || 0}
          </span>
        </Card>

        <Card className="p-[--spacing-s3] bg-[--color-chalk] border border-green-200/60 flex flex-col">
          <span className="text-[--font-size-step--2] text-green-700 uppercase font-mono tracking-wider">
            Hired
          </span>
          <span className="text-[--font-size-step-2] font-bold text-green-800 font-mono">
            {stats.hired || 0}
          </span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-[--spacing-s4] bg-[--color-chalk] border border-[--color-ink-900]/10 flex flex-col sm:flex-row gap-[--spacing-s3]">
        <div className="flex-1">
          <Input
            id="searchQuery"
            placeholder="Search candidate name, email, phone, college, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-64">
          <Select
            id="filterJob"
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
          >
            <option value="">All Job Roles</option>
            {uniqueJobs.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* ── KANBAN BOARD VIEW ────────────────────────────────────────────────── */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-[--spacing-s4] min-w-[1200px]">
            {STAGES.slice(0, 7).map((col) => {
              const colApps = filteredApps.filter((a) => a.stage === col.id)

              return (
                <div
                  key={col.id}
                  className="flex-1 min-w-[280px] bg-[--color-ink-900]/3 rounded-[--radius-md] border border-[--color-ink-900]/10 p-[--spacing-s3] flex flex-col gap-[--spacing-s3]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-[--color-ink-900]/10 pb-2">
                    <span className="text-[--font-size-step--1] font-bold text-[--color-ink-900]">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 text-[--font-size-step--2] font-mono font-bold bg-[--color-chalk] text-[--color-graphite] rounded-full border border-[--color-ink-900]/10">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex flex-col gap-[--spacing-s3] flex-1 min-h-[350px]">
                    {colApps.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-[--font-size-step--2] text-[--color-ink-400] italic border-2 border-dashed border-[--color-ink-900]/10 rounded-[--radius-sm]">
                        No applicants
                      </div>
                    ) : (
                      colApps.map((app) => (
                        <Card
                          key={app.id}
                          className="p-[--spacing-s3] bg-[--color-chalk] border border-[--color-ink-900]/10 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-[--spacing-s2]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/console/applications/${app.id}`}
                              className="font-bold text-[--font-size-step-0] text-[--color-ink-900] hover:text-[--color-marigold] transition-colors leading-tight"
                            >
                              {app.candidateName}
                            </Link>
                            <span className="text-[--font-size-step--2] font-mono text-[--color-ink-400]">
                              {app.publicId}
                            </span>
                          </div>

                          <div className="text-[--font-size-step--1] text-[--color-graphite] font-medium">
                            {app.jobTitle}
                          </div>

                          <div className="text-[--font-size-step--2] text-[--color-ink-600] flex flex-col gap-0.5">
                            <span>🏛 {app.collegeName}</span>
                            <span>🎓 {app.courseName} · {app.academicStatus.replace('_', ' ')}</span>
                          </div>

                          {app.driveCode && (
                            <div className="text-[--font-size-step--2] font-mono text-[--color-leaf] font-semibold">
                              Drive: {app.driveCode}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-[--color-ink-900]/5 pt-2 mt-1">
                            <Link
                              href={`/console/applications/${app.id}`}
                              className="text-[--font-size-step--2] font-medium text-[--color-ink-600] hover:underline"
                            >
                              View Detail &rarr;
                            </Link>

                            {/* Quick Stage Move Dropdown */}
                            <select
                              value={app.stage}
                              disabled={updatingId === app.id}
                              onChange={(e) => handleStageChange(app.id, e.target.value)}
                              className="text-[--font-size-step--2] font-mono bg-[--color-chalk] border border-[--color-ink-900]/20 rounded px-1.5 py-0.5"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Move to {s.label}
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
        <Card className="overflow-hidden bg-[--color-chalk] border border-[--color-ink-900]/10 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[--font-size-step--1]">
              <thead className="bg-[--color-ink-900]/4 border-b border-[--color-ink-900]/10 font-mono text-[--font-size-step--2] uppercase tracking-wider text-[--color-graphite]">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Job Role</th>
                  <th className="py-3 px-4">College & Course</th>
                  <th className="py-3 px-4">Drive</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-ink-900]/5">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[--color-ink-400] italic">
                      No applications found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-[--color-ink-900]/2 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/console/applications/${app.id}`}
                          className="font-bold text-[--color-ink-900] hover:underline"
                        >
                          {app.candidateName}
                        </Link>
                        <div className="text-[--font-size-step--2] text-[--color-ink-400]">
                          {app.candidateEmail} · {app.candidatePhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[--color-graphite]">
                        {app.jobTitle}
                      </td>
                      <td className="py-3 px-4 text-[--font-size-step--2] text-[--color-ink-600]">
                        <div>{app.collegeName}</div>
                        <div className="text-[--color-ink-400]">{app.courseName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[--font-size-step--2]">
                        {app.driveCode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={app.stage}
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStageChange(app.id, e.target.value)}
                          className="text-[--font-size-step--2] font-medium bg-[--color-chalk] border border-[--color-ink-900]/20 rounded px-2 py-1"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-[--font-size-step--2] text-[--color-ink-400] font-mono">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/console/applications/${app.id}`}
                          className="text-[--font-size-step--2] font-semibold text-[--color-marigold] hover:underline"
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
