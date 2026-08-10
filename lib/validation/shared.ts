/**
 * lib/validation/shared.ts
 *
 * Shared validation utilities used on BOTH client and server.
 * A field's validation rules exist in exactly one file (§3.1 — Zod).
 *
 * D1: normalisePhone — fixes phone number storage chaos from source data
 * D2: academicStatusEnum — structured enum replaces free text
 */

import { z } from 'zod'

// ── Phone normalisation (D1) ─────────────────────────────────────────────────
/**
 * Normalises an Indian mobile number to E.164 format: +91XXXXXXXXXX
 *
 * Accepts:
 *   - '9876543210'          → '+919876543210'
 *   - '09876543210'         → '+919876543210'  (source data has this — D1)
 *   - '+91 98765 43210'     → '+919876543210'
 *   - '+919876543210'       → '+919876543210'  (already normalised)
 *   - '8618470407'          → '+918618470407'  (source data — D1)
 *
 * Rejects:
 *   - Numbers not starting with 6–9 after the country code
 *   - Numbers not exactly 10 digits
 */
export function normalisePhone(raw: string): string | null {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '')

  // Remove leading country codes
  let local: string
  if (digits.startsWith('91') && digits.length === 12) {
    local = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 11) {
    local = digits.slice(1)
  } else if (digits.length === 10) {
    local = digits
  } else {
    return null
  }

  // Must be 10 digits starting with 6–9
  if (!/^[6-9]\d{9}$/.test(local)) return null

  return `+91${local}`
}

/**
 * Zod schema for an Indian mobile number.
 * Transforms input to E.164 on parse — the canonical form is always +91XXXXXXXXXX.
 * Server validation also runs the Zod regex (L5).
 */
export const phoneSchema = z
  .string()
  .min(1, 'Enter your mobile number')
  .transform((val, ctx) => {
    const normalised = normalisePhone(val)
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Enter a 10-digit mobile number starting with 6, 7, 8, or 9.',
      })
      return z.NEVER
    }
    return normalised
  })
  .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian mobile number'))

// ── Email normalisation ──────────────────────────────────────────────────────
/**
 * Normalises email:
 * - Lowercase
 * - For Gmail: strips dots from local part, strips +alias suffix
 *   (e.g. First.Last+tag@gmail.com → firstlast@gmail.com)
 *
 * Used for deduplication (D7) — NOT for display.
 */
export function normaliseEmail(raw: string): string {
  const lower = raw.toLowerCase().trim()
  const [local, domain] = lower.split('@')
  if (!local || !domain) return lower

  // Gmail dot/plus stripping
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const withoutPlus = local.split('+')[0] ?? local
    const withoutDots = withoutPlus.replace(/\./g, '')
    return `${withoutDots}@${domain}`
  }

  return lower
}

export const emailSchema = z
  .string()
  .min(1, 'Enter your email address')
  .email('Enter a valid email address')
  .transform((val) => val.toLowerCase().trim())

// ── Academic status enum (D2) ────────────────────────────────────────────────
export const ACADEMIC_STATUSES = [
  'sem_1',
  'sem_2',
  'sem_3',
  'sem_4',
  'sem_5',
  'sem_6',
  'sem_7',
  'sem_8',
  'final_year_results_awaited',
  'graduated',
] as const

export type AcademicStatus = (typeof ACADEMIC_STATUSES)[number]

export const academicStatusLabels: Record<AcademicStatus, string> = {
  sem_1: 'Semester 1',
  sem_2: 'Semester 2',
  sem_3: 'Semester 3',
  sem_4: 'Semester 4',
  sem_5: 'Semester 5',
  sem_6: 'Semester 6',
  sem_7: 'Semester 7',
  sem_8: 'Semester 8',
  final_year_results_awaited: 'Final year — results awaited',
  graduated: 'Graduated',
}

export const academicStatusSchema = z.enum(ACADEMIC_STATUSES, {
  message: 'Select your current academic status',
})

// ── Languages (D5) ───────────────────────────────────────────────────────────
export const LANGUAGES = [
  'Kannada',
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Malayalam',
  'Marathi',
  'Urdu',
  'Bengali',
  'Odia',
] as const

export type Language = (typeof LANGUAGES)[number]

export const languagesSchema = z
  .array(z.string())
  .min(1, 'Select at least one language')

// ── Indian states ────────────────────────────────────────────────────────────
export const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const

export type IndiaState = (typeof INDIA_STATES)[number]

// ── Name validation ───────────────────────────────────────────────────────────
// §0.4: 2–80 chars, letters/spaces/./'/-  only
// Also blocks URLs and < (L5 content validation)
export const nameSchema = z
  .string()
  .min(2, 'Enter your full name (minimum 2 characters)')
  .max(80, 'Name must be 80 characters or fewer')
  .regex(
    /^[a-zA-Z\s.\-']+$/,
    'Name may only contain letters, spaces, hyphens, apostrophes, and periods',
  )
  .regex(/^(?!.*https?:\/\/).*$/, 'Name contains invalid characters')
  .transform((val) => val.trim())

// ── Disposable email domain blocklist (L5) ────────────────────────────────────
// Minimal bootstrap list — grows over time. Do not check this on the client.
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'guerrillamail.info',
  'spam4.me',
  'trashmail.com',
  'dispostable.com',
  'yopmail.com',
  'trashmail.at',
  'trashmail.io',
  'maildrop.cc',
  'discard.email',
  'spamgourmet.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_EMAIL_DOMAINS.has(domain)
}
