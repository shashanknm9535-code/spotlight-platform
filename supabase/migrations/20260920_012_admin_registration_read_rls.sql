-- ============================================================
-- SPOTLIGHT — Admin Performer Registration Read RLS Policies
-- File: supabase/migrations/20260920_012_admin_registration_read_rls.sql
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
