/**
 * app/status/[token]/page.tsx
 *
 * Public Candidate Self-Serve Status Tracker.
 * Accessed via 32-char opaque token without exposing full candidate PII.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/Card'
import { getApplicationByToken } from '@/lib/db/queries/applications'

interface StatusPageProps {
  params: Promise<{
    token: string
  }>
}

const STAGES_TIMELINE = [
  { id: 'received', label: 'Application Submitted', desc: 'Your profile has been received and registered.' },
  { id: 'under_review', label: 'Profile Under Review', desc: 'Our recruitment team is reviewing your qualifications.' },
  { id: 'interview_scheduled', label: 'Interview Round', desc: 'Interview scheduled with the hiring manager.' },
  { id: 'offered', label: 'Final Decision', desc: 'Offer release or application completion.' },
]

export default async function CandidateStatusPage({ params }: StatusPageProps) {
  const { token } = await params
  const app = await getApplicationByToken(token)

  if (!app) {
    notFound()
  }

  // Determine stage progress level (0 to 3)
  const getStageIndex = (currentStage: string) => {
    switch (currentStage) {
      case 'received':
        return 0
      case 'under_review':
      case 'shortlisted':
        return 1
      case 'interview_scheduled':
      case 'interviewed':
        return 2
      case 'offered':
      case 'hired':
      case 'rejected':
      case 'withdrawn':
        return 3
      default:
        return 0
    }
  }

  const activeIdx = getStageIndex(app.stage)

  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col font-sans">
      <Header />

      <main className="mx-auto max-w-2xl w-full px-(--spacing-s4) py-(--spacing-s8) flex-1 flex flex-col gap-(--spacing-s6)">
        <div>
          <span className="eyebrow text-(--color-marigold)">Application Status</span>
          <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900) mt-1">
            Track Your Application
          </h1>
          <p className="text-(--font-size-step-0) text-(--color-graphite) mt-1">
            Hello {app.candidateFirstName || 'there'}, here is the live status of your application for the{' '}
            <span className="font-semibold text-(--color-ink-900)">{app.jobTitle}</span> opening.
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-md flex flex-col gap-(--spacing-s6)">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-(--color-ink-900)/10 pb-4 gap-2">
            <div>
              <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                Application Reference
              </span>
              <span className="font-mono font-bold text-(--font-size-step-1) text-(--color-marigold)">
                {app.publicId}
              </span>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono block">
                Submitted On
              </span>
              <span className="font-mono text-(--font-size-step--1) text-(--color-graphite)">
                {new Date(app.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-(--spacing-s4)">
            {STAGES_TIMELINE.map((s, i) => {
              const isPast = i < activeIdx
              const isCurrent = i === activeIdx
              const isFuture = i > activeIdx

              return (
                <div key={s.id} className="flex gap-(--spacing-s4) items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-(--font-size-step--1) transition-colors ${
                        isPast
                          ? 'bg-(--color-leaf) text-white'
                          : isCurrent
                          ? 'bg-(--color-marigold) text-white ring-4 ring-(--color-marigold)/20'
                          : 'bg-(--color-ink-900)/10 text-(--color-ink-400)'
                      }`}
                    >
                      {isPast ? '✓' : i + 1}
                    </div>
                    {i < STAGES_TIMELINE.length - 1 && (
                      <div
                        className={`w-0.5 h-10 my-1 ${
                          isPast ? 'bg-(--color-leaf)' : 'bg-(--color-ink-900)/10'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-bold text-(--font-size-step-0) ${
                          isCurrent
                            ? 'text-(--color-ink-900)'
                            : isPast
                            ? 'text-(--color-leaf)'
                            : 'text-(--color-ink-400)'
                        }`}
                      >
                        {s.label}
                      </h3>
                      {isCurrent && (
                        <span className="px-2 py-0.2 text-(--font-size-step--2) font-mono font-bold bg-(--color-marigold)/15 text-(--color-graphite) rounded">
                          Current Stage
                        </span>
                      )}
                    </div>
                    <p className="text-(--font-size-step--1) text-(--color-graphite) mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Need help box */}
          <div className="border-t border-(--color-ink-900)/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-(--font-size-step--1)">
            <span className="text-(--color-graphite)">
              Have questions regarding your application?
            </span>
            <a
              href="https://wa.me/919986266394"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] font-semibold hover:underline flex items-center gap-1"
            >
              Contact Support on WhatsApp &rarr;
            </a>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
