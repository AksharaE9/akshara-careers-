/**
 * app/console/drives/page.tsx
 *
 * Campus Drives Management Console (QR generator, Short codes, Attendance, Conversion tracking).
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FieldWrapper } from '@/components/ui/FieldWrapper'

interface DriveItem {
  id: string
  code: string
  driveDate: string
  venue: string | null
  seats: number | null
  status: string
  viewCount: number
  notes: string | null
  collegeId: string
  collegeName: string
  collegeCity: string | null
}

export default function CampusDrivesPage() {
  const [drives, setDrives] = useState<DriveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // New Drive Form
  const [code, setCode] = useState('')
  const [collegeQuery, setCollegeQuery] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [driveDate, setDriveDate] = useState('')
  const [venue, setVenue] = useState('')
  const [seats, setSeats] = useState('50')
  const [creating, setCreating] = useState(false)
  const [collegeOptions, setCollegeOptions] = useState<any[]>([])

  const fetchDrives = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/console/drives')
      const data = await res.json()
      if (res.ok) {
        setDrives(data.drives || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrives()
  }, [])

  const searchColleges = async (q: string) => {
    setCollegeQuery(q)
    if (q.length < 2) return
    try {
      const res = await fetch(`/api/lookup/colleges?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setCollegeOptions(data || [])
    } catch {}
  }

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !collegeId || !driveDate) return
    setCreating(true)

    try {
      const res = await fetch('/api/console/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          collegeId,
          driveDate,
          venue,
          seats: Number(seats) || 50,
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setCode('')
        setCollegeQuery('')
        setCollegeId('')
        setDriveDate('')
        setVenue('')
        fetchDrives()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const copyDriveLink = (driveCode: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/d/${driveCode}`
    navigator.clipboard.writeText(url)
    setCopiedCode(driveCode)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="flex flex-col gap-[--spacing-s6]">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[--spacing-s4]">
        <div>
          <span className="eyebrow text-[--color-marigold]">Campus Operations</span>
          <h1 className="display text-[--font-size-step-3] font-bold text-[--color-ink-900]">
            Campus Hiring Drives
          </h1>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-drive-btn"
        >
          + Schedule Campus Drive
        </Button>
      </div>

      {/* Drives List Card */}
      <Card className="overflow-hidden bg-[--color-chalk] border border-[--color-ink-900]/10 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[--font-size-step--1]">
            <thead className="bg-[--color-ink-900]/4 border-b border-[--color-ink-900]/10 font-mono text-[--font-size-step--2] uppercase tracking-wider text-[--color-graphite]">
              <tr>
                <th className="py-3 px-4">Drive Code</th>
                <th className="py-3 px-4">College & City</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Seats</th>
                <th className="py-3 px-4">QR Scans</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-ink-900]/5">
              {drives.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[--color-ink-400] italic">
                    {loading ? 'Loading campus drives...' : 'No campus drives scheduled.'}
                  </td>
                </tr>
              ) : (
                drives.map((d) => (
                  <tr key={d.id} className="hover:bg-[--color-ink-900]/2 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[--color-marigold]">
                        {d.code}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[--color-ink-900]">{d.collegeName}</div>
                      <div className="text-[--font-size-step--2] text-[--color-ink-400]">
                        {d.collegeCity || 'Karnataka'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {new Date(d.driveDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-[--color-graphite]">
                      {d.venue || 'Campus Auditorium'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {d.seats || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[--color-leaf]">
                      {d.viewCount} views
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[--font-size-step--2] font-mono uppercase font-bold rounded bg-emerald-500/10 text-emerald-800">
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copyDriveLink(d.code)}
                          className="px-2.5 py-1 text-[--font-size-step--2] font-medium bg-[--color-paper] hover:bg-[--color-ink-900]/10 border border-[--color-ink-900]/15 rounded transition-colors"
                        >
                          {copiedCode === d.code ? 'Copied URL!' : 'Copy QR Link'}
                        </button>
                        <Link
                          href={`/d/${d.code}`}
                          target="_blank"
                          className="text-[--font-size-step--2] text-[--color-ink-600] hover:underline"
                        >
                          Visit &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Schedule Drive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-[--spacing-s6] bg-[--color-chalk] border border-[--color-ink-900]/20 shadow-2xl flex flex-col gap-[--spacing-s5]">
            <div className="flex items-center justify-between border-b border-[--color-ink-900]/10 pb-3">
              <h2 className="font-bold text-[--font-size-step-1] text-[--color-ink-900]">
                Schedule Campus Drive
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[--color-ink-400] hover:text-[--color-ink-900] font-bold text-[--font-size-step-1]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="flex flex-col gap-[--spacing-s4]">
              <FieldWrapper id="code" label="Drive Short Code (e.g. GFGC-YLK-0826)" required hint="Used in QR code and direct landing URL /d/[code]">
                <Input
                  id="code"
                  placeholder="GFGC-YLK-0826"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </FieldWrapper>

              <FieldWrapper id="collegeQuery" label="Partner College" required>
                <Input
                  id="collegeQuery"
                  placeholder="Search college name..."
                  value={collegeQuery}
                  onChange={(e) => searchColleges(e.target.value)}
                  required
                />
                {collegeOptions.length > 0 && !collegeId && (
                  <div className="mt-1 max-h-40 overflow-y-auto bg-[--color-chalk] border border-[--color-ink-900]/15 rounded shadow-lg">
                    {collegeOptions.map((c) => (
                      <div
                        key={c.value}
                        onClick={() => {
                          setCollegeId(c.value)
                          setCollegeQuery(c.label)
                          setCollegeOptions([])
                        }}
                        className="px-3 py-2 text-[--font-size-step--1] hover:bg-[--color-marigold]/10 cursor-pointer text-[--color-ink-900]"
                      >
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </FieldWrapper>

              <div className="grid grid-cols-2 gap-[--spacing-s3]">
                <FieldWrapper id="driveDate" label="Drive Date" required>
                  <Input
                    id="driveDate"
                    type="date"
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                    required
                  />
                </FieldWrapper>

                <FieldWrapper id="seats" label="Seats / Openings">
                  <Input
                    id="seats"
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                  />
                </FieldWrapper>
              </div>

              <FieldWrapper id="venue" label="Venue Location">
                <Input
                  id="venue"
                  placeholder="Main Auditorium / Placement Cell"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </FieldWrapper>

              <div className="flex justify-end gap-[--spacing-s2] mt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={creating}>
                  Schedule Drive &rarr;
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
