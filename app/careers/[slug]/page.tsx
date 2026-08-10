/**
 * app/careers/[slug]/page.tsx
 *
 * Public job detail page.
 * Displays role details and outputs Schema.org JobPosting JSON-LD.
 * Awaits params per Next.js 15 requirements.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getJobBySlug } from '@/lib/db/queries/jobs'

interface JobDetail {
  id: string
  slug: string
  title: string
  family: string
  summary: string
  descriptionHtml: string
  responsibilities: string[]
  requirements: string[]
  niceToHave?: string[] | null
  benefits: string[]
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'INTERN' | 'CONTRACTOR'
  workMode: 'onsite' | 'hybrid' | 'remote' | 'field'
  locationCity: string
  locationState: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  salaryUnit: string
  salaryIsPublic: boolean
  requiresTwoWheeler: boolean
  requiresDrivingLicence: boolean
  postedAt: Date | null
  validThrough: Date | null
  createdAt?: Date
  updatedAt?: Date
}

// Fallback seed jobs for display when database URL is not supplied yet
const FALLBACK_JOBS: JobDetail[] = [
  {
    id: 'f1',
    slug: 'business-development-executive',
    title: 'Business Development Executive',
    family: 'Sales',
    summary: 'Promote education loans to students and drive admissions conversions.',
    descriptionHtml: '<h3>About the Role</h3><p>Join Akshara as a Business Development Executive (BDE) and work directly with colleges and student candidates. You will represent our lending products and guide families through the process of choosing educational loans.</p>',
    responsibilities: [
      'Conduct presentation sessions in partner colleges and classrooms.',
      'Follow up on student lead lists and clarify interest queries.',
      'Assist parents and students in completing loan application steps.',
      'Coordinate with operations credit team for document verification.',
    ],
    requirements: [
      'Excellent Kannada and English communication skills (mandatory).',
      'Must possess a personal two-wheeler and functional driving licence.',
      'Willingness to travel locally within Bengaluru district.',
      'Empathic listening and customer-centric problem solving.',
    ],
    niceToHave: [
      'Prior experience in sales/relationship roles in EdTech, BFSI or loans.'
    ],
    benefits: [
      'Competitive monthly incentives based on targets.',
      'Fuel reimbursement for field travel.',
      'PF, gratuity, and comprehensive group health insurance.'
    ],
    employmentType: 'FULL_TIME',
    workMode: 'field',
    locationCity: 'Bengaluru',
    locationState: 'Karnataka',
    salaryMin: 350000,
    salaryMax: 450000,
    salaryCurrency: 'INR',
    salaryUnit: 'YEAR',
    salaryIsPublic: false,
    requiresTwoWheeler: true,
    requiresDrivingLicence: true,
    postedAt: new Date('2026-08-01'),
    validThrough: new Date('2026-11-01'),
  },
  {
    id: 'f2',
    slug: 'operations-associate',
    title: 'Operations Associate',
    family: 'Operations',
    summary: 'Process loan applications, verify candidate details, and handle documentation.',
    descriptionHtml: '<h3>About the Role</h3><p>Join our core operations team to audit student documentation, parse resumes, and verify college admissions details in our pipeline.</p>',
    responsibilities: [
      'Audit submitted candidate records and check document completeness.',
      'Process verification calls with college registrars.',
      'Coordinate backend approvals with banking/lending partners.',
      'Prepare daily pipelines reports for the management team.',
    ],
    requirements: [
      'Strong analytical mindset and high attention to detail.',
      'Comfortable with Excel and basic SQL databases.',
      'Good written English and spoken Kannada.',
    ],
    niceToHave: [
      '1+ years of backend operations experience in loans/NBFCs.'
    ],
    benefits: [
      'Fixed day-shift schedule with alternate Saturdays off.',
      'Performance-based annual bonuses.',
      'Full corporate benefits (medical insurance, PF).'
    ],
    employmentType: 'FULL_TIME',
    workMode: 'onsite',
    locationCity: 'Bengaluru',
    locationState: 'Karnataka',
    salaryMin: 300000,
    salaryMax: 400000,
    salaryCurrency: 'INR',
    salaryUnit: 'YEAR',
    salaryIsPublic: false,
    requiresTwoWheeler: false,
    requiresDrivingLicence: false,
    postedAt: new Date('2026-08-01'),
    validThrough: new Date('2026-11-01'),
  },
]

interface JobDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  // Await params per Next.js 15 requirement
  const resolvedParams = await params
  const { slug } = resolvedParams

  // Fetch job from Neon, or use fallback seed
  let job: typeof FALLBACK_JOBS[number] | null = null
  const hasDb = Boolean(process.env.NEON_DATABASE_URL)

  if (hasDb) {
    try {
      const dbJob = await getJobBySlug(slug)
      if (dbJob) {
        // Adapt Drizzle schema formats to match page formats
        job = {
          ...dbJob,
          postedAt: dbJob.postedAt ?? new Date(),
          validThrough: dbJob.validThrough ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }
      }
    } catch (err) {
      console.error('Failed to fetch job details from database, utilizing fallback:', err)
    }
  }

  // Fallback check
  if (!job) {
    job = FALLBACK_JOBS.find((j) => j.slug === slug) ?? null
  }

  if (!job) {
    notFound()
  }

  // Generate structured SEO JobPosting JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    'title': job.title,
    'description': job.summary,
    'datePosted': job.postedAt ? job.postedAt.toISOString() : new Date().toISOString(),
    'validThrough': job.validThrough ? job.validThrough.toISOString() : undefined,
    'employmentType': job.employmentType,
    'hiringOrganization': {
      '@type': 'Organization',
      'name': 'Akshara Education Loan',
      'sameAs': 'https://akshara.in',
      'logo': 'https://careers.akshara.in/images/akshara-logo.svg',
    },
    'jobLocation': {
      '@type': 'Place',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': job.locationCity,
        'addressRegion': job.locationState,
        'addressCountry': 'IN',
      },
    },
    'baseSalary': job.salaryIsPublic && job.salaryMin && job.salaryMax ? {
      '@type': 'MonetaryAmount',
      'currency': job.salaryCurrency,
      'value': {
        '@type': 'QuantitativeValue',
        'minValue': job.salaryMin,
        'maxValue': job.salaryMax,
        'unitText': job.salaryUnit,
      },
    } : undefined,
  }

  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col">
      {/* Inject JSON-LD Schema.org SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="py-12 flex-1">
        <Container width="content" className="flex flex-col gap-6">
          {/* Back Link */}
          <Link href="/careers" className="text-step--1 font-mono text-ink-600 hover:text-ink-900 transition-colors flex items-center gap-1">
            <span>&larr;</span> Back to Open Roles
          </Link>

          {/* Job Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-ink-900/10 pb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="accent">{job.family}</Badge>
                <Badge variant="info">{job.workMode}</Badge>
                <span className="text-step--1 text-ink-400 font-mono">{job.locationCity}</span>
              </div>
              <h1 className="text-step-3 font-display font-bold text-ink-900 leading-tight">
                {job.title}
              </h1>
            </div>

            <Link href={`/apply/${job.slug}`} className="w-full md:w-auto" data-testid="apply-cta">
              <Button variant="primary" className="w-full md:w-auto px-6 h-12">
                Apply for this role
              </Button>
            </Link>
          </div>

          {/* Job Content Grid */}
          <Grid className="mt-2">
            {/* Main Details */}
            <div className="col-span-4 md:col-span-5 lg:col-span-8 flex flex-col gap-6 max-w-[68ch] text-graphite">
              <div dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />

              <div>
                <h3 className="text-step-1 font-bold text-ink-900 mb-3">
                  Key Responsibilities
                </h3>
                <ul className="list-disc pl-5 flex flex-col gap-2 text-step-0">
                  {job.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-step-1 font-bold text-ink-900 mb-3">
                  Requirements & Qualifications
                </h3>
                <ul className="list-disc pl-5 flex flex-col gap-2 text-step-0">
                  {job.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              {job.niceToHave && job.niceToHave.length > 0 && (
                <div>
                  <h3 className="text-step-1 font-bold text-ink-900 mb-3">
                    Nice to Have
                  </h3>
                  <ul className="list-disc pl-5 flex flex-col gap-2 text-step-0">
                    {job.niceToHave.map((nice, i) => (
                      <li key={i}>{nice}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-step-1 font-bold text-ink-900 mb-3">
                  Benefits & Perks
                </h3>
                <ul className="list-disc pl-5 flex flex-col gap-2 text-step-0">
                  {job.benefits.map((benefit, i) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar Metadata */}
            <div className="col-span-4 md:col-span-3 lg:col-span-4 flex flex-col gap-6">
              <Card className="flex flex-col gap-4 bg-chalk border border-ink-900/10 p-6">
                <h3 className="font-mono text-step--1 uppercase font-bold tracking-wider text-ink-900/70">
                  Job Overview
                </h3>
                
                <div className="flex flex-col gap-1">
                  <span className="text-step--2 text-ink-400 font-mono">EMPLOYMENT TYPE</span>
                  <span className="text-step--1 font-medium text-graphite uppercase">{job.employmentType.replace('_', ' ')}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-step--2 text-ink-400 font-mono">LOCATION</span>
                  <span className="text-step--1 font-medium text-graphite">{job.locationCity}, {job.locationState}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-step--2 text-ink-400 font-mono">WORK MODE</span>
                  <span className="text-step--1 font-medium text-graphite uppercase">{job.workMode}</span>
                </div>

                {job.requiresTwoWheeler && (
                  <div className="flex items-center gap-2 text-step--1 text-kumkum font-medium mt-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Two-wheeler required
                  </div>
                )}
              </Card>

              <Card className="flex flex-col gap-3 bg-chalk border border-ink-900/10 p-6 text-step--1">
                <h4 className="font-mono font-bold text-ink-900/70 uppercase">Need Help?</h4>
                <p className="text-ink-600 leading-relaxed">
                  If you face issues applying, email us at <span className="font-mono text-step--2">careers@akshara.in</span> with the job title.
                </p>
              </Card>
            </div>
          </Grid>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
