/**
 * app/console/loading.tsx
 *
 * Dedicated skeleton for the Recruiter & Admin Console.
 */

import React from 'react'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function ConsoleLoading() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 gap-8 font-sans">
      {/* Top Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton variant="rounded" width={160} height={14} />
          <Skeleton variant="rounded" width={260} height={32} />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={140} height={40} />
        </div>
      </div>

      {/* 4 Metric Stats Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Table Shell Shimmer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        {/* Table Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <Skeleton variant="rounded" width={320} height={42} />
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" width={140} height={42} />
            <Skeleton variant="rounded" width={140} height={42} />
          </div>
        </div>

        {/* Table Rows Shimmer */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4"
            >
              <Skeleton variant="rounded" width={80} height={20} />
              <Skeleton variant="text" width={180} height={20} />
              <Skeleton variant="rounded" width={140} height={20} />
              <Skeleton variant="rounded" width={100} height={24} />
              <Skeleton variant="rounded" width={80} height={32} />
            </div>
          ))}
        </div>

        {/* Smart Loader Delayed Feedback */}
        <SmartLoader
          variant="section"
          text="Loading recruiter stream..."
          delayedText="Querying live talent pool & candidates from database..."
          delayThresholdMs={2000}
        />
      </div>
    </div>
  )
}
