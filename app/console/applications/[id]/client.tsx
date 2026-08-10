/**
 * app/console/applications/[id]/client.tsx
 *
 * Client interactivity for Application Detail (stage updating, notes creation, copy links).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

const STAGES = [
  { id: 'received', label: 'Received' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview_scheduled', label: 'Interview Scheduled' },
  { id: 'interviewed', label: 'Interviewed' },
  { id: 'offered', label: 'Offered' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
  { id: 'duplicate', label: 'Duplicate' },
] as const

export function ApplicationDetailClient({ initialApp }: { initialApp: any }) {
  const [app, setApp] = useState(initialApp)
  const [stage, setStage] = useState(initialApp.stage)
  const [stageLoading, setStageLoading] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [notes, setNotes] = useState<any[]>(initialApp.notes || [])
  const [copiedToken, setCopiedToken] = useState(false)

  const handleStageChange = async (newStage: string) => {
    setStageLoading(true)
    try {
      const res = await fetch(`/api/console/applications/${app.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        setStage(newStage)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setStageLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteBody.trim()) return
    setNoteLoading(true)

    try {
      const res = await fetch(`/api/console/applications/${app.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteBody }),
      })
      const data = await res.json()
      if (res.ok && data.note) {
        setNotes([
          {
            ...data.note,
            authorName: 'You',
            authorRole: 'Recruiter',
            createdAt: new Date().toISOString(),
          },
          ...notes,
        ])
        setNoteBody('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setNoteLoading(false)
    }
  }

  const statusUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/status/${app.statusToken}`
    : `/status/${app.statusToken}`

  const copyStatusUrl = () => {
    navigator.clipboard.writeText(statusUrl)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  const waUrl = `https://wa.me/${app.candidatePhone.replace('+', '')}?text=${encodeURIComponent(
    `Hi ${app.candidateName}, this is Akshara Careers regarding your application (${app.publicId}) for ${app.jobTitle}.`
  )}`

  return (
    <div className="flex flex-col gap-(--spacing-s6)">
      {/* Header Banner Card */}
      <Card className="p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-(--spacing-s4)">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-(--spacing-s2)">
            <span className="font-mono text-(--font-size-step--1) font-bold text-(--color-marigold) bg-(--color-marigold)/10 px-2 py-0.5 rounded">
              {app.publicId}
            </span>
            <span className="text-(--font-size-step--2) text-(--color-ink-400)">
              Applied {new Date(app.submittedAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900)">
            {app.candidateName}
          </h1>
          <p className="text-(--font-size-step-0) text-(--color-graphite)">
            Role: <span className="font-semibold">{app.jobTitle}</span> ({app.jobFamily})
          </p>
        </div>

        {/* Stage Changer Dropdown */}
        <div className="flex flex-col gap-1 sm:items-end">
          <span className="text-(--font-size-step--2) font-mono uppercase text-(--color-ink-400)">
            Application Stage
          </span>
          <select
            value={stage}
            disabled={stageLoading}
            onChange={(e) => handleStageChange(e.target.value)}
            className="text-(--font-size-step-0) font-bold bg-(--color-chalk) border-2 border-(--color-marigold) rounded-(--radius-sm) px-3 py-1.5 focus:outline-none"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-(--spacing-s6)">
        {/* Left Column (2 Cols): Candidate Profile & Academics */}
        <div className="lg:col-span-2 flex flex-col gap-(--spacing-s6)">
          {/* Candidate Contact & Profile */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s4)">
            <h2 className="font-bold text-(--font-size-step-1) text-(--color-ink-900) border-b border-(--color-ink-900)/10 pb-2">
              Candidate Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-(--spacing-s4) text-(--font-size-step-0)">
              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Email
                </span>
                <a href={`mailto:${app.candidateEmail}`} className="text-(--color-graphite) hover:underline font-medium">
                  {app.candidateEmail}
                </a>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Phone (E.164)
                </span>
                <div className="flex items-center gap-(--spacing-s2)">
                  <a href={`tel:${app.candidatePhone}`} className="text-(--color-graphite) hover:underline font-mono font-medium">
                    {app.candidatePhone}
                  </a>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--font-size-step--2) text-[#25D366] font-semibold hover:underline"
                  >
                    Open WhatsApp &rarr;
                  </a>
                </div>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  WhatsApp Updates Opt-In
                </span>
                <span className={`font-medium ${app.whatsappOptIn ? 'text-(--color-leaf)' : 'text-(--color-ink-400)'}`}>
                  {app.whatsappOptIn ? '✓ Subscribed' : '✗ Not opted in'}
                </span>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  DPDP Consent Given
                </span>
                <span className="font-mono text-(--font-size-step--1) text-(--color-graphite)">
                  {new Date(app.consentGivenAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Education & Academic Match */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s4)">
            <h2 className="font-bold text-(--font-size-step-1) text-(--color-ink-900) border-b border-(--color-ink-900)/10 pb-2">
              Academic & College Mapping
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-(--spacing-s4)">
              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Matched Partner College
                </span>
                <div className="font-semibold text-(--color-ink-900)">
                  {app.collegeCanonicalName || 'Unmatched Raw String'}
                </div>
                <div className="text-(--font-size-step--2) text-(--color-ink-400) font-mono mt-0.5">
                  Raw input: &quot;{app.collegeRaw}&quot;
                </div>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Degree & Course
                </span>
                <div className="font-semibold text-(--color-ink-900)">
                  {app.courseCanonicalName || app.courseRaw}
                </div>
                <div className="text-(--font-size-step--2) text-(--color-ink-400) font-mono mt-0.5">
                  Raw input: &quot;{app.courseRaw}&quot;
                </div>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Academic Status
                </span>
                <span className="capitalize font-medium text-(--color-ink-900)">
                  {app.academicStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Experience Level
                </span>
                <span className="capitalize font-medium text-(--color-ink-900)">
                  {app.experienceType}
                </span>
              </div>
            </div>

            {app.academicNote && (
              <div className="bg-(--color-ink-900)/3 p-3 rounded-(--radius-sm) border border-(--color-ink-900)/5 text-(--font-size-step--1)">
                <span className="font-semibold text-(--color-ink-900) block">Candidate Notes:</span>
                <p className="text-(--color-graphite) mt-1">{app.academicNote}</p>
              </div>
            )}
          </Card>

          {/* Job Readiness & Vehicle */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s4)">
            <h2 className="font-bold text-(--font-size-step-1) text-(--color-ink-900) border-b border-(--color-ink-900)/10 pb-2">
              Logistics & Readiness
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-(--spacing-s4)">
              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Two-Wheeler
                </span>
                <span className="font-medium capitalize text-(--color-ink-900)">
                  {app.hasTwoWheeler.replace('_', ' ')}
                </span>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Driving Licence
                </span>
                <span className={`font-medium ${app.hasDrivingLicence ? 'text-(--color-leaf)' : 'text-(--color-ink-400)'}`}>
                  {app.hasDrivingLicence ? '✓ Valid Licence' : '✗ No Licence'}
                </span>
              </div>

              <div>
                <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                  Source / Drive
                </span>
                <span className="font-mono text-(--font-size-step--1) text-(--color-graphite)">
                  {app.driveCode ? `Drive: ${app.driveCode}` : app.source}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Resume, Interview Notes, Candidate Status Token */}
        <div className="flex flex-col gap-(--spacing-s6)">
          {/* Resume Card */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s3)">
            <h2 className="font-bold text-(--font-size-step-0) text-(--color-ink-900)">
              Uploaded Resume
            </h2>

            <div className="flex items-center gap-(--spacing-s3) p-3 bg-(--color-ink-900)/3 rounded-(--radius-sm) border border-(--color-ink-900)/5">
              <div className="h-10 w-10 rounded bg-(--color-marigold)/15 text-(--color-marigold) flex items-center justify-center font-bold text-(--font-size-step-0)">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-(--font-size-step--1) text-(--color-ink-900) truncate">
                  {app.resumeFilename}
                </div>
                <div className="text-(--font-size-step--2) text-(--color-ink-400) font-mono">
                  {(app.resumeSizeBytes / 1024).toFixed(1)} KB · {app.resumeMime.split('/')[1]?.toUpperCase()}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-(--font-size-step--1)"
              onClick={() => alert(`Downloading resume key: ${app.resumeKey}`)}
            >
              Download Resume File
            </Button>
          </Card>

          {/* Candidate Status Link */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s2)">
            <h2 className="font-bold text-(--font-size-step-0) text-(--color-ink-900)">
              Candidate Self-Serve Link
            </h2>
            <p className="text-(--font-size-step--2) text-(--color-ink-400)">
              Private link given to candidate to track their status.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <input
                readOnly
                value={statusUrl}
                className="w-full text-(--font-size-step--2) font-mono bg-(--color-paper) border border-(--color-ink-900)/15 rounded px-2 py-1 select-all"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={copyStatusUrl}
                className="shrink-0"
              >
                {copiedToken ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </Card>

          {/* Interview Notes Timeline */}
          <Card className="p-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col gap-(--spacing-s4)">
            <h2 className="font-bold text-(--font-size-step-0) text-(--color-ink-900)">
              Interview Notes ({notes.length})
            </h2>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="flex flex-col gap-(--spacing-s2)">
              <Textarea
                id="noteBody"
                placeholder="Log interview feedback, technical assessment, salary discussions..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={noteLoading}
                disabled={!noteBody.trim()}
                className="self-end"
              >
                Add Note
              </Button>
            </form>

            {/* Notes List */}
            <div className="flex flex-col gap-(--spacing-s3) divide-y divide-(--color-ink-900)/5 max-h-[350px] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-(--font-size-step--2) text-(--color-ink-400) italic text-center py-4">
                  No notes recorded yet.
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="pt-3 flex flex-col gap-1 text-(--font-size-step--1)">
                    <div className="flex items-center justify-between text-(--font-size-step--2)">
                      <span className="font-semibold text-(--color-ink-900)">
                        {n.authorName} ({n.authorRole})
                      </span>
                      <span className="text-(--color-ink-400) font-mono">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-(--color-graphite) whitespace-pre-wrap">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
