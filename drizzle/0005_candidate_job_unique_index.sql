-- Migration 0005: Allow candidate to apply to multiple distinct roles while preventing duplicate active applications to the same role

DROP INDEX IF EXISTS one_active_application_per_candidate;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_application_per_candidate_and_job
  ON applications (candidate_id, job_id)
  WHERE stage NOT IN ('rejected', 'withdrawn', 'duplicate');
