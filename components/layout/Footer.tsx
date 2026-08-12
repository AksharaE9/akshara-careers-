/**
 * components/layout/Footer.tsx
 *
 * §21.4 — Footer as the primary .ink-band emphasis block (full-bleed #1C1814 with paper text).
 * Inside the band, amber eyebrows and headings are legal (8.18:1 ratio).
 */

import Link from 'next/link'
import { Container } from './Container'
import { Grid } from './Grid'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full ink-band bg-(--color-ink) border-t border-(--color-hairline) text-(--color-paper) pt-12 pb-12">
      <Container width="content">
        <Grid className="gap-y-10">
          {/* Brand Column */}
          <div className="col-span-4 lg:col-span-4 flex flex-col gap-4">
            <Link href="/careers" className="inline-flex items-center gap-3 min-h-[44px]">
              <div className="h-8 w-8 bg-(--color-amber) rounded-(--radius-md) flex items-center justify-center font-display font-black text-(--color-ink) text-lg shadow-sm">
                A
              </div>
              <div className="flex items-baseline gap-1.5 font-sans">
                <span className="font-semibold text-base tracking-tight text-(--color-paper)">
                  akshara
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-(--color-amber)">
                  CAREERS
                </span>
              </div>
            </Link>
            <p className="text-(--font-size-step--1) text-(--color-paper)/75 leading-relaxed max-w-[40ch]">
              Building the credit and operational infrastructure for higher education financing across India.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="col-span-2 lg:col-span-2 lg:col-start-7 flex flex-col gap-3">
            <h3 className="font-mono text-(--font-size-step--1) uppercase font-bold tracking-wider text-(--color-amber)">
              Careers
            </h3>
            <ul className="flex flex-col gap-2 text-(--font-size-step--1) text-(--color-paper)/75">
              <li>
                <Link href="/careers#roles" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Open Roles
                </Link>
              </li>
              <li>
                <Link href="/careers#drives" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Campus Drives
                </Link>
              </li>
              <li>
                <Link href="/careers#process" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Hiring Process
                </Link>
              </li>
              <li>
                <Link href="/careers#life" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Life at Akshara
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Compliance */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-3">
            <h3 className="font-mono text-(--font-size-step--1) uppercase font-bold tracking-wider text-(--color-amber)">
              Compliance
            </h3>
            <ul className="flex flex-col gap-2 text-(--font-size-step--1) text-(--color-paper)/75">
              <li>
                <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  DPDP Act Consent
                </Link>
              </li>
              <li>
                <Link href="/privacy#retention" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Data Retention
                </Link>
              </li>
              <li>
                <Link href="/privacy#grievance" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Grievance Officer
                </Link>
              </li>
            </ul>
          </div>

          {/* Recruiter Console */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-3">
            <h3 className="font-mono text-(--font-size-step--1) uppercase font-bold tracking-wider text-(--color-amber)">
              Operators
            </h3>
            <ul className="flex flex-col gap-2 text-(--font-size-step--1) text-(--color-paper)/75">
              <li>
                <Link href="/console/login" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Admin Console
                </Link>
              </li>
              <li>
                <Link href="/dev/ui" className="inline-flex items-center min-h-[44px] hover:text-(--color-paper) transition-colors">
                  Design System
                </Link>
              </li>
            </ul>
          </div>
        </Grid>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-(--color-paper)/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-(--font-size-step--1) text-(--color-paper)/60 font-mono">
          <p>© {currentYear} Akshara Education Loan. All rights reserved.</p>
          <p>Bengaluru · Karnataka · India</p>
        </div>
      </Container>
    </footer>
  )
}
