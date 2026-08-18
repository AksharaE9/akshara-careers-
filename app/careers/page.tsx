import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { getOpenJobs, type JobCardResult } from '@/lib/db/queries/jobs'
import { TalentPoolForm } from '@/components/talent-pool/TalentPoolForm'
import { HiringProcessCarousel } from '@/components/landing/HiringProcessCarousel'

// ISR: re-render at most once per 60s. On job publish/close, revalidateTag('jobs')
// fires immediately and busts this cache without waiting for the window.
export const revalidate = 60

// Cache the DB fetch at the data layer so individual RSC renders stay fast
// even when the page re-renders due to searchParam filter changes.
const getCachedOpenJobs = unstable_cache(
  async () => {
    if (!process.env.NEON_DATABASE_URL) return null
    return getOpenJobs()
  },
  ['open-jobs'],
  { tags: ['jobs'], revalidate: 60 },
)

const FALLBACK_JOBS: JobCardResult[] = [
  {
    id: 'f1',
    slug: 'business-development-executive',
    title: 'Business Development Executive',
    family: 'Sales',
    summary: 'Promote education loans to students and drive admissions conversions across partner institutions.',
    employmentType: 'FULL_TIME',
    workMode: 'field',
    locationCity: 'Bengaluru',
    locationState: 'Karnataka',
    salaryMin: 350000,
    salaryMax: 450000,
    salaryCurrency: 'INR',
    salaryUnit: 'YEAR',
    salaryIsPublic: true,
    requiresTwoWheeler: true,
    requiresDrivingLicence: true,
    postedAt: new Date(),
  },
  {
    id: 'f2',
    slug: 'operations-associate',
    title: 'Operations Associate',
    family: 'Operations',
    summary: 'Process loan applications, verify candidate academic documents, and manage partner institution workflows.',
    employmentType: 'FULL_TIME',
    workMode: 'onsite',
    locationCity: 'Bengaluru',
    locationState: 'Karnataka',
    salaryMin: 300000,
    salaryMax: 400000,
    salaryCurrency: 'INR',
    salaryUnit: 'YEAR',
    salaryIsPublic: true,
    requiresTwoWheeler: false,
    requiresDrivingLicence: false,
    postedAt: new Date(),
  },
]

interface CareersPageProps {
  searchParams: Promise<{
    query?: string
    family?: string
    location?: string
  }>
}

import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker'

