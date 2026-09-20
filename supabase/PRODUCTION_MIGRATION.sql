-- ============================================================
-- SPOTLIGHT -- PRODUCTION MIGRATION (COMBINED)
-- Generated: 2026-09-20
-- Migrations: 001 through 010
--
-- HOW TO USE:
--   Run this file once in the Supabase SQL Editor on a FRESH project.
--   Do NOT run individual migration files after running this file.
--   Do NOT run seed.sql in production.
--
-- All 5 production-blocking issues from migrations 008 and 009 are
-- resolved by migration 010. This combined file is safe to run as-is.
-- ============================================================


-- ============================================================
-- MIGRATION 001 -- initial_schema
-- Source: supabase/migrations/20260919_001_initial_schema.sql
-- ============================================================

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


-- ============================================================
-- MIGRATION 002 -- rls_policies
-- Source: supabase/migrations/20260919_002_rls_policies.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Row Level Security Policies
-- File: supabase/migrations/20260919_002_rls_policies.sql
-- Apply AFTER 20260919_001_initial_schema.sql
-- ============================================================
--
-- Policy Philosophy:
--   - Security first: deny by default, grant minimally.
--   - Public: read-only access to approved/live data only.
--   - Audience: can validate their own ticket; one vote per act.
--   - Judges: can read acts; submit/update only their own scores.
--   - Admin: full operational access via service_role or admin JWT.
--
-- Phase 8B will wire Supabase Auth JWTs to these policies.
-- For this phase, the anon key provides public read-only access,
-- and service_role key (never exposed to browser) provides admin access.
-- ============================================================

-- Enable RLS on all application tables
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE acts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs     ENABLE ROW LEVEL SECURITY;

-- ─── events ──────────────────────────────────────────────────

-- Public: anyone can read non-DRAFT events (published schedule)
CREATE POLICY "events_public_read"
  ON events FOR SELECT
  TO anon, authenticated
  USING (status <> 'DRAFT');

-- Admin full access (service_role bypasses RLS; this is for authenticated admin users)
CREATE POLICY "events_admin_all"
  ON events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── acts ────────────────────────────────────────────────────

-- Public: can read APPROVED acts only (published programme)
CREATE POLICY "acts_public_read_approved"
  ON acts FOR SELECT
  TO anon, authenticated
  USING (status = 'APPROVED');

-- Admin full access
CREATE POLICY "acts_admin_all"
  ON acts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── act_members ─────────────────────────────────────────────

-- Public: can read members of APPROVED acts
CREATE POLICY "act_members_public_read"
  ON act_members FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM acts
      WHERE acts.id = act_members.act_id
        AND acts.status = 'APPROVED'
    )
  );

-- Admin full access
CREATE POLICY "act_members_admin_all"
  ON act_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── judges ──────────────────────────────────────────────────

-- Judges: can read their own profile (Phase 8B: match auth.uid() to judge record)
-- TODO(Phase 8B): Replace with: USING (auth.uid()::text = id::text)
CREATE POLICY "judges_self_read"
  ON judges FOR SELECT
  TO authenticated
  USING (true);  -- scoped to authenticated; further narrowed in Phase 8B

-- Admin full access
CREATE POLICY "judges_admin_all"
  ON judges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── judge_scores ────────────────────────────────────────────

-- Judges: can read and write only their own score sheets
-- TODO(Phase 8B): narrow using auth.uid() → judge lookup
CREATE POLICY "judge_scores_own_select"
  ON judge_scores FOR SELECT
  TO authenticated
  USING (true);  -- narrowed in Phase 8B to own judge_id

CREATE POLICY "judge_scores_own_insert"
  ON judge_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- narrowed in Phase 8B

CREATE POLICY "judge_scores_own_update"
  ON judge_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);  -- narrowed in Phase 8B

-- Admin full access
CREATE POLICY "judge_scores_admin_all"
  ON judge_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── tickets ─────────────────────────────────────────────────

-- Audience: can look up their own ticket by ticket_code
-- (used for QR scan validation — no auth required, just code knowledge)
-- TODO(Phase 8B): optionally bind to auth.uid() for registered users
CREATE POLICY "tickets_public_read_by_code"
  ON tickets FOR SELECT
  TO anon, authenticated
  USING (true);  -- application layer restricts to specific ticket_code query

-- Admin full access
CREATE POLICY "tickets_admin_all"
  ON tickets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── audience_votes ──────────────────────────────────────────

-- Audience: can insert one vote per act per ticket
-- DB UNIQUE(ticket_id, act_id) enforces the one-vote rule regardless
CREATE POLICY "audience_votes_insert"
  ON audience_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);  -- narrowed to own ticket in Phase 8B

-- Audience: can read their own votes
CREATE POLICY "audience_votes_own_read"
  ON audience_votes FOR SELECT
  TO anon, authenticated
  USING (true);  -- narrowed to own ticket in Phase 8B

-- Admin full access
CREATE POLICY "audience_votes_admin_all"
  ON audience_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── admin_users ─────────────────────────────────────────────

-- No public access. Admin users only visible to service_role.
CREATE POLICY "admin_users_service_role_only"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── event_logs ──────────────────────────────────────────────

-- No public access. Append-only via service_role.
CREATE POLICY "event_logs_service_role_only"
  ON event_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- MIGRATION 003 -- storage
-- Source: supabase/migrations/20260919_003_storage.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Storage Configuration
-- File: supabase/migrations/20260919_003_storage.sql
-- Apply AFTER 20260919_002_rls_policies.sql
--
-- Creates the performer-photos storage bucket and access policies.
-- NOTE: Storage bucket creation via SQL requires the Supabase storage schema.
--       If running via Dashboard, use Storage > New Bucket instead.
-- ============================================================

-- Create the performer-photos bucket
-- public = true means files are readable without auth (for displaying photos in the UI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'performer-photos',
  'performer-photos',
  true,
  5242880,   -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage Policies ─────────────────────────────────────────

-- Public: anyone can read/view performer photos (bucket is public)
CREATE POLICY "performer_photos_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'performer-photos');

-- Authenticated users (performers during registration) can upload their own photos
-- TODO(Phase 8B): narrow to specific performer identity via auth.uid()
CREATE POLICY "performer_photos_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'performer-photos');

-- Authenticated users can update their own uploaded photos
CREATE POLICY "performer_photos_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'performer-photos')
  WITH CHECK (bucket_id = 'performer-photos');

-- Service role can manage all photos (admin cleanup, etc.)
CREATE POLICY "performer_photos_service_role_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'performer-photos')
  WITH CHECK (bucket_id = 'performer-photos');


-- ============================================================
-- MIGRATION 004 -- registration_rls
-- Source: supabase/migrations/20260919_004_registration_rls.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Public Performer Registration RLS Policies
-- File: supabase/migrations/20260919_004_registration_rls.sql
-- Apply AFTER 20260919_003_storage.sql
-- ============================================================
--
-- Enables unauthenticated public site visitors (anon role) and
-- authenticated users to submit performer registrations for PENDING acts,
-- insert group act members, and upload performer photos to storage.
-- Also allows DELETE for error rollback cleanup during submission.
-- ============================================================

-- ─── acts table policies ──────────────────────────────────────

-- Allow anon and authenticated to submit PENDING act registrations
CREATE POLICY "acts_public_insert_pending"
  ON acts FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'PENDING');

