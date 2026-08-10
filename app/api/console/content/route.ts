/**
 * app/api/console/content/route.ts
 *
 * CMS Content Blocks endpoint (§14.15).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { getDb } from '@/lib/db/client'
import { contentBlocks, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !can(user, 'edit_content')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const defaultBlocks = [
      {
        slug: 'hero_headline',
        label: 'Careers Hero Headline',
        charLimit: 60,
        content: 'Build the Future of Education in India',
      },
      {
        slug: 'hero_subheadline',
        label: 'Careers Hero Subtitle',
        charLimit: 140,
        content: 'Join Akshara to transform foundational learning across Karnataka through mission-driven leadership and high-impact campus careers.',
      },
      {
        slug: 'why_akshara_lead',
        label: 'Why Join Akshara Lead Copy',
        charLimit: 120,
        content: 'Competitive performance incentives, structured mentorship from industry leaders, and direct ground-level impact.',
      },
    ]

    return NextResponse.json({ blocks: defaultBlocks })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to query content blocks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !can(user, 'edit_content')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { slug, content } = await request.json()

    const db = getDb()
    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'edit_content_block',
      entityType: 'content_block',
      after: { slug, length: content?.length },
    })

    return NextResponse.json({ success: true, message: 'Content block updated successfully.' })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}
