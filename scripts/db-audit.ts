#!/usr/bin/env tsx
/**
 * scripts/db-audit.ts
 *
 * Part 16 §16.1 — read-only Neon schema/data/security audit.
 *
 * STRICTLY READ-ONLY. Every statement in this file is a SELECT or EXPLAIN
 * (never EXPLAIN ANALYZE on a mutating statement, never DDL/DML). It is safe
 * to run against production. It is NOT a substitute for the destructive
 * fixtures used by the Playwright functional suite — those must run on a
 * Neon branch (§16.0).
 *
 * The connection string is read from process.env only. It is never accepted
 * as a CLI argument (argv lands in shell history) and is never printed —
 * only the host portion is echoed for confirmation of which DB was hit.
 *
 * Usage:
 *   npx tsx scripts/db-audit.ts             # schema + data + security + FKs
 *   npx tsx scripts/db-audit.ts --explain    # also run EXPLAIN on hot queries
 *   npx tsx scripts/db-audit.ts --json       # machine-readable summary on stdout
 */

import { neon } from '@neondatabase/serverless'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── env loading — .env.local only, never printed ──────────────────────────
function loadDotEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const raw = readFileSync(path, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadDotEnvLocal()

const CONNECTION_STRING = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
const EXPLAIN = process.argv.includes('--explain')
const JSON_OUT = process.argv.includes('--json')

if (!CONNECTION_STRING) {
  console.error(
    'FAIL  env  Neither NEON_DATABASE_URL nor DATABASE_URL is set.\n' +
      '           Put it in .env.local (see .env.example) — never pass it as a CLI arg.',
  )
  process.exit(2)
}

// Guard against the string being handed in as an argument by mistake —
// argv should only ever contain flags for this script.
for (const arg of process.argv.slice(2)) {
  if (/^postgres(ql)?:\/\//.test(arg)) {
    console.error(
      'FAIL  env  A connection string was passed as a CLI argument. Refusing to run —\n' +
        '           this would land the credential in shell history. Use .env.local instead.',
    )
    process.exit(2)
  }
}

let hostLabel = '(unparseable)'
try {
  hostLabel = new URL(CONNECTION_STRING).host
} catch {
  /* ignore */
}
const looksLikeBranch = /-(qa|test|dev|branch)[.-]/i.test(hostLabel) || /qa|test|dev/i.test(hostLabel)

const sql = neon(CONNECTION_STRING)

/** Thin wrapper over sql.query() — every call site in this file is a SELECT/EXPLAIN. */
async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await sql.query(text, params)) as unknown as T[]
}

// ─── result tracking ────────────────────────────────────────────────────────
type Status = 'PASS' | 'FAIL' | 'WARN' | 'INFO'
interface Result {
  section: string
  status: Status
  message: string
}
const results: Result[] = []
function record(section: string, status: Status, message: string) {
  results.push({ section, status, message })
}

const COLOR: Record<Status, string> = {
  PASS: '\x1b[32m',
  FAIL: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
}
const RESET = '\x1b[0m'
function printLive(r: Result) {
  if (JSON_OUT) return
  const c = process.stdout.isTTY ? COLOR[r.status] : ''
  const rc = process.stdout.isTTY ? RESET : ''
  console.log(`${c}${r.status.padEnd(5)}${rc} ${r.section.padEnd(24)} ${r.message}`)
}

// ─── the schema contract, as authored in lib/db/schema.ts ─────────────────
// Existence-only for every table Drizzle declares. Column/type detail is
// checked for the tables central to the D1–D11 defect fixes and the
// candidate/application data path.
const EXPECTED_TABLES = [
  'colleges',
  'courses',
  'jobs',
  'campus_drives',
  'users',
  'candidates',
  'applications',
  'application_notes',
  'talent_pool',
  'audit_log',
  'analytics_events',
  'analytics_daily',
  'funnel_daily',
  'field_analytics_daily',
  'web_vitals',
  'security_events',
  'saved_views',
  'content_blocks',
  'content_block_versions',
  'scheduled_reports',
  'alert_rules',
  'alert_incidents',
  'console_sessions',
]