-- Allow anon and authenticated to delete pending acts during registration rollback
CREATE POLICY "acts_public_delete_pending"
  ON acts FOR DELETE
  TO anon, authenticated
  USING (status = 'PENDING');

-- ─── act_members table policies ───────────────────────────────

-- Allow anon and authenticated to insert act members for registrations
CREATE POLICY "act_members_public_insert"
  ON act_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon and authenticated to delete act members during registration rollback
CREATE POLICY "act_members_public_delete"
  ON act_members FOR DELETE
  TO anon, authenticated
  USING (true);

-- ─── performer-photos storage policies ────────────────────────

-- Allow anon and authenticated to upload performer photos
CREATE POLICY "performer_photos_public_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'performer-photos');

-- Allow anon and authenticated to delete performer photos during registration rollback
CREATE POLICY "performer_photos_public_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'performer-photos');


-- ============================================================
-- MIGRATION 005 -- tickets_rls
-- Source: supabase/migrations/20260919_005_tickets_rls.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Public Audience Ticketing RLS Policies
-- File: supabase/migrations/20260919_005_tickets_rls.sql
-- Apply AFTER 20260919_004_registration_rls.sql
-- ============================================================
--
-- Enables unauthenticated public site visitors (anon role) and
-- authenticated users to purchase tickets (INSERT into tickets)
-- and read tickets (SELECT) when payment_status = 'PAID'.
-- ============================================================

-- Allow public (anon) and authenticated users to insert ticket purchases
CREATE POLICY "tickets_public_insert"
  ON tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Tighten public read policy: only permit SELECT for tickets with payment_status = 'PAID'
DROP POLICY IF EXISTS "tickets_public_read_by_code" ON tickets;

CREATE POLICY "tickets_public_read_paid"
  ON tickets FOR SELECT
  TO anon, authenticated
  USING (payment_status = 'PAID');


-- ============================================================
-- MIGRATION 006 -- secure_voting
-- Source: supabase/migrations/20260919_006_secure_voting.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Secure Audience Voting RPC Functions
-- File: supabase/migrations/20260919_006_secure_voting.sql
-- Apply AFTER 20260919_005_tickets_rls.sql
-- ============================================================
--
-- Security boundary for audience voting:
--   - Public client passes (ticket_code, rating) ONLY.
--   - Database determines current LIVE event and current APPROVED act.
--   - Prevents client manipulation of act_id or voting for past/future acts.
--   - Enforces 1–10 rating validation and UNIQUE(ticket_id, act_id) constraint.
-- ============================================================

-- ─── 1. submit_audience_vote RPC ───────────────────────────────

CREATE OR REPLACE FUNCTION submit_audience_vote(
  ticket_code_input TEXT,
  rating_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current_act_id UUID;
  v_event_status event_status;
  v_voting_open BOOLEAN;
  v_act_status act_status;
  v_act_title TEXT;
  v_performer_name TEXT;
  v_slot_number INTEGER;
  v_ticket_id UUID;
  v_ticket_payment payment_status;
  v_existing_vote_id UUID;
  v_vote_id UUID;
BEGIN
  -- 1. Validate rating (1–10)
  IF rating_input IS NULL OR rating_input < 1 OR rating_input > 10 THEN
    RAISE EXCEPTION 'INVALID_RATING' USING HINT = 'Please select a rating from 1 to 10.';
  END IF;

  -- 2. Normalize ticket code input
  ticket_code_input := UPPER(TRIM(ticket_code_input));
  IF ticket_code_input IS NULL OR length(ticket_code_input) < 5 THEN
    RAISE EXCEPTION 'INVALID_TICKET' USING HINT = 'This ticket is not valid for voting.';
  END IF;

  -- 3. Lookup ticket & confirm payment_status = PAID
  SELECT id, payment_status INTO v_ticket_id, v_ticket_payment
  FROM tickets
  WHERE UPPER(ticket_code) = ticket_code_input;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TICKET' USING HINT = 'This ticket is not valid for voting.';
  END IF;

  IF v_ticket_payment <> 'PAID' THEN
    RAISE EXCEPTION 'UNPAID_TICKET' USING HINT = 'This ticket has not been paid for.';
  END IF;

  -- 4. Lookup active LIVE event
  SELECT id, current_act_id, status, voting_open
  INTO v_event_id, v_current_act_id, v_event_status, v_voting_open
  FROM events
  WHERE status = 'LIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL OR v_event_status <> 'LIVE' OR NOT v_voting_open OR v_current_act_id IS NULL THEN
    RAISE EXCEPTION 'VOTING_CLOSED' USING HINT = 'Voting is currently closed.';
  END IF;

  -- 5. Lookup current act & verify APPROVED status
  SELECT status, title, performer_name, running_order
  INTO v_act_status, v_act_title, v_performer_name, v_slot_number
  FROM acts
  WHERE id = v_current_act_id;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'Voting is only available for approved performances.';
  END IF;

  -- 6. Check if ticket has already voted for current act
  SELECT id INTO v_existing_vote_id
  FROM audience_votes
  WHERE ticket_id = v_ticket_id AND act_id = v_current_act_id;

  IF v_existing_vote_id IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_VOTED' USING HINT = 'You have already voted for this act.';
  END IF;

  -- 7. Insert vote securely into audience_votes (handles race condition)
  BEGIN
    INSERT INTO audience_votes (ticket_id, act_id, rating)
    VALUES (v_ticket_id, v_current_act_id, rating_input)
    RETURNING id INTO v_vote_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED' USING HINT = 'You have already voted for this act.';
  END;

  -- 8. Return JSON payload describing success
  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'ticket_id', v_ticket_id,
    'act_id', v_current_act_id,
    'rating', rating_input,
    'act_title', v_act_title,
    'performer_name', v_performer_name,
    'slot_number', v_slot_number
  );
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION submit_audience_vote(TEXT, INTEGER) TO anon, authenticated;

-- ─── 2. get_current_voting_state RPC ───────────────────────────

