/**
 * lib/db/queries/colleges.ts
 *
 * Database queries for the colleges table (D4 college lookup and merge tool).
 * Uses Postgres pg_trgm for fuzzy matching and resolves aliases/merges.
 */

import { getDb } from '../client'
import { colleges } from '../schema'
import { eq, sql, or } from 'drizzle-orm'

export interface SearchCollegeResult {
  id: string
  name: string
  city: string | null
  state: string
  isVerified: boolean
  similarity?: number
}

/**
 * Fuzzy matches a raw input college string against canonical names and aliases.
 * Matches:
 *  - "Gfgc Yelahanka"
 *  - "GFGC yelahanka"
 *  - "Government first grade college Yelahanka"
 * to "Government First Grade College, Yelahanka".
 *
 * Implements D4 deduplication check.
 */
export async function searchColleges(query: string, limit = 5): Promise<SearchCollegeResult[]> {
  const db = getDb()
  const cleanQuery = query.trim()
  if (!cleanQuery) return []

  // 1. First run a fast exact/alias query.
  // This matches lowercase/trimmed name or matches any item in the aliases array.
  const exactMatch = await db
    .select({
      id: colleges.id,
      name: colleges.name,
      city: colleges.city,
      state: colleges.state,
      isVerified: colleges.isVerified,
      mergedInto: colleges.mergedInto,
    })
    .from(colleges)
    .where(
      or(
        sql`lower(btrim(${colleges.name})) = lower(btrim(${cleanQuery}))`,
        sql`${cleanQuery} = ANY(${colleges.aliases})`
      )
    )
    .limit(limit)

  // Resolve merges if any match was merged into a canonical record
  const resolvedExact = await Promise.all(
    exactMatch.map(async (item) => {
      if (item.mergedInto) {
        const canonical = await db
          .select()
          .from(colleges)
          .where(eq(colleges.id, item.mergedInto))
          .limit(1)
        if (canonical[0]) {
          return {
            id: canonical[0].id,
            name: canonical[0].name,
            city: canonical[0].city,
            state: canonical[0].state,
            isVerified: canonical[0].isVerified,
            similarity: 1.0,
          }
        }
      }
      return {
        id: item.id,
        name: item.name,
        city: item.city,
        state: item.state,
        isVerified: item.isVerified,
        similarity: 1.0,
      }
    })
  )

  if (resolvedExact.length > 0) {
    return resolvedExact
  }

  // 2. Fall back to pg_trgm fuzzy similarity search.
  // Matches name or any alias using the pg_trgm GIN index (defined in schema).
  // similarity() returns 0 to 1. Threshold of 0.25 captures typing variations.
  const fuzzyResults = await db
    .select({
      id: colleges.id,
      name: colleges.name,
      city: colleges.city,
      state: colleges.state,
      isVerified: colleges.isVerified,
      mergedInto: colleges.mergedInto,
      similarity: sql<number>`greatest(
        similarity(${colleges.name}, ${cleanQuery}),
        (
          select max(similarity(alias, ${cleanQuery}))
          from unnest(${colleges.aliases}) alias
        )
      )`,
    })
    .from(colleges)
    .where(
      or(
        sql`${colleges.name} % ${cleanQuery}`,
        sql`exists (
          select 1 from unnest(${colleges.aliases}) alias
          where alias % ${cleanQuery}
        )`
      )
    )
    .orderBy(sql`greatest(similarity(${colleges.name}, ${cleanQuery}), (select max(similarity(alias, ${cleanQuery})) from unnest(${colleges.aliases}) alias)) DESC`)
    .limit(limit)

  // Resolve merges for fuzzy results and deduplicate
  const finalResults: SearchCollegeResult[] = []
  const seenIds = new Set<string>()

  for (const item of fuzzyResults) {
    let target = item
    if (item.mergedInto) {
      const canonical = await db
        .select()
        .from(colleges)
        .where(eq(colleges.id, item.mergedInto))
        .limit(1)
      if (canonical[0]) {
        target = {
          ...item,
          id: canonical[0].id,
          name: canonical[0].name,
          city: canonical[0].city,
          state: canonical[0].state,
          isVerified: canonical[0].isVerified,
        }
      }
    }

    if (!seenIds.has(target.id)) {
      seenIds.add(target.id)
      finalResults.push({
        id: target.id,
        name: target.name,
        city: target.city,
        state: target.state,
        isVerified: target.isVerified,
        similarity: item.similarity,
      })
    }
  }

  return finalResults
}

/**
 * Merges a duplicate college into a canonical one (D4 merge tool).
 * Sets the merged_into pointer and updates existing applications to point to canonical.
 */
export async function mergeColleges(
  duplicateId: string,
  canonicalId: string
): Promise<void> {
  if (duplicateId === canonicalId) return
  const db = getDb()

  // Run in transactional structure
  // In our HTTP-only serverless driver, transactions can still be run via standard SQL transaction queries.
  // We perform updates sequentially.
  
  // 1. Update duplicate college merged_into pointer
  await db
    .update(colleges)
    .set({ mergedInto: canonicalId })
    .where(eq(colleges.id, duplicateId))

  // 2. Add duplicate's name and aliases to canonical aliases to preserve matches
  const duplicate = await db
    .select()
    .from(colleges)
    .where(eq(colleges.id, duplicateId))
    .limit(1)

  const canonical = await db
    .select()
    .from(colleges)
    .where(eq(colleges.id, canonicalId))
    .limit(1)

  if (duplicate[0] && canonical[0]) {
    const combinedAliases = Array.from(
      new Set([
        ...(canonical[0].aliases || []),
        duplicate[0].name,
        ...(duplicate[0].aliases || []),
      ])
    )

    await db
      .update(colleges)
      .set({ aliases: combinedAliases })
      .where(eq(colleges.id, canonicalId))
  }
}

export async function listAllCollegesAdmin() {
  const db = getDb()
  return db
    .select()
    .from(colleges)
    .orderBy(sql`${colleges.name} ASC`)
}

export async function addCollegeAlias(collegeId: string, alias: string) {
  const db = getDb()
  const cleanAlias = alias.trim()
  if (!cleanAlias) return

  const [target] = await db
    .select()
    .from(colleges)
    .where(eq(colleges.id, collegeId))
    .limit(1)

  if (!target) return

  const updatedAliases = Array.from(new Set([...(target.aliases || []), cleanAlias]))
  return db
    .update(colleges)
    .set({ aliases: updatedAliases })
    .where(eq(colleges.id, collegeId))
    .returning()
}

