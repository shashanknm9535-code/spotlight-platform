-- ============================================================================
-- Migration: 20260920_019_volunteer_entry_system.sql
-- Goal: Volunteer Identity, Venue Entry Gate Control & Atomic Single-Entry Scanner
-- ============================================================================

-- ─── 1. ADD ENTRY GATE CONTROL COLUMN TO EVENTS TABLE ───────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS entry_scanning_open BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. CREATE VOLUNTEERS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.volunteers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  volunteer_code TEXT        NOT NULL UNIQUE, -- e.g. VOL-01, VOL-02
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_auth_user_id ON public.volunteers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_code ON public.volunteers(volunteer_code);

-- ─── 3. CREATE EVENT ENTRIES TABLE (SINGLE ENTRY PER TICKET PER EVENT) ──────
CREATE TABLE IF NOT EXISTS public.event_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id    UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  volunteer_id UUID        REFERENCES public.volunteers(id) ON DELETE SET NULL,
  scanned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_status TEXT        NOT NULL DEFAULT 'ENTERED' CHECK (entry_status IN ('ENTERED', 'DENIED')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CONCURRENCY GUARD: Guarantees exactly 1 successful entry per ticket per event
  CONSTRAINT uq_event_ticket_entry UNIQUE (event_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_event_entries_event_id ON public.event_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_event_entries_ticket_id ON public.event_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_entries_volunteer_id ON public.event_entries(volunteer_id);

-- ─── 4. ROW LEVEL SECURITY (RLS) POLICIES ───────────────────────────────────
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteers_own_select ON public.volunteers;
DROP POLICY IF EXISTS volunteers_admin_all ON public.volunteers;
DROP POLICY IF EXISTS event_entries_volunteer_select ON public.event_entries;
DROP POLICY IF EXISTS event_entries_admin_select ON public.event_entries;

-- Volunteers can read their own profile
CREATE POLICY volunteers_own_select ON public.volunteers
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Active Admins have full access to volunteers table
CREATE POLICY volunteers_admin_all ON public.volunteers
  FOR ALL
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Active Volunteers can read entry logs for scanner verification
CREATE POLICY event_entries_volunteer_select ON public.event_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteers v
      WHERE v.auth_user_id = auth.uid() AND v.is_active = true
    )
  );

-- Active Admins can read all entry records
CREATE POLICY event_entries_admin_select ON public.event_entries
  FOR SELECT
  TO authenticated
  USING (is_active_admin());

-- Direct INSERT/UPDATE blocked for public/authenticated users.
-- Entry records MUST be created via SECURITY DEFINER RPC record_ticket_entry.