CREATE OR REPLACE FUNCTION get_current_voting_state(
  ticket_code_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current_act_id UUID;
  v_event_status event_status;
  v_voting_open BOOLEAN;
  v_act RECORD;
  v_ticket_id UUID;
  v_voted_rating INTEGER := NULL;
  v_has_voted BOOLEAN := false;
BEGIN
  -- Lookup active LIVE event (or fallback to latest event)
  SELECT id, current_act_id, status, voting_open
  INTO v_event_id, v_current_act_id, v_event_status, v_voting_open
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_current_act_id IS NOT NULL THEN
    SELECT id, act_code, category, title, performer_name, department, year, photo_url, performance_type, bio, running_order
    INTO v_act
    FROM acts
    WHERE id = v_current_act_id;
  END IF;

  -- Check vote status for ticket if ticket_code provided
  IF ticket_code_input IS NOT NULL AND length(TRIM(ticket_code_input)) >= 5 THEN
    SELECT id INTO v_ticket_id FROM tickets WHERE UPPER(ticket_code) = UPPER(TRIM(ticket_code_input)) AND payment_status = 'PAID';
    
    IF v_ticket_id IS NOT NULL AND v_current_act_id IS NOT NULL THEN
      SELECT rating INTO v_voted_rating
      FROM audience_votes
      WHERE ticket_id = v_ticket_id AND act_id = v_current_act_id;
      
      IF v_voted_rating IS NOT NULL THEN
        v_has_voted := true;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'event_status', COALESCE(v_event_status, 'DRAFT'),
    'voting_open', COALESCE(v_voting_open, false),
    'current_act', CASE WHEN v_act.id IS NOT NULL THEN jsonb_build_object(
      'id', v_act.id,
      'act_code', v_act.act_code,
      'category', LOWER(v_act.category::text),
      'title', v_act.title,
      'performer_name', v_act.performer_name,
      'department', COALESCE(v_act.department, ''),
      'year', COALESCE(v_act.year, ''),
      'photo_url', COALESCE(v_act.photo_url, ''),
      'performance_type', COALESCE(v_act.performance_type, ''),
      'blurb', COALESCE(v_act.bio, ''),
      'slot_number', COALESCE(v_act.running_order, 1)
    ) ELSE NULL END,
    'has_voted', v_has_voted,
    'voted_rating', v_voted_rating
  );
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_current_voting_state(TEXT) TO anon, authenticated;


-- ============================================================
-- MIGRATION 007 -- secure_judging
-- Source: supabase/migrations/20260919_007_secure_judging.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Secure Judge Scoring RPC Functions
-- File: supabase/migrations/20260919_007_secure_judging.sql
-- Apply AFTER 20260919_006_secure_voting.sql
-- ============================================================
--
-- Security boundary for judge scoring:
--   - Judges authenticate by judge_code (e.g. JUDGE-01).
--   - Enforces rubric limits:
--       creativity: 0–3
--       execution: 0–3
--       stage_presence: 0–2
--       audience_engagement: 0–2
--   - Calculated total is NOT stored (calculated by scoreService).
--   - Judge isolation: judges can ONLY access their own score records.
--   - Score locking: submitted = true locks score from further modification.
-- ============================================================

