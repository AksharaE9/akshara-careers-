/**
 * components/layout/Header.tsx
 *
 * §18.5 — Fixed 72px header bar (L-02, L-03, L-14).
 * Wordmark: 'akshara' in --color-text-on-dark (#E9EFF8) + 'CAREERS' in amber (#F0A93B).
 * Logo tile: 36×36 amber tile with dark glyph fully contained in the bar.
 */

import Link from 'next/link'
import { Container } from './Container'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full h-[72px] border-b border-(--color-ink-600)/40 bg-(--color-ink-950)/95 backdrop-blur-md flex items-center">
      <Container width="content" className="flex h-full items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/careers"
          className="flex items-center gap-3 min-h-[44px] focus-visible:outline-2 focus-visible:outline-(--color-amber-400) rounded-(--radius-sm) p-1"
        >
          {/* Logo Mark: 36x36 amber tile */}
          <div className="h-9 w-9 bg-(--color-amber-400) rounded-md flex items-center justify-center font-display font-black text-(--color-ink-950) text-xl shadow-sm">
            A
          </div>

          {/* Wordmark */}
          <div data-testid="logo-word" className="flex items-baseline gap-1.5 font-sans">
            <span className="font-semibold text-lg tracking-tight text-(--color-text-on-dark)">
              akshara
            </span>
            <span className="font-mono text-xs uppercase tracking-widest font-bold text-(--color-amber-400)">
              CAREERS
            </span>
          </div>
        </Link>

        {/* Navigation */}
        {/* F11: min-h-[44px] (44px) + inline-flex items-center on every nav link
            — px-3 py-2 alone rendered at ~42px, 2px under the WCAG tap-target
            floor. Applied to all three uniformly even though only the
            always-visible "Open Roles" link was caught at 390px (the other
            two are hidden below sm:) — same shared pattern, same fix. */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/careers#roles"
            className="inline-flex items-center min-h-[44px] text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2"
          >
            Open Roles
          </Link>

          <Link
            href="/careers#process"
            className="items-center min-h-[44px] text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-flex"
          >
            Hiring Process
          </Link>

          <Link
            href="/careers#talent"
            className="items-center min-h-[44px] text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-flex"
          >
            Talent Pool
          </Link>
        </nav>
      </Container>
    </header>
  )
}