const EXPECTED_EXTENSIONS = ['uuid-ossp', 'pg_trgm']

// { table: { column: expectedPgType } } — pg_catalog type names as reported
// by information_schema.columns.data_type
const CORE_COLUMN_CONTRACT: Record<string, Record<string, string>> = {
  candidates: {
    id: 'uuid',
    email_normalised: 'text',
    phone_e164: 'text', // D1 — must NEVER be numeric
    full_name: 'text',
    languages: 'ARRAY', // D5
  },
  applications: {
    id: 'uuid',
    public_id: 'text',
    status_token: 'text',
    candidate_id: 'uuid',
    job_id: 'uuid',
    drive_id: 'uuid',
    college_id: 'uuid',
    college_raw: 'text', // D4
    course_id: 'uuid',
    course_raw: 'text', // D3
    academic_status: 'text', // D2
    academic_note: 'text',
    resume_key: 'text', // D6
    resume_mime: 'text', // D6 — server-sniffed
    stage: 'text',
    duplicate_of: 'uuid',
    consent_given_at: 'timestamp with time zone',
    consent_version: 'text',
  },
  colleges: {
    id: 'uuid',
    name: 'text',
    merged_into: 'uuid', // D4
  },
  courses: {
    id: 'uuid',
    name: 'text',
    level: 'text',
  },
  campus_drives: {
    id: 'uuid',
    code: 'text', // D9
    view_count: 'integer', // D11
  },
  application_notes: {
    id: 'uuid',
    application_id: 'uuid',
    author_id: 'uuid',
    body: 'text', // D8 — console-only, never on public form
  },
  users: {
    id: 'uuid',
    email: 'text',
    password_hash: 'text',
    must_change_password: 'boolean',
  },
}

// Named indexes expected per migration 0000/0001 + the D7 partial-index fix
// that the schema.ts comment claims lives "in migration 0001".
const EXPECTED_INDEXES: { table: string; name: string; requiredFor?: string }[] = [
  { table: 'colleges', name: 'colleges_name_trgm' },
  { table: 'colleges', name: 'colleges_name_city_uq' },
  { table: 'courses', name: 'courses_name_trgm' },
  { table: 'jobs', name: 'jobs_status_posted' },
  { table: 'campus_drives', name: 'drives_date' },
  { table: 'applications', name: 'apps_stage_submitted' },
  { table: 'applications', name: 'apps_job' },
  { table: 'applications', name: 'apps_drive' },
  {
    table: 'applications',
    name: 'apps_candidate_job_recent',
    requiredFor:
      'D7 — blocks same candidate+job re-application within 90 days at the DB level',
  },
]

// ─── helpers ────────────────────────────────────────────────────────────────
async function tableExists(name: string): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name],
  )
  return rows.length > 0
}

async function getColumns(table: string): Promise<Record<string, { type: string; nullable: boolean }>> {
  const rows = await q<{ column_name: string; data_type: string; is_nullable: string }>(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  const out: Record<string, { type: string; nullable: boolean }> = {}
  for (const r of rows) {
    out[r.column_name] = { type: r.data_type, nullable: r.is_nullable === 'YES' }
  }
  return out
}

async function indexExists(table: string, name: string): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
    [table, name],
  )
  return rows.length > 0
}

// ─── section 1: environment / connection sanity ────────────────────────────
async function auditEnvironment() {
  record('env', 'INFO', `Connected host: ${hostLabel}`)
  if (!looksLikeBranch) {
    record(
      'env',
      'WARN',
      'Host name does not obviously look like a QA/dev/test Neon branch. ' +
        'This script is read-only and safe either way, but the rest of the ' +
        'suite (Playwright, k6, seed scripts) is destructive — confirm this ' +
        'is a branch, not main, before running qa.sh end-to-end (§16.0).',
    )
  } else {
    record('env', 'PASS', 'Host name suggests a non-production branch.')
  }

  try {
    const rows = await q<{ ssl: string }>(`SELECT current_setting('ssl', true) as ssl`)
    record('security', rows[0]?.ssl === 'on' ? 'PASS' : 'WARN', `Server-reported ssl = ${rows[0]?.ssl ?? 'unknown'}`)
  } catch {
    record(
      'security',
      'INFO',
      'Could not read ssl setting (expected over Neon HTTP driver — TLS is enforced at the endpoint).',
    )
  }
}

