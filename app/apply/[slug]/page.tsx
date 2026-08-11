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
    <div className="min-h-screen bg-(--color-ink-950) text-(--color-text-on-dark) flex flex-col font-sans">
      <Header />

      <main className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-10 flex flex-col gap-6 flex-1">
        {/* Back Link */}
        <Link
          href={`/careers`}
          className="text-(--font-size-step--1) font-mono text-(--color-text-on-dark-muted) hover:text-(--color-amber-400) transition-colors flex items-center gap-2 self-start"
        >
          <span>&larr;</span> Back to Careers
        </Link>

        {/* Wizard Header */}
        <div>
          <span className="font-mono text-(--font-size-step--1) tracking-[0.12em] uppercase text-(--color-amber-400) font-semibold">
            Application Portal
          </span>
          <h1 className="font-display text-(--font-size-step-3) font-bold text-(--color-text-on-dark) mt-2">
            Apply for {job.title}
          </h1>
          {driveCode && (
            <p className="text-(--font-size-step--1) text-(--color-leaf) font-semibold font-mono mt-1">
              ✓ Campus Placement Drive: {driveCode.toUpperCase()}
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
