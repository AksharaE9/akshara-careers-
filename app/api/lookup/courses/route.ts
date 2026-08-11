/**
 * app/api/lookup/courses/route.ts
 *
 * Course lookup API route for Combobox fuzzy search (D3).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchCourses } from '@/lib/db/queries/courses'

const FALLBACK_COURSES = [
  { value: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', label: 'MBA (Marketing)', meta: 'Postgraduate' },
  { value: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', label: 'B.Com (General)', meta: 'Undergraduate' },
  { value: 'cccccccc-cccc-4ccc-cccc-cccccccccccc', label: 'BBA (Finance)', meta: 'Undergraduate' },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.trim().length < 2) {
      return NextResponse.json([])
    }

    const hasDb = Boolean(process.env.NEON_DATABASE_URL)
    if (hasDb) {
      try {
        const dbResults = await searchCourses(q)
        const formatted = dbResults.map((item) => ({
          value: item.id,
          label: `${item.name} (${item.specialisation || 'General'})`,
          meta: item.level.toUpperCase(),
        }))
        return NextResponse.json(formatted)
      } catch (dbErr) {
        console.warn('Neon DB course query failed, falling back to mock lists:', dbErr)
      }
    }

    // Fallback search
    const filtered = FALLBACK_COURSES.filter((c) =>
      c.label.toLowerCase().includes(q.toLowerCase())
    )
    return NextResponse.json(filtered)
  } catch (err) {
    console.error('Course lookup failed:', err)
    // Final safety fallback
    const filtered = FALLBACK_COURSES.filter((c) =>
      c.label.toLowerCase().includes(new URL(request.url).searchParams.get('q')?.toLowerCase() || '')
    )
    return NextResponse.json(filtered)
  }
}
