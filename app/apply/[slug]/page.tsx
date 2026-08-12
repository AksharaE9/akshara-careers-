/**
 * app/apply/[slug]/page.tsx
 *
 * Public application wizard page.
 * Requires candidate authentication before application registration.
 * Fetches the job slug, checks drive params, and pre-fills candidate details.
 * Updated for Part 21 warm light theme with rust accents.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JobApplyForm } from '@/components/apply/JobApplyForm'
import { getJobBySlug } from '@/lib/db/queries/jobs'
import { getCurrentCandidate } from '@/lib/auth/candidate-session'

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

  if (!job) {
    job = FALLBACK_JOBS.find((j) => j.slug === slug) ?? null
  }

  if (!job) {
    notFound()
  }

  // Check candidate authentication
  let candidate = null
  try {
    candidate = await getCurrentCandidate()
  } catch {
    // Ignore outside request context
  }

  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink) flex flex-col font-sans">
      <Header />

      <main className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-10 flex flex-col gap-6 flex-1">
        {/* Back Link */}
        <Link
          href={`/careers`}
          className="text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-mono font-medium text-(--color-muted) hover:text-(--color-rust) transition-colors flex items-center gap-2 self-start"
        >
          <span>&larr;</span> Back to Careers
        </Link>

        {/* Wizard Header */}
        <div>
          <span className="font-mono text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] tracking-[0.12em] uppercase text-(--color-rust) font-bold">
            Application Portal
          </span>
          <h1 className="font-display text-[clamp(1.75rem,1.50rem+1.10vw,2.40rem)] font-bold text-(--color-ink) mt-1">
            Apply for {job.title}
          </h1>
          {driveCode && (
            <p className="text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] text-(--color-leaf) font-semibold font-mono mt-1">
              ✓ Campus Placement Drive: {driveCode.toUpperCase()}
            </p>
          )}
        </div>

        {/* Auth Check & Apply Form */}
        {!candidate ? (
          /* Authentication Required Gate Card */
          <div className="w-full max-w-2xl mx-auto bg-white border border-(--color-hairline) rounded-2xl p-6 sm:p-8 shadow-xl text-(--color-ink) flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--color-sand) border border-(--color-hairline) text-(--color-ink) text-xs font-mono font-bold w-fit">
                <span>🔐</span> Candidate Sign In Required
              </div>
              <h2 className="font-display text-[clamp(1.44rem,1.30rem+0.70vw,1.90rem)] font-bold text-(--color-ink) mt-1">
                Sign in to complete your application
              </h2>
              <p className="text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] text-(--color-muted) leading-relaxed">
                To submit and track your application for <strong className="text-(--color-ink)">{job.title}</strong>, please log in with your candidate account or register a new profile.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/login?redirect=/apply/${slug}`}
                className="btn btn--md btn--primary flex-1 font-bold shadow-sm"
              >
                Sign In to Apply &rarr;
              </Link>
              <Link
                href={`/login?mode=signup&redirect=/apply/${slug}`}
                className="btn btn--md btn--secondary flex-1 font-bold shadow-2xs"
              >
                Create New Account
              </Link>
            </div>

            <div className="border-t border-(--color-hairline) pt-4 flex items-center justify-between text-xs text-(--color-muted) font-mono">
              <span>Secure DPDP Act compliant pipeline</span>
              <Link href="/login" className="text-(--color-rust) hover:underline font-bold">
                Check Status &rarr;
              </Link>
            </div>
          </div>
        ) : (
          /* Logged In: Render Application Registration Wizard */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-(--color-sand) border border-(--color-hairline) px-4 py-2.5 rounded-xl text-xs text-(--color-ink)">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-(--color-leaf)" />
                Applying as: <strong className="text-(--color-ink)">{candidate.fullName}</strong> ({candidate.phoneE164})
              </span>
              <Link
                href={`/login?redirect=/apply/${slug}`}
                className="text-(--color-rust) hover:underline font-bold font-mono"
              >
                Switch Account
              </Link>
            </div>

            <JobApplyForm
              job={job}
              driveCode={driveCode}
              source={source}
              candidate={candidate}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
