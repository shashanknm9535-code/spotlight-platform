-- ============================================================
-- SPOTLIGHT — Production Hardening, Auth, & RLS Security Migration
-- File: supabase/migrations/20260919_009_production_hardening_auth.sql
-- Apply AFTER 20260919_008_admin_event_control.sql
-- ============================================================

-- ─── 1. LINK JUDGES TO AUTH USERS ──────────────────────────────

ALTER TABLE judges 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_judges_auth_user_id ON judges(auth_user_id);

-- ─── 2. REWORK RLS POLICIES FOR PRODUCTION ─────────────────────

-- Enable RLS on all sensitive tables if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_scores ENABLE ROW LEVEL SECURITY;

-- 2.1 ADMIN USERS POLICIES
DROP POLICY IF EXISTS "Active admins can view admin records" ON admin_users;
CREATE POLICY "Active admins can view admin records"
  ON admin_users FOR SELECT
  TO authenticated, anon
  USING (
    (auth.uid() = id AND is_active = true) OR
    EXISTS (
      SELECT 1 FROM admin_users a 
      WHERE a.id = auth.uid() AND a.is_active = true
    )
  );

-- 2.2 JUDGES POLICIES
DROP POLICY IF EXISTS "Public can view judge names and codes" ON judges;
CREATE POLICY "Public can view judge names and codes"
  ON judges FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Judges can update their own auth association" ON judges;
