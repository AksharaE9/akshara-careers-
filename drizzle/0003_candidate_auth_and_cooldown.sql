-- Migration 0003: Candidate Auth (Phone + OTP), Sessions, Stage Events Timeline & 30-Day Cooldown Partial Index

-- 1. Ensure phone_e164 unique constraint exists on candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_phone_e164_unique'
  ) THEN
    ALTER TABLE candidates
      ADD CONSTRAINT candidates_phone_e164_unique UNIQUE (phone_e164);
  END IF;
END $$;

-- 2. OTP verifications table (short-lived, rate-limited, hashed codes)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_verifications_phone_created_idx ON otp_verifications (phone_e164, created_at DESC);

-- 3. Candidate sessions table (candidate portal auth separate from console users)
CREATE TABLE IF NOT EXISTS candidate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidate_sessions_token_idx ON candidate_sessions (token_hash);
CREATE INDEX IF NOT EXISTS candidate_sessions_candidate_idx ON candidate_sessions (candidate_id);

-- 4. Application stage events timeline (audit and candidate-visible progression)
CREATE TABLE IF NOT EXISTS application_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage text NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_stage_events_app_idx ON application_stage_events (application_id, occurred_at ASC);

-- 5. At most one ACTIVE application per candidate enforced at database level
DROP INDEX IF EXISTS one_active_application_per_candidate;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_application_per_candidate
  ON applications (candidate_id)
  WHERE stage NOT IN ('rejected', 'withdrawn', 'duplicate');
