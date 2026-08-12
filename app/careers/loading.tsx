/**
 * app/careers/loading.tsx
 *
 * Dedicated skeleton loader for the Careers homepage.
 * Replicates the exact visual geometry of the Hero and Open Requisitions board
 * in the warm light theme.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { SkeletonLight } from '@/components/ui/Skeleton'
import { SmartLoader } from '@/components/ui/SmartLoader'

export default function CareersLoading() {
  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col font-sans">
      <Header />

      <main className="flex-1">
        {/* S1: HERO SKELETON */}
        <section className="relative bg-(--color-cream) border-b border-[#D8CCB6] section-lg min-h-[580px] flex items-center py-12 lg:py-16">
          <Container width="content" className="relative z-10">
            <Grid className="items-center gap-y-12">
              {/* Left Column */}
              <div className="col-span-4 md:col-span-8 lg:col-span-7 flex flex-col items-start gap-4">
                <SkeletonLight variant="rounded" width={280} height={32} />
                <SkeletonLight variant="rounded" width="90%" height={56} className="mt-2" />
                <SkeletonLight variant="rounded" width="70%" height={56} />
                <SkeletonLight variant="text" width="85%" height={24} className="mt-3" />
                <SkeletonLight variant="text" width="65%" height={24} />

                {/* CTA Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <SkeletonLight variant="rounded" width={200} height={52} />
                  <SkeletonLight variant="rounded" width={190} height={52} />
                </div>

                {/* Metric Badges */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <SkeletonLight variant="rounded" width={140} height={36} />
                  <SkeletonLight variant="rounded" width={160} height={36} />
                  <SkeletonLight variant="rounded" width={130} height={36} />
                </div>
              </div>

              {/* Right Column: Hero Visual card */}
              <div className="col-span-4 md:col-span-8 lg:col-span-5">
                <div className="rounded-2xl border border-(--color-hairline) bg-white p-3 shadow-md">
                  <SkeletonLight variant="rounded" height={380} className="w-full" />
                </div>
              </div>
            </Grid>
          </Container>
        </section>

        {/* S2: OPEN ROLES SKELETON */}
        <section className="bg-(--color-paper) section-md text-(--color-ink)">
          <Container width="content">
            <div className="heading-block max-w-2xl">
              <SkeletonLight variant="rounded" width={120} height={18} className="mb-2" />
              <SkeletonLight variant="rounded" width={280} height={36} className="mb-3" />
              <SkeletonLight variant="text" width={420} height={20} />
            </div>

            {/* Filter Bar Skeleton */}
            <div className="sticky top-[72px] z-20 bg-(--color-paper)/95 py-4 border-b border-(--color-hairline) flex flex-wrap gap-3">
              <SkeletonLight variant="rounded" height={48} className="flex-1 min-w-[200px]" />
              <SkeletonLight variant="rounded" height={48} width={208} />
              <SkeletonLight variant="rounded" height={48} width={208} />
            </div>

            {/* Role Cards Shimmer */}
            <div className="mt-8 flex flex-col gap-4">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="p-6 sm:p-8 bg-white border border-(--color-hairline) rounded-(--radius-lg) flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs"
                >
                  <div className="flex flex-col gap-3 max-w-2xl w-full">
                    <div className="flex items-center gap-3">
                      <SkeletonLight variant="rounded" width={80} height={24} />
                      <SkeletonLight variant="rounded" width={140} height={20} />
                    </div>
                    <SkeletonLight variant="rounded" width="75%" height={28} />
                    <SkeletonLight variant="text" width="95%" height={18} />
                    <SkeletonLight variant="text" width="60%" height={18} />
                    <div className="flex items-center gap-4 mt-1">
                      <SkeletonLight variant="rounded" width={130} height={20} />
                      <SkeletonLight variant="rounded" width={150} height={20} />
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <SkeletonLight variant="rounded" width={130} height={44} />
                  </div>
                </div>
              ))}
            </div>

            {/* Adaptive delayed status notifier */}
            <div className="mt-6">
              <SmartLoader
                variant="minimal"
                delayedText="Refreshing live openings from Akshara database..."
                delayThresholdMs={2000}
              />
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  )
}
