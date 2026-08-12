-- Migration 0006: email_outbox
-- Transactional outbox for HR notification emails.
-- Outbox rows commit in the same transaction as the application row.
-- drainOutbox() uses SELECT FOR UPDATE SKIP LOCKED to prevent duplicate sends.

CREATE TABLE email_outbox (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind            text NOT NULL,                                         -- 'hr_new_application'
  recipients      text[] NOT NULL,                                       -- validated from env at enqueue time
  application_id  uuid REFERENCES applications(id) ON DELETE CASCADE,
  idempotency_key text UNIQUE NOT NULL,                                  -- e.g. 'hr:{applicationId}'
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,                    -- rendered at send time from DB, not stored here
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','retrying','sent','failed')),
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,                                           -- NULL = ready immediately
  sent_at         timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Only index rows that still need to be processed (partial index — small and fast)
CREATE INDEX outbox_due ON email_outbox (status, next_attempt_at)
  WHERE status IN ('pending','retrying');