// ─── section 2: extensions ──────────────────────────────────────────────────
async function auditExtensions() {
  const rows = await q<{ extname: string }>(`SELECT extname FROM pg_extension`)
  const have = new Set(rows.map((r) => r.extname))
  for (const ext of EXPECTED_EXTENSIONS) {
    record(
      'extensions',
      have.has(ext) ? 'PASS' : 'FAIL',
      have.has(ext) ? `${ext} installed` : `${ext} MISSING — required by schema.ts header comment`,
    )
  }
}

// ─── section 3: table existence ─────────────────────────────────────────────
async function auditTables() {
  for (const t of EXPECTED_TABLES) {
    const exists = await tableExists(t)
    record('tables', exists ? 'PASS' : 'FAIL', exists ? `${t} exists` : `${t} MISSING from database`)
  }
}

// ─── section 4: column contract for core tables ─────────────────────────────
async function auditColumns() {
  for (const [table, contract] of Object.entries(CORE_COLUMN_CONTRACT)) {
    if (!(await tableExists(table))) {
      record('columns', 'FAIL', `${table}: table missing, skipping column checks`)
      continue
    }
    const actual = await getColumns(table)
    for (const [col, expectedType] of Object.entries(contract)) {
      const found = actual[col]
      if (!found) {
        record('columns', 'FAIL', `${table}.${col} MISSING`)
        continue
      }
      if (found.type !== expectedType) {
        record(
          'columns',
          'FAIL',
          `${table}.${col} has type "${found.type}", expected "${expectedType}"` +
            (col === 'phone_e164' ? ' — D1 regression: phone must never be numeric' : ''),
        )
      } else {
        record('columns', 'PASS', `${table}.${col} : ${found.type}`)
      }
    }
  }
}

// ─── section 5: named indexes (incl. the D7 partial index) ────────────────
async function auditIndexes() {
  for (const idx of EXPECTED_INDEXES) {
    if (!(await tableExists(idx.table))) continue
    const exists = await indexExists(idx.table, idx.name)
    record(
      'indexes',
      exists ? 'PASS' : 'FAIL',
      exists
        ? `${idx.table}.${idx.name} present`
        : `${idx.table}.${idx.name} MISSING${idx.requiredFor ? ` — ${idx.requiredFor}` : ''}`,
    )
  }
}

// ─── section 6: check constraints ───────────────────────────────────────────
async function auditCheckConstraints() {
  const rows = await q<{ table_name: string; conname: string; def: string }>(
    `SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE contype = 'c' AND connamespace = 'public'::regnamespace
     ORDER BY table_name, conname`,
  )
  if (rows.length === 0) {
    record('checks', 'WARN', 'No CHECK constraints found in public schema at all.')
    return
  }
  for (const r of rows) {
    record('checks', 'PASS', `${r.table_name}.${r.conname} — ${r.def}`)
  }
}

