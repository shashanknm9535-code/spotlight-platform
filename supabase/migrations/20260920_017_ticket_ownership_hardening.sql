-- ============================================================================
-- Migration: 20260920_017_ticket_ownership_hardening.sql
-- Goal: Hardened Authenticated Ticket Ownership (Per-Event, auth.uid() RPC, Anon Revocation)
-- ============================================================================

-- ─── 1. ADD EVENT_ID COLUMN & INDEX TO TICKETS ──────────────────────────────
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets (event_id);

-- Safely backfill existing ticket records with the current active event
UPDATE public.tickets
SET event_id = (
  SELECT id FROM public.events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1
)
WHERE event_id IS NULL;

-- ─── 2. PER-EVENT UNIQUE ACTIVE TICKET CONSTRAINT ──────────────────────────
-- Drop old global (user_id) unique index
DROP INDEX IF EXISTS public.tickets_user_active_unique;

-- Create partial unique index on (user_id, event_id) for active PAID tickets
CREATE UNIQUE INDEX IF NOT EXISTS tickets_user_event_active_unique
  ON public.tickets (user_id, event_id)
  WHERE payment_status = 'PAID' AND user_id IS NOT NULL AND event_id IS NOT NULL;

-- ─── 3. HARDEN PURCHASE_TICKETS_ATOMIC RPC (SERVER-SIDE auth.uid()) ─────────
-- Drop any existing variants to ensure clean signature
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

  -- Count total paid tickets sold
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_tickets_sold
  FROM tickets
  WHERE payment_status = 'PAID';

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
      'id',          v_ticket_id,
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

-- ─── 4. SECURITY PERMISSIONS & GRANTS ───────────────────────────────────────
-- Revoke execution from anonymous users
REVOKE EXECUTE ON FUNCTION public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) FROM anon, PUBLIC;

-- Grant execution to authenticated users ONLY
GRANT EXECUTE ON FUNCTION public.purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

-- ─── 5. TICKET RLS POLICIES ──────────────────────────────────────────────────
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
DROP POLICY IF EXISTS tickets_admin_select ON public.tickets;

-- Users can view their own tickets
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT
  USING (user_id = auth.uid());

-- Active admins can view all tickets for event control
CREATE POLICY tickets_admin_select ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );
