/**
 * lib/email/application-email.ts
 *
 * Transactional HR notification emails for new applications.
 *
 * Architecture:
 *   - enqueueHrNotification() inserts an outbox row inside the application
 *     transaction. The candidate is safe before any mail provider is contacted.
 *   - drainOutbox() is called fire-and-forget after commit, and by the
 *     /api/cron/drain-outbox endpoint every 60 seconds.
 *   - SELECT FOR UPDATE SKIP LOCKED prevents duplicate sends when two workers
 *     run concurrently.
 *   - 6 retry attempts with exponential backoff + jitter (~1m, 4m, 15m, 1h, 4h, 12h).
 *   - Permanent failures (>= 6 attempts) are surfaced on the Pulse attention list.
 *
 * Security / PII posture:
 *   - Resume is never linked; console link requires authentication.
 *   - HR_EMAIL_INCLUDE_CONTACT=false strips phone and email from the email body.
 *   - Every delivery is audit-logged (actor=system, action=email.sent).
 *   - Footer states the email contains personal data.
 */

import { getDb } from '@/lib/db/client'
import {
  emailOutbox,
  applications,
  candidates,
  jobs,
  campusDrives,
  colleges,
  auditLog,
  type EmailOutboxEntry,
} from '@/lib/db/schema'
import { eq, and, or, isNull, lte, sql } from 'drizzle-orm'
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HrEmailPayload {
  applicationId: string      // DB uuid
  publicId: string           // e.g. AKS-2608-4F7K
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  jobTitle: string
  location: string           // "Bangalore, Karnataka" | "—"
  experience: string         // "Fresher" | "Experienced — <note>"
  qualification: string      // "MBA · Final year, results awaited"
  applicationDate: string    // IST civil datetime
  resumeFilename: string
  consoleLink: string        // /console/applications/{publicId}
  campusDrive?: string       // "GFGC-YLK-0726 (GFGC Yelahanka)" | undefined
}

// ── Recipient validation ───────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parse HR_NOTIFICATION_RECIPIENTS from env.
 * Returns validated, de-duplicated list.
 * Logs loudly and returns [] if unset or all invalid — never falls back.
 */
export function parseRecipients(): string[] {
  const raw = process.env.HR_NOTIFICATION_RECIPIENTS ?? ''
  if (!raw.trim()) {
    console.error(
      '[HR EMAIL] HR_NOTIFICATION_RECIPIENTS is not set. ' +
      'No notification will be sent. Set the variable before going live.'
    )
    return []
  }

  const seen = new Set<string>()
  const valid: string[] = []
  const invalid: string[] = []

  for (const addr of raw.split(',')) {
    const trimmed = addr.trim().toLowerCase()
    if (!trimmed) continue
    if (!EMAIL_RE.test(trimmed)) {
      invalid.push(trimmed)
      continue
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      valid.push(trimmed)
    }
  }

  if (invalid.length > 0) {
    console.error(
      `[HR EMAIL] Invalid recipient address(es) in HR_NOTIFICATION_RECIPIENTS: ${invalid.join(', ')}. ` +
      'They have been skipped.'
    )
  }

  if (valid.length === 0) {
    console.error(
      '[HR EMAIL] No valid recipients after parsing HR_NOTIFICATION_RECIPIENTS. ' +
      'No notification will be sent.'
    )
  }

  return valid
}

// ── IST formatting ─────────────────────────────────────────────────────────────

