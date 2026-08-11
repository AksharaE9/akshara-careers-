/**
 * components/ui/SmoothLoader.tsx
 *
 * Smooth ambient loading indicator for dashboard sync, transitions, and initial data loads.
 * Matches design system tokens with subtle pulse micro-animations.
 */

'use client'

import React from 'react'

interface SmoothLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  inline?: boolean
  className?: string
}

export function SmoothLoader({
  size = 'md',
  text,
  inline = false,
  className = '',
}: SmoothLoaderProps) {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  }

  const spinner = (
    <div
      className={`animate-spin rounded-full border-t-(--color-amber-400) border-r-(--color-amber-400)/30 border-b-(--color-amber-400)/10 border-l-(--color-amber-400)/60 ${sizeMap[size]}`}
      role="status"
      aria-label="Loading"
    />
  )

  if (inline) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {spinner}
        {text && (
          <span className="font-mono text-(--font-size-step--2) text-(--color-text-on-dark-muted) animate-pulse">
            {text}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <span className="absolute h-12 w-12 rounded-full bg-(--color-amber-400)/10 animate-ping" />
        {spinner}
      </div>
      {text && (
        <span className="font-mono text-(--font-size-step--1) text-(--color-text-on-dark-muted) animate-pulse text-center">
          {text}
        </span>
      )}
    </div>
  )
}
