/**
 * components/ui/Skeleton.tsx
 *
 * High-performance, GPU-accelerated skeleton shimmer primitives.
 * Supports dark mode (slate-900/800) and light mode (frost-100/200) tokens.
 */

import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string | undefined
  variant?: ('rectangular' | 'rounded' | 'circular' | 'text') | undefined
  width?: string | number | undefined
  height?: string | number | undefined
}


export function Skeleton({
  className = '',
  variant = 'rounded',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantClass = {
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4 my-1',
  }[variant]

  const customStyle: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`relative overflow-hidden bg-slate-800/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent ${variantClass} ${className}`}
      style={customStyle}
      {...props}
    />
  )
}

export function SkeletonLight({
  className = '',
  variant = 'rounded',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantClass = {
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4 my-1',
  }[variant]

  const customStyle: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`relative overflow-hidden bg-slate-200/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent ${variantClass} ${className}`}
      style={customStyle}
      {...props}
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton variant="rounded" width={120} height={20} />
        <Skeleton variant="circular" width={28} height={28} />
      </div>
      <Skeleton variant="text" width="80%" height={24} />
      <Skeleton variant="text" width="60%" height={16} />
      <div className="mt-2 flex items-center gap-3">
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={100} height={28} />
      </div>
    </div>
  )
}
