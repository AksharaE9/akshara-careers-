/**
 * app/console/jobs/page.tsx
 *
 * Job Postings Management Console (Publishing, Drafts, Status Toggles, Roles).
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import { formatISTDate } from '@/lib/date/ist'

interface JobAdminItem {
  id: string
  slug: string
  title: string
  family: string
  summary: string
  locationCity: string
  status: 'draft' | 'open' | 'paused' | 'closed'
  openings: number
  postedAt: string | null
  salaryMin: number | null
  salaryMax: number | null
}

export default function ConsoleJobsPage() {
  const [jobs, setJobs] = useState<JobAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Job Form State
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [family, setFamily] = useState('Sales')
  const [summary, setSummary] = useState('')
  const [locationCity] = useState('Bengaluru')
  const [salaryMin, setSalaryMin] = useState('300000')
  const [salaryMax, setSalaryMax] = useState('450000')
  const [creating, setCreating] = useState(false)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/console/jobs')
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // F7: fetchJobs is also called from handleCreateJob below.
  useEffect(() => {
    ;(async () => {
      await fetchJobs()
    })()
  }, [])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    // Auto-generate slug
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generatedSlug)
  }

  const handleStatusChange = async (jobId: string, status: JobAdminItem['status']) => {
    try {
      const res = await fetch(`/api/console/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status } : j))
        )
      }
    } catch (err) {
      console.error('Failed to change job status:', err)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !slug || !summary) return
    setCreating(true)

    try {
      const res = await fetch('/api/console/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          family,
          summary,
          locationCity,
          salaryMin: Number(salaryMin),
          salaryMax: Number(salaryMax),
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setTitle('')
        setSlug('')
        setSummary('')
        fetchJobs()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-(--spacing-s6)">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-(--spacing-s4)">
        <div>
          <span className="eyebrow text-(--color-marigold)">Requisitions</span>
          <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900)">
            Job Openings Manager
          </h1>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-job-btn"
        >
          + Create Job Posting
        </Button>
      </div>

      {/* Jobs Table */}
      <Card className="overflow-hidden bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-(--font-size-step--1)">
            <thead className="bg-(--color-ink-900)/4 border-b border-(--color-ink-900)/10 font-mono text-(--font-size-step--2) uppercase tracking-wider text-(--color-graphite)">
              <tr>
                <th className="py-3 px-4">Title & Family</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Compensation (CTC)</th>
                <th className="py-3 px-4">Openings</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Posted Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-ink-900)/5">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-(--color-ink-400) italic">
                    {loading ? 'Loading job postings...' : 'No job openings created.'}
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-(--color-ink-900)/2 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-(--color-ink-900)">{j.title}</div>
                      <div className="text-(--font-size-step--2) text-(--color-ink-400) font-mono">
                        {j.family} · /{j.slug}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-(--color-graphite)">
                      {j.locationCity}
                    </td>
                    <td className="py-3 px-4 font-mono text-(--font-size-step--2)">
                      {j.salaryMin && j.salaryMax
                        ? `₹${(j.salaryMin / 100000).toFixed(1)}L - ₹${(j.salaryMax / 100000).toFixed(1)}L`
                        : 'Not public'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {j.openings}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={j.status}
                        onChange={(e) => handleStatusChange(j.id, e.target.value as JobAdminItem['status'])}
                        className={`text-(--font-size-step--2) font-mono font-bold uppercase rounded px-2 py-1 border ${
                          j.status === 'open'
                            ? 'bg-emerald-500/10 text-emerald-800 border-emerald-300'
                            : j.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-800 border-amber-300'
                            : 'bg-gray-500/10 text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="open">OPEN</option>
                        <option value="draft">DRAFT</option>
                        <option value="paused">PAUSED</option>
                        <option value="closed">CLOSED</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-(--font-size-step--2) text-(--color-ink-400) font-mono">
                      {j.postedAt ? formatISTDate(j.postedAt) : 'Unpublished'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/careers/${j.slug}`}
                        target="_blank"
                        className="text-(--font-size-step--2) font-semibold text-(--color-marigold) hover:underline"
                      >
                        Public Page &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-xl p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/20 shadow-2xl flex flex-col gap-(--spacing-s5)">
            <div className="flex items-center justify-between border-b border-(--color-ink-900)/10 pb-3">
              <h2 className="font-bold text-(--font-size-step-1) text-(--color-ink-900)">
                Create New Job Requisition
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-(--color-ink-400) hover:text-(--color-ink-900) font-bold text-(--font-size-step-1)"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="flex flex-col gap-(--spacing-s4)">
              <FieldWrapper id="title" label="Job Title" required>
                <Input
                  id="title"
                  placeholder="e.g. Senior Business Development Executive"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </FieldWrapper>

              <div className="grid grid-cols-2 gap-(--spacing-s3)">
                <FieldWrapper id="slug" label="URL Slug" required>
                  <Input
                    id="slug"
                    placeholder="senior-bde"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </FieldWrapper>

                <FieldWrapper id="family" label="Department Family" required>
                  <Select
                    id="family"
                    value={family}
                    onChange={(e) => setFamily(e.target.value)}
                  >
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Credit & Underwriting">Credit & Underwriting</option>
                    <option value="Technology">Technology</option>
                  </Select>
                </FieldWrapper>
              </div>

              <FieldWrapper id="summary" label="Summary Description" required>
                <Textarea
                  id="summary"
                  placeholder="Drive student loan disbursement growth across college campuses..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  required
                />
              </FieldWrapper>

              <div className="grid grid-cols-2 gap-(--spacing-s3)">
                <FieldWrapper id="salaryMin" label="Min CTC (₹)">
                  <Input
                    id="salaryMin"
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                </FieldWrapper>

                <FieldWrapper id="salaryMax" label="Max CTC (₹)">
                  <Input
                    id="salaryMax"
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
                </FieldWrapper>
              </div>

              <div className="flex justify-end gap-(--spacing-s2) mt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={creating}>
                  Publish Opening &rarr;
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