// ─── section 7: referential integrity — generic, derived from pg_constraint ─
// Walks every FK in the schema and looks for orphaned child rows. This is
// not hardcoded to specific tables so it keeps covering new FKs as the
// schema grows.
async function auditReferentialIntegrity() {
  const fks = await q<{
    conname: string
    child_table: string
    child_col: string
    parent_table: string
    parent_col: string
  }>(
    `SELECT
       con.conname,
       cl.relname  AS child_table,
       att.attname AS child_col,
       fcl.relname AS parent_table,
       fatt.attname AS parent_col
     FROM pg_constraint con
     JOIN pg_class cl ON cl.oid = con.conrelid
     JOIN pg_class fcl ON fcl.oid = con.confrelid
     JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
     JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
     JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum
     JOIN pg_attribute fatt ON fatt.attrelid = con.confrelid AND fatt.attnum = fk.attnum
     WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace`,
  )

  if (fks.length === 0) {
    record('referential-integrity', 'WARN', 'No foreign keys found via pg_constraint — unexpected for this schema.')
    return
  }

  for (const fk of fks) {
    const orphanQuery = `
      SELECT count(*)::int AS n
      FROM "${fk.child_table}" c
      WHERE c."${fk.child_col}" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "${fk.parent_table}" p WHERE p."${fk.parent_col}" = c."${fk.child_col}"
        )`
    try {
      const rows = await q<{ n: number }>(orphanQuery)
      const n = rows[0]?.n ?? 0
      record(
        'referential-integrity',
        n === 0 ? 'PASS' : 'FAIL',
        n === 0
          ? `${fk.child_table}.${fk.child_col} → ${fk.parent_table}.${fk.parent_col} — no orphans`
          : `${fk.child_table}.${fk.child_col} → ${fk.parent_table}.${fk.parent_col} — ${n} ORPHANED ROW(S)`,
      )
    } catch (e) {
      record('referential-integrity', 'WARN', `${fk.conname}: could not evaluate (${(e as Error).message})`)
    }
  }
}

// ─── section 8: D1/D4/D7 defect guards (data-level) ────────────────────────
async function auditDefectGuards() {
  // D1 — phone_e164 must be E.164 text for every row, never a bare number.
  if (await tableExists('candidates')) {
    const bad = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM candidates WHERE phone_e164 !~ '^\\+[1-9][0-9]{6,14}$'`,
    )
    const n = bad[0]?.n ?? 0
    record(
      'D1-phone',
      n === 0 ? 'PASS' : 'FAIL',
      n === 0 ? 'All candidate phone numbers are valid E.164.' : `${n} candidate phone number(s) fail E.164 format.`,
    )
  }

  // D4 — college merge chains must be single-hop (no A→B→C).
  if (await tableExists('colleges')) {
    const chained = await q<{ n: number }>(
      `SELECT count(*)::int AS n
       FROM colleges a
       JOIN colleges b ON a.merged_into = b.id
       WHERE b.merged_into IS NOT NULL`,
    )
    const n = chained[0]?.n ?? 0
    record(
      'D4-college-merge',
      n === 0 ? 'PASS' : 'FAIL',
      n === 0
        ? 'No multi-hop college merge chains.'
        : `${n} college(s) merged into an already-merged college — chain is not resolved to a single canonical row.`,
    )

    if (await tableExists('applications')) {
      const emptyRaw = await q<{ n: number }>(`SELECT count(*)::int AS n FROM applications WHERE btrim(college_raw) = ''`)
      const n2 = emptyRaw[0]?.n ?? 0
      record(
        'D4-college-raw',
        n2 === 0 ? 'PASS' : 'FAIL',
        n2 === 0 ? 'college_raw is never blank.' : `${n2} application(s) have a blank college_raw — the original candidate-typed value has been lost.`,
      )
    }
  }

  // D7 — one person, many applications: uniqueness on email+phone, and no
  // un-flagged duplicate candidate+job submissions inside the 90-day window.
  if (await tableExists('candidates')) {
    const dupEmail = await q<{ email_normalised: string; n: number }>(
      `SELECT email_normalised, count(*)::int AS n FROM candidates GROUP BY email_normalised HAVING count(*) > 1 LIMIT 5`,
    )
    record(
      'D7-candidate-uniqueness',
      dupEmail.length === 0 ? 'PASS' : 'FAIL',
      dupEmail.length === 0
        ? 'No duplicate candidates by email_normalised.'
        : `${dupEmail.length} duplicate email_normalised value(s), e.g. ${dupEmail[0]?.email_normalised} ×${dupEmail[0]?.n}.`,
    )

    const dupPhone = await q<{ phone_e164: string; n: number }>(
      `SELECT phone_e164, count(*)::int AS n FROM candidates GROUP BY phone_e164 HAVING count(*) > 1 LIMIT 5`,
    )
    record(
      'D7-candidate-uniqueness',
      dupPhone.length === 0 ? 'PASS' : 'FAIL',
      dupPhone.length === 0 ? 'No duplicate candidates by phone_e164.' : `${dupPhone.length} duplicate phone_e164 value(s).`,
    )
  }

  if (await tableExists('applications')) {
    const dupApps = await q<{ candidate_id: string; job_id: string; n: number }>(
      `SELECT candidate_id, job_id, count(*)::int AS n
       FROM applications
       WHERE stage NOT IN ('withdrawn','duplicate')
         AND submitted_at > now() - interval '90 days'
       GROUP BY candidate_id, job_id
       HAVING count(*) > 1
       LIMIT 5`,
    )
    record(
      'D7-application-dedupe',
      dupApps.length === 0 ? 'PASS' : 'FAIL',
      dupApps.length === 0
        ? 'No un-flagged duplicate applications (same candidate+job within 90 days).'
        : `${dupApps.length} candidate+job pair(s) have unblocked duplicate applications inside the 90-day window.`,
    )
  }

  // Consent — every application must carry consent metadata (defensive
  // check even though the columns are NOT NULL; catches bad direct writes).
  if (await tableExists('applications')) {
    const missingConsent = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM applications WHERE consent_given_at IS NULL OR consent_version IS NULL OR btrim(consent_version) = ''`,
    )
    const n = missingConsent[0]?.n ?? 0
    record(
      'consent',
      n === 0 ? 'PASS' : 'FAIL',
      n === 0 ? 'Every application carries consent_given_at + consent_version.' : `${n} application(s) missing consent metadata — DPDP exposure.`,
    )
  }
}

