/**
 * components/layout/Header.tsx
 *
 * §18.5 & §21.4 — Fixed 72px header bar on warm paper ground (--color-paper).
 * Pure UI component safe for Server and Client modules.
 * Wordmark uses --color-rust for "CAREERS" to clear >=4.5:1 contrast on paper.
 */

import Link from 'next/link'
import { Container } from './Container'
import { HeaderAuth } from './HeaderAuth'

interface HeaderProps {
  candidateName?: string | null
}

export function Header({ candidateName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-[72px] border-b border-(--color-hairline) bg-(--color-paper)/95 backdrop-blur-md flex items-center">
      <Container width="content" className="flex h-full items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/careers"
          className="flex items-center gap-3 min-h-[44px] focus-visible:outline-2 focus-visible:outline-(--color-rust) rounded-(--radius-sm) p-1"
        >
          {/* Logo Mark: 36x36 amber fill with ink text (8.18:1 ratio, §21.1) */}
          <div className="h-9 w-9 bg-(--color-amber) rounded-(--radius-md) flex items-center justify-center font-display font-black text-(--color-ink) text-xl shadow-xs">
            A
          </div>

          {/* Wordmark: "akshara" ink + "CAREERS" rust (5.80:1 ratio on paper) */}
          <div data-testid="logo-word" className="flex items-baseline gap-1.5 font-sans">
            <span className="font-bold text-lg tracking-tight text-(--color-ink)">
              akshara
            </span>
            <span className="font-mono text-xs uppercase tracking-widest font-extrabold text-(--color-rust)">
              CAREERS
            </span>
          </div>
        </Link>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/careers#roles"
              className="inline-flex items-center min-h-[44px] text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-muted) hover:text-(--color-ink) transition-colors rounded-(--radius-sm) px-3 py-2"
            >
              Open Roles
            </Link>

            <Link
              href="/careers#process"
              className="items-center min-h-[44px] text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-muted) hover:text-(--color-ink) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-flex"
            >
              Hiring Process
            </Link>

            <Link
              href="/careers#talent"
              className="items-center min-h-[44px] text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-muted) hover:text-(--color-ink) transition-colors rounded-(--radius-sm) px-3 py-2 hidden sm:inline-flex"
            >
              Talent Pool
            </Link>
          </nav>

          {/* Direct Login Button */}
          <HeaderAuth candidateName={candidateName} />
        </div>
      </Container>
    </header>
  )
}
