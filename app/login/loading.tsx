/**
 * app/login/loading.tsx
 *
 * Dedicated skeleton for the Unified Login & Candidate Portal.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-(--color-ink-950) text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
          {/* Header Shimmer */}
          <div className="flex flex-col gap-2">
            <SkeletonLight variant="rounded" width={110} height={14} />
            <SkeletonLight variant="rounded" width={180} height={32} />
            <SkeletonLight variant="text" width="90%" height={16} />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <SkeletonLight variant="rounded" height={36} />
            <SkeletonLight variant="rounded" height={36} />
          </div>

          {/* Input Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SkeletonLight variant="text" width={130} height={14} />
              <SkeletonLight variant="rounded" height={48} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <SkeletonLight variant="text" width={80} height={14} />
              <SkeletonLight variant="rounded" height={48} className="w-full" />
            </div>

            <SkeletonLight variant="rounded" height={48} className="w-full mt-2" />
          </div>

          <SmartLoader
            variant="minimal"
            delayedText="Establishing secure session handshake..."
            delayThresholdMs={2000}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
