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
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-(--color-amber-400) rounded-(--radius-sm) p-1"
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
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/careers#roles"
            className="text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2"
          >
            Open Roles
          </Link>
          
          <Link
            href="/careers#process"
            className="text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-block"
          >
            Hiring Process
          </Link>

          <Link
            href="/careers#talent"
            className="text-(--font-size-step--1) font-medium text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-block"
          >
            Talent Pool
          </Link>
        </nav>
      </Container>
    </header>
  )
}
