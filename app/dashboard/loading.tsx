/**
 * app/dashboard/loading.tsx
 *
 * Dedicated skeleton for the Candidate Self-Serve Live Dashboard.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Skeleton, SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-(--color-ink-950) text-(--color-text-on-dark) flex flex-col font-sans">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <Container width="content">
          <div className="flex flex-col gap-8">
            {/* Profile Header Bar Skeleton */}
            <div className="bg-slate-900 border border-slate-800 rounded-(--radius-lg) p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="rounded" width={140} height={18} />
                  <Skeleton variant="rounded" width={90} height={22} />
                </div>
                <Skeleton variant="rounded" width={260} height={36} />
                <div className="flex items-center gap-4 mt-1">
                  <Skeleton variant="text" width={120} height={16} />
                  <Skeleton variant="text" width={160} height={16} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Skeleton variant="rounded" width={170} height={40} />
                <Skeleton variant="rounded" width={90} height={40} />
              </div>
            </div>

            {/* Application Timeline Card Skeleton */}
            <div className="bg-white border border-slate-200 rounded-(--radius-lg) p-6 sm:p-8 shadow-sm flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div className="flex flex-col gap-2">
                  <SkeletonLight variant="rounded" width={120} height={14} />
                  <SkeletonLight variant="rounded" width={240} height={28} />
                  <SkeletonLight variant="text" width={300} height={16} />
                </div>
                <SkeletonLight variant="rounded" width={160} height={36} />
              </div>

              {/* Timeline Items */}
              <div className="flex flex-col gap-6 pl-4 border-l border-slate-200">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <SkeletonLight variant="rounded" width={160} height={20} />
                      <SkeletonLight variant="rounded" width={100} height={14} />
                    </div>
                    <SkeletonLight variant="text" width="80%" height={16} />
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Loader Delayed Feedback */}
            <SmartLoader
              variant="section"
              text="Synchronizing candidate records..."
              delayedText="Retrieving verified application status from secure database..."
              delayThresholdMs={2000}
            />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
