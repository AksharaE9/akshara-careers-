/**
 * components/landing/HiringProcessCarousel.tsx
 *
 * Interactive visual hiring process carousel featuring photography, step badges,
 * timeline progression, and 3-second auto-rotation.
 * Updated for Part 21 warm light theme with --color-rust accents.
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Application & Resume Review',
    subtitle: 'Step 1 of 4 · Simple 3-Minute Apply',
    desc: 'Submit your candidate details and upload your resume in under 3 minutes. Our talent acquisition team reviews every profile within 48 business hours.',
    badge: 'Quick & Seamless',
    image: '/images/process-1.png',
    stat: '48h Review',
  },
  {
    step: '02',
    title: 'Initial Talent Conversation',
    subtitle: 'Step 2 of 4 · Mutual Alignment',
    desc: 'A friendly 20-minute conversation with our recruitment partner to discuss your background, career aspirations, and answer any questions about life at Akshara.',
    badge: 'Video / Phone Call',
    image: '/images/hero-team.png',
    stat: '20 Min Chat',
  },
  {
    step: '03',
    title: 'Hiring Manager Discussion',
    subtitle: 'Step 3 of 4 · Technical & Role Fit',
    desc: 'Deep-dive conversation with your future team lead focusing on real-world scenarios, domain expertise, and operational problem solving.',
    badge: 'Team Fit & Case Study',
    image: '/images/process-2.png',
    stat: 'In-Depth Round',
  },
  {
    step: '04',
    title: 'Offer & Seamless Onboarding',
    subtitle: 'Step 4 of 4 · Welcome to the Team',
    desc: 'Transparent compensation breakdown, prompt written offer release, and structured day-one orientation with your dedicated mentor.',
    badge: 'Day-One Readiness',
    image: '/images/process-3.png',
    stat: 'Fast Decisions',
  },
]

export function HiringProcessCarousel() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // 3-second auto-rotation interval
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % PROCESS_STEPS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [isPaused])

  const current = PROCESS_STEPS[activeIdx]!

  return (
    <div
      className="w-full flex flex-col gap-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Step Tab Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="tablist" aria-label="Hiring Steps">
        {PROCESS_STEPS.map((s, idx) => {
          const isActive = idx === activeIdx
          return (
            <div
              key={s.step}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              onClick={() => setActiveIdx(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveIdx(idx)
                }
              }}
              className={`cursor-pointer text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 select-none ${
                isActive
                  ? 'bg-white border-2 border-(--color-rust) shadow-md ring-2 ring-(--color-rust)/20'
                  : 'bg-white/80 border-(--color-hairline) hover:border-(--color-border) hover:bg-white text-(--color-ink)'
              }`}
            >
              <div className="flex items-center justify-between pointer-events-none">
                <span
                  className={`font-mono text-xs font-bold ${
                    isActive ? 'text-(--color-rust)' : 'text-(--color-muted)'
                  }`}
                >
                  {s.step}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive ? 'bg-(--color-rust)' : 'bg-(--color-hairline)'
                  }`}
                />
              </div>
              <span
                className={`font-display text-sm font-bold truncate pointer-events-none ${
                  isActive ? 'text-(--color-ink)' : 'text-(--color-muted-strong)'
                }`}
              >
                {s.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main Feature Slide Card */}
      <div className="bg-white border border-(--color-hairline) rounded-2xl overflow-hidden shadow-md grid grid-cols-1 lg:grid-cols-12 text-(--color-ink)">
        {/* Left Side: Photo with Badge (6 cols) */}
        <div className="lg:col-span-6 relative min-h-[300px] lg:min-h-[420px] bg-(--color-ink) overflow-hidden">
          <Image
            src={current.image}
            alt={current.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center transition-all duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-(--color-ink)/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-(--color-ink)/40" />

          {/* Floating Metric Pill */}
          <div className="absolute top-4 left-4 bg-(--color-ink)/85 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-white">
            <span className="h-2 w-2 rounded-full bg-(--color-amber) animate-pulse" />
            <span className="font-mono text-xs font-bold text-(--color-amber)">
              {current.badge}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-(--color-ink)/85 backdrop-blur-md border border-white/15 p-3.5 rounded-xl flex items-center justify-between text-(--color-paper)">
            <span className="font-mono text-xs text-(--color-paper)/70">
              Stage Benchmark
            </span>
            <span className="font-mono text-sm font-bold text-(--color-paper)">
              {current.stat}
            </span>
          </div>
        </div>

        {/* Right Side: Step Details & Navigation (6 cols) */}
        <div className="lg:col-span-6 p-8 lg:p-10 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-black text-(--color-rust)">
                {current.step}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-(--color-muted) font-bold">
                {current.subtitle}
              </span>
            </div>

            <h3 className="font-display text-[clamp(1.50rem,1.30rem+0.80vw,2.10rem)] font-bold text-(--color-ink) leading-tight">
              {current.title}
            </h3>

            <p className="text-base text-(--color-muted) leading-relaxed mt-2">
              {current.desc}
            </p>
          </div>

          {/* Bottom Controls */}
          <div className="pt-6 border-t border-(--color-hairline) flex items-center justify-between">
            <div className="flex items-center">
              {PROCESS_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveIdx(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActiveIdx(idx)
                    }
                  }}
                  className="h-11 w-11 flex items-center justify-center cursor-pointer"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 rounded-full transition-all ${
                      idx === activeIdx
                        ? 'w-8 bg-(--color-rust)'
                        : 'w-2.5 bg-(--color-hairline) hover:bg-(--color-border)'
                    }`}
                  />
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveIdx((prev) => (prev === 0 ? PROCESS_STEPS.length - 1 : prev - 1))
                }
                className="btn btn--sm btn--secondary !min-w-[80px] font-semibold"
                aria-label="Previous step"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                onClick={() => setActiveIdx((prev) => (prev + 1) % PROCESS_STEPS.length)}
                className="btn btn--sm btn--secondary !min-w-[80px] font-semibold"
                aria-label="Next step"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
