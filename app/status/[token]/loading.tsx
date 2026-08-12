/**
 * app/status/[token]/loading.tsx
 *
 * Dedicated skeleton for the Public Candidate Status Tracker.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function StatusLoading() {
  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col font-sans">
      <Header />

      <main className="mx-auto max-w-2xl w-full px-4 py-12 flex-1 flex flex-col gap-6">
        {/* Title Shimmer */}
        <div className="flex flex-col gap-2">
          <SkeletonLight variant="rounded" width={140} height={14} />
          <SkeletonLight variant="rounded" width={280} height={36} />
          <SkeletonLight variant="text" width="80%" height={18} />
        </div>

        {/* Card Shimmer */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col gap-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div className="flex flex-col gap-1">
              <SkeletonLight variant="text" width={120} height={12} />
              <SkeletonLight variant="rounded" width={160} height={24} />
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <SkeletonLight variant="text" width={100} height={12} />
              <SkeletonLight variant="rounded" width={120} height={20} />
            </div>
          </div>

          {/* Timeline Shimmer */}
          <div className="flex flex-col gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <SkeletonLight variant="circular" width={32} height={32} className="shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5 pt-1">
                  <SkeletonLight variant="rounded" width={180} height={18} />
                  <SkeletonLight variant="text" width="85%" height={14} />
                </div>
              </div>
            ))}
          </div>

          {/* Delayed status message */}
          <SmartLoader
            variant="minimal"
            delayedText="Decrypting verified application record from audit store..."
            delayThresholdMs={2000}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
