/**
 * app/privacy/page.tsx
 *
 * Privacy Policy & Data Consent compliance page.
 * Outlines our adherence to the Digital Personal Data Protection (DPDP) Act.
 */

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header />

      <main className="py-12 flex-1">
        <Container width="prose" className="flex flex-col gap-6">
        <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900) leading-tight">
          Privacy Policy & Data Consent
        </h1>
        
        <p className="prose text-(--font-size-step-0) text-(--color-graphite) leading-relaxed">
          At Akshara (operating under Akshara Education Loan), we value your privacy and process personal data in compliance with the Digital Personal Data Protection (DPDP) Act of India.
        </p>

        <Card className="flex flex-col gap-(--spacing-s4) bg-(--color-chalk) border border-(--color-ink-900)/10">
          <h2 className="text-(--font-size-step-1) font-bold text-(--color-ink-900)">
            Summary of Candidate Data processing
          </h2>
          
          <ul className="list-disc pl-(--spacing-s5) flex flex-col gap-(--spacing-s2) text-(--font-size-step-0) text-(--color-graphite)">
            <li><strong>Purpose:</strong> Recruitment, talent sourcing, and employment suitability assessment.</li>
            <li><strong>Data Collected:</strong> Full name, contact details (phone, email), academic qualifications, resume document, and functional vehicle ownership check.</li>
            <li><strong>Retention Period:</strong> Strictly <strong>24 months</strong> from the date of submission. Profiles are automatically deleted at the end of this period unless consent is explicitly renewed.</li>
            <li><strong>Data Rights:</strong> You retain the right to withdraw consent, inspect your data, or request immediate correction/deletion by emailing us.</li>
          </ul>
        </Card>

        <div className="flex flex-col gap-(--spacing-s4) prose max-w-none text-(--color-graphite)">
          <h3 className="text-(--font-size-step-1) font-bold text-(--color-ink-900)">
            1. Consent Collection
          </h3>
          <p>
            When applying for a role on our careers portal or scanning a QR code at one of our campus drives, you will be prompted to provide explicit consent. This consent covers the processing of your contact info, academic details, and resume by our recruiters.
          </p>

          <h3 className="text-(--font-size-step-1) font-bold text-(--color-ink-900)">
            2. Data Retention and Deletion
          </h3>
          <p>
            We enforce an automated 24-month data retention policy for all candidate profiles. This ensures that old application documents and personal contact records do not sit indefinitely on our servers. Once the 24-month threshold is reached, your candidate profile and all associated applications, resumes, and logs are deleted.
          </p>

          <h3 className="text-(--font-size-step-1) font-bold text-(--color-ink-900)">
            3. Contact Information
          </h3>
          <p>
            For any queries regarding personal data processing or if you wish to exercise your rights under the DPDP Act (such as requesting the immediate deletion of your application record), contact our Data Protection Officer at:
          </p>
          <p className="font-mono text-(--font-size-step--1) bg-(--color-ink-900)/5 p-(--spacing-s3) rounded-(--radius-sm) self-start">
            Email: privacy@akshara.in
          </p>
        </div>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
