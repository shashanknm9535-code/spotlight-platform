-- ============================================================
-- SPOTLIGHT — Initial Schema Migration
-- File: supabase/migrations/20260919_001_initial_schema.sql
-- Apply via: Supabase Dashboard > SQL Editor, or `supabase db push`
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─── Custom Enum Types ───────────────────────────────────────

CREATE TYPE event_status   AS ENUM ('DRAFT', 'READY', 'LIVE', 'PAUSED', 'ENDED');
CREATE TYPE act_category   AS ENUM ('SOLO', 'GROUP');
CREATE TYPE act_status     AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE actor_type     AS ENUM ('ADMIN', 'JUDGE', 'SYSTEM');
CREATE TYPE event_log_action AS ENUM (
  'ACT_STARTED',
  'VOTING_OPENED',
  'VOTING_CLOSED',
  'ACT_ENDED',
  'NEXT_ACT',
  'EVENT_PAUSED',
  'EVENT_RESUMED',
  'REGISTRATION_APPROVED',
  'REGISTRATION_REJECTED',
  'JUDGE_SCORE_SUBMITTED'
);

-- ─── events ──────────────────────────────────────────────────

CREATE TABLE events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  description     TEXT,
  event_date      TIMESTAMPTZ,
  venue           TEXT,
  capacity        INTEGER      NOT NULL DEFAULT 800,
  ticket_price    NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  status          event_status NOT NULL DEFAULT 'DRAFT',
  current_act_id  UUID,                  -- FK added after acts table
  voting_open     BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── acts ────────────────────────────────────────────────────

CREATE TABLE acts (
  id               UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  act_code         TEXT       NOT NULL UNIQUE,   -- e.g. SPT-2026-0001
  category         act_category NOT NULL,
  title            TEXT       NOT NULL,
  performer_name   TEXT       NOT NULL,
  department       TEXT,
  year             TEXT,
  phone            TEXT,
  email            TEXT,
  photo_url        TEXT,
  performance_type TEXT,
  bio              TEXT,
  self_rating      SMALLINT   CHECK (self_rating BETWEEN 1 AND 10),
  status           act_status NOT NULL DEFAULT 'PENDING',
  running_order    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add the FK from events → acts
ALTER TABLE events
  ADD CONSTRAINT fk_events_current_act
  FOREIGN KEY (current_act_id) REFERENCES acts(id) ON DELETE SET NULL;

-- ─── act_members ─────────────────────────────────────────────
-- Separate table; avoids comma-separated strings in acts.

CREATE TABLE act_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id      UUID        NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  department  TEXT,
  year        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_act_members_act_id ON act_members(act_id);

-- ─── judges ──────────────────────────────────────────────────

CREATE TABLE judges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT,
  judge_code  TEXT        NOT NULL UNIQUE,  -- e.g. JUDGE-01
  is_anchor   BOOLEAN     NOT NULL DEFAULT false,  -- anchor = tie-breaker judge
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── judge_scores ────────────────────────────────────────────
-- Rubric: creativity/3 + execution/3 + stage_presence/2 + audience_engagement/2 = 10
-- total is NOT stored; calculated by scoreService to avoid drift.

CREATE TABLE judge_scores (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id               UUID        NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  judge_id             UUID        NOT NULL REFERENCES judges(id) ON DELETE RESTRICT,
  creativity           SMALLINT    NOT NULL CHECK (creativity    BETWEEN 0 AND 3),
  execution            SMALLINT    NOT NULL CHECK (execution     BETWEEN 0 AND 3),
  stage_presence       SMALLINT    NOT NULL CHECK (stage_presence BETWEEN 0 AND 2),
  audience_engagement  SMALLINT    NOT NULL CHECK (audience_engagement BETWEEN 0 AND 2),
  notes                TEXT,
  submitted            BOOLEAN     NOT NULL DEFAULT false,
  submitted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One score sheet per judge per act
  CONSTRAINT uq_judge_act UNIQUE (judge_id, act_id)
);

CREATE INDEX idx_judge_scores_act_id   ON judge_scores(act_id);
CREATE INDEX idx_judge_scores_judge_id ON judge_scores(judge_id);

-- ─── tickets ─────────────────────────────────────────────────

CREATE TABLE tickets (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code        TEXT           NOT NULL UNIQUE,  -- e.g. SPT-TKT-2026-0001
  buyer_name         TEXT           NOT NULL,
  buyer_email        TEXT           NOT NULL,
  buyer_phone        TEXT,
  quantity           SMALLINT       NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  payment_status     payment_status NOT NULL DEFAULT 'PENDING',
  payment_reference  TEXT,          -- Razorpay order_id (Phase 8C+)
  issued_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ─── audience_votes ──────────────────────────────────────────
-- Critical constraint: one vote per ticket per act (enforced at DB level).

CREATE TABLE audience_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  act_id     UUID        NOT NULL REFERENCES acts(id)    ON DELETE CASCADE,
  rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate votes: one vote per ticket per act
  CONSTRAINT uq_ticket_act_vote UNIQUE (ticket_id, act_id)
);

CREATE INDEX idx_audience_votes_act_id    ON audience_votes(act_id);
CREATE INDEX idx_audience_votes_ticket_id ON audience_votes(ticket_id);

-- ─── admin_users ─────────────────────────────────────────────
-- References Supabase Auth (auth.users). No custom password stored here.
-- Real auth via Supabase Auth (Phase 8B+).

CREATE TABLE admin_users (
  id          UUID        PRIMARY KEY,   -- matches auth.users.id
  email       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── event_logs ──────────────────────────────────────────────

CREATE TABLE event_logs (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID             NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_type  actor_type       NOT NULL,
  actor_id    TEXT,            -- judge_id or admin_id (string for flexibility)
  action      event_log_action NOT NULL,
  metadata    JSONB,           -- flexible payload e.g. {"act_id": "...", "votes": 42}
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_logs_event_id  ON event_logs(event_id);
CREATE INDEX idx_event_logs_action    ON event_logs(action);
CREATE INDEX idx_event_logs_actor     ON event_logs(actor_id);

-- ─── updated_at Auto-Update Trigger ──────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_acts_updated_at
  BEFORE UPDATE ON acts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_judge_scores_updated_at
  BEFORE UPDATE ON judge_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