-- ─── 1. get_judge_by_code RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_judge_by_code(
  judge_code_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge RECORD;
BEGIN
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, name, email, judge_code, is_anchor, is_active
  INTO v_judge
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Judge code not recognized. Please check your assigned code (e.g. JUDGE-01).';
  END IF;

  IF NOT v_judge.is_active THEN
    RAISE EXCEPTION 'INACTIVE_JUDGE' USING HINT = 'This judge account is currently inactive.';
  END IF;

  RETURN jsonb_build_object(
    'id', v_judge.id,
    'name', v_judge.name,
    'email', COALESCE(v_judge.email, ''),
    'code', v_judge.judge_code,
    'isAnchor', v_judge.is_anchor,
    'isActive', v_judge.is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_judge_by_code(TEXT) TO anon, authenticated;

-- ─── 2. get_judge_score_for_act RPC ────────────────────────────

CREATE OR REPLACE FUNCTION get_judge_score_for_act(
  judge_code_input TEXT,
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge_id UUID;
  v_score RECORD;
BEGIN
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id INTO v_judge_id
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input AND is_active = true;

  IF v_judge_id IS NULL THEN
    -- Try resolving judge_code_input as UUID directly
    BEGIN
      v_judge_id := judge_code_input::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  SELECT id, act_id, judge_id, creativity, execution, stage_presence, audience_engagement, notes, submitted, submitted_at, created_at
  INTO v_score
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_score.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_score.id,
    'actId', v_score.act_id,
    'judgeId', v_score.judge_id,
    'creativity', v_score.creativity,
    'execution', v_score.execution,
    'stagePresence', v_score.stage_presence,
    'audienceEngagement', v_score.audience_engagement,
    'total', (v_score.creativity + v_score.execution + v_score.stage_presence + v_score.audience_engagement),
    'notes', COALESCE(v_score.notes, ''),
    'submitted', v_score.submitted,
    'createdAt', COALESCE(v_score.submitted_at, v_score.created_at)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_judge_score_for_act(TEXT, UUID) TO anon, authenticated;

-- ─── 3. submit_judge_score RPC ────────────────────────────────

CREATE OR REPLACE FUNCTION submit_judge_score(
  judge_code_input TEXT,
  act_id_input UUID,
  creativity_input INTEGER,
  execution_input INTEGER,
  stage_presence_input INTEGER,
  audience_engagement_input INTEGER,
  notes_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge_id UUID;
  v_judge_active BOOLEAN;
  v_act_status act_status;
  v_existing_submitted BOOLEAN;
  v_score_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate score ranges
  IF creativity_input IS NULL OR creativity_input < 0 OR creativity_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Creativity score must be between 0 and 3.';
  END IF;

  IF execution_input IS NULL OR execution_input < 0 OR execution_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Execution score must be between 0 and 3.';
  END IF;

  IF stage_presence_input IS NULL OR stage_presence_input < 0 OR stage_presence_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Stage presence score must be between 0 and 2.';
  END IF;

  IF audience_engagement_input IS NULL OR audience_engagement_input < 0 OR audience_engagement_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Audience engagement score must be between 0 and 2.';
  END IF;

  -- 2. Resolve judge identity
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, is_active INTO v_judge_id, v_judge_active
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge_id IS NULL THEN
    -- Fallback: check if judge_code_input is a UUID string directly
    BEGIN
      SELECT id, is_active INTO v_judge_id, v_judge_active
      FROM judges
      WHERE id = judge_code_input::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
    END;
  END IF;

  IF v_judge_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
  END IF;

  IF NOT v_judge_active THEN
    RAISE EXCEPTION 'INACTIVE_JUDGE' USING HINT = 'This judge account is currently inactive.';
  END IF;

  -- 3. Verify act exists and is APPROVED
  SELECT status INTO v_act_status
  FROM acts
  WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'There is currently no approved act available for judging.';
  END IF;

  -- 4. Check score locking (if already submitted, reject modification)
  SELECT submitted INTO v_existing_submitted
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_existing_submitted IS TRUE THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 5. Upsert score securely into judge_scores
  INSERT INTO judge_scores (
    act_id,
    judge_id,
    creativity,
    execution,
    stage_presence,
    audience_engagement,
    notes,
    submitted,
    submitted_at
  ) VALUES (
    act_id_input,
    v_judge_id,
    creativity_input,
    execution_input,
    stage_presence_input,
    audience_engagement_input,
    TRIM(notes_input),
    true,
    v_now
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity = EXCLUDED.creativity,
    execution = EXCLUDED.execution,
    stage_presence = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    notes = EXCLUDED.notes,
    submitted = true,
    submitted_at = EXCLUDED.submitted_at
  WHERE judge_scores.submitted = false
  RETURNING id INTO v_score_id;

  IF v_score_id IS NULL THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 6. Return JSON response
  RETURN jsonb_build_object(
    'id', v_score_id,
    'actId', act_id_input,
    'judgeId', v_judge_id,
    'creativity', creativity_input,
    'execution', execution_input,
    'stagePresence', stage_presence_input,
    'audienceEngagement', audience_engagement_input,
    'total', (creativity_input + execution_input + stage_presence_input + audience_engagement_input),
    'notes', COALESCE(TRIM(notes_input), ''),
    'submitted', true,
    'createdAt', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_judge_score(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO anon, authenticated;


-- ============================================================
-- MIGRATION 008 -- admin_event_control
-- Source: supabase/migrations/20260919_008_admin_event_control.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT — Secure Admin Event Control RPC Functions
-- File: supabase/migrations/20260919_008_admin_event_control.sql
-- Apply AFTER 20260919_007_secure_judging.sql
-- ============================================================
--
-- Security boundary for Admin Event Operations:
--   - Provides transactional operations for registration approvals,
--     running order management, event control, live voting state,
--     and stage display controls.
--   - Automatically logs every important action to event_logs table.
-- ============================================================

-- ─── 1. admin_approve_registration RPC ────────────────────────

CREATE OR REPLACE FUNCTION admin_approve_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status act_status;
  v_next_order INTEGER;
  v_updated RECORD;
BEGIN
  SELECT status INTO v_current_status
  FROM acts
  WHERE id = act_id_input;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  IF v_current_status = 'REJECTED' THEN
    RAISE EXCEPTION 'CANNOT_APPROVE_REJECTED' USING HINT = 'Rejected registrations cannot be approved directly.';
  END IF;

  -- Calculate next running_order position
  SELECT COALESCE(MAX(running_order), 0) + 1 INTO v_next_order
  FROM acts
  WHERE status = 'APPROVED';

  UPDATE acts
  SET status = 'APPROVED',
      running_order = COALESCE(running_order, v_next_order),
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, category, status, running_order INTO v_updated;

  -- Log administrative action to event_logs
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_APPROVED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name,
    'running_order', v_updated.running_order
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'act_code', v_updated.act_code,
    'status', v_updated.status,
    'running_order', v_updated.running_order
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_approve_registration(UUID) TO anon, authenticated;

-- ─── 2. admin_reject_registration RPC ─────────────────────────

CREATE OR REPLACE FUNCTION admin_reject_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  UPDATE acts
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, status INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  -- Log administrative action
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_REJECTED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'status', v_updated.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reject_registration(UUID) TO anon, authenticated;

-- ─── 3. admin_set_current_act RPC ─────────────────────────────

CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_act_status act_status;
  v_act_code TEXT;
BEGIN
  SELECT status, act_code INTO v_act_status, v_act_code
  FROM acts
  WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'Only approved acts can be set as the current performance.';
  END IF;

  SELECT id INTO v_event_id
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  UPDATE events
  SET current_act_id = act_id_input,
      updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'CURRENT_ACT_CHANGED', jsonb_build_object(
    'current_act_id', act_id_input,
    'act_code', v_act_code
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'current_act_id', act_id_input);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_current_act(UUID) TO anon, authenticated;

-- ─── 4. admin_update_event_state RPC ──────────────────────────

CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status TEXT DEFAULT NULL,
  p_voting_open BOOLEAN DEFAULT NULL,
  p_current_act_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_new_status event_status;
BEGIN
  SELECT id INTO v_event_id
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;
  END IF;

  UPDATE events
  SET status = COALESCE(v_new_status, status),
      voting_open = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at = now()
  WHERE id = v_event_id;

  -- Log action
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status', p_status,
    'voting_open', p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_event_state(TEXT, BOOLEAN, UUID) TO anon, authenticated;

-- ─── 5. admin_get_overview_stats RPC ──────────────────────────

CREATE OR REPLACE FUNCTION admin_get_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_total_registrations INTEGER;
  v_approved_acts INTEGER;
  v_tickets_sold INTEGER;
  v_tickets_revenue NUMERIC;
  v_total_votes INTEGER;
  v_judges_submitted INTEGER;
  v_total_judges INTEGER;
BEGIN
  SELECT id, current_act_id, status, voting_open, capacity, ticket_price
  INTO v_event
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  SELECT COUNT(*) INTO v_total_registrations FROM acts;
  SELECT COUNT(*) INTO v_approved_acts FROM acts WHERE status = 'APPROVED';
  
  SELECT COALESCE(SUM(quantity), 0) INTO v_tickets_sold 
  FROM tickets WHERE payment_status = 'PAID';

  v_tickets_revenue := v_tickets_sold * COALESCE(v_event.ticket_price, 10);

  SELECT COUNT(*) INTO v_total_votes FROM audience_votes;

  SELECT COUNT(DISTINCT judge_id) INTO v_judges_submitted 
  FROM judge_scores 
  WHERE act_id = v_event.current_act_id AND submitted = true;

  SELECT COUNT(*) INTO v_total_judges FROM judges WHERE is_active = true;

  RETURN jsonb_build_object(
    'total_registrations', v_total_registrations,
    'approved_acts', v_approved_acts,
    'tickets_sold', v_tickets_sold,
    'capacity', COALESCE(v_event.capacity, 800),
    'tickets_revenue', v_tickets_revenue,
    'total_votes', v_total_votes,
    'judges_submitted', v_judges_submitted,
    'total_judges', v_total_judges,
    'event_status', COALESCE(v_event.status::text, 'LIVE'),
    'voting_open', COALESCE(v_event.voting_open, false),
    'current_act_id', v_event.current_act_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_overview_stats() TO anon, authenticated;


-- ============================================================
-- MIGRATION 009 -- production_hardening_auth
-- Source: supabase/migrations/20260919_009_production_hardening_auth.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT â€” Production Hardening, Auth, & RLS Security Migration
-- File: supabase/migrations/20260919_009_production_hardening_auth.sql
-- Apply AFTER 20260919_008_admin_event_control.sql
-- ============================================================

-- â”€â”€â”€ 1. LINK JUDGES TO AUTH USERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE judges 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_judges_auth_user_id ON judges(auth_user_id);

-- â”€â”€â”€ 2. REWORK RLS POLICIES FOR PRODUCTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Enable RLS on all sensitive tables if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_scores ENABLE ROW LEVEL SECURITY;

-- 2.1 ADMIN USERS POLICIES
DROP POLICY IF EXISTS "Active admins can view admin records" ON admin_users;
CREATE POLICY "Active admins can view admin records"
  ON admin_users FOR SELECT
  TO authenticated, anon
  USING (
    (auth.uid() = id AND is_active = true) OR
    EXISTS (
      SELECT 1 FROM admin_users a 
      WHERE a.id = auth.uid() AND a.is_active = true
    )
  );

-- 2.2 JUDGES POLICIES
DROP POLICY IF EXISTS "Public can view judge names and codes" ON judges;
CREATE POLICY "Public can view judge names and codes"
  ON judges FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Judges can update their own auth association" ON judges;
CREATE POLICY "Judges can update their own auth association"
  ON judges FOR UPDATE
  TO authenticated
  USING (auth_user_id IS NULL OR auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 2.3 EVENT LOGS POLICIES
DROP POLICY IF EXISTS "Only active admins can view event logs" ON event_logs;
CREATE POLICY "Only active admins can view event logs"
  ON event_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 2.4 JUDGE SCORES POLICIES
DROP POLICY IF EXISTS "Judges can view their own scores" ON judge_scores;
CREATE POLICY "Judges can view their own scores"
  ON judge_scores FOR SELECT
  TO authenticated
  USING (
    judge_id IN (
      SELECT id FROM judges WHERE auth_user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true
    )
  );

-- â”€â”€â”€ 3. ATOMIC TICKET CAPACITY & PURCHASE RPC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION purchase_tickets_atomic(
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_quantity INTEGER,
  p_payment_method TEXT DEFAULT 'upi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_tickets_sold INTEGER;
  v_max_capacity INTEGER;
  v_unit_price NUMERIC;
  v_total_amount NUMERIC;
  v_order_id UUID;
  v_order_code TEXT;
  v_tickets JSONB := '[]'::jsonb;
  v_ticket_id UUID;
  v_ticket_code TEXT;
  i INTEGER;
BEGIN
  -- Validate inputs
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING HINT = 'Ticket quantity must be between 1 and 10.';
  END IF;

  IF TRIM(p_buyer_name) = '' OR TRIM(p_buyer_email) = '' THEN
    RAISE EXCEPTION 'INVALID_BUYER' USING HINT = 'Buyer name and email are required.';
  END IF;

  -- Acquire transaction-level advisory lock to prevent capacity race conditions
  PERFORM pg_advisory_xact_lock(987654321);

  -- Retrieve active event configuration
  SELECT id, capacity, ticket_price, status
  INTO v_event
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_EVENT' USING HINT = 'No active event is available for ticketing.';
  END IF;

  v_max_capacity := COALESCE(v_event.capacity, 800);
  v_unit_price := COALESCE(v_event.ticket_price, 10);

  -- Count total paid tickets sold
  SELECT COALESCE(SUM(quantity), 0) INTO v_tickets_sold
  FROM orders
  WHERE payment_status = 'PAID';

  IF (v_tickets_sold + p_quantity) > v_max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED' USING HINT = format('Event capacity reached. Available: %s, Requested: %s', v_max_capacity - v_tickets_sold, p_quantity);
  END IF;

  v_total_amount := p_quantity * v_unit_price;
  v_order_code := 'ORD-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- Create order
  INSERT INTO orders (
    event_id, order_code, buyer_name, buyer_email, buyer_phone, quantity, unit_price, total_amount, payment_status, payment_reference
  ) VALUES (
    v_event.id, v_order_code, TRIM(p_buyer_name), TRIM(p_buyer_email), TRIM(p_buyer_phone), p_quantity, v_unit_price, v_total_amount, 'PAID', 'MOCK-PAY-' || floor(random() * 899999 + 100000)::text
  )
  RETURNING id INTO v_order_id;

  -- Generate individual tickets
  FOR i IN 1..p_quantity LOOP
    v_ticket_code := 'TCK-' || upper(substring(md5(random()::text || clock_timestamp()::text || i::text) from 1 for 6));
    INSERT INTO tickets (
      order_id, event_id, ticket_code, attendee_name, attendee_email, status, payment_status
    ) VALUES (
      v_order_id, v_event.id, v_ticket_code, TRIM(p_buyer_name), TRIM(p_buyer_email), 'ACTIVE', 'PAID'
    )
    RETURNING id INTO v_ticket_id;

    v_tickets := v_tickets || jsonb_build_object(
      'id', v_ticket_id,
      'ticket_code', v_ticket_code,
      'status', 'ACTIVE'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'quantity', p_quantity,
    'total_amount', v_total_amount,
    'tickets', v_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO anon, authenticated;

-- â”€â”€â”€ 4. HARDENED ADMIN RPCs WITH AUTHORIZATION & STATE MACHINE â”€â”€â”€

-- Helper function to verify caller is active admin
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$;

-- Update admin_approve_registration
CREATE OR REPLACE FUNCTION admin_approve_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status act_status;
  v_next_order INTEGER;
  v_updated RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can approve registrations.';
  END IF;

  SELECT status INTO v_current_status FROM acts WHERE id = act_id_input;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  IF v_current_status = 'REJECTED' THEN
    RAISE EXCEPTION 'CANNOT_APPROVE_REJECTED' USING HINT = 'Rejected registrations cannot be approved directly.';
  END IF;

  SELECT COALESCE(MAX(running_order), 0) + 1 INTO v_next_order FROM acts WHERE status = 'APPROVED';

  UPDATE acts
  SET status = 'APPROVED',
      running_order = COALESCE(running_order, v_next_order),
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, category, status, running_order INTO v_updated;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_APPROVED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name,
    'running_order', v_updated.running_order
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'act_code', v_updated.act_code,
    'status', v_updated.status,
    'running_order', v_updated.running_order
  );
END;
$$;

-- Update admin_reject_registration
CREATE OR REPLACE FUNCTION admin_reject_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can reject registrations.';
  END IF;

  UPDATE acts
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, status INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_REJECTED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'status', v_updated.status
  );
END;
$$;

-- Update admin_set_current_act
CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_act_status act_status;
  v_act_code TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can set the active act.';
  END IF;

  SELECT status, act_code INTO v_act_status, v_act_code
  FROM acts
  WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'Only approved acts can be set as the current performance.';
  END IF;

  SELECT id INTO v_event_id
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  UPDATE events
  SET current_act_id = act_id_input,
      updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'CURRENT_ACT_CHANGED', jsonb_build_object(
    'current_act_id', act_id_input,
    'act_code', v_act_code
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'current_act_id', act_id_input);
END;
$$;

-- Update admin_update_event_state with state machine transition checks
CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status TEXT DEFAULT NULL,
  p_voting_open BOOLEAN DEFAULT NULL,
  p_current_act_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_current_status event_status;
  v_new_status event_status;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can update event state.';
  END IF;

  SELECT id, status INTO v_event_id, v_current_status
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;
    
    -- State Machine Validation
    IF v_current_status = 'ENDED' AND v_new_status <> 'ENDED' THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING HINT = 'An ended event cannot be reopened.';
    END IF;

    IF v_new_status = 'LIVE' AND v_current_status NOT IN ('DRAFT', 'READY', 'PAUSED') THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING HINT = 'Event can only go live from READY or PAUSED state.';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  -- Voting State Machine Validation: voting cannot be open unless event status is LIVE
  IF p_voting_open = true AND v_new_status <> 'LIVE' THEN
    RAISE EXCEPTION 'INVALID_VOTING_STATE' USING HINT = 'Voting can only be opened when the event status is LIVE.';
  END IF;

  UPDATE events
  SET status = COALESCE(v_new_status, status),
      voting_open = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status', v_new_status,
    'voting_open', p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'status', v_new_status);
END;
$$;

-- â”€â”€â”€ 5. HARDENED JUDGE RPCs WITH SCORE LOCKING & AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION submit_judge_score(
  act_id_input UUID,
  score_creativity NUMERIC,
  score_execution NUMERIC,
  score_stage_presence NUMERIC,
  score_audience_engagement NUMERIC,
  notes_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id UUID;
  v_act_status act_status;
  v_is_locked BOOLEAN;
  v_total_score NUMERIC;
  v_score_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_judge_id
    FROM judges
    WHERE auth_user_id = auth.uid() AND is_active = true;

    IF v_judge_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED_JUDGE' USING HINT = 'Authenticated user is not registered as an active judge.';
    END IF;
  ELSE
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING HINT = 'Judge authentication required to submit scores.';
  END IF;

  SELECT status INTO v_act_status FROM acts WHERE id = act_id_input;
  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'INVALID_ACT' USING HINT = 'Scores can only be submitted for approved acts.';
  END IF;

  IF score_creativity NOT BETWEEN 1 AND 5 OR
     score_execution NOT BETWEEN 1 AND 5 OR
     score_stage_presence NOT BETWEEN 1 AND 5 OR
     score_audience_engagement NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'INVALID_SCORE_RANGE' USING HINT = 'Rubric scores must be between 1 and 5.';
  END IF;

  SELECT submitted INTO v_is_locked
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_is_locked = true THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'Submitted judge scores are locked and cannot be modified.';
  END IF;

  v_total_score := (score_creativity * 0.35) + (score_execution * 0.35) + (score_stage_presence * 0.15) + (score_audience_engagement * 0.15);

  INSERT INTO judge_scores (
    judge_id, act_id, creativity, execution, stage_presence, audience_engagement, total_score, notes, submitted, locked_at
  ) VALUES (
    v_judge_id, act_id_input, score_creativity, score_execution, score_stage_presence, score_audience_engagement, v_total_score, TRIM(notes_input), true, now()
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity = EXCLUDED.creativity,
    execution = EXCLUDED.execution,
    stage_presence = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    total_score = EXCLUDED.total_score,
    notes = EXCLUDED.notes,
    submitted = true,
    locked_at = now(),
    updated_at = now()
  RETURNING id INTO v_score_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'JUDGE', 'SCORE_SUBMITTED', jsonb_build_object(
    'judge_id', v_judge_id,
    'act_id', act_id_input,
    'total_score', v_total_score
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'score_id', v_score_id,
    'total_score', v_total_score,
    'submitted', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_judge_score(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;


-- ============================================================
-- MIGRATION 010 -- production_schema_fixes
-- Source: supabase/migrations/20260920_010_production_schema_fixes.sql
-- ============================================================

-- ============================================================
-- SPOTLIGHT -- Production Schema Fixes
-- File: supabase/migrations/20260920_010_production_schema_fixes.sql
-- Apply AFTER 20260919_009_production_hardening_auth.sql
-- ============================================================
--
-- Root causes addressed:
--
--   ISSUE 1+2 (009): purchase_tickets_atomic references a missing
--     `orders` table and inserts non-existent columns into `tickets`.
--     The existing application uses the flat tickets schema from 001.
--     Fix: Replace the function to operate against the real schema.
--
--   ISSUE 3 (009): The auth-based submit_judge_score overload (5 args)
--     references non-existent `total_score` and `locked_at` columns in
--     judge_scores, and uses a rubric (1-5) that contradicts the 001
--     schema CHECK constraints (0-3 / 0-2). The application exclusively
--     calls the 7-arg code-based overload from migration 007.
--     Fix: Drop the broken overload. The 7-arg overload from 007
--     (re-hardened in 009) remains and is the canonical implementation.
--
--   ISSUE 4 (008+009): admin_set_current_act inserts
--     'CURRENT_ACT_CHANGED' into event_logs.action but this value is
--     not in the event_log_action enum from migration 001.
--     Fix: Add the value to the enum before the function is called.
--
--   ISSUE 5 (008+009): admin_update_event_state inserts
--     'EVENT_STATE_UPDATED' and submit_judge_score (7-arg) inserts
--     'SCORE_SUBMITTED'. Neither value is in the enum from 001.
--     Fix: Add both values to the enum.
--
-- NOTE: Migrations 001-009 are preserved as historical migrations.
--   The broken functions in 008/009 parse successfully on a fresh
--   database (PostgreSQL validates plpgsql bodies lazily at call time).
--   This migration runs before any of those functions are called in
--   production, patching them before first use.
-- ============================================================

-- =============================================================
-- 1. ADD MISSING EVENT LOG ENUM VALUES
-- =============================================================
-- PostgreSQL enums require ALTER TYPE ... ADD VALUE.
-- IF NOT EXISTS prevents re-run errors.

ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'CURRENT_ACT_CHANGED';
ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'EVENT_STATE_UPDATED';
ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'SCORE_SUBMITTED';


-- =============================================================
-- 2. REPLACE purchase_tickets_atomic
-- =============================================================
-- The 009 version references a non-existent `orders` table and
-- inserts wrong column names into `tickets`.
--
-- This replacement operates against the real `tickets` schema
-- defined in migration 001:
--   tickets(id, ticket_code, buyer_name, buyer_email, buyer_phone,
--           quantity, payment_status, payment_reference, issued_at,
--           created_at)
--
-- Business requirements preserved:
--   - Advisory lock prevents concurrent capacity over-sells
--   - Only PAID tickets count toward capacity (via quantity column)
--   - Each individual ticket record gets a unique SPT-TKT-XXXX code
--   - quantity=1 per row (one voting pass per ticket record)
--   - payment_reference stores a shared order code, enabling
--     adminService.ts to group tickets into display "orders"
--   - Returns { success, order_id, order_code, quantity,
--       total_amount, tickets: [{id, ticket_code, status}] }
--     matching the shape expected by ticketService.ts line 187-192

CREATE OR REPLACE FUNCTION purchase_tickets_atomic(
  p_buyer_name    TEXT,
  p_buyer_email   TEXT,
  p_buyer_phone   TEXT,
  p_quantity      INTEGER,
  p_payment_method TEXT DEFAULT 'upi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event        RECORD;
  v_tickets_sold INTEGER;
  v_max_capacity INTEGER;
  v_unit_price   NUMERIC;
  v_total_amount NUMERIC;
  v_order_code   TEXT;
  v_pay_ref      TEXT;
  v_tickets      JSONB := '[]'::jsonb;
  v_ticket_id    UUID;
  v_ticket_code  TEXT;
  i              INTEGER;
BEGIN
  -- Input validation
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY'
      USING HINT = 'Ticket quantity must be between 1 and 10.';
  END IF;

  IF TRIM(p_buyer_name) = '' OR TRIM(p_buyer_email) = '' THEN
    RAISE EXCEPTION 'INVALID_BUYER'
      USING HINT = 'Buyer name and email are required.';
  END IF;

  -- Advisory lock: prevents concurrent capacity over-sell
  PERFORM pg_advisory_xact_lock(987654321);

  -- Retrieve active event
  SELECT id, capacity, ticket_price, status
  INTO v_event
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_EVENT'
      USING HINT = 'No active event is available for ticketing.';
  END IF;

  v_max_capacity := COALESCE(v_event.capacity, 800);
  v_unit_price   := COALESCE(v_event.ticket_price, 10);

  -- Count paid tickets sold (SUM quantity for future-compatibility)
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_tickets_sold
  FROM tickets
  WHERE payment_status = 'PAID';

  IF (v_tickets_sold + p_quantity) > v_max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED'
      USING HINT = format(
        'Event capacity reached. Available: %s, Requested: %s',
        v_max_capacity - v_tickets_sold, p_quantity
      );
  END IF;

  -- Generate shared order code and payment reference
  v_order_code := 'ORD-' || upper(
    substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)
  );
  v_pay_ref := 'MOCK-PAY-' || floor(random() * 899999 + 100000)::text;
  v_total_amount := p_quantity * v_unit_price;

  -- Insert one ticket record per pass (quantity=1 per row)
  FOR i IN 1..p_quantity LOOP
    v_ticket_code := 'SPT-TKT-2026-' || lpad(
      floor(random() * 899999 + 100000)::text, 6, '0'
    );

    INSERT INTO tickets (
      ticket_code,
      buyer_name,
      buyer_email,
      buyer_phone,
      quantity,
      payment_status,
      payment_reference,
      issued_at
    ) VALUES (
      v_ticket_code,
      TRIM(p_buyer_name),
      TRIM(p_buyer_email),
      NULLIF(TRIM(p_buyer_phone), ''),
      1,
      'PAID',
      v_pay_ref,
      now()
    )
    RETURNING id INTO v_ticket_id;

    v_tickets := v_tickets || jsonb_build_object(
      'id',          v_ticket_id,
      'ticket_code', v_ticket_code,
      'status',      'ACTIVE'
    );
  END LOOP;

  -- Return shape matching ticketService.ts lines 187-212
  RETURN jsonb_build_object(
    'success',      true,
    'order_id',     v_order_code,
    'order_code',   v_order_code,
    'quantity',     p_quantity,
    'total_amount', v_total_amount,
    'tickets',      v_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT)
  TO anon, authenticated;


-- =============================================================
-- 3. DROP THE BROKEN AUTH-BASED submit_judge_score OVERLOAD
-- =============================================================
-- Migration 009 created a second overload with signature
-- (UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT).
-- This overload inserts non-existent columns `total_score` and
-- `locked_at`, uses rubric range 1-5 (violating CHECK constraints),
-- and is never called by the application (judgeService.ts calls
-- the 7-arg code-based overload exclusively).

DROP FUNCTION IF EXISTS
  submit_judge_score(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT);


-- =============================================================
-- 4. REPLACE submit_judge_score (7-arg, code-based, canonical)
-- =============================================================
-- The 009 version of the 7-arg overload is functionally correct
-- but inserts 'SCORE_SUBMITTED' which was not in the enum until
-- step 1 above. Replace now that the enum value is available.
--
-- Changes from 009 version:
--   - SCORE_SUBMITTED audit log is now valid (enum fixed)
--   - Rubric stays 0-3 / 0-3 / 0-2 / 0-2 (max 10), per 001 schema
--   - total is NOT stored (calculated client-side by scoreService)
--   - Score locking via submitted=true (existing mechanism, correct)
--   - No auth.uid() guard (judges use judge_code identity, not auth)

CREATE OR REPLACE FUNCTION submit_judge_score(
  judge_code_input          TEXT,
  act_id_input              UUID,
  creativity_input          INTEGER,
  execution_input           INTEGER,
  stage_presence_input      INTEGER,
  audience_engagement_input INTEGER,
  notes_input               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id           UUID;
  v_judge_active       BOOLEAN;
  v_act_status         act_status;
  v_existing_submitted BOOLEAN;
  v_score_id           UUID;
  v_now                TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate rubric ranges (0-3 / 0-3 / 0-2 / 0-2 = max 10)
  IF creativity_input IS NULL OR creativity_input < 0 OR creativity_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Creativity score must be between 0 and 3.';
  END IF;
  IF execution_input IS NULL OR execution_input < 0 OR execution_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Execution score must be between 0 and 3.';
  END IF;
  IF stage_presence_input IS NULL OR stage_presence_input < 0 OR stage_presence_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Stage presence score must be between 0 and 2.';
  END IF;
  IF audience_engagement_input IS NULL OR audience_engagement_input < 0 OR audience_engagement_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Audience engagement score must be between 0 and 2.';
  END IF;

  -- 2. Resolve judge identity from judge_code (e.g. JUDGE-01)
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, is_active INTO v_judge_id, v_judge_active
  FROM judges WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge_id IS NULL THEN
    BEGIN
      SELECT id, is_active INTO v_judge_id, v_judge_active
      FROM judges WHERE id = judge_code_input::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
    END;
  END IF;

  IF v_judge_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
  END IF;

  IF NOT v_judge_active THEN
    RAISE EXCEPTION 'INACTIVE_JUDGE' USING HINT = 'This judge account is currently inactive.';
  END IF;

  -- 3. Verify act is APPROVED
  SELECT status INTO v_act_status FROM acts WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED'
      USING HINT = 'There is currently no approved act available for judging.';
  END IF;

  -- 4. Score locking check
  SELECT submitted INTO v_existing_submitted
  FROM judge_scores WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_existing_submitted IS TRUE THEN
    RAISE EXCEPTION 'SCORE_LOCKED'
      USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 5. Upsert score (total NOT stored, calculated by scoreService)
  INSERT INTO judge_scores (
    act_id, judge_id, creativity, execution,
    stage_presence, audience_engagement, notes,
    submitted, submitted_at
  ) VALUES (
    act_id_input, v_judge_id,
    creativity_input, execution_input,
    stage_presence_input, audience_engagement_input,
    TRIM(notes_input), true, v_now
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity          = EXCLUDED.creativity,
    execution           = EXCLUDED.execution,
    stage_presence      = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    notes               = EXCLUDED.notes,
    submitted           = true,
    submitted_at        = EXCLUDED.submitted_at,
    updated_at          = now()
  WHERE judge_scores.submitted = false
  RETURNING id INTO v_score_id;

  IF v_score_id IS NULL THEN
    RAISE EXCEPTION 'SCORE_LOCKED'
      USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 6. Audit log (SCORE_SUBMITTED now valid after step 1)
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'JUDGE', 'SCORE_SUBMITTED', jsonb_build_object(
    'judge_id', v_judge_id,
    'act_id',   act_id_input,
    'total',    (creativity_input + execution_input + stage_presence_input + audience_engagement_input)
  )
  FROM events ORDER BY created_at DESC LIMIT 1;

  -- 7. Return matching judgeService.ts line 183-196 expectations
  RETURN jsonb_build_object(
    'id',                 v_score_id,
    'actId',              act_id_input,
    'judgeId',            v_judge_id,
    'creativity',         creativity_input,
    'execution',          execution_input,
    'stagePresence',      stage_presence_input,
    'audienceEngagement', audience_engagement_input,
    'total',              (creativity_input + execution_input + stage_presence_input + audience_engagement_input),
    'notes',              COALESCE(TRIM(notes_input), ''),
    'submitted',          true,
    'createdAt',          v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  submit_judge_score(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT)
  TO anon, authenticated;


-- =============================================================
-- 5. REPLACE admin_set_current_act
-- =============================================================
-- Replaces the 009 version to ensure CURRENT_ACT_CHANGED
-- (now valid after step 1) is used cleanly. Logic unchanged.

CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id   UUID;
  v_act_status act_status;
  v_act_code   TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only active admin users can set the active act.';
  END IF;

  SELECT status, act_code INTO v_act_status, v_act_code
  FROM acts WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED'
      USING HINT = 'Only approved acts can be set as the current performance.';
  END IF;

  SELECT id INTO v_event_id
  FROM events ORDER BY (status = 'LIVE') DESC, created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  UPDATE events
  SET current_act_id = act_id_input, updated_at = now()
  WHERE id = v_event_id;

  -- CURRENT_ACT_CHANGED valid after step 1
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'CURRENT_ACT_CHANGED', jsonb_build_object(
    'current_act_id', act_id_input,
    'act_code',       v_act_code
  ));

  RETURN jsonb_build_object(
    'success',        true,
    'event_id',       v_event_id,
    'current_act_id', act_id_input
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_current_act(UUID) TO anon, authenticated;


-- =============================================================
-- 6. REPLACE admin_update_event_state
-- =============================================================
-- Replaces the 009 version to ensure EVENT_STATE_UPDATED
-- (now valid after step 1) is used cleanly. Logic unchanged.

CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status         TEXT    DEFAULT NULL,
  p_voting_open    BOOLEAN DEFAULT NULL,
  p_current_act_id UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id       UUID;
  v_current_status event_status;
  v_new_status     event_status;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only active admin users can update event state.';
  END IF;

  SELECT id, status INTO v_event_id, v_current_status
  FROM events ORDER BY (status = 'LIVE') DESC, created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;

    IF v_current_status = 'ENDED' AND v_new_status <> 'ENDED' THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION'
        USING HINT = 'An ended event cannot be reopened.';
    END IF;

    IF v_new_status = 'LIVE' AND v_current_status NOT IN ('DRAFT', 'READY', 'PAUSED') THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION'
        USING HINT = 'Event can only go live from READY or PAUSED state.';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  IF p_voting_open = true AND v_new_status <> 'LIVE' THEN
    RAISE EXCEPTION 'INVALID_VOTING_STATE'
      USING HINT = 'Voting can only be opened when the event status is LIVE.';
  END IF;

  UPDATE events
  SET status         = COALESCE(v_new_status, status),
      voting_open    = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at     = now()
  WHERE id = v_event_id;

  -- EVENT_STATE_UPDATED valid after step 1
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status',         v_new_status,
    'voting_open',    p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object(
    'success',  true,
    'event_id', v_event_id,
    'status',   v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  admin_update_event_state(TEXT, BOOLEAN, UUID)
  TO anon, authenticated;

-- ============================================================
-- END OF MIGRATION 010
-- ============================================================


-- ============================================================
-- MIGRATION 011 -- registration_production_fix
-- Source: supabase/migrations/20260920_011_registration_production_fix.sql
-- ============================================================

DROP POLICY IF EXISTS "acts_public_insert_pending" ON public.acts;

CREATE POLICY "acts_public_insert_pending"
ON public.acts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'PENDING'
);

DROP POLICY IF EXISTS "act_members_public_insert" ON public.act_members;

CREATE POLICY "act_members_public_insert"
ON public.act_members
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.acts
    WHERE acts.id = act_members.act_id
      AND acts.status = 'PENDING'
  )
);

DROP POLICY IF EXISTS "acts_public_delete_pending" ON public.acts;

CREATE POLICY "acts_public_delete_pending"
ON public.acts
FOR DELETE
TO anon, authenticated
USING (
  status = 'PENDING'
);

DROP POLICY IF EXISTS "act_members_public_delete" ON public.act_members;

CREATE POLICY "act_members_public_delete"
ON public.act_members
FOR DELETE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.acts
    WHERE acts.id = act_members.act_id
      AND acts.status = 'PENDING'
  )
);


-- ============================================================
-- MIGRATION 012 -- admin_registration_read_rls
-- Source: supabase/migrations/20260920_012_admin_registration_read_rls.sql
-- ============================================================

DROP POLICY IF EXISTS "acts_active_admin_select" ON public.acts;

CREATE POLICY "acts_active_admin_select"
ON public.acts
FOR SELECT
TO authenticated
USING (
  is_active_admin()
);

DROP POLICY IF EXISTS "act_members_active_admin_select" ON public.act_members;

CREATE POLICY "act_members_active_admin_select"
ON public.act_members
FOR SELECT
TO authenticated
USING (
  is_active_admin()
);


-- ============================================================
-- END OF PRODUCTION MIGRATION
-- ============================================================


-- ============================================================
-- END OF PRODUCTION MIGRATION
-- ============================================================

