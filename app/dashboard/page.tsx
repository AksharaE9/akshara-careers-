/**
 * app/dashboard/page.tsx
 *
 * Candidate Self-Serve Dashboard & Application Tracking Portal.
 * Enforces §5 & §6: Scoped strictly at SQL layer by candidate session.
 * Features 2-second real-time polling sync with ETag and smooth micro-animations.
 */

import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { getCurrentCandidate } from '@/lib/auth/candidate-session'
import { getCandidateApplications } from '@/lib/db/queries/applications'
import { checkApplicationEligibility } from '@/lib/db/queries/candidates'
import { CandidateDashboardLive } from '@/components/candidate/CandidateDashboardLive'

export default async function CandidateDashboardPage() {
  const candidate = await getCurrentCandidate()

  if (!candidate) {
    redirect('/login')
  }

  const [apps, eligibility] = await Promise.all([
    getCandidateApplications(candidate.id),
    checkApplicationEligibility(candidate.id),
  ])

  return (
    <div className="min-h-screen bg-(--color-ink-950) text-(--color-text-on-dark) flex flex-col font-sans">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <Container width="content">
          <CandidateDashboardLive
            candidate={candidate}
            initialApplications={apps}
            initialEligibility={{
              allowed: eligibility.allowed,
              reason: eligibility.reason,
              message: eligibility.message,
              reapplyAvailableAt: eligibility.reapplyAvailableAt?.toISOString(),
              daysRemaining: eligibility.daysRemaining,
            }}
          />
        </Container>
      </main>

      <Footer />
    </div>
  )
}
