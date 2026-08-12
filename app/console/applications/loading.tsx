/**
 * app/console/applications/loading.tsx
 *
 * Dedicated skeleton for the Recruiter Applications table.
 */

import React from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function ApplicationsLoading() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 gap-6 font-sans">
      <div className="flex flex-col gap-2">
        <Skeleton variant="rounded" width={180} height={14} />
        <Skeleton variant="rounded" width={280} height={32} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <Skeleton variant="rounded" width={300} height={40} />
          <div className="flex gap-3">
            <Skeleton variant="rounded" width={120} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 6].map((i) => (
            <div
              key={i}
              className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4"
            >
              <Skeleton variant="rounded" width={90} height={20} />
              <Skeleton variant="text" width={180} height={20} />
              <Skeleton variant="rounded" width={140} height={20} />
              <Skeleton variant="rounded" width={110} height={24} />
              <Skeleton variant="rounded" width={80} height={32} />
            </div>
          ))}
        </div>

        <SmartLoader
          variant="minimal"
          delayedText="Syncing candidate pipeline..."
          delayThresholdMs={2000}
        />
      </div>
    </div>
  )
}
