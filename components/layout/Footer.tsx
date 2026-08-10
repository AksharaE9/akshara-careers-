import Link from 'next/link'
import Image from 'next/image'
import { Container } from './Container'
import { Grid } from './Grid'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-ink-900 border-t border-ink-600 text-chalk pt-12 pb-12">
      <Container width="content">
        <Grid className="gap-y-10">
          {/* Brand Column */}
          <div className="col-span-4 lg:col-span-4 flex flex-col gap-4">
            <Link href="/careers" className="inline-block">
              <Image
                src="/images/akshara-logo.svg"
                alt="Akshara Logo"
                width={140}
                height={34}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-step--1 text-ink-400 leading-relaxed max-w-[40ch]">
              Building the credit and operational infrastructure for higher education financing across India.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="col-span-2 lg:col-span-2 lg:col-start-7 flex flex-col gap-3">
            <h3 className="font-mono text-step--1 uppercase font-bold tracking-wider text-marigold">
              Careers
            </h3>
            <ul className="flex flex-col gap-2 text-step--1 text-chalk/70">
              <li>
                <Link href="/careers#roles" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Open Roles
                </Link>
              </li>
              <li>
                <Link href="/careers#drives" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Campus Drives
                </Link>
              </li>
              <li>
                <Link href="/careers#process" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Hiring Process
                </Link>
              </li>
              <li>
                <Link href="/careers#life" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Life at Akshara
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Compliance */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-3">
            <h3 className="font-mono text-step--1 uppercase font-bold tracking-wider text-marigold">
              Compliance
            </h3>
            <ul className="flex flex-col gap-2 text-step--1 text-chalk/70">
              <li>
                <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  DPDP Act Consent
                </Link>
              </li>
              <li>
                <Link href="/privacy#retention" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Data Retention
                </Link>
              </li>
              <li>
                <Link href="/privacy#grievance" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Grievance Officer
                </Link>
              </li>
            </ul>
          </div>

          {/* Recruiter Console */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-3">
            <h3 className="font-mono text-step--1 uppercase font-bold tracking-wider text-marigold">
              Operators
            </h3>
            <ul className="flex flex-col gap-2 text-step--1 text-chalk/70">
              <li>
                <Link href="/console/login" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Admin Console
                </Link>
              </li>
              <li>
                <Link href="/dev/ui" className="inline-flex items-center min-h-[44px] hover:text-chalk transition-colors">
                  Design System
                </Link>
              </li>
            </ul>
          </div>
        </Grid>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-ink-600/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-step--1 text-ink-400 font-mono">
          <p>© {currentYear} Akshara Education Loan. All rights reserved.</p>
          <p>Bengaluru · Karnataka · India</p>
        </div>
      </Container>
    </footer>
  )
}
