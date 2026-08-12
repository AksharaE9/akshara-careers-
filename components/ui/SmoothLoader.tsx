/**
 * components/ui/SmoothLoader.tsx
 *
 * Smooth ambient loading indicator for dashboard sync, transitions, and initial data loads.
 * Matches design system tokens with subtle pulse micro-animations and >2s delayed status escalation.
 */

'use client'

import React from 'react'
import { SmartLoader, type SmartLoaderProps } from './SmartLoader'

export interface SmoothLoaderProps extends SmartLoaderProps {
  inline?: boolean
}

export function SmoothLoader({
  size = 'md',
  text,
  delayedText,
  delayThresholdMs = 2000,
  inline = false,
  className = '',
}: SmoothLoaderProps) {
  return (
    <SmartLoader
      size={size}
      text={text}
      delayedText={delayedText}
      delayThresholdMs={delayThresholdMs}
      variant={inline ? 'inline' : 'section'}
      className={className}
    />
  )
}

