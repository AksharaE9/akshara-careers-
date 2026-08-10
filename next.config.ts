import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // ── TypeScript ──────────────────────────────────────────────────────────────
  // Fail build on type errors — no warnings-only mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Images ──────────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    // Explicitly set to empty — no external image hosts; all images are local
    // or served via presigned R2 URLs (not next/image territory)
    remotePatterns: [],
  },

  // ── Bundle analyser ─────────────────────────────────────────────────────────
  // Enabled by ANALYZE=true in env (never default-on in CI)
  ...(process.env.ANALYZE === 'true'
    ? {
        experimental: {
          // @next/bundle-analyzer wraps this config externally — see package.json
        },
      }
    : {}),

  // ── Headers ─────────────────────────────────────────────────────────────────
  // Security headers live here (L7). CSP nonce is set in middleware.ts for
  // routes that need it. These headers apply to every response.
  async headers() {
    return [
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

export default withSentryConfig(nextConfig, {
  // Sentry build-time config — source maps upload on deploy, stripped from client bundle
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: true,
})

