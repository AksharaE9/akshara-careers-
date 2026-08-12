/**
 * app/loading.tsx
 *
 * Root global loading boundary.
 * Renders an ambient high-contrast skeleton shell with SmartLoader.
 */

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { SmartLoader } from '@/components/ui/SmartLoader'
import { Skeleton } from '@/components/ui/Skeleton'

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-(--color-ink-950) flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Container width="content" className="w-full flex flex-col items-center py-12">
          <SmartLoader
            variant="section"
            text="Loading portal content..."
            delayedText="Connecting to live recruitment network... thanks for waiting."
            delayThresholdMs={2000}
          />
          <div className="w-full max-w-2xl mt-6 flex flex-col gap-4">
            <Skeleton variant="rounded" height={16} width="60%" className="mx-auto" />
            <Skeleton variant="rounded" height={12} width="40%" className="mx-auto" />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
