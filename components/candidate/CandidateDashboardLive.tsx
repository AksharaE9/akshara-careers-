/**
 * components/candidate/CandidateDashboardLive.tsx
 *
 * Client-side real-time synchronization component for the Candidate Dashboard.
 * Polls /api/candidate/applications on a 2s interval with conditional GET (ETag / 304).
 * Enforces §3: <2s sync propagation from recruiter status changes with smooth micro-animations.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CandidateLogoutButton } from './CandidateLogoutButton'
import type { getCandidateApplications } from '@/lib/db/queries/applications'

type CandidateApplication = Awaited<ReturnType<typeof getCandidateApplications>>[number]

const STAGE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  received: {
    label: 'Application Submitted',
    color: 'text-(--color-rust) bg-(--color-rust)/10 border-(--color-rust)/30',
    desc: 'Your profile has been received and registered in our database.',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    desc: 'Our talent acquisition team is actively reviewing your qualifications.',
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'Your profile has passed initial screening and moved to team evaluation.',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    desc: 'An interview discussion has been arranged with the hiring team.',
  },
  interviewed: {
    label: 'Interview Completed',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    desc: 'Interview round concluded. Hiring manager feedback is being synthesized.',
  },
  offered: {
    label: 'Offer Extended',
    color: 'text-(--color-leaf) bg-(--color-leaf)/10 border-(--color-leaf)/30',
    desc: 'Congratulations! An offer package has been extended.',
  },
  hired: {
    label: 'Offer Accepted & Hired',
    color: 'text-(--color-leaf) bg-(--color-leaf)/20 border-(--color-leaf)/40',
    desc: 'Welcome to Akshara! Day-one orientation schedule sent.',
  },
  rejected: {
    label: 'Application Concluded',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    desc: 'Thank you for your interest. We are not proceeding with this application at this time.',
  },
  withdrawn: {
    label: 'Application Withdrawn',
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    desc: 'Application was withdrawn by the candidate.',
  },
  duplicate: {
    label: 'Duplicate Entry',
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    desc: 'Merged into primary candidate application record.',
  },
}

interface LiveDashboardProps {
  candidate: {
    id: string
    fullName: string
    phoneE164: string
    emailNormalised: string
  }
  initialApplications: CandidateApplication[]
  initialEligibility: {
    allowed: boolean
    reason?: string
    message?: string
    reapplyAvailableAt?: string
    daysRemaining?: number
  }
}

export function CandidateDashboardLive({
  candidate,
  initialApplications,
  initialEligibility,
}: LiveDashboardProps) {
  const [apps, setApps] = useState<CandidateApplication[]>(initialApplications)
  const [selectedAppId, setSelectedAppId] = useState<string>(initialApplications[0]?.id || '')
  const [eligibility, setEligibility] = useState(initialEligibility)
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now')
  const [hasUpdated, setHasUpdated] = useState(false)
  const lastEtagRef = useRef<string | null>(null)

  // Sync selectedAppId when apps change
  const activeAppExists = apps.some((a) => a.id === selectedAppId)
  if (apps.length > 0 && apps[0] && (!selectedAppId || !activeAppExists)) {
    setSelectedAppId(apps[0].id)
  }

  // 2-second Conditional Polling Sync Loop (§3)
  useEffect(() => {
    let isMounted = true

    const pollSync = async () => {
      try {
        const headers: Record<string, string> = {}
        if (lastEtagRef.current) {
          headers['If-None-Match'] = lastEtagRef.current
        }

        const res = await fetch('/api/candidate/applications', {
          headers,
          cache: 'no-store',
        })

        if (!isMounted) return

        if (res.status === 304) {
          // No changes detected — zero DOM recalculation
          setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
          return
        }

        if (res.ok) {
          const newEtag = res.headers.get('ETag')
          if (newEtag) {
            lastEtagRef.current = newEtag
          }

          const data = await res.json()
          if (data.applications) {
            // Check if stage actually changed to trigger subtle highlight
            if (apps.length > 0 && data.applications.length > 0) {
              if (apps[0]?.stage !== data.applications[0]?.stage) {
                setHasUpdated(true)
                setTimeout(() => setHasUpdated(false), 4000)
              }
            }

            setApps(data.applications)
            setEligibility(data.eligibility)
            setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
          }
        }
      } catch {
        // Silent recovery on network glitches
      }
    }

    const interval = setInterval(pollSync, 2000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [apps])

  const currentApp = apps.find((a) => a.id === selectedAppId) || apps[0]

  return (
    <div className="flex flex-col gap-8">
      {/* Candidate Profile Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-(--radius-lg) p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden text-white">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-(--font-size-step--2) text-amber-400 font-bold uppercase tracking-wider">
              Candidate Account
            </span>
            {/* Live Sync Badge (§3) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 font-mono text-[11px] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync</span>
            </div>
          </div>

          <h1 className="font-display text-(--font-size-step-3) font-bold text-white">
            {candidate.fullName}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-(--font-size-step--1) text-slate-300 font-mono mt-1">
            <span>📱 {candidate.phoneE164}</span>
            {candidate.emailNormalised && !candidate.emailNormalised.includes('temp_') && (
              <span>✉️ {candidate.emailNormalised}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/careers#roles" className="btn btn--sm btn--primary font-bold">
            + Apply for Another Role
          </Link>
          <CandidateLogoutButton />
        </div>
      </div>

      {/* Multiple Roles Tab Switcher if Candidate has applied for > 1 role */}
      {apps.length > 1 && (
        <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-(--radius-lg) shadow-xs">
          <span className="font-mono text-(--font-size-step--2) uppercase tracking-wider text-amber-700 font-bold">
            Switch Applied Role ({apps.length} Applications)
          </span>
          <div className="flex flex-wrap gap-2.5">
            {apps.map((app) => {
              const isSelected = (currentApp?.id === app.id)
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedAppId(app.id)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-(--font-size-step--1) transition-all flex items-center gap-2.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-md'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  <span>{app.jobTitle}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'}`}>
                    {app.publicId}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 2-Month Cooldown Banner */}
      {!eligibility.allowed && eligibility.reason === 'COOLDOWN_ACTIVE' && (
        <div className="p-6 bg-amber-50 border-l-4 border-l-amber-500 border border-amber-200 rounded-(--radius-lg) shadow-sm flex flex-col gap-2 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <h3 className="font-display text-(--font-size-step-1) font-bold text-amber-900">
              Application Cooldown Active
            </h3>
          </div>
          <p className="text-(--font-size-step-0) text-amber-950 font-medium">
            {eligibility.message}
          </p>
          <p className="text-(--font-size-step--1) text-amber-800 leading-relaxed">
            Akshara maintains a 2-month (60-day) review interval following application conclusion for the same role so you have time to build experience or acquire certifications before reapplying. You can still apply for other open positions in the meantime!
          </p>
        </div>
      )}

      {/* Active Application Status for Current Selected Role */}
      {currentApp ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-(--font-size-step-2) font-bold text-slate-900">
              Application Status & Progress
            </h2>
            <span className="font-mono text-(--font-size-step--1) text-slate-600 font-semibold">
              Reference: <strong className="text-amber-600">{currentApp.publicId}</strong>
            </span>
          </div>

          {/* Main Status & Timeline Card */}
          <div
            className={`bg-white border rounded-(--radius-lg) p-6 sm:p-8 shadow-sm flex flex-col gap-8 transition-all duration-700 ${
              hasUpdated
                ? 'border-amber-400 ring-4 ring-amber-400/20'
                : 'border-slate-200'
            }`}
          >
            {/* Application Header Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-(--font-size-step--2) uppercase text-slate-500 font-semibold">
                  Target Opening
                </span>
                <h3 className="font-display text-(--font-size-step-2) font-bold text-slate-900">
                  {currentApp.jobTitle}
                </h3>
                <span className="font-mono text-(--font-size-step--1) text-slate-600">
                  {currentApp.jobFamily} · {currentApp.locationCity || 'Bengaluru'} · Submitted{' '}
                  {new Date(currentApp.submittedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Current Stage Badge with Live Animation */}
              <div>
                {(() => {
                  const cfg = STAGE_LABELS[currentApp.stage] || {
                    label: currentApp.stage,
                    color: 'text-gray-300 bg-gray-500/10 border-gray-500/30',
                    desc: '',
                  }
                  return (
                    <span
                      data-testid="candidate-stage-badge"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-(--font-size-step--1) font-mono font-semibold border transition-all ${cfg.color}`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                      {cfg.label}
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Stage Events Timeline (§3 & §5) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-(--font-size-step--2) uppercase tracking-wider text-(--color-amber-400) font-bold">
                  {currentApp.jobTitle} — Timeline
                </span>
                <span className="font-mono text-[11px] text-(--color-text-on-dark-muted)">
                  Last synced: {lastSyncTime}
                </span>
              </div>

              <div className="relative pl-6 sm:pl-8 border-l border-(--color-ink-600) flex flex-col gap-6 ml-2 my-2">
                {currentApp.timeline && currentApp.timeline.length > 0 ? (
                  currentApp.timeline.map((evt, idx) => {
                    const isLatest = idx === 0
                    const cfg = STAGE_LABELS[evt.stage] || { label: evt.stage, desc: '' }
                    return (
                      <div key={idx} className="relative flex flex-col gap-1">
                        {/* Dot on timeline */}
                        <span
                          className={`absolute -left-[31px] sm:-left-[39px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-(--color-ink-900) transition-all ${
                            isLatest
                              ? 'bg-(--color-amber-400) ring-4 ring-(--color-amber-400)/20'
                              : 'bg-(--color-ink-600)'
                          }`}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-display text-(--font-size-step-0) font-bold text-(--color-text-on-dark)">
                            {cfg.label}
                          </span>
                          <span className="font-mono text-(--font-size-step--2) text-(--color-text-on-dark-muted)">
                            {new Date(evt.occurredAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-(--font-size-step--1) text-(--color-text-on-dark-muted) leading-relaxed">
                          {evt.note || cfg.desc}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="relative flex flex-col gap-1">
                    <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 h-3.5 w-3.5 rounded-full bg-(--color-amber-400)" />
                    <span className="font-display text-(--font-size-step-0) font-bold text-(--color-text-on-dark)">
                      Application Submitted
                    </span>
                    <span className="font-mono text-(--font-size-step--2) text-(--color-text-on-dark-muted)">
                      {new Date(currentApp.submittedAt).toLocaleDateString()}
                    </span>
                    <p className="text-(--font-size-step--1) text-(--color-text-on-dark-muted)">
                      Application registered successfully in recruitment database.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state if candidate has not applied yet */
        <div className="p-12 text-center bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) flex flex-col items-center gap-4">
          <span className="text-4xl">📄</span>
          <h3 className="font-display text-(--font-size-step-2) font-bold text-(--color-text-on-dark)">
            No Active Applications Found
          </h3>
          <p className="text-(--font-size-step-0) text-(--color-text-on-dark-muted) max-w-md">
            You haven&apos;t submitted an application yet. Explore our open requisitions across sales and operations.
          </p>
          <Link href="/careers#roles" className="btn btn--md btn--primary mt-2">
            Explore Open Roles &rarr;
          </Link>
        </div>
      )}

      {/* All Applications Table */}
      {apps.length > 1 && (
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-text-on-dark)">
            All Applications Submitted ({apps.length})
          </h3>
          <div className="bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-(--font-size-step--1)">
                <thead className="bg-(--color-ink-800) text-(--color-text-on-dark-muted) uppercase text-(--font-size-step--2) border-b border-(--color-ink-600)">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Role Title</th>
                    <th className="p-4">Submitted Date</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-ink-600)/40">
                  {apps.map((app) => {
                    const isSelected = (currentApp?.id === app.id)
                    const cfg = STAGE_LABELS[app.stage] || { label: app.stage, color: 'text-gray-300' }
                    return (
                      <tr
                        key={app.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-400/10' : 'hover:bg-(--color-ink-800)/40'
                        }`}
                        onClick={() => setSelectedAppId(app.id)}
                      >
                        <td className="p-4 font-bold text-(--color-amber-400)">{app.publicId}</td>
                        <td className="p-4 font-sans font-semibold text-(--color-text-on-dark)">
                          {app.jobTitle}
                        </td>
                        <td className="p-4 text-(--color-text-on-dark-muted)">
                          {new Date(app.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-4">
                          <span className="capitalize font-semibold text-amber-300">
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAppId(app.id)
                            }}
                            className={`btn btn--xs ${isSelected ? 'btn--primary' : 'btn--secondary'}`}
                          >
                            {isSelected ? 'Viewing' : 'View Timeline'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
