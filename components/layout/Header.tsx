import Link from 'next/link'
import Image from 'next/image'
import { Container } from './Container'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-600/20 bg-ink-900/90 backdrop-blur-md">
      <Container width="content" className="flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/careers"
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-marigold rounded-(--radius-sm) p-1"
        >
          <Image
            src="/images/akshara-logo.svg"
            alt="Akshara Logo"
            width={150}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            href="/careers#roles"
            className="text-step--1 font-medium text-chalk/80 hover:text-chalk transition-colors focus-visible:outline-2 focus-visible:outline-marigold rounded-(--radius-sm) px-3 py-1.5"
          >
            Open Roles
          </Link>
          
          <Link
            href="/careers#life"
            className="text-step--1 font-medium text-chalk/80 hover:text-chalk transition-colors focus-visible:outline-2 focus-visible:outline-marigold rounded-(--radius-sm) px-3 py-1.5"
          >
            Life at Akshara
          </Link>

          <Link
            href="/careers#process"
            className="text-step--1 font-medium text-chalk/80 hover:text-chalk transition-colors focus-visible:outline-2 focus-visible:outline-marigold rounded-(--radius-sm) px-3 py-1.5 hidden sm:inline-block"
          >
            Hiring Process
          </Link>
        </nav>
      </Container>
    </header>
  )
}
