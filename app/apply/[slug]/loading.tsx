/**
 * app/apply/[slug]/loading.tsx
 *
 * Dedicated skeleton for the candidate application wizard.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function ApplyLoading() {
  return (
    <div className="min-h-screen bg-(--color-ink-950) text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-10 flex flex-col gap-6 flex-1">
        {/* Back Link Shimmer */}
        <SkeletonLight variant="rounded" width={140} height={20} />

        {/* Wizard Header Shimmer */}
        <div className="flex flex-col gap-2">
          <SkeletonLight variant="rounded" width={160} height={16} />
          <SkeletonLight variant="rounded" width={320} height={36} />
        </div>

        {/* Wizard Form Card Skeleton */}
        <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
          {/* Progress Steps Shimmer */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <SkeletonLight variant="rounded" height={32} className="flex-1" />
            <SkeletonLight variant="rounded" height={32} className="flex-1" />
            <SkeletonLight variant="rounded" height={32} className="flex-1" />
          </div>

          {/* Form Fields Shimmer */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <SkeletonLight variant="text" width={100} height={16} />
              <SkeletonLight variant="rounded" height={48} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <SkeletonLight variant="text" width={120} height={16} />
              <SkeletonLight variant="rounded" height={48} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <SkeletonLight variant="text" width={140} height={16} />
              <SkeletonLight variant="rounded" height={48} className="w-full" />
            </div>

            <div className="flex justify-end pt-4">
              <SkeletonLight variant="rounded" width={140} height={44} />
            </div>
          </div>

          {/* Delayed status notification if DB lookup takes >2s */}
          <SmartLoader
            variant="minimal"
            delayedText="Validating candidate profile & role requisitions..."
            delayThresholdMs={2000}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
