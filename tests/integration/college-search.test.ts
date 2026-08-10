/**
 * tests/integration/college-search.test.ts
 *
 * Integration test to verify pg_trgm search and alias resolution.
 * Proves that "Gfgc Yelahanka", "GFGC yelahanka", and "Government first grade college Yelahanka"
 * all resolve to the same canonical college record.
 *
 * Runs only if NEON_DATABASE_URL is provided (reconciled dynamically).
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { describe, it, expect, beforeAll } from 'vitest'
import { getDb } from '@/lib/db/client'
import { colleges } from '@/lib/db/schema'
import { searchColleges } from '@/lib/db/queries/colleges'
import { eq, sql } from 'drizzle-orm'

describe('College search pg_trgm integration tests', () => {
  const dbUrl = process.env.NEON_DATABASE_URL

  // Only run tests if database connection string is present
  const runCondition = dbUrl ? it : it.skip

  beforeAll(async () => {
    if (!dbUrl) {
      console.warn('Skipping college pg_trgm search integration test: NEON_DATABASE_URL is not set.')
      return
    }

    const db = getDb()

    const existing = await db
      .select()
      .from(colleges)
      .where(eq(colleges.name, 'Government First Grade College, Yelahanka'))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(colleges)
        .set({
          aliases: [
            'GFGC Yelahanka',
            'Gfgc Yelahanka',
            'GFGC yelahanka',
            'Government first grade college Yelahanka',
            'Government First Grade College Yelahanka',
          ],
          isVerified: true,
        })
        .where(eq(colleges.id, existing[0]!.id))
    } else {
      await db.insert(colleges).values({
        name: 'Government First Grade College, Yelahanka',
        city: 'Yelahanka',
        state: 'Karnataka',
        aliases: [
          'GFGC Yelahanka',
          'Gfgc Yelahanka',
          'GFGC yelahanka',
          'Government first grade college Yelahanka',
          'Government First Grade College Yelahanka',
        ],
        isVerified: true,
      })
    }
  })

  runCondition('resolves "Gfgc Yelahanka" to Yelahanka canonical record', async () => {
    const results = await searchColleges('Gfgc Yelahanka')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name).toBe('Government First Grade College, Yelahanka')
  })

  runCondition('resolves "GFGC yelahanka" to Yelahanka canonical record', async () => {
    const results = await searchColleges('GFGC yelahanka')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name).toBe('Government First Grade College, Yelahanka')
  })

  runCondition('resolves "Government first grade college Yelahanka" to Yelahanka canonical record', async () => {
    const results = await searchColleges('Government first grade college Yelahanka')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name).toBe('Government First Grade College, Yelahanka')
  })
})
