#!/usr/bin/env tsx
/**
 * scripts/verify-env-isolation.ts
 *
 * TASK 1 — Environment Isolation Audit
 *
 * Pulls the actual environment variables Vercel would inject into a Production
 * build and a Preview build, then fails if any critical credential is identical
 * across both. Values are SHA-256 fingerprinted — never printed — so this
 * script's output is safe to paste into a report.
 *
 * Usage:
 *   pnpm tsx scripts/verify-env-isolation.ts
 *
 * Requires:
 *   VERCEL_TOKEN   — Vercel API token (project-scoped or team-scoped)
 *   VERCEL_PROJECT_ID — from .vercel/project.json or Vercel dashboard
 *   VERCEL_TEAM_ID    — optional, for team projects (ORG slug or team ID)
 *
 * Or if you have the Vercel CLI linked already:
 *   vercel env pull .env.production --environment=production
 *   vercel env pull .env.preview    --environment=preview
 * and pass --from-files flag instead.
 */

import { createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

// ── Constants ──────────────────────────────────────────────────────────────────

/** These must NEVER be the same value across Production and Preview. */
const MUST_DIFFER = [
  'NEON_DATABASE_URL',
  'DATABASE_URL', // alias some setups use
  'R2_BUCKET_NAME',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'RESEND_API_KEY',
  'SEED_ADMIN_PASSWORD',
  'CRON_SECRET',
  'AUTH_SECRET',
]

/** These must be present in production but are not required to differ. */
const MUST_BE_SET_IN_PROD = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
]

// ── Fingerprint helper ─────────────────────────────────────────────────────────

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

// ── Env loader ────────────────────────────────────────────────────────────────

interface EnvMap {
  [key: string]: string
}

/** Parse a .env file into a plain object (simple key=value, no escaping). */
function parseEnvFile(filePath: string): EnvMap {
  const content = readFileSync(filePath, 'utf-8')
  const env: EnvMap = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const raw = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes if present
    const value = raw.replace(/^["']|["']$/g, '')
    env[key] = value
  }
  return env
}

/** Load env vars from Vercel REST API for a given target. */
async function fetchVercelEnv(
  projectId: string,
  teamId: string | undefined,
  token: string,
  target: 'production' | 'preview',
): Promise<EnvMap> {
  const teamParam = teamId ? `&teamId=${teamId}` : ''
  const url = `https://api.vercel.com/v9/projects/${projectId}/env?target=${target}&decrypt=true${teamParam}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Vercel API ${response.status}: ${body}`)
  }

  const data = (await response.json()) as { envs: { key: string; value: string; target: string[] }[] }

  const env: EnvMap = {}
  for (const item of data.envs) {
    // Only take the value if it's scoped to our target
    if (item.target.includes(target)) {
      env[item.key] = item.value ?? ''
    }
  }
  return env
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Akshara Careers — Environment Isolation Audit')
  console.log('='.repeat(60))

  let prodEnv: EnvMap = {}
  let previewEnv: EnvMap = {}
  let source = ''

  // Strategy 1: Vercel REST API
  const vercelToken = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  // Strategy 2: Pre-pulled .env files (vercel env pull)
  const prodFile = path.join(process.cwd(), '.env.production')
  const previewFile = path.join(process.cwd(), '.env.preview')

  if (vercelToken && projectId) {
    source = 'Vercel REST API'
    console.log(`\nSource: ${source}`)
    console.log(`Project: ${projectId}`)

    const teamId = process.env.VERCEL_TEAM_ID
    console.log(`Team: ${teamId ?? '(personal account)'}`)

    console.log('\nFetching production env vars...')
    prodEnv = await fetchVercelEnv(projectId, teamId, vercelToken, 'production')

    console.log('Fetching preview env vars...')
    previewEnv = await fetchVercelEnv(projectId, teamId, vercelToken, 'preview')
  } else if (existsSync(prodFile) && existsSync(previewFile)) {
    source = 'Local .env files'
    console.log(`\nSource: ${source}`)
    console.log(`  Production: ${prodFile}`)
    console.log(`  Preview:    ${previewFile}`)

    prodEnv = parseEnvFile(prodFile)
    previewEnv = parseEnvFile(previewFile)
  } else {
    console.error('\n❌ No source available.')
    console.error('   Option A: Set VERCEL_TOKEN, VERCEL_PROJECT_ID (and optionally VERCEL_TEAM_ID)')
    console.error('   Option B: Pull env files first:')
    console.error('     vercel env pull .env.production --environment=production')
    console.error('     vercel env pull .env.preview    --environment=preview')
    process.exit(2)
  }

  // ── MUST_DIFFER check ────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60))
  console.log('ISOLATION CHECK — credentials that must differ across environments')
  console.log('─'.repeat(60))

  const header = `${'Variable'.padEnd(36)} ${'Production'.padEnd(14)} ${'Preview'.padEnd(14)} ${'Status'.padEnd(6)}`
  console.log(header)
  console.log('-'.repeat(header.length))

  let failCount = 0

  for (const key of MUST_DIFFER) {
    const prodVal = prodEnv[key]
    const previewVal = previewEnv[key]

    const prodFP = prodVal ? fingerprint(prodVal) : '(not set)'
    const previewFP = previewVal ? fingerprint(previewVal) : '(not set)'

    let status: string
    if (!prodVal && !previewVal) {
      status = '⚠️  MISSING'
    } else if (!prodVal) {
      status = '⚠️  PROD MISSING'
    } else if (!previewVal) {
      // Preview not set is acceptable for some vars
      status = '✅ OK (preview unset)'
    } else if (prodFP === previewFP) {
      status = '❌ FAIL (same)'
      failCount++
    } else {
      status = '✅ PASS'
    }

    console.log(`${key.padEnd(36)} ${prodFP.padEnd(14)} ${previewFP.padEnd(14)} ${status}`)
  }

  // ── MUST_BE_SET_IN_PROD check ─────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60))
  console.log('PRESENCE CHECK — variables required in production')
  console.log('─'.repeat(60))

  let missingInProd = 0
  for (const key of MUST_BE_SET_IN_PROD) {
    const val = prodEnv[key]
    const status = val ? '✅ SET' : '❌ MISSING'
    if (!val) missingInProd++
    console.log(`${key.padEnd(36)} ${status}`)
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(60))
  if (failCount === 0 && missingInProd === 0) {
    console.log('✅ ALL CHECKS PASSED — environment isolation is correct.')
  } else {
    if (failCount > 0) {
      console.log(`❌ ${failCount} ISOLATION FAILURE(S) — credentials shared across Production and Preview.`)
      console.log('   In Vercel → Settings → Environment Variables, set separate values')
      console.log('   for each of the FAIL rows, scoped to their respective environments.')
    }
    if (missingInProd > 0) {
      console.log(`⚠️  ${missingInProd} VARIABLE(S) MISSING IN PRODUCTION.`)
    }
    process.exit(1)
  }
  console.log('='.repeat(60) + '\n')
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