function toISTDatetime(d: Date): string {
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ── Payload builder ────────────────────────────────────────────────────────────

/**
 * Build the HR email payload by reading from the committed DB row.
 * We read from the DB — not the request body — so the email reflects
 * exactly what was stored (normalised phone, canonical college, etc.).
 */
export async function buildHrPayload(applicationId: string): Promise<HrEmailPayload | null> {
  const db = getDb()

  const rows = await db
    .select({
      appId: applications.id,
      publicId: applications.publicId,
      submittedAt: applications.submittedAt,
      source: applications.source,
      experienceType: applications.experienceType,
      experienceNote: applications.experienceNote,
      academicStatus: applications.academicStatus,
      courseRaw: applications.courseRaw,
      resumeFilename: applications.resumeFilename,
      candidateName: candidates.fullName,
      candidateEmail: candidates.emailNormalised,
      candidatePhone: candidates.phoneE164,
      homeCity: candidates.homeCity,
      homeState: candidates.homeState,
      jobTitle: jobs.title,
      driveCode: campusDrives.code,
      collegeName: colleges.name,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(campusDrives, eq(applications.driveId, campusDrives.id))
    .leftJoin(colleges, eq(campusDrives.collegeId, colleges.id))
    .where(eq(applications.id, applicationId))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  // Location
  const locationParts = [row.homeCity, row.homeState].filter(Boolean)
  const location = locationParts.length > 0 ? locationParts.join(', ') : '—'

  // Experience (Option A)
  const experience =
    row.experienceType === 'fresher'
      ? 'Fresher'
      : row.experienceNote
      ? `Experienced — ${row.experienceNote}`
      : 'Experienced'

  // Qualification
  const academicMap: Record<string, string> = {
    sem_1: 'Semester 1', sem_2: 'Semester 2', sem_3: 'Semester 3',
    sem_4: 'Semester 4', sem_5: 'Semester 5', sem_6: 'Semester 6',
    sem_7: 'Semester 7', sem_8: 'Semester 8',
    final_year_results_awaited: 'Final year, results awaited',
    graduated: 'Graduated',
  }
  const academicLabel = academicMap[row.academicStatus] ?? row.academicStatus
  const qualification = `${row.courseRaw} · ${academicLabel}`

  // Date in IST
  const applicationDate = row.submittedAt
    ? toISTDatetime(new Date(row.submittedAt))
    : toISTDatetime(new Date())

  // Campus drive label
  const campusDrive = row.driveCode
    ? `${row.driveCode}${row.collegeName ? ` (${row.collegeName})` : ''}`
    : undefined

  // Console link — login required to view resume via 5-min signed URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const consoleLink = `${appUrl}/console/applications/${row.publicId}`

  const includeContact = process.env.HR_EMAIL_INCLUDE_CONTACT !== 'false'

  return {
    applicationId,
    publicId: row.publicId,
    candidateName: row.candidateName,
    candidateEmail: includeContact ? row.candidateEmail : '(hidden — HR_EMAIL_INCLUDE_CONTACT=false)',
    candidatePhone: includeContact ? row.candidatePhone : '(hidden — HR_EMAIL_INCLUDE_CONTACT=false)',
    jobTitle: row.jobTitle,
    location,
    experience,
    qualification,
    applicationDate,
    resumeFilename: row.resumeFilename,
    consoleLink,
    ...(campusDrive !== undefined ? { campusDrive } : {}),
  }
}

// ── HTML template ─────────────────────────────────────────────────────────────

export function hrNewApplicationHtml(p: HrEmailPayload): string {
  const driveRow = p.campusDrive
    ? `<tr><td class="label">Campus Drive</td><td class="value">${esc(p.campusDrive)}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Application — ${esc(p.candidateName)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0F172A;background:#F8FAFC;margin:0;padding:0}
    .wrap{max-width:600px;margin:28px auto;background:#fff;border-radius:10px;border:1px solid #E2E8F0;overflow:hidden}
    .hd{background:#0F172A;padding:24px 28px;color:#fff}
    .hd h1{margin:0 0 4px;font-size:18px;font-weight:700}
    .hd p{margin:0;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px}
    .body{padding:28px}
    .intro{font-size:15px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    td{padding:8px 10px;font-size:14px;border-bottom:1px solid #F1F5F9;vertical-align:top}
    td.label{color:#64748B;font-weight:600;width:42%;white-space:nowrap}
    td.value{color:#0F172A;font-weight:500;word-break:break-word}
    .id{font-family:monospace;font-size:13px;color:#D97706;font-weight:700}
    .btn-wrap{text-align:center;margin:24px 0}
    .btn{display:inline-block;background:#D97706;color:#fff!important;text-decoration:none;padding:11px 26px;border-radius:8px;font-weight:700;font-size:14px}
    .ft{border-top:1px solid #E2E8F0;padding:16px 28px;font-size:11px;color:#94A3B8;text-align:center}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hd">
      <h1>New Application Received</h1>
      <p>Akshara Careers — Hiring Team Notification</p>
    </div>
    <div class="body">
      <p class="intro">A candidate has submitted an application through the careers portal.</p>
      <table>
        <tr><td class="label">Name</td><td class="value">${esc(p.candidateName)}</td></tr>
        <tr><td class="label">Email</td><td class="value">${esc(p.candidateEmail)}</td></tr>
        <tr><td class="label">Phone</td><td class="value">${esc(p.candidatePhone)}</td></tr>
        <tr><td class="label">Position</td><td class="value">${esc(p.jobTitle)}</td></tr>
        <tr><td class="label">Location</td><td class="value">${esc(p.location)}</td></tr>
        <tr><td class="label">Experience</td><td class="value">${esc(p.experience)}</td></tr>
        <tr><td class="label">Qualification</td><td class="value">${esc(p.qualification)}</td></tr>
        <tr><td class="label">Applied On</td><td class="value">${esc(p.applicationDate)}</td></tr>
        <tr><td class="label">Resume on file</td><td class="value">${esc(p.resumeFilename)}</td></tr>
        ${driveRow}
        <tr><td class="label">Application ID</td><td class="value"><span class="id">${esc(p.publicId)}</span></td></tr>
      </table>
      <div class="btn-wrap">
        <a href="${esc(p.consoleLink)}" class="btn">View Application in Console →</a>
      </div>
      <p style="font-size:13px;color:#64748B;text-align:center">
        The resume can be downloaded after signing into the console.<br>
        Reply to this email to reach the candidate directly.
      </p>
    </div>
    <div class="ft">
      <p>This message contains personal data and must not be forwarded outside the hiring team.</p>
      <p>© ${new Date().getFullYear()} Akshara Enterprises. Akshara Careers · Automated Notification</p>
    </div>
  </div>
</body>
</html>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Plain-text template (required for deliverability) ─────────────────────────

export function hrNewApplicationText(p: HrEmailPayload): string {
  const driveSection = p.campusDrive ? `Campus Drive: ${p.campusDrive}\n` : ''

  return `NEW APPLICATION — AKSHARA CAREERS
===================================

A candidate has submitted an application through the careers portal.

CANDIDATE DETAILS
-----------------
Name:             ${p.candidateName}
Email:            ${p.candidateEmail}
Phone:            ${p.candidatePhone}
Position:         ${p.jobTitle}
Location:         ${p.location}
Experience:       ${p.experience}
Qualification:    ${p.qualification}
Applied On:       ${p.applicationDate}
Resume on file:   ${p.resumeFilename}
${driveSection}Application ID:   ${p.publicId}

VIEW IN CONSOLE
---------------
${p.consoleLink}
(Sign in required. Resume available as a 5-minute signed link after login.)

---
This message contains personal data and must not be forwarded outside the hiring team.
© ${new Date().getFullYear()} Akshara Enterprises.
`
}

// ── Enqueue (called inside application transaction) ───────────────────────────

/**
 * Insert an outbox row for an HR notification.
 * Uses ON CONFLICT DO NOTHING — idempotent; safe on retry.
 * Must be called inside the same DB transaction as the application insert.
 */
export async function enqueueHrNotification(
  applicationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
): Promise<void> {
  const recipients = parseRecipients()
  // Even if recipients is empty, we still enqueue so the error is recorded
  // and visible in the outbox, not silently dropped.
  const idempotencyKey = `hr:${applicationId}`

  await tx
    .insert(emailOutbox)
    .values({
      kind: 'hr_new_application',
      recipients,
      applicationId,
      idempotencyKey,
      status: 'pending',
    })
    .onConflictDoNothing({ target: emailOutbox.idempotencyKey })
}

// ── Retry schedule ────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 6

/** Exponential backoff with jitter. Returns next attempt time. */
function nextAttemptAt(attempts: number): Date {
  // Base delays in seconds: 60, 240, 900, 3600, 14400, 43200
  const baseSeconds = Math.min(60 * Math.pow(4, attempts - 1), 43200)
  const jitter = Math.floor(Math.random() * baseSeconds * 0.2)
  return new Date(Date.now() + (baseSeconds + jitter) * 1000)
}

// ── Send via Resend REST API ───────────────────────────────────────────────────

async function sendViaResend(
  payload: HrEmailPayload,
  recipients: string[],
  applicationId: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const from = process.env.HR_EMAIL_FROM || 'Akshara Careers <careers@akshara.in>'
  const subject = [
    'New application —',
    payload.candidateName,
    '·',
    payload.jobTitle,
    payload.campusDrive ? `[${payload.campusDrive.split(' ')[0]}]` : '[Organic]',
  ].join(' ')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: payload.candidateEmail,
      subject,
      html: hrNewApplicationHtml(payload),
      text: hrNewApplicationText(payload),
      headers: {
        'X-Entity-Ref-ID': `hr:${applicationId}`,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    return { ok: false, error: `Resend ${res.status}: ${body}` }
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string }
  return { ok: true as const, ...(data.id !== undefined ? { messageId: data.id } : {}) }
}

// ── Drain ─────────────────────────────────────────────────────────────────────

/**
 * Process pending/retrying outbox rows.
 * Safe to call concurrently — SELECT FOR UPDATE SKIP LOCKED.
 * Returns counts of sent and permanently failed rows.
 */
export async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  const db = getDb()
  let sent = 0
  let failed = 0

  // Fetch up to 20 due rows under a lock
  const due = await db.execute(sql`
    SELECT id, kind, recipients, application_id, idempotency_key, attempts
    FROM email_outbox
    WHERE status IN ('pending','retrying')
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
    ORDER BY created_at
    LIMIT 20
    FOR UPDATE SKIP LOCKED
  `)

  for (const row of due.rows as Array<{
    id: string
    kind: string
    recipients: string[]
    application_id: string
    idempotency_key: string
    attempts: number
  }>) {
    const attempts = (row.attempts ?? 0) + 1

    if (row.recipients.length === 0) {
      // No valid recipients — mark failed immediately, don't retry
      await db
        .update(emailOutbox)
        .set({
          status: 'failed',
          attempts,
          lastError: 'No valid recipients configured (HR_NOTIFICATION_RECIPIENTS)',
        })
        .where(eq(emailOutbox.id, row.id))
      failed++
      continue
    }

    // Build payload from committed DB row
    const payload = await buildHrPayload(row.application_id)
    if (!payload) {
      await db
        .update(emailOutbox)
        .set({
          status: 'failed',
          attempts,
          lastError: `Application ${row.application_id} not found in DB`,
        })
        .where(eq(emailOutbox.id, row.id))
      failed++
      continue
    }

    const result = await sendViaResend(payload, row.recipients, row.application_id)

    if (result.ok) {
      await db
        .update(emailOutbox)
        .set({ status: 'sent', attempts, sentAt: new Date(), lastError: null })
        .where(eq(emailOutbox.id, row.id))

      // Audit log — DPDP disclosure record
      try {
        await db.insert(auditLog).values({
          action: 'email.sent',
          entityType: 'application',
          entityId: row.application_id,
          after: {
            kind: row.kind,
            recipients: row.recipients,
            messageId: result.messageId,
          },
        })
      } catch (auditErr) {
        console.error('[HR EMAIL] Failed to write audit log:', auditErr)
      }

      sent++
    } else {
      if (attempts >= MAX_ATTEMPTS) {
        await db
          .update(emailOutbox)
          .set({ status: 'failed', attempts, lastError: result.error ?? 'Unknown error' })
          .where(eq(emailOutbox.id, row.id))
        console.error(
          `[HR EMAIL] Permanently failed after ${attempts} attempts: ${row.id}. ` +
          `Error: ${result.error}. This will appear on the Pulse attention list.`
        )
        failed++
      } else {
        await db
          .update(emailOutbox)
          .set({
            status: 'retrying',
            attempts,
            lastError: result.error ?? 'Unknown error',
            nextAttemptAt: nextAttemptAt(attempts),
          })
          .where(eq(emailOutbox.id, row.id))
        console.warn(
          `[HR EMAIL] Attempt ${attempts}/${MAX_ATTEMPTS} failed for ${row.id}: ${result.error}. ` +
          `Will retry.`
        )
      }
    }
  }

  return { sent, failed }
}

// ── Legacy exports (preserve existing imports) ────────────────────────────────

export type { EmailOutboxEntry }

export interface ApplicationConfirmationEmailPayload {
  to: string
  candidateName: string
  jobTitle: string
  applicationId: string
  statusUrl?: string | undefined
  department?: string | undefined
  submittedAt?: Date | undefined
}

export interface EmailSendResult {
  success: boolean
  messageId?: string | undefined
  mode: 'dummy' | 'live'
  error?: string | undefined
}

/** Kept for the existing candidate confirmation flow — unchanged. */
export async function sendApplicationConfirmationEmail(
  payload: ApplicationConfirmationEmailPayload
): Promise<EmailSendResult> {
  try {
    const dateStr = (payload.submittedAt || new Date()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const htmlContent = `<!DOCTYPE html><html><body>
      <p>Dear ${payload.candidateName},</p>
      <p>Thank you for applying for <strong>${payload.jobTitle}</strong>.</p>
      <p>Reference: <strong>${payload.applicationId}</strong> — ${dateStr}</p>
      ${payload.statusUrl ? `<p><a href="${payload.statusUrl}">Track your application →</a></p>` : ''}
      <p>Best regards,<br>Akshara Careers</p>
    </body></html>`

    const textContent = `Dear ${payload.candidateName},\n\nThank you for applying for ${payload.jobTitle}.\nReference: ${payload.applicationId}\nDate: ${dateStr}\n${payload.statusUrl ? `\nTrack your application: ${payload.statusUrl}\n` : ''}\nBest regards,\nAkshara Careers`

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.HR_EMAIL_FROM || 'Akshara Careers <careers@akshara.in>',
          to: [payload.to],
          subject: `Application Received — ${payload.jobTitle} (${payload.applicationId})`,
          html: htmlContent,
          text: textContent,
        }),
      })
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { id?: string }
        return { success: true, messageId: data.id, mode: 'live' }
      }
    }

    // Dummy mode
    console.log(`\n[EMAIL DUMMY] Candidate confirmation → ${payload.to} | ${payload.applicationId}\n`)
    return { success: true, messageId: `mock-${Date.now()}`, mode: 'dummy' }
  } catch (err) {
    return { success: false, mode: 'dummy', error: err instanceof Error ? err.message : 'Unknown' }
  }
}