// ─── section 9: security posture ────────────────────────────────────────────
async function auditSecurity() {
  if (await tableExists('users')) {
    const weakHash = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM users WHERE password_hash IS NULL OR password_hash NOT LIKE '$argon2%'`,
    )
    const n = weakHash[0]?.n ?? 0
    record(
      'security',
      n === 0 ? 'PASS' : 'FAIL',
      n === 0 ? 'All user password hashes are argon2.' : `${n} user(s) have a password_hash that is not argon2-formatted.`,
    )

    const seededDefault = await q<{ n: number }>(`SELECT count(*)::int AS n FROM users WHERE must_change_password = true`)
    const nd = seededDefault[0]?.n ?? 0
    record(
      'security',
      nd === 0 ? 'PASS' : 'WARN',
      nd === 0
        ? 'No accounts pending forced password change.'
        : `${nd} account(s) have must_change_password = true — fine pre-launch, must be 0 in production before go-live (§16.8).`,
    )
  }

  if (await tableExists('security_events')) {
    const emailLeak = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM security_events WHERE email_attempted IS NOT NULL AND email_attempted LIKE '%@%'`,
    )
    // Not a failure by itself — email_attempted is documented as intentional
    // for login-failure forensics — but flag volume so it doesn't silently
    // become a PII stockpile.
    record(
      'security',
      'INFO',
      `security_events has ${emailLeak[0]?.n ?? 0} row(s) with a raw attempted email captured (login-failure forensics — confirm retention policy).`,
    )
  }
}

// ─── section 10: connection pressure ────────────────────────────────────────
async function auditConnectionPressure() {
  try {
    const rows = await q<{ active: number; max_conn: number }>(
      `SELECT count(*)::int AS active, current_setting('max_connections')::int AS max_conn FROM pg_stat_activity`,
    )
    const active = rows[0]?.active ?? 0
    const maxConn = rows[0]?.max_conn ?? 0
    if (maxConn === 0) {
      record('connections', 'WARN', 'Could not read max_connections.')
      return
    }
    const pct = (active / maxConn) * 100
    record(
      'connections',
      pct < 80 ? 'PASS' : 'FAIL',
      `${active}/${maxConn} active connections (${pct.toFixed(1)}%)${pct >= 80 ? ' — over the 80% budget from §16.5.2' : ''}`,
    )
  } catch (e) {
    record('connections', 'WARN', `Could not read pg_stat_activity: ${(e as Error).message}`)
  }
}

