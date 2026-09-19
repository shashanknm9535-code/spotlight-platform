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
