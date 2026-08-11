/**
 * app/console/exports/page.tsx
 *
 * DPDP Compliance & Candidate Data Exports console.
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { FieldWrapper } from '@/components/ui/FieldWrapper'

export default function ConsoleExportsPage() {
  const [stage, setStage] = useState('')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    const params = new URLSearchParams()
    if (stage) params.set('stage', stage)

    // This triggers a file download (the endpoint sets Content-Disposition:
    // attachment), not a page navigation — router.push()/redirect() are for
    // navigating between Next.js routes, not fetching a non-HTML response.
    // An anchor click is the standard way to trigger a download without
    // navigating away, and it doesn't trip
    // @next/next/no-location-assign-relative-destination the way a direct
    // window.location.href assignment does.
    const link = document.createElement('a')
    link.href = `/api/console/exports?${params.toString()}`
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => setDownloading(false), 2000)
  }

  return (
    <div className="flex flex-col gap-(--spacing-s6) max-w-3xl">
      <div>
        <span className="eyebrow text-(--color-marigold)">Compliance & Analytics</span>
        <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900)">
          DPDP Candidate Exports
        </h1>
        <p className="text-(--font-size-step--1) text-(--color-graphite) mt-1">
          Export candidate pipeline snapshots into standard CSV for ATS or offline evaluation.
          All exports are immutably recorded in the compliance audit log.
        </p>
      </div>

      <Card className="p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-xs flex flex-col gap-(--spacing-s5)">
        <h2 className="font-bold text-(--font-size-step-1) text-(--color-ink-900)">
          Export Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-(--spacing-s4)">
          <FieldWrapper id="stage" label="Filter by Stage">
            <Select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All Pipeline Stages</option>
              <option value="received">Received</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="interviewed">Interviewed</option>
              <option value="offered">Offered</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </Select>
          </FieldWrapper>

          <FieldWrapper id="format" label="File Format">
            <Select id="format" value="csv" disabled>
              <option value="csv">Standard CSV (.csv UTF-8)</option>
            </Select>
          </FieldWrapper>
        </div>

        <div className="bg-(--color-marigold)/10 p-3 rounded-(--radius-sm) border border-(--color-marigold)/20 text-(--font-size-step--2) text-(--color-graphite)">
          <span className="font-bold text-(--color-ink-900) block mb-1">
            ⚖️ DPDP Act Retention Policy Notice:
          </span>
          Exported records are subject to 24-month retention limits. Do not store PII on unencrypted
          external storage devices.
        </div>

        <Button
          variant="primary"
          onClick={handleDownload}
          loading={downloading}
          className="self-start"
          data-testid="export-csv-btn"
        >
          📥 Download Candidates CSV
        </Button>
      </Card>
    </div>
  )
}
