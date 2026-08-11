// Obsolete endpoint - replaced by password auth
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'DEPRECATED', message: 'Replaced by password authentication.' }, { status: 410 })
}
