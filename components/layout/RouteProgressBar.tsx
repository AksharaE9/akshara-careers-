/**
 * components/layout/RouteProgressBar.tsx
 *
 * Ultra-responsive top navigation progress bar for Next.js App Router.
 * Starts instantaneously on internal link clicks with amber-gold glowing shimmer,
 * accelerating and completing on page navigation completion.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function RouteProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const initialMountRef = useRef(true)

  // Complete and reset progress on route/searchParam change
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false
      return
    }

    // Trigger rapid completion animation
    setProgress(100)
    const completeTimer = setTimeout(() => {
      setIsVisible(false)
      setProgress(0)
    }, 250)

    return () => {
      clearTimeout(completeTimer)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pathname, searchParams])

  // Listen to navigation clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Ignore hash anchors on same page, new tabs, external links, or downloads
      if (
        href.startsWith('#') ||
        target.getAttribute('target') === '_blank' ||
        target.hasAttribute('download') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('https://wa.me')
      ) {
        return
      }

      // Check if it's an internal route navigation
      const isInternal =
        href.startsWith('/') ||
        (href.startsWith(window.location.origin) && !href.includes('#'))

      if (isInternal) {
        // Start progress immediately
        setIsVisible(true)
        setProgress(25)

        if (timerRef.current) clearInterval(timerRef.current)

        // Increment progress gradually up to 90% while waiting for the route
        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              if (timerRef.current) clearInterval(timerRef.current)
              return 90
            }
            const step = Math.max(1, (90 - prev) * 0.15)
            return Math.min(90, prev + step)
          })
        }, 150)
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => {
      document.removeEventListener('click', handleAnchorClick, true)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!isVisible && progress === 0) return null

  return (
    <div
      role="progressbar"
      aria-label="Navigation progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-(--color-rust) via-(--color-rust) to-(--color-amber) shadow-[0_0_12px_rgba(168,67,42,0.6)] transition-all duration-200 ease-out relative"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/60 blur-[2px]" />
      </div>
    </div>
  )
}
