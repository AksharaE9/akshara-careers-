/**
 * app/apply/[slug]/page.tsx
 *
 * Public application wizard page.
 * Fetches the job slug (awaited for Next.js 15), checks drive params,
 * and renders the client-side JobApplyForm wizard component.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JobApplyForm } from '@/components/apply/JobApplyForm'
import { getJobBySlug } from '@/lib/db/queries/jobs'

// Fallback seed jobs for display when database URL is not supplied yet
const FALLBACK_JOBS = [
  {
    id: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
    slug: 'business-development-executive',
    title: 'Business Development Executive',
    requiresTwoWheeler: true,
    requiresDrivingLicence: true,
  },
  {
    id: 'b2c3d4e5-f6a7-4890-bcde-f01234567890',
    slug: 'operations-associate',
    title: 'Operations Associate',
    requiresTwoWheeler: false,
    requiresDrivingLicence: false,
  },
]

interface ApplyPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    drive?: string
    source?: string
  }>
}

export default async function ApplyPage({ params, searchParams }: ApplyPageProps) {
  // Await params and searchParams per Next.js 15 specification
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const { slug } = resolvedParams
  const driveCode = resolvedSearchParams.drive || null
  const source = resolvedSearchParams.source || 'organic'

  // Fetch job from Neon, or use fallback seed list
  let job: typeof FALLBACK_JOBS[number] | null = null
  const hasDb = Boolean(process.env.NEON_DATABASE_URL)

  if (hasDb) {
    try {
      const dbJob = await getJobBySlug(slug)
      if (dbJob) {
        job = {
          id: dbJob.id,
          title: dbJob.title,
          slug: dbJob.slug,
          requiresTwoWheeler: dbJob.requiresTwoWheeler,
          requiresDrivingLicence: dbJob.requiresDrivingLicence,
        }
      }
    } catch (err) {
      console.error('Failed to query job info from database, utilizing fallback:', err)
    }
  }

  // Fallback check
  if (!job) {
    job = FALLBACK_JOBS.find((j) => j.slug === slug) ?? null
  }

  if (!job) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col">
      <Header />

      <main className="mx-auto max-w-3xl w-full px-(--spacing-s5) py-(--spacing-s8) flex flex-col gap-(--spacing-s6) flex-1">
        {/* Back Link */}
        <Link href={`/careers/${job.slug}`} className="text-(--font-size-step--1) font-mono text-(--color-ink-600) hover:text-(--color-ink-900) transition-colors flex items-center gap-(--spacing-s1) self-start">
          <span>&larr;</span> Back to Job Details
        </Link>

        {/* Wizard Header */}
        <div>
          <span className="eyebrow text-(--color-marigold)">Application Portal</span>
          <h1 className="display text-(--font-size-step-2) font-bold text-(--color-ink-900) mt-(--spacing-s1)">
            Apply for {job.title}
          </h1>
          {driveCode && (
            <p className="text-(--font-size-step--1) text-(--color-leaf) font-semibold font-mono mt-(--spacing-s1)">
              ✓ Campus Drive Session: {driveCode.toUpperCase()}
            </p>
          )}
        </div>

        {/* Interactive Apply Wizard Form */}
        <JobApplyForm job={job} driveCode={driveCode} source={source} />
      </main>

      <Footer />
    </div>
  )
}
