-- Migration 0002 — D7 defect guard: block active duplicate applications
-- (same candidate + same job) at the database level.
--
-- ROOT CAUSE NOTE (found via scripts/db-audit.ts, Part 16):
-- schema.ts's header comment claimed a partial index named
-- apps_candidate_job_recent already existed "in migration 0001" enforcing
-- "same candidate+job blocked within 90 days, unless withdrawn". It did not
-- exist in either 0000 or 0001 — confirmed by reading both files directly.
--
-- The literal 90-day-rolling-window design is NOT expressible as a Postgres
-- partial index: index predicates must be IMMUTABLE, and `now()` /
-- `interval` arithmetic is STABLE/VOLATILE, not IMMUTABLE. Postgres rejects
-- `CREATE INDEX ... WHERE submitted_at > now() - interval '90 days'` outright
-- (error: functions in index predicate must be marked IMMUTABLE), and even if
-- it didn't, an index can't "expire" a row out of its own predicate without
-- a write touching that row.
--
-- What IS implementable here: a permanent (not time-windowed) partial unique
-- index blocking more than one *active* (non-withdrawn, non-duplicate)
-- application per candidate+job pair. This is strictly stronger than the
-- envisioned 90-day window in the common case (blocks resubmission forever,
-- not just for 90 days) and requires the application layer to explicitly
-- move an old row to 'withdrawn' or 'duplicate' before a genuine, intentional
-- re-application past the 90-day mark is allowed through. The real rolling
-- 90-day window, if wanted, needs either a BEFORE INSERT trigger (which can
-- call now()) or must stay purely in application code — this migration adds
-- defense-in-depth at the layer Postgres can actually enforce.
CREATE UNIQUE INDEX IF NOT EXISTS "apps_candidate_job_recent"
  ON "applications" ("candidate_id", "job_id")
  WHERE "stage" NOT IN ('withdrawn', 'duplicate');
