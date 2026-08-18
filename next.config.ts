import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // ── TypeScript ──────────────────────────────────────────────────────────────
  // Fail build on type errors — no warnings-only mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Package optimizations ───────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', 'gsap'],
  },

  // ── Images ──────────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    // Explicitly set to empty — no external image hosts; all images are local
    // or served via presigned R2 URLs (not next/image territory)
    remotePatterns: [],
  },

  // Bundle analyzer is handled at the export wrapping level using @next/bundle-analyzer

  // ── Headers ─────────────────────────────────────────────────────────────────
  // Security headers live here (L7). CSP nonce is set in middleware.ts for
  // routes that need it. These headers apply to every response.
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS — 1 year, includeSubDomains, preload
          // Only meaningful on HTTPS (Vercel enforces this)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  // ── Redirects ───────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Root → careers home (convenience)
      {
        source: '/',
        destination: '/careers',
        permanent: false,
      },
    ]
  },
}

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withSentryConfig(analyzer(nextConfig), {
  // Sentry build-time config — source maps upload on deploy, stripped from client bundle
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: true,
})

