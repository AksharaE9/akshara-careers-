-- Migration: 0004_candidate_auth_password
-- Drop OTP table, add candidate password auth and login attempts tracking.

DROP TABLE IF EXISTS otp_verifications CASCADE;

ALTER TABLE candidates 
  ADD COLUMN password_hash text NOT NULL DEFAULT '$argon2id$v=19$m=19456,t=2,p=1$fzrJapWQKvDhRpURLv4EtA$48McOJnSPFXCaGxJUs+mXZX5bzAQ/r7Kf2U8sg1SZ58';

-- Clean check constraints if any, then add candidates_phone_format format check
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_phone_format;
ALTER TABLE candidates 
  ADD CONSTRAINT candidates_phone_format 
    CHECK (phone_e164 ~ '^\+91[6-9][0-9]{9}$');

-- Drop default so subsequent inserts must explicitly specify password_hash
ALTER TABLE candidates ALTER COLUMN password_hash DROP DEFAULT;

-- candidate_login_attempts table for brute-force rate-limiting
CREATE TABLE candidate_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  ip_address text NOT NULL,
  succeeded boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX candidate_login_attempts_phone_time_idx ON candidate_login_attempts (phone_e164, attempted_at DESC);