-- ─── 5. ATOMIC TICKET ENTRY RPC ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_ticket_entry(p_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_volunteer_id UUID;
  v_volunteer_name TEXT;
  v_ticket       RECORD;
  v_event        RECORD;
  v_existing     RECORD;
  v_entry_id     UUID;
BEGIN
  -- 1. Verify caller is an active volunteer or active admin
  SELECT id, name INTO v_volunteer_id, v_volunteer_name
  FROM public.volunteers
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;

  IF v_volunteer_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true) THEN
      RETURN jsonb_build_object(
        'success', false,
        'result_code', 'UNAUTHORIZED_VOLUNTEER',
        'message', 'Only authorized event volunteers can scan entry passes.'
      );
    END IF;
  END IF;

  -- 2. Validate ticket code input
  IF p_ticket_code IS NULL OR TRIM(p_ticket_code) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'INVALID_TICKET',
      'message', 'No ticket pass code provided.'
    );
  END IF;

  -- 3. Resolve active event & gate status
  SELECT id, name, status, entry_scanning_open
  INTO v_event
  FROM public.events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'NO_ACTIVE_EVENT',
      'message', 'No active event is available for ticketing entry.'
    );
  END IF;

  -- 4. Check if Entry Gate Scanning is OPEN
  IF NOT COALESCE(v_event.entry_scanning_open, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'ENTRY_CLOSED',
      'message', 'Venue entry scanning is currently CLOSED by event administration.'
    );
  END IF;

  -- 5. Look up Ticket in database by ticket_code (Server-side validation)
  SELECT id, ticket_code, user_id, event_id, buyer_name, buyer_email, payment_status
  INTO v_ticket
  FROM public.tickets
  WHERE upper(ticket_code) = upper(trim(p_ticket_code))
  LIMIT 1;

  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'INVALID_TICKET',
      'message', 'Ticket pass not found in event registry.'
    );
  END IF;

  -- 6. Check Payment Status
  IF v_ticket.payment_status <> 'PAID' THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'UNPAID_TICKET',
      'message', 'Ticket payment status is not confirmed (Unpaid or Cancelled).'
    );
  END IF;

  -- 7. Check Event Match
  IF v_ticket.event_id IS NOT NULL AND v_ticket.event_id <> v_event.id THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'WRONG_EVENT',
      'message', 'This ticket pass belongs to a different event.'
    );
  END IF;

  -- Advisory lock on ticket ID for transaction serialization
  PERFORM pg_advisory_xact_lock(hashtext('entry_' || v_ticket.id::text));

  -- 8. Check if ticket has already been entered
  SELECT ee.id, ee.scanned_at, v.name AS volunteer_name
  INTO v_existing
  FROM public.event_entries ee
  LEFT JOIN public.volunteers v ON v.id = ee.volunteer_id
  WHERE ee.event_id = v_event.id AND ee.ticket_id = v_ticket.id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'result_code', 'ALREADY_ENTERED',
      'message', 'Attendee has ALREADY ENTERED the venue.',
      'first_scanned_at', v_existing.scanned_at,
      'scanned_by', COALESCE(v_existing.volunteer_name, 'Gate Volunteer'),
      'attendee_name', v_ticket.buyer_name,
      'ticket_code', v_ticket.ticket_code
    );
  END IF;

  -- 9. Insert Entry Record Atomically
  -- Nested block catches unique_violation from the UNIQUE(event_id, ticket_id)
  -- constraint in the extremely rare case where the advisory lock window was
  -- bypassed by a concurrent transaction. Returns ALREADY_ENTERED instead of
  -- propagating a raw PostgreSQL error.
  BEGIN
    INSERT INTO public.event_entries (
      event_id, ticket_id, user_id, volunteer_id, scanned_at, entry_status
    ) VALUES (
      v_event.id, v_ticket.id, v_ticket.user_id, v_volunteer_id, now(), 'ENTERED'
    )
    RETURNING id INTO v_entry_id;

  EXCEPTION
    WHEN unique_violation THEN
      -- Race edge-case: another session inserted between our advisory lock
      -- and this INSERT. Re-fetch the winning entry and return ALREADY_ENTERED.
      SELECT ee.id, ee.scanned_at, v.name AS volunteer_name
      INTO v_existing
      FROM public.event_entries ee
      LEFT JOIN public.volunteers v ON v.id = ee.volunteer_id
      WHERE ee.event_id = v_event.id AND ee.ticket_id = v_ticket.id
      LIMIT 1;

      RETURN jsonb_build_object(
        'success',         false,
        'result_code',     'ALREADY_ENTERED',
        'message',         'Attendee has ALREADY ENTERED the venue.',
        'first_scanned_at', v_existing.scanned_at,
        'scanned_by',      COALESCE(v_existing.volunteer_name, 'Gate Volunteer'),
        'attendee_name',   v_ticket.buyer_name,
        'ticket_code',     v_ticket.ticket_code
      );
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'result_code',   'VALID_ENTRY',
    'message',       'ENTRY GRANTED',
    'attendee_name', v_ticket.buyer_name,
    'ticket_code',   v_ticket.ticket_code,
    'scanned_at',    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ticket_entry(TEXT) TO authenticated;

-- ─── 6. ADMIN VOLUNTEER & ENTRY STATS RPCs ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_volunteers()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admins can view volunteer roster.';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',            v.id,
          'volunteerCode', v.volunteer_code,
          'name',          v.name,
          'email',         v.email,
          'phone',         v.phone,
          'isActive',      v.is_active,
          'authUserId',    v.auth_user_id,
          'scansCount',    (SELECT COUNT(*) FROM public.event_entries ee WHERE ee.volunteer_id = v.id),
          'createdAt',     v.created_at,
          'updatedAt',     v.updated_at
        )
        ORDER BY v.created_at DESC
      ),
      '[]'::jsonb
    )
    FROM public.volunteers v
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_volunteers() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_entry_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_total_entries INT;
  v_total_paid_tickets INT;
  v_scanning_open BOOLEAN;
