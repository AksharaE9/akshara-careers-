/**
 * components/landing/HiringProcessCarousel.tsx
 *
 * Interactive visual hiring process carousel featuring photography, step badges,
 * timeline progression, and auto-rotation.
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

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % PROCESS_STEPS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isPaused])

  const current = PROCESS_STEPS[activeIdx]!

  return (
    <div
      className="w-full flex flex-col gap-8"
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
              className={`cursor-pointer text-left p-4 rounded-(--radius-md) border transition-all flex flex-col gap-1 select-none ${
                isActive
                  ? 'bg-(--color-ink-800) border-(--color-amber-400) shadow-lg'
                  : 'bg-(--color-ink-900)/60 border-(--color-ink-600)/60 hover:border-(--color-ink-500)'
              }`}
            >
              <div className="flex items-center justify-between pointer-events-none">
                <span
                  className={`font-mono text-(--font-size-step--1) font-bold ${
                    isActive ? 'text-(--color-amber-400)' : 'text-(--color-text-on-dark-muted)'
                  }`}
                >
                  {s.step}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? 'bg-(--color-amber-400)' : 'bg-(--color-ink-600)'
                  }`}
                />
              </div>
              <span
                className={`font-display text-(--font-size-step--1) font-bold truncate pointer-events-none ${
                  isActive ? 'text-(--color-text-on-dark)' : 'text-(--color-text-on-dark-muted)'
                }`}
              >
                {s.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main Feature Slide Card */}
      <div className="bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Photo with Badge (6 cols) */}
        <div className="lg:col-span-6 relative min-h-[300px] lg:min-h-[420px] bg-(--color-ink-950) overflow-hidden">
          <Image
            src={current.image}
            alt={current.title}
            fill
            className="object-cover object-center transition-all duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-(--color-ink-950) via-transparent to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-(--color-ink-900)/40 lg:to-(--color-ink-900)" />

          {/* Floating Metric Pill */}
          <div className="absolute top-4 left-4 bg-(--color-ink-950)/85 backdrop-blur-md border border-(--color-ink-600) px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-(--color-amber-400) animate-pulse" />
            <span className="font-mono text-(--font-size-step--2) font-bold text-(--color-amber-400)">
              {current.badge}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-(--color-ink-950)/80 backdrop-blur-md border border-(--color-ink-600)/80 p-3 rounded-(--radius-md) flex items-center justify-between">
            <span className="font-mono text-(--font-size-step--2) text-(--color-text-on-dark-muted)">
              Stage Benchmark
            </span>
            <span className="font-mono text-(--font-size-step--1) font-bold text-(--color-text-on-dark)">
              {current.stat}
            </span>
          </div>
        </div>

        {/* Right Side: Step Details & Navigation (6 cols) */}
        <div className="lg:col-span-6 p-8 lg:p-10 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-(--font-size-step-1) font-bold text-(--color-amber-400)">
                {current.step}
              </span>
              <span className="font-mono text-(--font-size-step--2) uppercase tracking-wider text-(--color-text-on-dark-muted) font-semibold">
                {current.subtitle}
              </span>
            </div>

            <h3 className="font-display text-(--font-size-step-3) font-bold text-(--color-text-on-dark) leading-tight">
              {current.title}
            </h3>

            <p className="text-(--font-size-step-0) text-(--color-text-on-dark-muted) leading-relaxed mt-2">
              {current.desc}
            </p>
          </div>

          {/* Bottom Controls */}
          <div className="pt-6 border-t border-(--color-ink-600)/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === activeIdx
                      ? 'w-8 bg-(--color-amber-400)'
                      : 'w-2.5 bg-(--color-ink-600) hover:bg-(--color-ink-500)'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveIdx((prev) => (prev === 0 ? PROCESS_STEPS.length - 1 : prev - 1))
                }
                className="btn btn--sm btn--secondary !min-w-[80px]"
                aria-label="Previous step"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                onClick={() => setActiveIdx((prev) => (prev + 1) % PROCESS_STEPS.length)}
                className="btn btn--sm btn--secondary !min-w-[80px]"
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