export default async function CareersPage({ searchParams }: CareersPageProps) {
  const resolvedParams = await searchParams
  const queryFilter = resolvedParams.query?.toLowerCase() || ''
  const familyFilter = resolvedParams.family || ''
  const locationFilter = resolvedParams.location || ''
  const hasActiveFilters = Boolean(queryFilter || familyFilter || locationFilter)

  let openJobs = FALLBACK_JOBS

  try {
    const dbJobs = await getCachedOpenJobs()
    if (dbJobs && dbJobs.length > 0) openJobs = dbJobs
  } catch (err) {
    console.error('Failed to query database, using fallback data:', err)
  }

  const filteredJobs = openJobs.filter((job) => {
    const matchesQuery =
      queryFilter === '' ||
      job.title.toLowerCase().includes(queryFilter) ||
      job.summary.toLowerCase().includes(queryFilter)
    const matchesFamily = familyFilter === '' || job.family === familyFilter
    const matchesLocation =
      locationFilter === '' ||
      job.locationCity.toLowerCase() === locationFilter.toLowerCase()

    return matchesQuery && matchesFamily && matchesLocation
  })

  const uniqueFamilies = Array.from(new Set(openJobs.map((j) => j.family)))
  const uniqueLocations = Array.from(new Set(openJobs.map((j) => j.locationCity)))

  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink) flex flex-col font-sans">
      <AnalyticsTracker name="page_view" path="/careers" />
      <Header />

      <main className="flex-1">
        {/* S1: HERO · .section-lg · Warm cream ground (§21.4) with bottom hairline */}
        <section
          data-section="hero"
          data-ground="cream"
          className="relative bg-(--color-cream) border-b border-[#D8CCB6] section-lg min-h-[600px] flex items-center text-(--color-ink) overflow-hidden py-12 lg:py-16"
        >
          <Container width="content" className="relative z-10">
            <Grid className="items-center gap-y-12">
              {/* Left Column: 7 Cols on desktop */}
              <div className="col-span-4 md:col-span-8 lg:col-span-7 flex flex-col items-start">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-(--color-hairline) shadow-xs text-xs sm:text-sm font-mono font-bold text-(--color-rust) mb-5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-(--color-leaf) animate-pulse" />
                  <span>HIRING 2026 COHORTS · BENGALURU HUB</span>
                </div>

                <h1 className="text-[clamp(2.5rem,2.0rem+2.8vw,4.25rem)] font-display font-black leading-[1.06] text-(--color-ink) tracking-tight max-w-[16ch]">
                  Build educational infrastructure.
                </h1>

                <p className="mt-5 text-[clamp(1.125rem,1.05rem+0.35vw,1.35rem)] text-(--color-muted) max-w-[48ch] leading-relaxed font-normal">
                  Join our mission to finance higher education for ambitious students across India. High autonomy, transparent compensation, and fast career progression.
                </p>

                {/* CTAs (§21.4): One ink-filled primary CTA + one bordered secondary */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <a
                    href="#roles"
                    data-testid="hero-cta-roles"
                    className="btn btn--lg btn--primary min-w-[200px] h-13 text-base shadow-md font-bold flex items-center justify-center gap-2.5"
                  >
                    <span>View Open Roles</span>
                    <span>&rarr;</span>
                  </a>
                  <a
                    href="#process"
                    data-testid="hero-cta-drives"
                    className="btn btn--lg btn--secondary min-w-[190px] h-13 text-base shadow-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <span>Hiring Process</span>
                  </a>
                </div>

                {/* Metric Badges */}
                <div className="mt-9 flex flex-wrap gap-2.5 sm:gap-3 text-xs sm:text-sm font-mono">
                  <div className="px-4 py-2 rounded-lg bg-white border border-(--color-hairline) text-(--color-ink) font-bold shadow-xs flex items-center gap-2">
                    <span className="text-(--color-rust) font-bold">●</span> {openJobs.length} Active Openings
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-white border border-(--color-hairline) text-(--color-ink) font-bold shadow-xs flex items-center gap-2">
                    <span className="text-(--color-rust) font-bold">⚡</span> 4-Stage Fast Hiring
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-white border border-(--color-hairline) text-(--color-ink) font-bold shadow-xs flex items-center gap-2">
                    <span className="text-(--color-leaf) font-bold">📍</span> Bengaluru HQ
                  </div>
                </div>
              </div>

              {/* Right Column: 5 Cols on desktop — Warm Editorial Visual */}
              <div className="col-span-4 md:col-span-8 lg:col-span-5 relative">
                <div className="relative rounded-2xl overflow-hidden border border-(--color-hairline) shadow-md bg-white p-3">
                  <div className="relative rounded-xl overflow-hidden min-h-[420px] flex items-end">
                    <Image
                      src="/images/hero-team.png"
                      alt="Akshara Careers & Collaborative Team"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 540px"
                      className="object-cover object-center transition-all duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-(--color-ink)/85 via-(--color-ink)/25 to-transparent" />

                    {/* Top Floating Badge */}
                    <div className="absolute top-3.5 left-3.5 px-3.5 py-1.5 rounded-full bg-(--color-ink)/85 backdrop-blur-md border border-white/20 text-(--color-paper) text-xs font-mono font-medium flex items-center gap-2 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-(--color-amber)" />
                      <span>Direct Mentorship & Scale</span>
                    </div>

                    {/* Floating Metric Card */}
                    <div className="relative z-10 m-4 p-4 bg-(--color-ink)/90 backdrop-blur-md border border-white/10 rounded-xl flex flex-col gap-1.5 w-full text-(--color-paper) shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs sm:text-sm text-(--color-amber) font-bold uppercase tracking-wider">
                          Bengaluru Innovation Hub
                        </span>
                        <span className="flex h-2 w-2 rounded-full bg-(--color-leaf) animate-pulse" />
                      </div>
                      <p className="text-xs sm:text-sm text-(--color-paper)/85 font-normal leading-snug">
                        Empowering ambitious talent to scale educational financing across India.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Grid>
          </Container>
        </section>

        {/* S2: OPEN ROLES · .section-md · data-ground="paper" */}
        <section id="roles" data-section="roles" data-ground="paper" className="bg-(--color-paper) section-md text-(--color-ink)">
          <Container width="content">
            <div className="heading-block max-w-2xl">
              <span className="heading-block-eyebrow">
                Opportunities
              </span>
              <h2 className="heading-block-title text-(--font-size-step-3)">
                Open Requisitions
              </h2>
              <p className="heading-block-sub">
                Explore open opportunities across our commercial, risk, and operations divisions.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="sticky top-[72px] z-20 bg-(--color-paper)/95 backdrop-blur py-4 border-b border-(--color-hairline) flex flex-wrap items-center gap-3">
              <form method="GET" action="/careers#roles" className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full">
                <input
                  type="text"
                  name="query"
                  aria-label="Search keywords or job title"
                  defaultValue={queryFilter}
                  placeholder="Search keywords or job title..."
                  className="input-control w-full sm:flex-1 h-12"
                />

                <select
                  name="family"
                  aria-label="Filter by Job Family"
                  defaultValue={familyFilter}
                  className="select-control w-full sm:w-52 h-12"
                >
                  <option value="">All Job Families</option>
                  {uniqueFamilies.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <select
                  name="location"
                  aria-label="Filter by Location"
                  defaultValue={locationFilter}
                  className="select-control w-full sm:w-52 h-12"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <Link
                    href="/careers#roles"
                    className="text-(--font-size-step--1) text-(--color-muted) hover:text-(--color-ink) font-semibold self-center underline ml-2"
                  >
                    Clear filters
                  </Link>
                )}
              </form>
            </div>

            {/* Role Cards List */}
            <div className="mt-8 flex flex-col gap-4">
              {filteredJobs.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-(--radius-lg) border border-(--color-hairline)">
                  <h3 className="text-(--font-size-step-1) font-bold text-(--color-ink)">No open roles match your filters</h3>
                  <p className="text-(--font-size-step-0) text-(--color-muted) mt-2">
                    Try clearing search terms or join our talent pool to get notified when new roles open.
                  </p>
                  <div className="mt-6">
                    <Link href="/careers#roles" className="btn btn--sm btn--secondary">
                      Clear filters
                    </Link>
                  </div>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    data-testid={`job-card-${job.slug}`}
                    className="p-6 sm:p-8 bg-white border border-(--color-hairline) rounded-(--radius-lg) hover:border-(--color-border) transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs"
                  >
                    <div className="flex flex-col gap-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-(--font-size-step--2) uppercase font-semibold text-(--color-muted-strong) bg-(--color-sand) px-2.5 py-1 rounded">
                          {job.family}
                        </span>
                        <span className="font-mono text-(--font-size-step--2) text-(--color-muted)">
                          {job.employmentType.replace('_', ' ')} · {job.workMode}
                        </span>
                      </div>

                      <h3 className="font-display text-(--font-size-step-2) font-bold text-(--color-ink)">
                        {job.title}
                      </h3>

                      <p className="text-(--font-size-step-0) text-(--color-muted) leading-relaxed">
                        {job.summary}
                      </p>

                      <div data-card-meta className="flex flex-wrap items-center gap-4 mt-2 font-mono text-(--font-size-step--1) text-(--color-muted)">
                        <span>📍 {job.locationCity}, {job.locationState}</span>
                        {job.requiresTwoWheeler && (
                          <span className="text-(--color-leaf) font-medium">✓ Two-wheeler required</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center md:self-center shrink-0">
                      <Link
                        href={`/apply/${job.slug}`}
                        className="btn btn--sm btn--primary w-full sm:w-auto"
                      >
                        Apply Now →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Container>
        </section>

        {/* S3: HIRING PROCESS · .section-md · data-ground="cream" */}
        <section id="process" data-section="process" data-ground="cream" className="bg-(--color-cream) section-md text-(--color-ink) border-t border-(--color-hairline)">
          <Container width="content">
            <div className="heading-block max-w-2xl">
              <span className="heading-block-eyebrow">
                Methodology
              </span>
              <h2 className="heading-block-title text-(--font-size-step-3)">
                How We Hire
              </h2>
              <p className="heading-block-sub">
                A streamlined, transparent 4-stage evaluation designed to respect your time and give you real clarity.
              </p>
            </div>

            {/* Interactive Visual Carousel */}
            <div className="mt-8">
              <HiringProcessCarousel />
            </div>
          </Container>
        </section>

        {/* S4: LIFE AT AKSHARA · .section-md · data-ground="paper" */}
        <section data-section="culture" data-ground="paper" className="bg-(--color-paper) section-md text-(--color-ink) border-t border-(--color-hairline)">
          <Container width="content">
            <div className="heading-block max-w-2xl">
              <span className="heading-block-eyebrow">
                Culture & Environment
              </span>
              <h2 className="heading-block-title text-(--font-size-step-3)">
                Life at Akshara
              </h2>
              <p className="heading-block-sub">
                We combine the rigorous execution of enterprise fintech with the speed, autonomy, and direct impact of an early-stage team.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white border border-(--color-hairline) rounded-(--radius-lg) flex flex-col gap-3 shadow-xs">
                <span className="text-2xl">⚡</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-ink)">High Ownership</h3>
                <p className="text-(--font-size-step--1) text-(--color-muted) leading-relaxed">
                  Every team member owns real operational and financial outcomes from day one with clear mandate and minimal bureaucracy.
                </p>
              </div>

              <div className="p-6 bg-white border border-(--color-hairline) rounded-(--radius-lg) flex flex-col gap-3 shadow-xs">
                <span className="text-2xl">📈</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-ink)">Transparent Growth</h3>
                <p className="text-(--font-size-step--1) text-(--color-muted) leading-relaxed">
                  Clear performance benchmarks, uncapped sales incentives for commercial roles, and structured promotion tracks.
                </p>
              </div>

              <div className="p-6 bg-white border border-(--color-hairline) rounded-(--radius-lg) flex flex-col gap-3 shadow-xs">
                <span className="text-2xl">🎓</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-ink)">Mission Driven</h3>
                <p className="text-(--font-size-step--1) text-(--color-muted) leading-relaxed">
                  Direct impact enabling students across tier-2/3 institutions to access credit and complete degree education.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* S5: TALENT POOL · .section-md · data-ground="cream" */}
        <section id="talent" data-section="talent-pool" data-ground="cream" className="bg-(--color-cream) section-md text-(--color-ink) border-t border-(--color-hairline)">
          <Container width="content">
            <div className="heading-block max-w-2xl">
              <span className="heading-block-eyebrow">
                Future Openings
              </span>
              <h2 className="heading-block-title text-(--font-size-step-3)">
                Join the Akshara Talent Pool
              </h2>
              <p className="heading-block-sub">
                Don&apos;t see an exact match today? Register your interest to be notified immediately when relevant commercial or credit roles open.
              </p>
            </div>

            <div className="mt-8 max-w-xl">
              <TalentPoolForm />
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  )
}
