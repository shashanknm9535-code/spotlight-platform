-- ============================================================
-- SPOTLIGHT — Production Performer Registration RLS Fixes
-- File: supabase/migrations/20260920_011_registration_production_fix.sql
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
