/**
 * lib/db/queries/courses.ts
 *
 * Database queries for the courses table (D3 course lookup).
 * Fuzzy matches variations of MBA, B.Com, BBA to canonical records.
 */

import { getDb } from '../client'
import { courses } from '../schema'
import { eq, and, sql, or } from 'drizzle-orm'

export interface SearchCourseResult {
  id: string
  name: string
  specialisation: string | null
  level: 'undergraduate' | 'postgraduate' | 'diploma' | 'other'
  isVerified: boolean
  similarity?: number
}

/**
 * Fuzzy matches a raw input course string against canonical names and aliases.
 * E.g. "MBA Marketing", "M.B.A" resolves to MBA.
 */
export async function searchCourses(query: string, limit = 5): Promise<SearchCourseResult[]> {
  const db = getDb()
  const cleanQuery = query.trim()
  if (!cleanQuery) return []

  // 1. Fast exact/alias match
  const exactMatch = await db
    .select({
      id: courses.id,
      name: courses.name,
      specialisation: courses.specialisation,
      level: courses.level,
      isVerified: courses.isVerified,
    })
    .from(courses)
    .where(
      or(
        sql`lower(btrim(${courses.name})) = lower(btrim(${cleanQuery}))`,
        sql`${cleanQuery} = ANY(${courses.aliases})`
      )
    )
    .limit(limit)

  if (exactMatch.length > 0) {
    return exactMatch.map(item => ({ ...item, similarity: 1.0 }))
  }

  // 2. Trigram similarity match
  const fuzzyResults = await db
    .select({
      id: courses.id,
      name: courses.name,
      specialisation: courses.specialisation,
      level: courses.level,
      isVerified: courses.isVerified,
      similarity: sql<number>`greatest(
        similarity(${courses.name}, ${cleanQuery}),
        (
          select max(similarity(alias, ${cleanQuery}))
          from unnest(${courses.aliases}) alias
        )
      )`,
    })
    .from(courses)
    .where(
      or(
        sql`${courses.name} % ${cleanQuery}`,
        sql`exists (
          select 1 from unnest(${courses.aliases}) alias
          where alias % ${cleanQuery}
        )`
      )
    )
    .orderBy(sql`greatest(similarity(${courses.name}, ${cleanQuery}), (select max(similarity(alias, ${cleanQuery})) from unnest(${courses.aliases}) alias)) DESC`)
    .limit(limit)

  return fuzzyResults
}
