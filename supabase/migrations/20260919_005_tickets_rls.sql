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
