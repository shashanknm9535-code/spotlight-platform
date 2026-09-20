-- ============================================================================
-- Migration: 20260920_018_ticket_email_deliveries.sql
-- Goal: Dedicated Ticket Email Delivery Tracking, Idempotency & Status Lookup
-- ============================================================================

-- ─── 1. CREATE TICKET EMAIL DELIVERIES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_ticket_email_deliveries_ticket_id 
  ON public.ticket_email_deliveries (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_email_deliveries_ticket_code 
  ON public.ticket_email_deliveries (ticket_code);
CREATE INDEX IF NOT EXISTS idx_ticket_email_deliveries_status 
  ON public.ticket_email_deliveries (status);

-- ─── 2. ROW LEVEL SECURITY (RLS) POLICIES ───────────────────────────────────
ALTER TABLE public.ticket_email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deliveries_select_own ON public.ticket_email_deliveries;
DROP POLICY IF EXISTS deliveries_admin_select ON public.ticket_email_deliveries;

-- Ticket owner can check delivery status for their own ticket
CREATE POLICY deliveries_select_own ON public.ticket_email_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_email_deliveries.ticket_id
        AND t.user_id = auth.uid()
    )
  );

-- Admin users can check delivery status for any ticket
CREATE POLICY deliveries_admin_select ON public.ticket_email_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Direct INSERT / UPDATE blocked for public/authenticated users.
-- Allowed strictly via Edge Function (Service Role) or SECURITY DEFINER functions.

-- ─── 3. EMAIL DELIVERY STATUS RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_delivery_status(p_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery RECORD;
BEGIN
  IF p_ticket_code IS NULL OR TRIM(p_ticket_code) = '' THEN
    RETURN jsonb_build_object('delivered', false, 'status', 'NOT_FOUND');
  END IF;

  SELECT status, recipient_email, sent_at, error_message, updated_at
  INTO v_delivery
  FROM ticket_email_deliveries
  WHERE upper(ticket_code) = upper(trim(p_ticket_code))
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_delivery.status IS NULL THEN
    RETURN jsonb_build_object('delivered', false, 'status', 'UNSENT');
  END IF;

  RETURN jsonb_build_object(
    'delivered',       (v_delivery.status = 'SENT'),
    'status',          v_delivery.status,
    'recipient_email', v_delivery.recipient_email,
    'sent_at',         v_delivery.sent_at,
    'error_message',   v_delivery.error_message,
    'updated_at',      v_delivery.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_delivery_status(TEXT) TO anon, authenticated;
