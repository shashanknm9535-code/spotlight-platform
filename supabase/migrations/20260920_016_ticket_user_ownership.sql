-- ============================================================================
-- Migration: 20260920_016_ticket_user_ownership.sql
-- Goal: Connect Audience Tickets to Spotlight Auth Identity (user_id + RLS + constraint)
-- ============================================================================

-- ─── 1. ADD USER_ID COLUMN & INDEXES TO TICKETS ───────────────────────────────
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets (user_id);

-- Enforce ONE active ticket per authenticated user per event (at DB level)
-- Partial unique index applies only when payment_status = 'PAID' and user_id is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS tickets_user_active_unique
  ON public.tickets (user_id)
  WHERE payment_status = 'PAID' AND user_id IS NOT NULL;

-- ─── 2. UPDATE PURCHASE_TICKETS_ATOMIC RPC WITH USER_ID & DUPLICATE CHECK ────
CREATE OR REPLACE FUNCTION purchase_tickets_atomic(
  p_buyer_name     TEXT,
  p_buyer_email    TEXT,
  p_buyer_phone    TEXT,
  p_quantity       INTEGER,
  p_payment_method TEXT DEFAULT 'upi',
  p_user_id        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
  i              INTEGER;
BEGIN
  -- Input validation
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY'
      USING HINT = 'Ticket quantity must be between 1 and 10.';
  END IF;

  IF TRIM(p_buyer_name) = '' OR TRIM(p_buyer_email) = '' THEN
    RAISE EXCEPTION 'INVALID_BUYER'
      USING HINT = 'Buyer name and email are required.';
  END IF;

  -- ── Check Duplicate Active Ticket for Authenticated User ──────────────────
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM tickets
    WHERE user_id = p_user_id AND payment_status = 'PAID'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'ALREADY_HAS_TICKET'
        USING HINT = 'You already have an active Spotlight ticket.';
    END IF;
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

  v_max_capacity := COALESCE(v_event.capacity, 800);
  v_unit_price   := COALESCE(v_event.ticket_price, 10);

  -- Count paid tickets sold
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_tickets_sold
  FROM tickets
  WHERE payment_status = 'PAID';

  IF (v_tickets_sold + p_quantity) > v_max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED'
      USING HINT = format(
        'Event capacity reached. Available: %s, Requested: %s',
        v_max_capacity - v_tickets_sold, p_quantity
      );
  END IF;

  -- Generate shared order code and payment reference
  v_order_code := 'ORD-' || upper(
    substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)
  );
  v_pay_ref := 'MOCK-PAY-' || floor(random() * 899999 + 100000)::text;
  v_total_amount := p_quantity * v_unit_price;

  -- Insert ticket records (linking user_id)
  FOR i IN 1..p_quantity LOOP
    v_ticket_code := 'SPT-TKT-2026-' || lpad(
      floor(random() * 899999 + 100000)::text, 6, '0'
    );

    INSERT INTO tickets (
      ticket_code,
      user_id,
      buyer_name,
      buyer_email,
      buyer_phone,
      quantity,
      payment_status,
      payment_reference,
      issued_at
    ) VALUES (
      v_ticket_code,
      p_user_id,
      TRIM(p_buyer_name),
      TRIM(p_buyer_email),
      NULLIF(TRIM(p_buyer_phone), ''),
      1,
      'PAID',
      v_pay_ref,
      now()
    )
    RETURNING id INTO v_ticket_id;

    v_tickets := v_tickets || jsonb_build_object(
      'id',          v_ticket_id,
      'ticket_code', v_ticket_code,
      'status',      'ACTIVE'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'order_id',     v_order_code,
    'order_code',   v_order_code,
    'quantity',     p_quantity,
    'total_amount', v_total_amount,
    'tickets',      v_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT, UUID)
  TO anon, authenticated;

-- ─── 3. TICKET RLS POLICIES ──────────────────────────────────────────────────
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
DROP POLICY IF EXISTS tickets_admin_select ON public.tickets;

-- Users can view their own ticket
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Active admins can view all tickets for event control
CREATE POLICY tickets_admin_select ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );
