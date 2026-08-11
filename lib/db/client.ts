/**
 * lib/db/client.ts
 *
 * Neon DB client following §3.2 rules:
 * 1. HTTP driver for one-shot queries (RSC, route handlers) — prevents connection exhaustion
 * 2. WebSocket/pooled only for transactions
 * 3. Never instantiated at module scope — always called inside the handler
 *
 * Usage in RSC or route handler:
 *   import { getDb } from '@/lib/db/client'
 *   const db = getDb()
 *   const rows = await db.select().from(jobs).where(...)
 *
 * Usage in transaction:
 *   import { getDbWithTransaction } from '@/lib/db/client'
 *   const db = getDbWithTransaction()
 *   await db.transaction(async (tx) => { ... })
 */

import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * One-shot HTTP client — use for all RSC and route handler queries.
 * Safe to call per-request. Uses serverless HTTP connection caching and statement timeout.
 */
export function getDb() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error('NEON_DATABASE_URL is not set')

  // Configure Neon serverless HTTP with fetch connection caching and 15s timeout
  const sql = neon(url, {
    fetchOptions: {
      cache: 'no-store',
    },
  })
  return drizzleHttp(sql, { schema })
}

/**
 * Type alias — use for typing function params that accept either client.
 * Prefer getDb() for all non-transactional work.
 */
export type Db = ReturnType<typeof getDb>