BEGIN
  IF NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admins can view entry stats.';
  END IF;

  SELECT id, entry_scanning_open INTO v_event_id, v_scanning_open
  FROM public.events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('totalEntries', 0, 'totalPaidTickets', 0, 'scanningOpen', false, 'recentEntries', '[]'::jsonb);
  END IF;

  SELECT COUNT(*) INTO v_total_entries
  FROM public.event_entries WHERE event_id = v_event_id;

  SELECT COUNT(*) INTO v_total_paid_tickets
  FROM public.tickets WHERE event_id = v_event_id AND payment_status = 'PAID';

  RETURN jsonb_build_object(
    'totalEntries',     v_total_entries,
    'totalPaidTickets', v_total_paid_tickets,
    'scanningOpen',     COALESCE(v_scanning_open, false),
    'recentEntries',    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',            ee.id,
            'ticketCode',    t.ticket_code,
            'attendeeName',  t.buyer_name,
            'volunteerName', COALESCE(v.name, 'Gate Volunteer'),
            'scannedAt',     ee.scanned_at
          )
          ORDER BY ee.scanned_at DESC
        ),
        '[]'::jsonb
      )
      FROM public.event_entries ee
      JOIN public.tickets t ON t.id = ee.ticket_id
      LEFT JOIN public.volunteers v ON v.id = ee.volunteer_id
      WHERE ee.event_id = v_event_id
      LIMIT 20
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_entry_stats(UUID) TO authenticated;

-- ─── 7. GOOGLE IDENTITY AUTO-LINK RPC ────────────────────────────────────────
-- Called server-side when a volunteer signs in with Google.
-- Matches auth.uid() → auth.users.email → volunteers.email (normalized).
-- Updates volunteers.auth_user_id only when:
--   • The email matches exactly one active volunteer row
--   • That row has auth_user_id IS NULL (not yet claimed)
-- Fails safely for 0 matches, >1 matches, or concurrent claim attempts.
-- No frontend email claim is trusted — email is read from auth.users.
CREATE OR REPLACE FUNCTION public.link_volunteer_google_identity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id    UUID;
  v_caller_email TEXT;
  v_volunteer_id UUID;
  v_match_count  INT;
BEGIN
  -- 1. Identify the calling Supabase Auth user (trusted JWT)
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Not authenticated'
    );
  END IF;

  -- 2. Read email from auth.users — NOT from any frontend claim
  --    Normalise: lowercase + trim to survive provider inconsistencies
  SELECT lower(trim(u.email)) INTO v_caller_email
  FROM auth.users u
  WHERE u.id = v_caller_id;

  IF v_caller_email IS NULL OR v_caller_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'No email associated with this Google account'
    );
  END IF;

  -- 3. Check if already linked (idempotent re-entry)
  SELECT id INTO v_volunteer_id
  FROM public.volunteers
  WHERE auth_user_id = v_caller_id
    AND is_active = true
  LIMIT 1;

  IF v_volunteer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',        true,
      'already_linked', true,
      'volunteer_id',   v_volunteer_id
    );
  END IF;

  -- 4. Count pending volunteer records that match this email
  SELECT COUNT(*) INTO v_match_count
  FROM public.volunteers
  WHERE lower(trim(email)) = v_caller_email
    AND auth_user_id IS NULL
    AND is_active = true;

  IF v_match_count = 0 THEN
    -- No pending record → this Google account is not registered as a volunteer
    RETURN jsonb_build_object(
      'success', false,
      'error',   'No pending volunteer record found for this Google account'
    );
  END IF;

  IF v_match_count > 1 THEN
    -- Multiple pending records for same email → admin must resolve before linking
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Multiple pending volunteer records found for this email. Contact the event admin.'
    );
  END IF;

  -- 5. Exactly one match — atomically claim it
  --    The WHERE clause re-checks auth_user_id IS NULL to prevent a concurrent
  --    session from double-linking if two tabs sign in simultaneously.
  UPDATE public.volunteers
  SET    auth_user_id = v_caller_id,
         updated_at   = now()
  WHERE  lower(trim(email)) = v_caller_email
    AND  auth_user_id IS NULL
    AND  is_active = true
  RETURNING id INTO v_volunteer_id;

  IF v_volunteer_id IS NULL THEN
    -- Concurrent session won the race — treat as already linked
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Volunteer link conflict — another session claimed this record. Please sign out and back in.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'already_linked', false,
    'volunteer_id',   v_volunteer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_volunteer_google_identity() TO authenticated;

-- ─── 8. ADMIN SET ENTRY SCANNING GATE RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_entry_scanning(p_open BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admins can modify entry gate state.';
  END IF;

  SELECT id INTO v_event_id
  FROM public.events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active event found.');
  END IF;

  UPDATE public.events
  SET entry_scanning_open = p_open,
      updated_at = now()
  WHERE id = v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'scanning_open', p_open
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_entry_scanning(BOOLEAN) TO authenticated;

