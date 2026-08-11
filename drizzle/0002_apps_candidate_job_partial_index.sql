-- Migration 0002: Fix D7 rolling-window index defect (Part 17 §17.1.1)
--
-- The original apps_candidate_job_recent index used now() in its WHERE
-- predicate, which is STABLE not IMMUTABLE — Postgres cannot build a partial
-- index with STABLE functions. This migration drops the broken declaration
-- (which was never actually applied to Neon) and replaces it with the correct
-- construction:
--
--   1. UNIQUE partial index on (candidate_id, job_id) WHERE stage is active
--      — guarantees correctness under concurrency at the DB layer
--   2. 90-day window enforced in the write path (SELECT … FOR UPDATE)
--      — application-layer rule where now() is legal
--
-- Terminal stages ('withdrawn','rejected','duplicate') release the slot,
-- permitting a genuine re-application after those outcomes.

DROP INDEX IF EXISTS apps_candidate_job_recent;

CREATE UNIQUE INDEX IF NOT EXISTS apps_candidate_job_active
  ON applications (candidate_id, job_id)
  WHERE stage NOT IN ('withdrawn', 'rejected', 'duplicate');
