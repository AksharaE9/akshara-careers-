import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { getOpenJobs, type JobCardResult } from '@/lib/db/queries/jobs'
import { TalentPoolForm } from '@/components/talent-pool/TalentPoolForm'
import { HiringProcessCarousel } from '@/components/landing/HiringProcessCarousel'

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

export default async function CareersPage({ searchParams }: CareersPageProps) {
  const resolvedParams = await searchParams
  const queryFilter = resolvedParams.query?.toLowerCase() || ''
  const familyFilter = resolvedParams.family || ''
  const locationFilter = resolvedParams.location || ''
  const hasActiveFilters = Boolean(queryFilter || familyFilter || locationFilter)

  let openJobs = FALLBACK_JOBS

  try {
    if (process.env.NEON_DATABASE_URL) {
      const dbJobs = await getOpenJobs()
      if (dbJobs && dbJobs.length > 0) openJobs = dbJobs
    }
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
    <div className="min-h-screen bg-(--color-ink-950) flex flex-col font-sans">
      <Header />

      <main className="flex-1">
        {/* S1: HERO · .section-lg · bg-ink-950 with background image */}
        <section data-section="hero" className="relative bg-(--color-ink-950) section-lg min-h-[620px] flex items-center text-(--color-text-on-dark) overflow-hidden">
          {/* Background Image with Dark Vignette & Gradient Overlays */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none">
            <Image
              src="/images/hero-bg.png"
              alt="Akshara Education Infrastructure"
              fill
              priority
              className="object-cover object-center opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-(--color-ink-950) via-(--color-ink-950)/90 to-(--color-ink-950)/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-(--color-ink-950) via-transparent to-(--color-ink-950)/50" />
          </div>

          <Container width="content" className="relative z-10">
            <Grid className="items-center gap-y-12">
              {/* Left Column: 7 Cols on desktop */}
              <div className="col-span-4 md:col-span-8 lg:col-span-7 flex flex-col items-start">
                <span className="font-mono text-(--font-size-step--1) tracking-[0.12em] uppercase text-(--color-amber-400) font-semibold mb-3">
                  Careers at Akshara
                </span>

                <h1 className="text-(--font-size-step-5) font-display font-bold leading-[1.05] text-(--color-text-on-dark) tracking-tight max-w-[16ch]">
                  Build educational infrastructure.
                </h1>

                <p className="mt-5 text-(--font-size-step-0) text-(--color-text-on-dark-muted) max-w-[50ch] leading-relaxed">
                  Join our mission to finance higher education for ambitious students across India. High autonomy, transparent compensation, and fast career progression.
                </p>

                {/* CTAs with shared min-width (L-13) */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <a
                    href="#roles"
                    data-testid="hero-cta-roles"
                    className="btn btn--md btn--primary min-w-[180px]"
                  >
                    View Open Roles
                  </a>
                  <a
                    href="#process"
                    data-testid="hero-cta-drives"
                    className="btn btn--md btn--secondary min-w-[180px]"
                  >
                    Hiring Process
                  </a>
                </div>

                <div className="mt-10 text-(--font-size-step--1) font-mono text-(--color-text-on-dark-muted) tabular-nums">
                  {openJobs.length} active requisitions · Bengaluru Innovation Hub · 4-stage hiring
                </div>
              </div>

              {/* Right Column: 5 Cols on desktop — Career Space Visual Photo */}
              <div className="col-span-4 md:col-span-8 lg:col-span-5 relative">
                <div className="relative rounded-(--radius-lg) overflow-hidden border border-(--color-ink-600) shadow-2xl bg-(--color-ink-900) min-h-[380px] flex items-end">
                  <Image
                    src="/images/hero-team.png"
                    alt="Akshara Careers & Collaborative Team"
                    fill
                    priority
                    className="object-cover object-center transition-all duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-(--color-ink-950) via-(--color-ink-950)/40 to-transparent" />

                  {/* Floating Metric Card */}
                  <div className="relative z-10 m-5 p-4 bg-(--color-ink-950)/85 backdrop-blur-md border border-(--color-ink-600) rounded-(--radius-md) flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-(--font-size-step--2) text-(--color-amber-400) font-bold uppercase tracking-wider">
                        Bengaluru Innovation Hub
                      </span>
                      <span className="flex h-2 w-2 rounded-full bg-(--color-leaf) animate-pulse" />
                    </div>
                    <p className="text-(--font-size-step--1) text-(--color-text-on-dark) font-medium">
                      Empowering ambitious talent to scale educational financing across India.
                    </p>
                  </div>
                </div>
              </div>
            </Grid>
            {/* Proof Strip of Supported Institutions (L-12) */}
            <div className="mt-12 border-t border-(--color-ink-600)/30 pt-6">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-(--color-text-on-dark-muted) block mb-4">
                Supported Partner Institutions
              </span>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-50">
                <div data-proof-logo className="h-[28px] text-(--color-text-on-dark) font-display font-bold text-sm tracking-tight flex items-center">
                  GC Yelahanka
                </div>
                <div data-proof-logo className="h-[28px] text-(--color-text-on-dark) font-display font-bold text-sm tracking-tight flex items-center">
                  GFGC Bangalore
                </div>
                <div data-proof-logo className="h-[28px] text-(--color-text-on-dark) font-display font-bold text-sm tracking-tight flex items-center">
                  PES University
                </div>
                <div data-proof-logo className="h-[28px] text-(--color-text-on-dark) font-display font-bold text-sm tracking-tight flex items-center">
                  RV College of Engineering
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* S2: OPEN ROLES · .section-md · bg-frost-100 · data-ground="light" */}
        <section id="roles" data-section="roles" data-ground="light" className="bg-(--color-frost-100) section-md text-(--color-text-on-light)">
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

            {/* Filter Bar (Sticky Live Filtering per §18.5) */}
            <div className="sticky top-[72px] z-20 bg-(--color-frost-100)/95 backdrop-blur py-4 border-b border-(--color-frost-300) flex flex-wrap items-center gap-3">
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
                    className="text-(--font-size-step--1) text-(--color-text-on-light-muted) hover:text-(--color-text-on-light) font-semibold self-center underline ml-2"
                  >
                    Clear filters
                  </Link>
                )}
              </form>
            </div>

            {/* Role Cards List */}
            <div className="mt-8 flex flex-col gap-4">
              {filteredJobs.length === 0 ? (
                <div className="p-12 text-center bg-(--color-frost-50) rounded-(--radius-lg) border border-(--color-frost-300)">
                  <h3 className="text-(--font-size-step-1) font-bold text-(--color-text-on-light)">No open roles match your filters</h3>
                  <p className="text-(--font-size-step-0) text-(--color-text-on-light-muted) mt-2">
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
                    className="p-6 sm:p-8 bg-(--color-frost-50) border border-(--color-frost-300) rounded-(--radius-lg) hover:border-(--color-ink-500) transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs"
                  >
                    <div className="flex flex-col gap-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-(--font-size-step--2) uppercase font-semibold text-(--color-text-on-light-muted) bg-(--color-frost-200) px-2.5 py-1 rounded">
                          {job.family}
                        </span>
                        <span className="font-mono text-(--font-size-step--2) text-(--color-text-on-light-muted)">
                          {job.employmentType.replace('_', ' ')} · {job.workMode}
                        </span>
                      </div>

                      <h3 className="font-display text-(--font-size-step-2) font-bold text-(--color-text-on-light)">
                        {job.title}
                      </h3>

                      <p className="text-(--font-size-step-0) text-(--color-text-on-light-muted) leading-relaxed">
                        {job.summary}
                      </p>

                      <div data-card-meta className="flex flex-wrap items-center gap-4 mt-2 font-mono text-(--font-size-step--1) text-(--color-text-on-light-muted)">
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

        {/* S3: HIRING PROCESS · .section-md · bg-ink-950 with Interactive Carousel */}
        <section id="process" data-section="process" className="bg-(--color-ink-950) section-md text-(--color-text-on-dark) border-t border-(--color-ink-600)/40">
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

        {/* S4: LIFE AT AKSHARA · .section-md · bg-frost-200 · data-ground="light" */}
        <section data-section="culture" data-ground="light" className="bg-(--color-frost-200) section-md text-(--color-text-on-light)">
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
              <div className="p-6 bg-(--color-frost-50) border border-(--color-frost-300) rounded-(--radius-lg) flex flex-col gap-3">
                <span className="text-2xl">⚡</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-text-on-light)">High Ownership</h3>
                <p className="text-(--font-size-step--1) text-(--color-text-on-light-muted) leading-relaxed">
                  Every team member owns real operational and financial outcomes from day one with clear mandate and minimal bureaucracy.
                </p>
              </div>

              <div className="p-6 bg-(--color-frost-50) border border-(--color-frost-300) rounded-(--radius-lg) flex flex-col gap-3">
                <span className="text-2xl">📈</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-text-on-light)">Transparent Growth</h3>
                <p className="text-(--font-size-step--1) text-(--color-text-on-light-muted) leading-relaxed">
                  Clear performance benchmarks, uncapped sales incentives for commercial roles, and structured promotion tracks.
                </p>
              </div>

              <div className="p-6 bg-(--color-frost-50) border border-(--color-frost-300) rounded-(--radius-lg) flex flex-col gap-3">
                <span className="text-2xl">🎓</span>
                <h3 className="font-display text-(--font-size-step-1) font-bold text-(--color-text-on-light)">Mission Driven</h3>
                <p className="text-(--font-size-step--1) text-(--color-text-on-light-muted) leading-relaxed">
                  Direct impact enabling students across tier-2/3 institutions to access credit and complete degree education.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* S5: TALENT POOL · .section-md · bg-ink-900 */}
        <section id="talent" data-section="talent-pool" className="bg-(--color-ink-900) section-md text-(--color-text-on-dark) border-t border-(--color-ink-600)/40">
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
