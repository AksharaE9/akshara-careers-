/**
 * app/api/lookup/colleges/route.ts
 *
 * College lookup API route for Combobox fuzzy search (D4).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchColleges } from '@/lib/db/queries/colleges'

const FALLBACK_COLLEGES = [
  { value: '11111111-1111-4111-a111-111111111111', label: 'Government First Grade College, Yelahanka', meta: 'Yelahanka, Bengaluru' },
  { value: '22222222-2222-4222-a222-222222222222', label: 'Government First Grade College, Kengeri', meta: 'Kengeri, Bengaluru' },
  { value: '33333333-3333-4333-a333-333333333333', label: 'Government First Grade College, Varthur', meta: 'Varthur, Bengaluru' },
  { value: '44444444-4444-4444-a444-444444444444', label: 'Acharya Institute of Technology', meta: 'Soladevanahalli, Bengaluru' },
  { value: '55555555-5555-4555-a555-555555555555', label: 'M.S. Ramaiah College of Arts, Science and Commerce', meta: 'Mathikere, Bengaluru' },
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
        const dbResults = await searchColleges(q)
        const formatted = dbResults.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.city ? `${item.city}, Bengaluru` : 'Bengaluru',
        }))
        return NextResponse.json(formatted)
      } catch (dbErr) {
        console.warn('Neon DB college query failed, falling back to mock lists:', dbErr)
      }
    }

    // Fallback search
    const filtered = FALLBACK_COLLEGES.filter((col) =>
      col.label.toLowerCase().includes(q.toLowerCase())
    )
    return NextResponse.json(filtered)
  } catch (err) {
    console.error('College lookup failed:', err)
    // Final safety fallback
    const filtered = FALLBACK_COLLEGES.filter((col) =>
      col.label.toLowerCase().includes(new URL(request.url).searchParams.get('q')?.toLowerCase() || '')
    )
    return NextResponse.json(filtered)
  }
}
