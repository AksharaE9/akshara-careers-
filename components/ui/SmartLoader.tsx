/**
 * components/ui/SmartLoader.tsx
 *
 * Adaptive, high-performance loader with intelligent >2-second delayed state escalation.
 * Displays immediate subtle feedback, and smoothly transitions to informative progress status
 * if operations take longer than 2 seconds without layout shifts.
 * Updated for Part 21 warm light theme with rust accents.
 */

'use client'

import React, { useState, useEffect } from 'react'

export interface SmartLoaderProps {
  /** Initial loading label (immediate) */
  text?: string | undefined
  /** Status text shown if operation takes longer than the threshold */
  delayedText?: string | undefined
  /** Milliseconds before escalating to delayed state (defaults to 2000ms / 2s) */
  delayThresholdMs?: number | undefined
  /** Visual presentation mode */
  variant?: ('inline' | 'card' | 'section' | 'fullpage' | 'minimal') | undefined
  /** Size modifier */
  size?: ('sm' | 'md' | 'lg') | undefined
  /** Custom CSS classes */
  className?: string | undefined
}

export function SmartLoader({
  text = 'Loading...',
  delayedText = 'Securing live data from database... thank you for your patience.',
  delayThresholdMs = 2000,
  variant = 'section',
  size = 'md',
  className = '',
}: SmartLoaderProps) {
  const [isDelayed, setIsDelayed] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    // 2-second timer trigger
    const delayTimer = setTimeout(() => {
      setIsDelayed(true)
    }, delayThresholdMs)

    // Elapsed counter for long-running processes
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      clearTimeout(delayTimer)
      clearInterval(interval)
    }
  }, [delayThresholdMs])

  const spinnerSizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-7 w-7 border-2',
    lg: 'h-11 w-11 border-3',
  }

  const spinner = (
    <div className="relative flex items-center justify-center">
      {/* Outer ambient glow */}
      <span className="absolute h-full w-full rounded-full bg-(--color-rust)/15 animate-ping" />
      {/* Crisp Dual-Ring High-Performance Spinner */}
      <div
        className={`animate-spin rounded-full border-t-(--color-rust) border-r-(--color-rust)/40 border-b-transparent border-l-(--color-rust)/80 ${spinnerSizes[size]}`}
        role="status"
        aria-label="Loading indicator"
      />
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {spinner}
        <span className="font-mono text-xs text-(--color-muted) animate-pulse">
          {isDelayed ? delayedText : text}
        </span>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center p-2 ${className}`}>
        {spinner}
      </div>
    )
  }

  if (variant === 'fullpage') {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-(--color-paper)/95 backdrop-blur-md p-6 ${className}`}>
        <div className="flex flex-col items-center max-w-md w-full text-center gap-5 p-8 rounded-2xl bg-white border border-(--color-hairline) shadow-2xl">
          {spinner}
          
          <div className="flex flex-col gap-2">
            <h3 className="font-display font-bold text-lg text-(--color-ink)">
              {isDelayed ? 'Fetching Real-Time Records' : 'Loading Content'}
            </h3>
            <p className="text-sm font-sans text-(--color-muted) leading-relaxed">
              {isDelayed ? delayedText : text}
            </p>
          </div>

          {isDelayed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-sand) border border-(--color-hairline) text-(--color-rust) text-xs font-mono animate-pulse">
              <span className="h-2 w-2 rounded-full bg-(--color-rust) animate-ping" />
              <span>Optimizing connection ({elapsedSeconds}s)</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`p-8 bg-white border border-(--color-hairline) rounded-2xl flex flex-col items-center justify-center gap-4 text-center shadow-md ${className}`}>
        {spinner}
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs text-(--color-rust) font-bold uppercase tracking-wider">
            {isDelayed ? 'Still Synchronizing' : 'Please Wait'}
          </p>
          <p className="text-sm text-(--color-muted) font-medium max-w-xs">
            {isDelayed ? delayedText : text}
          </p>
        </div>
      </div>
    )
  }

  // Default: section variant
  return (
    <div className={`py-12 px-4 flex flex-col items-center justify-center gap-4 text-center ${className}`}>
      {spinner}
      <div className="flex flex-col items-center gap-1.5 max-w-md">
        <p className="font-mono text-xs text-(--color-rust) font-bold uppercase tracking-wider">
          {isDelayed ? 'Still Loading Live Records' : 'Loading'}
        </p>
        <p className="text-sm text-(--color-muted) leading-relaxed font-sans">
          {isDelayed ? delayedText : text}
        </p>
        {isDelayed && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-(--color-rust) bg-(--color-sand) px-3 py-1 rounded-full border border-(--color-hairline)">
            <span className="h-1.5 w-1.5 rounded-full bg-(--color-rust)" />
            <span>Connection verified · Live sync active</span>
          </div>
        )}
      </div>
    </div>
  )
}
