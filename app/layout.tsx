import type { Metadata } from 'next'
import { Inter_Tight } from 'next/font/google'
import localFont from 'next/font/local'
import { Suspense } from 'react'
import { RouteProgressBar } from '@/components/layout/RouteProgressBar'
import './globals.css'

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
})

const bricolage = localFont({
  src: '../public/fonts/bricolage-grotesque-variable-latin.woff2',
  display: 'swap',
  variable: '--font-bricolage',
})

const geistMono = localFont({
  src: '../public/fonts/geist-mono-400.woff2',
  display: 'swap',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://careers.akshara.in',
  ),
  title: {
    default: 'Akshara Careers — Join our team',
    template: '%s | Akshara Careers',
  },
  description:
    'Explore open roles at Akshara Education Loan — BDE, sales, operations and more. Apply directly or walk in at a campus drive.',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Akshara Careers',
    images: ['/api/og/default'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${bricolage.variable} ${geistMono.variable}`}
    >
      <body>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}