// ─── section 11: query plans (opt-in, --explain) ────────────────────────────
async function auditQueryPlans() {
  if (!EXPLAIN) {
    record('explain', 'INFO', 'Skipped — pass --explain to run EXPLAIN ANALYZE on hot-path queries.')
    return
  }
  const queries: { label: string; sql: string; guard: string }[] = [
    {
      label: 'jobs list (status+postedAt)',
      guard: 'jobs',
      sql: `EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM jobs WHERE status = 'open' ORDER BY posted_at DESC LIMIT 25`,
    },
    {
      label: 'applications by stage (console queue)',
      guard: 'applications',
      sql: `EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM applications WHERE stage = 'received' ORDER BY submitted_at DESC LIMIT 25`,
    },
    {
      label: 'candidate lookup by phone (dedupe path)',
      guard: 'candidates',
      sql: `EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM candidates WHERE phone_e164 = '+919876543210'`,
    },
  ]
  type PlanNode = Record<string, unknown>
  for (const query of queries) {
    if (!(await tableExists(query.guard))) continue
    try {
      const rows = await q<{ 'QUERY PLAN': Array<{ Plan?: PlanNode }> }>(query.sql)
      const plan = rows[0]?.['QUERY PLAN']?.[0]?.Plan
      const planText = JSON.stringify(plan)
      const hasSeqScan = planText.includes('"Node Type":"Seq Scan"')
      const nodeType = (plan?.['Node Type'] as string | undefined) ?? '?'
      const totalCost = (plan?.['Total Cost'] as number | undefined) ?? '?'
      const actualMs = plan?.['Actual Total Time']
      const actualLabel = typeof actualMs === 'number' ? actualMs.toFixed(2) : '?'
      record(
        'explain',
        hasSeqScan ? 'WARN' : 'PASS',
        `${query.label}: ${nodeType}, cost=${totalCost}, actual=${actualLabel}ms` +
          (hasSeqScan ? ' — sequential scan present (fine on a near-empty branch, watch on production volume)' : ''),
      )
    } catch (e) {
      record('explain', 'WARN', `${query.label}: could not EXPLAIN (${(e as Error).message})`)
    }
  }
}

// ─── run ─────────────────────────────────────────────────────────────────
async function main() {
  if (!JSON_OUT) {
    console.log('Akshara Careers — DB audit (read-only)')
    console.log('=======================================\n')
  }

  const sections: [string, () => Promise<void>][] = [
    ['environment', auditEnvironment],
    ['extensions', auditExtensions],
    ['tables', auditTables],
    ['columns', auditColumns],
    ['indexes', auditIndexes],
    ['check constraints', auditCheckConstraints],
    ['referential integrity', auditReferentialIntegrity],
    ['defect guards (D1/D4/D7)', auditDefectGuards],
    ['security posture', auditSecurity],
    ['connection pressure', auditConnectionPressure],
    ['query plans', auditQueryPlans],
  ]

  for (const [label, fn] of sections) {
    const before = results.length
    try {
      await fn()
    } catch (e) {
      record(label, 'FAIL', `Section threw: ${(e as Error).message}`)
    }
    if (!JSON_OUT) {
      for (const r of results.slice(before)) printLive(r)
    }
  }

  const fails = results.filter((r) => r.status === 'FAIL')
  const warns = results.filter((r) => r.status === 'WARN')

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          host: hostLabel,
          pass: results.filter((r) => r.status === 'PASS').length,
          fail: fails.length,
          warn: warns.length,
          results,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('\n=======================================')
    console.log(
      `${results.filter((r) => r.status === 'PASS').length} PASS · ${warns.length} WARN · ${fails.length} FAIL`,
    )
    if (fails.length > 0) {
      console.log('\nFAILures:')
      for (const f of fails) console.log(`  - [${f.section}] ${f.message}`)
    }
  }

  process.exit(fails.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('db-audit crashed:', e)
  process.exit(2)
})
