import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { getOpenJobs, type JobCardResult } from '@/lib/db/queries/jobs'
import { listAllDrives } from '@/lib/db/queries/drives'
import { TalentPoolForm } from '@/components/talent-pool/TalentPoolForm'

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
  {
    id: 'f3',
    slug: 'credit-analyst',
    title: 'Junior Credit Analyst',
    family: 'Credit & Risk',
    summary: 'Assess applicant financial profiles, verify income documents, and underwrite educational financing proposals.',
    employmentType: 'FULL_TIME',
    workMode: 'onsite',
    locationCity: 'Bengaluru',
    locationState: 'Karnataka',
    salaryMin: 420000,
    salaryMax: 550000,
    salaryCurrency: 'INR',
    salaryUnit: 'YEAR',
    salaryIsPublic: true,
    requiresTwoWheeler: false,
    requiresDrivingLicence: false,
    postedAt: new Date(),
  },
]

const FALLBACK_DRIVES = [
  {
    code: 'RVCE-2026',
    collegeName: 'RV College of Engineering',
    collegeCity: 'Bengaluru',
    driveDate: '2026-08-20',
    seats: 45,
    status: 'upcoming',
  },
  {
    code: 'BMSCE-2026',
    collegeName: 'BMS College of Engineering',
    collegeCity: 'Bengaluru',
    driveDate: '2026-08-25',
    seats: 30,
    status: 'upcoming',
  },
  {
    code: 'PES-2026',
    collegeName: 'PES University Ring Road Campus',
    collegeCity: 'Bengaluru',
    driveDate: '2026-09-02',
    seats: 60,
    status: 'upcoming',
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

  let openJobs = FALLBACK_JOBS
  let drives: any[] = FALLBACK_DRIVES

  try {
    if (process.env.NEON_DATABASE_URL) {
      const dbJobs = await getOpenJobs()
      if (dbJobs && dbJobs.length > 0) openJobs = dbJobs
      const dbDrives = await listAllDrives()
      if (dbDrives && dbDrives.length > 0) drives = dbDrives
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
    <div className="min-h-screen bg-paper flex flex-col">
      <Header />

      <main className="flex-1">
        {/* S1: HERO · .section-lg · bg-ink-900 */}
        <section data-section="hero" className="bg-ink-900 section-lg min-h-[78svh] flex items-center text-chalk">
          <Container width="content">
            <div className="flex flex-col items-start">
              {/* Eyebrow */}
              <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-marigold font-semibold">
                Careers at Akshara
              </span>

              {/* H1 Headline */}
              <h1 className="mt-3 text-step-5 font-display leading-[0.95] text-chalk max-w-[16ch] ml-[-0.04em]">
                Build educational infrastructure.
              </h1>

              {/* Sub-paragraph */}
              <p className="mt-6 text-step-1 text-ink-400 max-w-[52ch] leading-relaxed">
                Join our mission to finance higher education for ambitious students across India. High autonomy, transparent compensation, and fast career progression.
              </p>

              {/* CTA Row */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <a
                  href="#roles"
                  className="h-12 px-6 bg-marigold text-ink-900 rounded-[--radius-md] inline-flex items-center justify-center font-semibold hover:bg-marigold-press transition-colors"
                >
                  View Open Roles
                </a>
                <a
                  href="#drives"
                  className="h-12 px-6 border border-ink-600 text-chalk rounded-[--radius-md] inline-flex items-center justify-center font-semibold hover:border-chalk transition-colors"
                >
                  Campus Drives
                </a>
              </div>

              {/* Stat Line */}
              <div className="mt-16 text-step--1 font-mono text-ink-400 tabular-nums">
                {openJobs.length} active requisitions · Bengaluru Hub · Fast-track 4-stage hiring
              </div>
            </div>
          </Container>
        </section>

        {/* S2: DRIVE BOARD · .section-md · bg-ink-800 · Container(wide) */}
        <section id="drives" data-section="drives" className="bg-ink-800 section-md text-chalk border-t border-ink-600/30">
          <Container width="wide">
            {/* Heading Block */}
            <div className="max-w-2xl mb-12">
              <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-marigold font-semibold">
                Live Campus Recruitment
              </span>
              <h2 className="mt-3 text-step-3 font-display font-bold text-chalk">
                Campus Placement Board
              </h2>
              <p className="mt-4 text-step-0 text-ink-400">
                Upcoming campus recruitment drives and on-site evaluation schedules.
              </p>
            </div>

            {/* Drive Board Table */}
            <div className="overflow-x-auto relative rounded-lg border border-ink-600 bg-ink-900/60 backdrop-blur">
              <div className="min-w-[720px]">
                {/* Header Row */}
                <div className="grid grid-cols-[120px_1fr_120px_140px_90px_120px] items-center px-6 h-12 border-b border-ink-600 font-mono text-step--1 text-ink-400 uppercase tracking-wider">
                  <div>Drive Code</div>
                  <div>College / Venue</div>
                  <div>Location</div>
                  <div>Date</div>
                  <div>Seats</div>
                  <div className="text-right">Action</div>
                </div>

                {/* Data Rows */}
                {drives.map((drive) => (
                  <div
                    key={drive.code}
                    className="grid grid-cols-[120px_1fr_120px_140px_90px_120px] items-center px-6 h-14 border-b border-ink-600/40 last:border-0 font-mono text-step--1 text-chalk hover:bg-ink-600/20 transition-colors"
                  >
                    <div className="font-bold text-marigold">{drive.code}</div>
                    <div className="font-sans font-medium truncate pr-4">{drive.collegeName}</div>
                    <div className="text-ink-400">{drive.collegeCity || 'Bengaluru'}</div>
                    <div className="tabular-nums">{drive.driveDate}</div>
                    <div className="tabular-nums">{drive.seats || 50} seats</div>
                    <div className="text-right">
                      <Link
                        href={`/d/${drive.code}`}
                        className="inline-flex items-center text-xs font-sans font-semibold text-marigold hover:underline"
                      >
                        Register →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* S3: OPEN ROLES · .section-md · bg-paper · Container(content) */}
        <section id="roles" data-section="roles" className="bg-paper section-md">
          <Container width="content">
            {/* Heading Block */}
            <div className="max-w-2xl">
              <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-graphite/80 font-semibold">
                Opportunities
              </span>
              <h2 className="mt-3 text-step-3 font-display font-bold text-ink-900">
                Open Requisitions
              </h2>
              <p className="mt-4 text-step-0 text-graphite/80">
                Explore open opportunities across our commercial, risk, and operations divisions.
              </p>
            </div>

            {/* Filter Bar (Sticky) */}
            <div className="mt-8 sticky top-16 z-20 bg-paper/95 backdrop-blur py-4 border-b border-graphite/10 flex flex-wrap items-center gap-3">
              <form method="GET" action="/careers" className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full">
                <input
                  type="text"
                  name="query"
                  aria-label="Search keywords or job title"
                  defaultValue={queryFilter}
                  placeholder="Search keywords or job title..."
                  className="w-full sm:flex-1 h-12 px-4 bg-chalk border border-graphite/20 rounded-md text-step-0 text-ink-900 placeholder:text-graphite/50 focus-visible:outline-2 focus-visible:outline-marigold"
                />

                <select
                  name="family"
                  aria-label="Filter by job family"
                  defaultValue={familyFilter}
                  className="w-full sm:w-auto h-12 px-4 bg-chalk border border-graphite/20 rounded-md text-step-0 text-ink-900 focus-visible:outline-2 focus-visible:outline-marigold"
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
                  aria-label="Filter by location"
                  defaultValue={locationFilter}
                  className="w-full sm:w-auto h-12 px-4 bg-chalk border border-graphite/20 rounded-md text-step-0 text-ink-900 focus-visible:outline-2 focus-visible:outline-marigold"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="w-full sm:w-auto h-12 px-6 bg-ink-900 text-chalk font-semibold rounded-md hover:bg-ink-800 transition-colors"
                >
                  Filter
                </button>
              </form>
            </div>

            {/* Result Count */}
            <div className="mt-4 text-step--1 text-graphite/70" aria-live="polite">
              Showing {filteredJobs.length} of {openJobs.length} active roles
            </div>

            {/* Card Grid */}
            <Grid className="mt-6">
              {filteredJobs.map((job) => (
                <div key={job.id} data-testid={`job-card-${job.slug}`} className="col-span-4 min-w-0">
                  <div className="bg-chalk border border-graphite/12 rounded-lg p-6 h-full flex flex-col hover:border-marigold hover:translate-y-[-2px] transition-all duration-180">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-step--2 uppercase font-semibold text-graphite/70 bg-paper px-2.5 py-1 rounded">
                        {job.family}
                      </span>
                      <span className="font-mono text-step--2 text-leaf font-semibold">
                        {job.workMode === 'field' ? 'Field' : 'On-Site'}
                      </span>
                    </div>

                    <h3 className="text-step-1 font-bold text-ink-900 line-clamp-2">
                      <Link href={`/careers/${job.slug}`} className="hover:text-marigold transition-colors">
                        {job.title}
                      </Link>
                    </h3>

                    <p className="mt-2 text-step-0 line-clamp-2 text-graphite/75 leading-relaxed">
                      {job.summary}
                    </p>

                    <div data-card-meta className="mt-auto pt-6 border-t border-graphite/10 flex items-center justify-between">
                      <span className="text-step--1 font-mono font-medium text-graphite">
                        {job.locationCity}, {job.locationState}
                      </span>
                      <Link
                        href={`/apply/${job.slug}`}
                        className="h-10 px-4 bg-marigold text-ink-900 rounded-md font-semibold text-step--1 inline-flex items-center justify-center hover:bg-marigold-press transition-colors"
                      >
                        Apply Now →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </Grid>
          </Container>
        </section>

        {/* S4: HIRING PROCESS · .section-md · bg-ink-900 · Container(content) */}
        <section id="process" data-section="process" className="bg-ink-900 section-md text-chalk border-t border-ink-600/30">
          <Container width="content">
            {/* Heading */}
            <div className="max-w-2xl mb-12">
              <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-marigold font-semibold">
                Transparent Evaluation
              </span>
              <h2 className="mt-3 text-step-3 font-display font-bold text-chalk">
                4-Stage Hiring Process
              </h2>
              <p className="mt-4 text-step-0 text-ink-400">
                Clear expectations, guaranteed feedback, and no multi-week ghosting.
              </p>
            </div>

            {/* 4 Process Steps */}
            <div className="relative">
              {/* Connector line on desktop */}
              <div className="hidden lg:block absolute top-7 left-0 right-0 h-[1px] bg-ink-600 z-0" />

              <Grid className="relative z-10">
                <div className="col-span-4 lg:col-span-3 bg-ink-900 pr-4">
                  <div className="font-mono text-step-3 text-marigold font-bold">01</div>
                  <h3 className="mt-3 text-step-1 text-chalk font-semibold">Application & Screening</h3>
                  <p className="mt-2 text-step--1 text-ink-400">Review within 24 hours of submission</p>
                </div>

                <div className="col-span-4 lg:col-span-3 bg-ink-900 pr-4">
                  <div className="font-mono text-step-3 text-marigold font-bold">02</div>
                  <h3 className="mt-3 text-step-1 text-chalk font-semibold">Domain Assessment</h3>
                  <p className="mt-2 text-step--1 text-ink-400">Practical role-specific scenario exercise</p>
                </div>

                <div className="col-span-4 lg:col-span-3 bg-ink-900 pr-4">
                  <div className="font-mono text-step-3 text-marigold font-bold">03</div>
                  <h3 className="mt-3 text-step-1 text-chalk font-semibold">Leadership Discussion</h3>
                  <p className="mt-2 text-step--1 text-ink-400">Strategic alignment and team fit interview</p>
                </div>

                <div className="col-span-4 lg:col-span-3 bg-ink-900">
                  <div className="font-mono text-step-3 text-marigold font-bold">04</div>
                  <h3 className="mt-3 text-step-1 text-chalk font-semibold">Offer & Onboarding</h3>
                  <p className="mt-2 text-step--1 text-ink-400">Same-day formal offer letter release</p>
                </div>
              </Grid>
            </div>
          </Container>
        </section>

        {/* S5: LIFE AT AKSHARA · .section-lg · bg-paper · Container(content) */}
        <section id="life" data-section="life" className="bg-paper section-lg">
          <Container width="content">
            {/* Heading Block */}
            <div className="max-w-2xl mb-16">
              <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-graphite/80 font-semibold">
                Culture & Community
              </span>
              <h2 className="mt-3 text-step-3 font-display font-bold text-ink-900">
                Life at Akshara
              </h2>
              <p className="mt-4 text-step-0 text-graphite/80">
                Empowering teams to make high-impact decisions every day.
              </p>
            </div>

            {/* 3 Alternating Feature Blocks with 96px gap */}
            <div className="flex flex-col gap-24">
              {/* Feature Block 1: Text Left, Image Right */}
              <Grid className="items-center">
                <div className="col-span-4 md:col-span-8 lg:col-span-5 self-center">
                  <span className="font-mono text-step--2 text-marigold-press font-bold uppercase tracking-wider">
                    Ground Reality
                  </span>
                  <h3 className="mt-2 text-step-2 font-display font-bold text-ink-900">
                    Real Campus Engagements
                  </h3>
                  <p className="mt-4 text-step-0 text-graphite/85 leading-relaxed">
                    Our sales and operations teams visit partner colleges across Karnataka, interacting directly with students and parents to demystify higher education loans.
                  </p>
                </div>
                <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-graphite/15 relative">
                    <Image
                      src="/images/life/campus-drive-recruiter.png"
                      alt="Akshara Campus Recruitment Team"
                      width={600}
                      height={450}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              </Grid>

              {/* Feature Block 2: Image Left, Text Right (Reversed) */}
              <Grid className="items-center">
                <div className="col-span-4 md:col-span-8 lg:col-span-6 order-2 lg:order-1">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-graphite/15 relative">
                    <Image
                      src="/images/life/team-meeting.png"
                      alt="Akshara Collaborative Team Meeting"
                      width={600}
                      height={450}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8 order-1 lg:order-2 self-center">
                  <span className="font-mono text-step--2 text-marigold-press font-bold uppercase tracking-wider">
                    High Autonomy
                  </span>
                  <h3 className="mt-2 text-step-2 font-display font-bold text-ink-900">
                    Collaborative Problem Solving
                  </h3>
                  <p className="mt-4 text-step-0 text-graphite/85 leading-relaxed">
                    We eliminate bureaucracy. Cross-functional teams work in tight sprint loops to improve credit underwriting models, reduce disbursement turnaround, and scale partner operations.
                  </p>
                </div>
              </Grid>

              {/* Feature Block 3: Text Left, Image Right */}
              <Grid className="items-center">
                <div className="col-span-4 md:col-span-8 lg:col-span-5 self-center">
                  <span className="font-mono text-step--2 text-marigold-press font-bold uppercase tracking-wider">
                    Celebration & Milestones
                  </span>
                  <h3 className="mt-2 text-step-2 font-display font-bold text-ink-900">
                    Shared Success
                  </h3>
                  <p className="mt-4 text-step-0 text-graphite/85 leading-relaxed">
                    From celebrating team milestones in Bengaluru to rewarding top performers in campus outreach, we recognize and reward dedication and excellence.
                  </p>
                </div>
                <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-graphite/15 relative">
                    <Image
                      src="/images/life/celebration.png"
                      alt="Akshara Team Celebration"
                      width={600}
                      height={450}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              </Grid>
            </div>
          </Container>
        </section>

        {/* S6: PROOF STRIP · .section-sm · bg-chalk · Container(content) */}
        <section data-section="proof-strip" className="bg-chalk section-sm border-t border-b border-graphite/10">
          <Container width="content">
            <div className="text-center mb-8">
              <span className="text-step--2 font-mono uppercase tracking-widest text-graphite/60 font-semibold">
                Trusted by leading educational institutions
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-6">
              <span data-proof-logo className="font-display font-bold text-step-1 text-graphite/60 h-8 flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                RVCE Bengaluru
              </span>
              <span data-proof-logo className="font-display font-bold text-step-1 text-graphite/60 h-8 flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                BMSCE
              </span>
              <span data-proof-logo className="font-display font-bold text-step-1 text-graphite/60 h-8 flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                PES University
              </span>
              <span data-proof-logo className="font-display font-bold text-step-1 text-graphite/60 h-8 flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                MS Ramaiah
              </span>
              <span data-proof-logo className="font-display font-bold text-step-1 text-graphite/60 h-8 flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                Dayananda Sagar
              </span>
            </div>
          </Container>
        </section>

        {/* S7: TALENT POOL · .section-md · bg-ink-900 · Container(content) */}
        <section id="talent-pool" data-section="talent-pool" className="bg-ink-900 section-md text-chalk border-t border-ink-600/30">
          <Container width="content">
            <Grid className="items-start">
              <div className="col-span-4 md:col-span-8 lg:col-span-5">
                <span className="text-step--1 font-mono tracking-[0.12em] uppercase text-marigold font-semibold">
                  Future Opportunities
                </span>
                <h2 className="mt-3 text-step-3 font-display font-bold text-chalk">
                  Join our Talent Pool
                </h2>
                <p className="mt-4 text-step-0 text-ink-400 leading-relaxed">
                  Don't see the right open requisition today? Submit your profile to our talent roster and our recruitment team will reach out when matching opportunities open.
                </p>
              </div>

              <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
                <div className="bg-ink-800 border border-ink-600 rounded-lg p-6">
                  <TalentPoolForm />
                </div>
              </div>
            </Grid>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  )
}
