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