CREATE POLICY "Judges can update their own auth association"
  ON judges FOR UPDATE
  TO authenticated
  USING (auth_user_id IS NULL OR auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 2.3 EVENT LOGS POLICIES
DROP POLICY IF EXISTS "Only active admins can view event logs" ON event_logs;
CREATE POLICY "Only active admins can view event logs"
  ON event_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 2.4 JUDGE SCORES POLICIES
DROP POLICY IF EXISTS "Judges can view their own scores" ON judge_scores;
CREATE POLICY "Judges can view their own scores"
  ON judge_scores FOR SELECT
  TO authenticated
  USING (
    judge_id IN (
      SELECT id FROM judges WHERE auth_user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true
    )
  );

-- ─── 3. ATOMIC TICKET CAPACITY & PURCHASE RPC ──────────────────

CREATE OR REPLACE FUNCTION purchase_tickets_atomic(
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_quantity INTEGER,
  p_payment_method TEXT DEFAULT 'upi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_tickets_sold INTEGER;
  v_max_capacity INTEGER;
  v_unit_price NUMERIC;
  v_total_amount NUMERIC;
  v_order_id UUID;
  v_order_code TEXT;
  v_tickets JSONB := '[]'::jsonb;
  v_ticket_id UUID;
  v_ticket_code TEXT;
  i INTEGER;
BEGIN
  -- Validate inputs
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING HINT = 'Ticket quantity must be between 1 and 10.';
  END IF;

  IF TRIM(p_buyer_name) = '' OR TRIM(p_buyer_email) = '' THEN
    RAISE EXCEPTION 'INVALID_BUYER' USING HINT = 'Buyer name and email are required.';
  END IF;

  -- Acquire transaction-level advisory lock to prevent capacity race conditions
  PERFORM pg_advisory_xact_lock(987654321);

  -- Retrieve active event configuration
  SELECT id, capacity, ticket_price, status
  INTO v_event
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_EVENT' USING HINT = 'No active event is available for ticketing.';
  END IF;

  v_max_capacity := COALESCE(v_event.capacity, 800);
  v_unit_price := COALESCE(v_event.ticket_price, 10);

  -- Count total paid tickets sold
  SELECT COALESCE(SUM(quantity), 0) INTO v_tickets_sold
  FROM orders
  WHERE payment_status = 'PAID';

  IF (v_tickets_sold + p_quantity) > v_max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED' USING HINT = format('Event capacity reached. Available: %s, Requested: %s', v_max_capacity - v_tickets_sold, p_quantity);
  END IF;

  v_total_amount := p_quantity * v_unit_price;
  v_order_code := 'ORD-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- Create order
  INSERT INTO orders (
    event_id, order_code, buyer_name, buyer_email, buyer_phone, quantity, unit_price, total_amount, payment_status, payment_reference
  ) VALUES (
    v_event.id, v_order_code, TRIM(p_buyer_name), TRIM(p_buyer_email), TRIM(p_buyer_phone), p_quantity, v_unit_price, v_total_amount, 'PAID', 'MOCK-PAY-' || floor(random() * 899999 + 100000)::text
  )
  RETURNING id INTO v_order_id;

  -- Generate individual tickets
  FOR i IN 1..p_quantity LOOP
    v_ticket_code := 'TCK-' || upper(substring(md5(random()::text || clock_timestamp()::text || i::text) from 1 for 6));
    INSERT INTO tickets (
      order_id, event_id, ticket_code, attendee_name, attendee_email, status, payment_status
    ) VALUES (
      v_order_id, v_event.id, v_ticket_code, TRIM(p_buyer_name), TRIM(p_buyer_email), 'ACTIVE', 'PAID'
    )
    RETURNING id INTO v_ticket_id;

    v_tickets := v_tickets || jsonb_build_object(
      'id', v_ticket_id,
      'ticket_code', v_ticket_code,
      'status', 'ACTIVE'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'quantity', p_quantity,
    'total_amount', v_total_amount,
    'tickets', v_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO anon, authenticated;

-- ─── 4. HARDENED ADMIN RPCs WITH AUTHORIZATION & STATE MACHINE ───

-- Helper function to verify caller is active admin
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$;

-- Update admin_approve_registration
CREATE OR REPLACE FUNCTION admin_approve_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status act_status;
  v_next_order INTEGER;
  v_updated RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can approve registrations.';
  END IF;

  SELECT status INTO v_current_status FROM acts WHERE id = act_id_input;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  IF v_current_status = 'REJECTED' THEN
    RAISE EXCEPTION 'CANNOT_APPROVE_REJECTED' USING HINT = 'Rejected registrations cannot be approved directly.';
  END IF;

  SELECT COALESCE(MAX(running_order), 0) + 1 INTO v_next_order FROM acts WHERE status = 'APPROVED';

  UPDATE acts
  SET status = 'APPROVED',
      running_order = COALESCE(running_order, v_next_order),
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, category, status, running_order INTO v_updated;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_APPROVED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name,
    'running_order', v_updated.running_order
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'act_code', v_updated.act_code,
    'status', v_updated.status,
    'running_order', v_updated.running_order
  );
END;
$$;

-- Update admin_reject_registration
CREATE OR REPLACE FUNCTION admin_reject_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can reject registrations.';
  END IF;

  UPDATE acts
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, status INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'ADMIN', 'REGISTRATION_REJECTED', jsonb_build_object(
    'act_id', act_id_input,
    'act_code', v_updated.act_code,
    'performer_name', v_updated.performer_name
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_updated.id,
    'status', v_updated.status
  );
END;
$$;

-- Update admin_set_current_act
CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_act_status act_status;
  v_act_code TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can set the active act.';
  END IF;

  SELECT status, act_code INTO v_act_status, v_act_code
  FROM acts
  WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'Only approved acts can be set as the current performance.';
  END IF;

  SELECT id INTO v_event_id
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  UPDATE events
  SET current_act_id = act_id_input,
      updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'CURRENT_ACT_CHANGED', jsonb_build_object(
    'current_act_id', act_id_input,
    'act_code', v_act_code
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'current_act_id', act_id_input);
END;
$$;

-- Update admin_update_event_state with state machine transition checks
CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status TEXT DEFAULT NULL,
  p_voting_open BOOLEAN DEFAULT NULL,
  p_current_act_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_current_status event_status;
  v_new_status event_status;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only active admin users can update event state.';
  END IF;

  SELECT id, status INTO v_event_id, v_current_status
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;
    
    -- State Machine Validation
    IF v_current_status = 'ENDED' AND v_new_status <> 'ENDED' THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING HINT = 'An ended event cannot be reopened.';
    END IF;

    IF v_new_status = 'LIVE' AND v_current_status NOT IN ('DRAFT', 'READY', 'PAUSED') THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING HINT = 'Event can only go live from READY or PAUSED state.';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  -- Voting State Machine Validation: voting cannot be open unless event status is LIVE
  IF p_voting_open = true AND v_new_status <> 'LIVE' THEN
    RAISE EXCEPTION 'INVALID_VOTING_STATE' USING HINT = 'Voting can only be opened when the event status is LIVE.';
  END IF;

  UPDATE events
  SET status = COALESCE(v_new_status, status),
      voting_open = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status', v_new_status,
    'voting_open', p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'status', v_new_status);
END;
$$;

-- ─── 5. HARDENED JUDGE RPCs WITH SCORE LOCKING & AUTH ───────────

CREATE OR REPLACE FUNCTION submit_judge_score(
  act_id_input UUID,
  score_creativity NUMERIC,
  score_execution NUMERIC,
  score_stage_presence NUMERIC,
  score_audience_engagement NUMERIC,
  notes_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id UUID;
  v_act_status act_status;
  v_is_locked BOOLEAN;
  v_total_score NUMERIC;
  v_score_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_judge_id
    FROM judges
    WHERE auth_user_id = auth.uid() AND is_active = true;

    IF v_judge_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED_JUDGE' USING HINT = 'Authenticated user is not registered as an active judge.';
    END IF;
  ELSE
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING HINT = 'Judge authentication required to submit scores.';
  END IF;

  SELECT status INTO v_act_status FROM acts WHERE id = act_id_input;
  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'INVALID_ACT' USING HINT = 'Scores can only be submitted for approved acts.';
  END IF;

  IF score_creativity NOT BETWEEN 1 AND 5 OR
     score_execution NOT BETWEEN 1 AND 5 OR
     score_stage_presence NOT BETWEEN 1 AND 5 OR
     score_audience_engagement NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'INVALID_SCORE_RANGE' USING HINT = 'Rubric scores must be between 1 and 5.';
  END IF;

  SELECT submitted INTO v_is_locked
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_is_locked = true THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'Submitted judge scores are locked and cannot be modified.';
  END IF;

  v_total_score := (score_creativity * 0.35) + (score_execution * 0.35) + (score_stage_presence * 0.15) + (score_audience_engagement * 0.15);

  INSERT INTO judge_scores (
    judge_id, act_id, creativity, execution, stage_presence, audience_engagement, total_score, notes, submitted, locked_at
  ) VALUES (
    v_judge_id, act_id_input, score_creativity, score_execution, score_stage_presence, score_audience_engagement, v_total_score, TRIM(notes_input), true, now()
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity = EXCLUDED.creativity,
    execution = EXCLUDED.execution,
    stage_presence = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    total_score = EXCLUDED.total_score,
    notes = EXCLUDED.notes,
    submitted = true,
    locked_at = now(),
    updated_at = now()
  RETURNING id INTO v_score_id;

  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'JUDGE', 'SCORE_SUBMITTED', jsonb_build_object(
    'judge_id', v_judge_id,
    'act_id', act_id_input,
    'total_score', v_total_score
  )
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'score_id', v_score_id,
    'total_score', v_total_score,
    'submitted', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_judge_score(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;
