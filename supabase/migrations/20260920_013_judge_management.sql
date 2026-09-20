-- ============================================================
-- SPOTLIGHT — Judge Management & Scheduling Migration
-- File: supabase/migrations/20260920_013_judge_management.sql
-- ============================================================

-- ─── 1. CREATE judge_assignments TABLE ───────────────────────

CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  role_override TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_event_id ON public.judge_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge_id ON public.judge_assignments(judge_id);

-- ─── 2. ENABLE RLS & POLICIES ON judge_assignments ───────────

ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- Active admins full operational access
DROP POLICY IF EXISTS "judge_assignments_admin_all" ON public.judge_assignments;
CREATE POLICY "judge_assignments_admin_all"
  ON public.judge_assignments FOR ALL
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Authenticated judges can read their own assignments
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

-- ─── 3. ENSURE ACTIVE ADMINS CAN MANAGE judges TABLE ──────────

DROP POLICY IF EXISTS "judges_admin_all" ON public.judges;
CREATE POLICY "judges_admin_all"
  ON public.judges FOR ALL
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- ─── 4. ADMIN CREATE JUDGE RPC ───────────────────────────────

CREATE OR REPLACE FUNCTION admin_create_judge(
  p_name TEXT,
  p_email TEXT,
  p_is_anchor BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_code TEXT;
  v_next_num INTEGER;
  v_judge_id UUID;
  v_created TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admins can create judges.';
  END IF;

  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'INVALID_NAME' USING HINT = 'Judge full name is required.';
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' OR p_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'INVALID_EMAIL' USING HINT = 'Valid judge email address is required.';
  END IF;

  -- Generate next unique judge_code e.g. JUDGE-04
  SELECT COALESCE(MAX(CAST(SUBSTRING(judge_code FROM 7) AS INTEGER)), 0) + 1
  INTO v_next_num
  FROM judges
  WHERE judge_code LIKE 'JUDGE-%';

  v_judge_code := 'JUDGE-' || lpad(v_next_num::text, 2, '0');

  INSERT INTO judges (
    name, email, judge_code, is_anchor, is_active, created_at
  ) VALUES (
    TRIM(p_name), LOWER(TRIM(p_email)), v_judge_code, COALESCE(p_is_anchor, false), true, v_created
  )
  RETURNING id INTO v_judge_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_judge_id,
    'name', TRIM(p_name),
    'email', LOWER(TRIM(p_email)),
    'code', v_judge_code,
    'is_anchor', COALESCE(p_is_anchor, false),
    'is_active', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_judge(TEXT, TEXT, BOOLEAN) TO authenticated;
