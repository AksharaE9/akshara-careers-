/**
 * app/console/applications/[id]/page.tsx
 *
 * Application Detail, Candidate Profile, Resume Viewer & Interview Notes timeline.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getApplicationById } from '@/lib/db/queries/applications'
import { Card } from '@/components/ui/Card'
import { ApplicationDetailClient } from './client'

interface Params {
  params: Promise<{ id: string }>
}

export default async function ApplicationDetailPage({ params }: Params) {
  const { id } = await params
  const app = await getApplicationById(id)

  if (!app) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-(--spacing-s6)">
      {/* Top Nav Back */}
      <Link
        href="/console/applications"
        className="text-(--font-size-step--1) font-mono text-(--color-ink-600) hover:text-(--color-ink-900) transition-colors flex items-center gap-(--spacing-s1) self-start"
      >
        <span>&larr;</span> Back to Candidate Pipeline
      </Link>

      <ApplicationDetailClient initialApp={app as any} />
    </div>
  )
}
