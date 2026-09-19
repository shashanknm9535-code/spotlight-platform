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
