/**
 * app/careers/[slug]/loading.tsx
 *
 * Dedicated skeleton for individual job requisition detail view.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col font-sans">
      <Header />

      <main className="flex-1 bg-(--color-paper) py-10">
        <Container width="content">
          {/* Back link shimmer */}
          <SkeletonLight variant="rounded" width={140} height={20} className="mb-6" />

          <Grid className="gap-8">
            {/* Left Content Column */}
            <div className="col-span-4 md:col-span-8 lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border border-(--color-hairline) rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <SkeletonLight variant="rounded" width={90} height={24} />
                  <SkeletonLight variant="rounded" width={140} height={24} />
                </div>
                <SkeletonLight variant="rounded" width="80%" height={40} />
                <SkeletonLight variant="text" width="95%" height={20} />
                <SkeletonLight variant="text" width="90%" height={20} />

                <div className="mt-4 border-t border-(--color-hairline) pt-6 flex flex-col gap-4">
                  <SkeletonLight variant="rounded" width={180} height={28} />
                  <SkeletonLight variant="text" width="100%" height={18} />
                  <SkeletonLight variant="text" width="92%" height={18} />
                  <SkeletonLight variant="text" width="85%" height={18} />
                </div>

                <div className="mt-4 border-t border-(--color-hairline) pt-6 flex flex-col gap-3">
                  <SkeletonLight variant="rounded" width={200} height={28} />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SkeletonLight variant="circular" width={12} height={12} />
                      <SkeletonLight variant="text" width="88%" height={16} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Summary Sidebar */}
            <div className="col-span-4 md:col-span-8 lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white border border-(--color-hairline) rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <SkeletonLight variant="rounded" width={120} height={20} />
                <SkeletonLight variant="rounded" width="100%" height={48} className="mt-1" />
                
                <div className="border-t border-(--color-hairline) pt-4 flex flex-col gap-3">
                  <div className="flex justify-between">
                    <SkeletonLight variant="text" width={80} height={16} />
                    <SkeletonLight variant="text" width={100} height={16} />
                  </div>
                  <div className="flex justify-between">
                    <SkeletonLight variant="text" width={80} height={16} />
                    <SkeletonLight variant="text" width={90} height={16} />
                  </div>
                  <div className="flex justify-between">
                    <SkeletonLight variant="text" width={100} height={16} />
                    <SkeletonLight variant="text" width={110} height={16} />
                  </div>
                </div>

                <SmartLoader
                  variant="minimal"
                  delayedText="Retrieving role specifications from database..."
                  delayThresholdMs={2000}
                />
              </div>
            </div>
          </Grid>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
