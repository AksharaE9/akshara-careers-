/**
 * app/api/cron/reap-orphaned-uploads/route.ts
 *
 * TASK 4 — Cron: Authenticated + Idempotent
 *
 * Runs nightly (02:00 UTC) per vercel.json.
 * Deletes R2 resume objects that were uploaded (presigned PUT completed) but
 * never finalised into an applications row — i.e., the candidate started the
 * form, uploaded their resume, then abandoned before submission.
 *
 * Detection heuristic: an R2 key exists but no applications row references it,
 * and the object's LastModified is older than 24 hours (giving any in-flight
 * submission plenty of time to finalise).
 *
 * Advisory lock key: 1003
 *
 * Manually triggerable:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain/api/cron/reap-orphaned-uploads
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const ADVISORY_LOCK_KEY = 1003
const STALE_THRESHOLD_HOURS = 24

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[CRON:reap-orphaned-uploads] CRON_SECRET is not set.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Idempotency ─────────────────────────────────────────────────────────────
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json({ error: 'NEON_DATABASE_URL not set' }, { status: 500 })
  }

  const sql = neon(dbUrl)
  const lockRows = await sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`
  const acquired = (lockRows[0] as { acquired: boolean } | undefined)?.acquired

  if (!acquired) {
    console.log('[CRON:reap-orphaned-uploads] Lock not acquired — skipping.')
    return NextResponse.json({ skipped: 'already running' }, { status: 200 })
  }

  // ── Reap ─────────────────────────────────────────────────────────────────────
  try {
    const endpoint = process.env.R2_ENDPOINT
    const bucket = process.env.R2_BUCKET_NAME
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: 'R2 credentials not configured' }, { status: 500 })
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })

    // List all objects in the bucket
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucket }))
    const objects = listRes.Contents ?? []

    if (objects.length === 0) {
      return NextResponse.json({ ok: true, reaped: 0, message: 'Bucket is empty' })
    }

    const thresholdMs = STALE_THRESHOLD_HOURS * 60 * 60 * 1000
    const now = Date.now()

    // Only consider objects older than the stale threshold
    const staleKeys = objects
      .filter((obj) => {
        const age = now - (obj.LastModified?.getTime() ?? now)
        return age > thresholdMs && !!obj.Key
      })
      .map((obj) => obj.Key!)

    if (staleKeys.length === 0) {
      return NextResponse.json({ ok: true, reaped: 0, message: 'No stale objects found' })
    }

    // Check which of these keys are referenced by an applications row
    const referenced = await sql`
      SELECT resume_key FROM applications
      WHERE resume_key = ANY(${staleKeys}::text[])
    `
    const referencedSet = new Set((referenced as { resume_key: string }[]).map((r) => r.resume_key))

    // Orphaned = stale AND not in applications
    const orphaned = staleKeys.filter((key) => !referencedSet.has(key))

    if (orphaned.length === 0) {
      return NextResponse.json({ ok: true, reaped: 0, message: 'No orphaned uploads found' })
    }

    // Delete orphaned objects in one batch (S3 allows up to 1000 per request)
    const deleteRes = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: orphaned.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    )

    const errored = deleteRes.Errors?.length ?? 0
    const reaped = orphaned.length - errored

    console.log(`[CRON:reap-orphaned-uploads] Reaped ${reaped} orphaned uploads (${errored} errors)`)
    return NextResponse.json({ ok: true, reaped, errors: errored })
  } catch (err) {
    console.error('[CRON:reap-orphaned-uploads] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  } finally {
    sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {})
  }
}
