-- ============================================================
-- SPOTLIGHT — Judge Auth & Scheduling Completion
-- File: supabase/migrations/20260920_014_judge_auth_scheduling_completion.sql
-- Apply AFTER: 20260920_013_judge_management.sql
-- ============================================================
-- NOTE: Migration 013 creates judge_assignments table and judges_admin_all
-- policy. This migration only adds on top of that — no duplication.
-- ============================================================

-- ─── 1. PREVENT DUPLICATE AUTH_USER_ID ON judges ────────────────
-- Ensures retrying judge creation never creates two judge rows for
-- the same Auth user. Edge Function checks email first, but this is
-- Idempotently add unique constraint on auth_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'judges_auth_user_id_unique'
      AND conrelid = 'public.judges'::regclass
  ) THEN
    ALTER TABLE public.judges
      ADD CONSTRAINT judges_auth_user_id_unique UNIQUE (auth_user_id);
  END IF;
END $$;

-- ─── 2. JUDGES CAN READ THEIR OWN RECORD ─────────────────────────
-- Required so judges can resolve their own identity on the /judge page
-- without requiring admin-level access.
-- Migration 009 added "Public can view judge names and codes" (is_active only).
-- This adds a more targeted policy for self-identification.

DROP POLICY IF EXISTS "judges_own_select" ON public.judges;
CREATE POLICY "judges_own_select"
  ON public.judges FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- ─── 3. JUDGES SELECT THEIR OWN ASSIGNMENTS ──────────────────────
-- Already in migration 013, but re-stated here idempotently in case
-- 013 was not yet applied.

DROP POLICY IF EXISTS "judge_assignments_own_select" ON public.judge_assignments;
CREATE POLICY "judge_assignments_own_select"
  ON public.judge_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.judges
      WHERE judges.id = judge_assignments.judge_id
        AND judges.auth_user_id = auth.uid()
        AND judges.is_active = true
    )
  );

-- ─── 4. ADMIN FULL CRUD ON judge_assignments ─────────────────────
-- Re-stated idempotently from migration 013.

DROP POLICY IF EXISTS "judge_assignments_admin_all" ON public.judge_assignments;
CREATE POLICY "judge_assignments_admin_all"
  ON public.judge_assignments FOR ALL
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- ─── 5. ENSURE judge_assignments HAS RLS ENABLED ─────────────────
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- ─── 6. SAFE GET-EVENT-ID HELPER FOR ASSIGNMENTS ─────────────────
-- Returns the most recent event id, used when creating assignments
-- without requiring the admin to know the event UUID.
CREATE OR REPLACE FUNCTION get_current_event_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.events
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_current_event_id() TO authenticated;

-- ─── 7. RPC: admin_get_judge_assignments ─────────────────────────
-- Returns all assignments joined with judge name/code for display.
-- Active admins only.

CREATE OR REPLACE FUNCTION admin_get_judge_assignments(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admins can view all assignments.';
  END IF;

  v_event_id := COALESCE(p_event_id, get_current_event_id());

  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',            ja.id,
        'eventId',       ja.event_id,
        'judgeId',       ja.judge_id,
        'judgeName',     j.name,
        'judgeCode',     j.judge_code,
        'judgeIsAnchor', j.is_anchor,
        'startTime',     ja.start_time,
        'endTime',       ja.end_time,
        'roleOverride',  ja.role_override,
        'notes',         ja.notes,
        'createdAt',     ja.created_at,
        'updatedAt',     ja.updated_at
      )
      ORDER BY ja.start_time ASC
    )
    FROM public.judge_assignments ja
    JOIN public.judges j ON j.id = ja.judge_id
    WHERE ja.event_id = v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_judge_assignments(UUID) TO authenticated;

-- ─── 8. RPC: get_my_judge_assignments ────────────────────────────
-- Returns this judge's own assignments for the current event.
-- Judges can only see their own; uses auth.uid() to resolve judge_id.

CREATE OR REPLACE FUNCTION get_my_judge_assignments(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id UUID;
  v_event_id UUID;
BEGIN
  -- Resolve judge from auth.uid()
  SELECT id INTO v_judge_id
  FROM public.judges
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF v_judge_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  v_event_id := COALESCE(p_event_id, get_current_event_id());

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',           ja.id,
          'eventId',      ja.event_id,
          'judgeId',      ja.judge_id,
          'startTime',    ja.start_time,
          'endTime',      ja.end_time,
          'roleOverride', ja.role_override,
          'notes',        ja.notes
        )
        ORDER BY ja.start_time ASC
      ),
      '[]'::JSONB
    )
    FROM public.judge_assignments ja
    WHERE ja.judge_id = v_judge_id
      AND ja.event_id = v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_judge_assignments(UUID) TO authenticated;
