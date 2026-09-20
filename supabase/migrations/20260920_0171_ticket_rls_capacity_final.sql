-- ============================================================================
-- Migration: 20260920_0171_ticket_rls_capacity_final.sql
-- Goal: Close Ticket RLS Bypass, Secure Presentation RPC & Scope Capacity Per Event
-- ============================================================================

-- ─── 1. DROP UNSECURE PUBLIC RLS POLICIES ON TICKETS ─────────────────────────
DROP POLICY IF EXISTS "tickets_public_insert" ON public.tickets;
DROP POLICY IF EXISTS tickets_public_insert ON public.tickets;
DROP POLICY IF EXISTS "tickets_public_read_paid" ON public.tickets;
DROP POLICY IF EXISTS tickets_public_read_paid ON public.tickets;

-- ─── 2. RE-ASSERT STRICT ACCOUNT RLS POLICIES ────────────────────────────────
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
DROP POLICY IF EXISTS tickets_admin_select ON public.tickets;

-- Authenticated audience user: SELECT only their own ticket
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT
  USING (user_id = auth.uid());

-- Active admins: SELECT all tickets for event administration
CREATE POLICY tickets_admin_select ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- NO direct INSERT or UPDATE policies exist for anon/authenticated.
-- Ticket creation is allowed ONLY via the SECURITY DEFINER purchase_tickets_atomic RPC.

-- ─── 3. SECURE TICKET CODE PRESENTATION RPC ──────────────────────────────────
-- Allows presentation lookup for /ticket?code= without exposing sensitive table fields or requiring public SELECT
CREATE OR REPLACE FUNCTION public.get_ticket_by_code(p_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  IF p_ticket_code IS NULL OR TRIM(p_ticket_code) = '' THEN
    RETURN NULL;
  END IF;

  SELECT ticket_code, buyer_name, buyer_email, buyer_phone, payment_status, created_at
  INTO v_ticket
  FROM tickets
  WHERE upper(ticket_code) = upper(trim(p_ticket_code))
    AND payment_status = 'PAID'
  LIMIT 1;

  IF v_ticket.ticket_code IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return ONLY minimal presentation fields required by TicketCard.
  -- Does NOT expose user_id, payment_reference, or database internal UUIDs.
  RETURN jsonb_build_object(
    'ticket_code',    v_ticket.ticket_code,
    'buyer_name',     v_ticket.buyer_name,
    'buyer_email',    v_ticket.buyer_email,
    'buyer_phone',    COALESCE(v_ticket.buyer_phone, ''),
    'payment_status', v_ticket.payment_status,
    'created_at',     v_ticket.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_by_code(TEXT) TO anon, authenticated;

-- ─── 4. BACKFILL & PER-EVENT UNIQUE CONSTRAINT ───────────────────────────────
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets (event_id);

-- Safely backfill any missing event_id using active/latest event
UPDATE public.tickets
SET event_id = (
  SELECT id FROM public.events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1
)
WHERE event_id IS NULL;

-- Partial unique index for active PAID tickets per user PER EVENT
DROP INDEX IF EXISTS public.tickets_user_active_unique;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_user_event_active_unique
  ON public.tickets (user_id, event_id)
  WHERE payment_status = 'PAID' AND user_id IS NOT NULL AND event_id IS NOT NULL;

-- ─── 5. HARDEN PURCHASE_TICKETS_ATOMIC RPC (PER-EVENT CAPACITY & auth.uid()) ─
DROP FUNCTION IF EXISTS public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.purchase_tickets_atomic(
  p_buyer_name     TEXT,
  p_buyer_email    TEXT,
  p_buyer_phone    TEXT,
  p_quantity       INTEGER DEFAULT 1,
  p_payment_method TEXT DEFAULT 'upi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
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
  v_existing_id  UUID;
BEGIN
  -- ── 1. Require Authenticated User (Server-Side auth.uid()) ───────────────
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'
      USING HINT = 'Sign in with Google before purchasing a Spotlight ticket.';
  END IF;

  -- ── 2. Enforce Quantity = 1 ──────────────────────────────────────────────
  IF p_quantity IS NULL OR p_quantity <> 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY'
      USING HINT = 'Each Spotlight account can purchase exactly one audience ticket.';
  END IF;

  -- ── 3. Validate Buyer Name and Email ─────────────────────────────────────
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

  -- ── 4. Enforce One Paid Ticket Per User Per Event ────────────────────────
  SELECT id INTO v_existing_id
  FROM tickets
  WHERE user_id = v_user_id AND event_id = v_event.id AND payment_status = 'PAID'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_HAS_TICKET'
      USING HINT = 'You already have an active Spotlight ticket.';
  END IF;

  v_max_capacity := COALESCE(v_event.capacity, 800);
  v_unit_price   := COALESCE(v_event.ticket_price, 10);

  -- ── 5. Count Paid Tickets Sold STRICTLY FOR THIS EVENT ───────────────────
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_tickets_sold
  FROM tickets
  WHERE event_id = v_event.id
    AND payment_status = 'PAID';

  IF (v_tickets_sold + 1) > v_max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED'
      USING HINT = format(
        'Event capacity reached. Available: %s, Requested: 1',
        v_max_capacity - v_tickets_sold
      );
  END IF;

  -- Generate shared order code and payment reference
  v_order_code := 'ORD-' || upper(
    substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)
  );
  v_pay_ref := 'MOCK-PAY-' || floor(random() * 899999 + 100000)::text;
  v_total_amount := 1 * v_unit_price;

  -- Generate ticket code and insert ticket row (linking v_user_id & v_event.id)
  v_ticket_code := 'SPT-TKT-2026-' || lpad(
    floor(random() * 899999 + 100000)::text, 6, '0'
  );

  INSERT INTO tickets (
    ticket_code,
    user_id,
    event_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    quantity,
    payment_status,
    payment_reference,
    issued_at
  ) VALUES (
    v_ticket_code,
    v_user_id,
    v_event.id,
    TRIM(p_buyer_name),
    TRIM(p_buyer_email),
    NULLIF(TRIM(p_buyer_phone), ''),
    1,
    'PAID',
    v_pay_ref,
    now()
  )
  RETURNING id INTO v_ticket_id;

  v_tickets := jsonb_build_array(
    jsonb_build_object(
      'id',          v_ticket_code,
      'ticket_code', v_ticket_code,
      'status',      'ACTIVE'
    )
  );

  RETURN jsonb_build_object(
    'success',      true,
    'order_id',     v_order_code,
    'order_code',   v_order_code,
    'quantity',     1,
    'total_amount', v_total_amount,
    'tickets',      v_tickets
  );
END;
$$;

-- Revoke execution from anonymous users
REVOKE EXECUTE ON FUNCTION public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) FROM anon, PUBLIC;

-- Grant execution to authenticated users ONLY
GRANT EXECUTE ON FUNCTION public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
