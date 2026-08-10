/**
 * lib/db/schema.ts
 *
 * Drizzle schema — the authoritative DDL contract from Part 5.
 *
 * Rules (§3.2):
 * - Additive-only from migration 0002 onward. Never DROP or rename in place.
 * - pg_trgm extension required (migration 0001).
 * - uuid-ossp extension required (migration 0001).
 *
 * Defects fixed:
 *   D1  → candidates.phone_e164 (text, never numeric)
 *   D2  → applications.academic_status (enum), applications.academic_note
 *   D3  → courses table + applications.course_raw
 *   D4  → colleges table + applications.college_raw + merged_into
 *   D5  → candidates.languages (text[])
 *   D6  → applications.resume_key, resume_mime (server-sniffed)
 *   D7  → candidates unique on email+phone; apps_candidate_job_recent partial index
 *   D8  → application_notes (console-only, never on public form)
 *   D9  → campus_drives table
 *   D10 → jobs table
 *   D11 → campus_drives.view_count
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  bigserial,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ──────────────────────────────────────────────────────────────────────────────
// colleges — fixes D4
// ──────────────────────────────────────────────────────────────────────────────
export const colleges = pgTable(
  'colleges',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    name: text('name').notNull(),
    city: text('city'),
    state: text('state').notNull().default('Karnataka'),
    aliases: text('aliases').array().notNull().default(sql`'{}'::text[]`),
    isVerified: boolean('is_verified').notNull().default(false),
    // Set when deduped — self-reference (D4 merge tool)
    mergedInto: uuid('merged_into'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // Trigram GIN index for fuzzy search (pg_trgm required — migration 0001)
    index('colleges_name_trgm').using('gin', sql`${t.name} gin_trgm_ops`),
    // Prevent true duplicates (case-insensitive, trimmed)
    uniqueIndex('colleges_name_city_uq').on(
      sql`lower(btrim(${t.name}))`,
      sql`lower(coalesce(${t.city}, ''))`,
    ),
  ],
)

// ──────────────────────────────────────────────────────────────────────────────
// courses — fixes D3
// ──────────────────────────────────────────────────────────────────────────────
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    name: text('name').notNull(), // 'MBA', 'B.Com', 'BBA'
    specialisation: text('specialisation'), // 'Aviation Management'
    level: text('level')
      .notNull()
      .$type<'undergraduate' | 'postgraduate' | 'diploma' | 'other'>(),
    aliases: text('aliases').array().notNull().default(sql`'{}'::text[]`),
    isVerified: boolean('is_verified').notNull().default(false),
  },
  (t) => [
    index('courses_name_trgm').using('gin', sql`${t.name} gin_trgm_ops`),
    check(
      'courses_level_check',
      sql`${t.level} IN ('undergraduate','postgraduate','diploma','other')`,
    ),
  ],
)

// ──────────────────────────────────────────────────────────────────────────────
// jobs — fixes D10
// ──────────────────────────────────────────────────────────────────────────────
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    slug: text('slug').unique().notNull(),
    title: text('title').notNull(),
    family: text('family').notNull(), // 'Sales', 'Operations'
    summary: text('summary').notNull(),
    descriptionHtml: text('description_html').notNull(),
    responsibilities: text('responsibilities')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    requirements: text('requirements')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    niceToHave: text('nice_to_have')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    benefits: text('benefits').array().notNull().default(sql`'{}'::text[]`),
    employmentType: text('employment_type')
      .notNull()
      .$type<'FULL_TIME' | 'PART_TIME' | 'INTERN' | 'CONTRACTOR'>(),
    workMode: text('work_mode')
      .notNull()
      .$type<'onsite' | 'hybrid' | 'remote' | 'field'>(),
    locationCity: text('location_city').notNull(),
    locationState: text('location_state').notNull(),
    experienceMinYears: numeric('experience_min_years', {
      precision: 3,
      scale: 1,
    })
      .notNull()
      .default('0'),
    experienceMaxYears: numeric('experience_max_years', {
      precision: 3,
      scale: 1,
    }),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency').notNull().default('INR'),
    salaryUnit: text('salary_unit').notNull().default('YEAR'),
    salaryIsPublic: boolean('salary_is_public').notNull().default(false),
    requiresTwoWheeler: boolean('requires_two_wheeler').notNull().default(false),
    requiresDrivingLicence: boolean('requires_driving_licence')
      .notNull()
      .default(false),
    openings: integer('openings').notNull().default(1),
    status: text('status')
      .notNull()
      .default('draft')
      .$type<'draft' | 'open' | 'paused' | 'closed'>(),
    // Both required before status='open'
    postedAt: timestamp('posted_at', { withTimezone: true }),
    validThrough: timestamp('valid_through', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('jobs_status_posted').on(t.status, t.postedAt),
    check(
      'jobs_employment_type_check',
      sql`${t.employmentType} IN ('FULL_TIME','PART_TIME','INTERN','CONTRACTOR')`,
    ),
    check(
      'jobs_work_mode_check',
      sql`${t.workMode} IN ('onsite','hybrid','remote','field')`,
    ),
    check(
      'jobs_status_check',
      sql`${t.status} IN ('draft','open','paused','closed')`,
    ),
  ],
)

// ──────────────────────────────────────────────────────────────────────────────
// campus_drives — fixes D9, D11
// ──────────────────────────────────────────────────────────────────────────────
export const campusDrives = pgTable(
  'campus_drives',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    // Human-readable code shown on QR: 'GFGC-YLK-0726'
    code: text('code').unique().notNull(),
    collegeId: uuid('college_id')
      .notNull()
      .references(() => colleges.id),
    driveDate: date('drive_date').notNull(),
    venue: text('venue'),
    jobIds: uuid('job_ids').array().notNull().default(sql`'{}'::uuid[]`),
    seats: integer('seats'),
    recruiterIds: uuid('recruiter_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    status: text('status')
      .notNull()
      .default('upcoming')
      .$type<'upcoming' | 'live' | 'closed' | 'cancelled'>(),
    // Incremented on /d/[code] redirect — used for conversion metric (D11)
    viewCount: integer('view_count').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('drives_date').on(t.driveDate),
    check(
      'drives_status_check',
      sql`${t.status} IN ('upcoming','live','closed','cancelled')`,
    ),
  ],
)

// ──────────────────────────────────────────────────────────────────────────────
// users — console auth
// Note: defined BEFORE application_notes (which references it)
// ──────────────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  role: text('role')
    .notNull()
    .$type<'recruiter' | 'admin' | 'super_admin'>(),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  assignedDriveIds: text('assigned_drive_ids').array().notNull().default(sql`'{}'::text[]`),
  prefs: jsonb('prefs').notNull().default(sql`'{}'::jsonb`),
})

// ──────────────────────────────────────────────────────────────────────────────
// candidates — fixes D7 (one person, many applications)
// ──────────────────────────────────────────────────────────────────────────────
export const candidates = pgTable('candidates', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  // Lowercased + gmail dots/plus stripped — deduplication key
  emailNormalised: text('email_normalised').unique().notNull(),
  // E.164 format '+919876543210' — TEXT, NEVER numeric (D1)
  phoneE164: text('phone_e164').unique().notNull(),
  fullName: text('full_name').notNull(),
  gender: text('gender').$type<
    'female' | 'male' | 'prefer_not_to_say' | 'other'
  >(),
  homeCity: text('home_city'),
  homeState: text('home_state'),
  // Multi-select chips stored as text[] (D5)
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  whatsappOptIn: boolean('whatsapp_opt_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

// ──────────────────────────────────────────────────────────────────────────────
// applications — one per candidate-job pair (per 90-day window)
// ──────────────────────────────────────────────────────────────────────────────
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    // 'AKS-2608-4F7K' — shown to candidate on success page
    publicId: text('public_id').unique().notNull(),
    // 32-char opaque token for /status/[token] — no enumeration
    statusToken: text('status_token').unique().notNull(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id),
    driveId: uuid('drive_id').references(() => campusDrives.id),

    // College — canonical FK + raw string (D4)
    collegeId: uuid('college_id').references(() => colleges.id),
    collegeRaw: text('college_raw').notNull(),

    // Course — canonical FK + raw string (D3)
    courseId: uuid('course_id').references(() => courses.id),
    courseRaw: text('course_raw').notNull(),

    // Academic status — structured enum (D2)
    academicStatus: text('academic_status')
      .notNull()
      .$type<
        | 'sem_1'
        | 'sem_2'
        | 'sem_3'
        | 'sem_4'
        | 'sem_5'
        | 'sem_6'
        | 'sem_7'
        | 'sem_8'
        | 'final_year_results_awaited'
        | 'graduated'
      >(),
    // Free-text nuance preserved (D2) — 240 char limit enforced in Zod
    academicNote: text('academic_note'),

    // Experience
    experienceType: text('experience_type')
      .notNull()
      .$type<'fresher' | 'experienced'>(),
    experienceNote: text('experience_note'),

    // Readiness fields (§0.4 Step 3)
    hasDrivingLicence: boolean('has_driving_licence').notNull(),
    hasTwoWheeler: text('has_two_wheeler')
      .notNull()
      .$type<'yes' | 'no' | 'can_arrange'>(),

    // Resume — R2 object, server-sniffed MIME (D6)
    resumeKey: text('resume_key').notNull(),
    resumeFilename: text('resume_filename').notNull(),
    resumeSizeBytes: integer('resume_size_bytes').notNull(),
    // Server-sniffed, not client-declared (D6, §4.3, L6)
    resumeMime: text('resume_mime').notNull(),

    // Source tracking (D9)
    source: text('source')
      .notNull()
      .default('organic')
      .$type<
        'organic' | 'campus_drive' | 'referral' | 'job_board' | 'social'
      >(),
    utm: jsonb('utm').notNull().default(sql`'{}'::jsonb`),
    referrer: text('referrer'),

    // Recruiter pipeline stage
    stage: text('stage')
      .notNull()
      .default('received')
      .$type<
        | 'received'
        | 'under_review'
        | 'shortlisted'
        | 'interview_scheduled'
        | 'interviewed'
        | 'offered'
        | 'hired'
        | 'rejected'
        | 'withdrawn'
        | 'duplicate'
      >(),
    // Set when D7 dedupe fires — points to the canonical application
    duplicateOf: uuid('duplicate_of'),

    // Consent — versioned, required (L8 / DPDP)
    consentGivenAt: timestamp('consent_given_at', {
      withTimezone: true,
    }).notNull(),
    consentVersion: text('consent_version').notNull(),

    // Bot protection metadata
    idempotencyKey: text('idempotency_key').unique().notNull(),
    ipHash: text('ip_hash'),
    uaHash: text('ua_hash'),
    botScore: numeric('bot_score', { precision: 3, scale: 2 }),
    timeOnFormMs: integer('time_on_form_ms'),

    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('apps_stage_submitted').on(t.stage, t.submittedAt),
    index('apps_job').on(t.jobId, t.submittedAt),
    index('apps_drive').on(t.driveId),
    // D7 guard: blocks more than one ACTIVE (non-withdrawn, non-duplicate)
    // application per candidate+job pair — see migration 0002 for the actual
    // CREATE UNIQUE INDEX (Drizzle doesn't support WHERE clauses on indexes
    // natively, so it's hand-written SQL, not declared here).
    //
    // NOTE: this is NOT the 90-day rolling window the original design
    // intended — Postgres index predicates must be IMMUTABLE and can't call
    // now()/interval arithmetic, so "expires after 90 days" can't live in an
    // index. This enforces "never more than one active application" instead,
    // which is a superset of the 90-day protection. A true rolling window
    // needs a BEFORE INSERT trigger or application-layer enforcement.
    check(
      'apps_academic_status_check',
      sql`${t.academicStatus} IN ('sem_1','sem_2','sem_3','sem_4','sem_5','sem_6','sem_7','sem_8','final_year_results_awaited','graduated')`,
    ),
    check(
      'apps_experience_type_check',
      sql`${t.experienceType} IN ('fresher','experienced')`,
    ),
    check(
      'apps_two_wheeler_check',
      sql`${t.hasTwoWheeler} IN ('yes','no','can_arrange')`,
    ),
    check(
      'apps_source_check',
      sql`${t.source} IN ('organic','campus_drive','referral','job_board','social')`,
    ),
    check(
      'apps_stage_check',
      sql`${t.stage} IN ('received','under_review','shortlisted','interview_scheduled','interviewed','offered','hired','rejected','withdrawn','duplicate')`,
    ),
  ],
)

// ──────────────────────────────────────────────────────────────────────────────
// application_notes — fixes D8 (recruiter notes, console-only)
// NEVER appears on the public form. This is a security boundary.
// ──────────────────────────────────────────────────────────────────────────────
export const applicationNotes = pgTable('application_notes', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

// ──────────────────────────────────────────────────────────────────────────────
// talent_pool — HubSpot mechanic (§4.1 section 7)
// Separate table, separate endpoint, same bot protection
// ──────────────────────────────────────────────────────────────────────────────
export const talentPool = pgTable('talent_pool', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  emailNormalised: text('email_normalised').unique().notNull(),
  fullName: text('full_name').notNull(),
  interestFamily: text('interest_family').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

// ──────────────────────────────────────────────────────────────────────────────
// audit_log — every stage change, note, export, delete (§4.6)
// ──────────────────────────────────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

// ──────────────────────────────────────────────────────────────────────────────
// PART 14 — ANALYTICS, SECURITY & CONSOLE OPERATIONS
// ──────────────────────────────────────────────────────────────────────────────

// Raw first-party cookieless analytics events
export const analyticsEvents = pgTable('analytics_events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: text('name').notNull(),
  sessionId: text('session_id').notNull(),
  path: text('path'),
  props: jsonb('props').notNull().default(sql`'{}'::jsonb`),
  jobId: uuid('job_id').references(() => jobs.id),
  driveId: uuid('drive_id').references(() => campusDrives.id),
  deviceType: text('device_type'),
  os: text('os'),
  browser: text('browser'),
  viewportBucket: text('viewport_bucket'),
  connectionType: text('connection_type'), // 'slow-2g','2g','3g','4g','unknown'
  country: text('country'),
  region: text('region'),
  city: text('city'),
  referrer: text('referrer'),
  utm: jsonb('utm').notNull().default(sql`'{}'::jsonb`),
  ipHash: text('ip_hash'),
  uaHash: text('ua_hash'),
  ts: timestamp('ts', { withTimezone: true }).notNull().default(sql`now()`),
})

// Daily dimension rollups
export const analyticsDaily = pgTable('analytics_daily', {
  day: date('day').notNull(),
  dimension: text('dimension').notNull(), // 'total','job','drive','college','source','device','connection'
  dimensionId: text('dimension_id').notNull(),
  visitors: integer('visitors').notNull().default(0),
  sessions: integer('sessions').notNull().default(0),
  pageViews: integer('page_views').notNull().default(0),
  jobViews: integer('job_views').notNull().default(0),
  applyClicks: integer('apply_clicks').notNull().default(0),
  applyStarts: integer('apply_starts').notNull().default(0),
  submissions: integer('submissions').notNull().default(0),
  medianCompleteMs: integer('median_complete_ms'),
})

// Daily funnel step rollups
export const funnelDaily = pgTable('funnel_daily', {
  day: date('day').notNull(),
  step: text('step').notNull(), // 'step_1_start','step_1_done','step_2_done','step_3_done','submitted'
  segment: text('segment').notNull().default('all'),
  segmentValue: text('segment_value').notNull().default('all'),
  entered: integer('entered').notNull().default(0),
  completed: integer('completed').notNull().default(0),
  medianMs: integer('median_ms'),
})

// Daily field drop-off analytics
export const fieldAnalyticsDaily = pgTable('field_analytics_daily', {
  day: date('day').notNull(),
  field: text('field').notNull(),
  focused: integer('focused').notNull().default(0),
  completed: integer('completed').notNull().default(0),
  abandoned: integer('abandoned').notNull().default(0),
  errored: integer('errored').notNull().default(0),
  medianFocusMs: integer('median_focus_ms'),
  topErrorCode: text('top_error_code'),
})

// Real-user Web Vitals (RUM)
export const webVitals = pgTable('web_vitals', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  metric: text('metric').notNull(), // 'LCP','INP','CLS','TTFB','FCP'
  value: numeric('value').notNull(),
  path: text('path').notNull(),
  deviceType: text('device_type'),
  connectionType: text('connection_type'),
  ts: timestamp('ts', { withTimezone: true }).notNull().default(sql`now()`),
})

// Security observability & bot detection events
export const securityEvents = pgTable('security_events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  layer: text('layer').notNull(), // 'L1_honeypot','L2_timing','L3_turnstile','L3_replay','L4_ratelimit','L5_content','L6_file','L7_headers','login'
  outcome: text('outcome').notNull(), // 'blocked','flagged','allowed_failopen'
  reason: text('reason'),
  path: text('path'),
  ipHash: text('ip_hash'),
  uaHash: text('ua_hash'),
  emailAttempted: text('email_attempted'),
  meta: jsonb('meta').notNull().default(sql`'{}'::jsonb`),
  ts: timestamp('ts', { withTimezone: true }).notNull().default(sql`now()`),
})

// Saved filter views
export const savedViews = pgTable('saved_views', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  screen: text('screen').notNull(),
  name: text('name').notNull(),
  query: jsonb('query').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
})

// CMS Content blocks
export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  slug: text('slug').unique().notNull(),
  body: jsonb('body').notNull(),
  version: integer('version').notNull().default(1),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
})

export const contentBlockVersions = pgTable('content_block_versions', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  blockId: uuid('block_id').notNull().references(() => contentBlocks.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  body: jsonb('body').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
})

// Scheduled Reports
export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name: text('name').notNull(),
  cadence: text('cadence').notNull(), // 'daily' | 'weekly' | 'monthly'
  recipients: text('recipients').array().notNull(),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastRunStatus: text('last_run_status'),
  lastRunError: text('last_run_error'),
  createdBy: uuid('created_by').references(() => users.id),
})

// Alert Rules & Incidents
export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  key: text('key').unique().notNull(),
  threshold: numeric('threshold').notNull(),
  windowMinutes: integer('window_minutes').notNull(),
  severity: text('severity').notNull(), // 'P1' | 'P2' | 'P3'
  channels: text('channels').array().notNull().default(sql`'{email}'::text[]`),
  isActive: boolean('is_active').notNull().default(true),
})

export const alertIncidents = pgTable('alert_incidents', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  ruleId: uuid('rule_id').notNull().references(() => alertRules.id),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().default(sql`now()`),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  peakValue: numeric('peak_value'),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
})

// Active Console Sessions
export const consoleSessions = pgTable('console_sessions', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipHash: text('ip_hash'),
  uaHash: text('ua_hash'),
  deviceLabel: text('device_label'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().default(sql`now()`),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
})

// ──────────────────────────────────────────────────────────────────────────────
// Inferred types — use these for typed query results throughout the app
// ──────────────────────────────────────────────────────────────────────────────
export type College = typeof colleges.$inferSelect
export type NewCollege = typeof colleges.$inferInsert
export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type CampusDrive = typeof campusDrives.$inferSelect
export type NewCampusDrive = typeof campusDrives.$inferInsert
export type Candidate = typeof candidates.$inferSelect
export type NewCandidate = typeof candidates.$inferInsert
export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type ApplicationNote = typeof applicationNotes.$inferSelect
export type NewApplicationNote = typeof applicationNotes.$inferInsert
export type User = typeof users.$inferSelect
export type TalentPoolEntry = typeof talentPool.$inferSelect
export type AuditLogEntry = typeof auditLog.$inferSelect
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type SecurityEvent = typeof securityEvents.$inferSelect
export type SavedView = typeof savedViews.$inferSelect
export type ContentBlock = typeof contentBlocks.$inferSelect
export type ScheduledReport = typeof scheduledReports.$inferSelect
export type AlertRule = typeof alertRules.$inferSelect
export type AlertIncident = typeof alertIncidents.$inferSelect
export type ConsoleSession = typeof consoleSessions.$inferSelect

