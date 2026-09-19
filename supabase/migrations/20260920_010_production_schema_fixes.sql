-- ============================================================
-- SPOTLIGHT -- Production Schema Fixes
-- File: supabase/migrations/20260920_010_production_schema_fixes.sql
-- Apply AFTER 20260919_009_production_hardening_auth.sql
-- ============================================================
--
-- Root causes addressed:
--
--   ISSUE 1+2 (009): purchase_tickets_atomic references a missing
--     `orders` table and inserts non-existent columns into `tickets`.
--     The existing application uses the flat tickets schema from 001.
--     Fix: Replace the function to operate against the real schema.
--
--   ISSUE 3 (009): The auth-based submit_judge_score overload (5 args)
--     references non-existent `total_score` and `locked_at` columns in
--     judge_scores, and uses a rubric (1-5) that contradicts the 001
--     schema CHECK constraints (0-3 / 0-2). The application exclusively
--     calls the 7-arg code-based overload from migration 007.
--     Fix: Drop the broken overload. The 7-arg overload from 007
--     (re-hardened in 009) remains and is the canonical implementation.
--
--   ISSUE 4 (008+009): admin_set_current_act inserts
--     'CURRENT_ACT_CHANGED' into event_logs.action but this value is
--     not in the event_log_action enum from migration 001.
--     Fix: Add the value to the enum before the function is called.
--
--   ISSUE 5 (008+009): admin_update_event_state inserts
--     'EVENT_STATE_UPDATED' and submit_judge_score (7-arg) inserts
--     'SCORE_SUBMITTED'. Neither value is in the enum from 001.
--     Fix: Add both values to the enum.
--
-- NOTE: Migrations 001-009 are preserved as historical migrations.
--   The broken functions in 008/009 parse successfully on a fresh
--   database (PostgreSQL validates plpgsql bodies lazily at call time).
--   This migration runs before any of those functions are called in
--   production, patching them before first use.
-- ============================================================

-- =============================================================
-- 1. ADD MISSING EVENT LOG ENUM VALUES
-- =============================================================
-- PostgreSQL enums require ALTER TYPE ... ADD VALUE.
-- IF NOT EXISTS prevents re-run errors.

ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'CURRENT_ACT_CHANGED';
ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'EVENT_STATE_UPDATED';
ALTER TYPE event_log_action ADD VALUE IF NOT EXISTS 'SCORE_SUBMITTED';


-- =============================================================
-- 2. REPLACE purchase_tickets_atomic
-- =============================================================
-- The 009 version references a non-existent `orders` table and
-- inserts wrong column names into `tickets`.
--
-- This replacement operates against the real `tickets` schema
-- defined in migration 001:
--   tickets(id, ticket_code, buyer_name, buyer_email, buyer_phone,
--           quantity, payment_status, payment_reference, issued_at,
--           created_at)
--
-- Business requirements preserved:
--   - Advisory lock prevents concurrent capacity over-sells
--   - Only PAID tickets count toward capacity (via quantity column)
--   - Each individual ticket record gets a unique SPT-TKT-XXXX code
--   - quantity=1 per row (one voting pass per ticket record)
--   - payment_reference stores a shared order code, enabling
--     adminService.ts to group tickets into display "orders"
--   - Returns { success, order_id, order_code, quantity,
--       total_amount, tickets: [{id, ticket_code, status}] }
--     matching the shape expected by ticketService.ts line 187-192

CREATE OR REPLACE FUNCTION purchase_tickets_atomic(
  p_buyer_name    TEXT,
  p_buyer_email   TEXT,
  p_buyer_phone   TEXT,
  p_quantity      INTEGER,
  p_payment_method TEXT DEFAULT 'upi'
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

  -- Count paid tickets sold (SUM quantity for future-compatibility)
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

  -- Insert one ticket record per pass (quantity=1 per row)
  FOR i IN 1..p_quantity LOOP
    v_ticket_code := 'SPT-TKT-2026-' || lpad(
      floor(random() * 899999 + 100000)::text, 6, '0'
    );

    INSERT INTO tickets (
      ticket_code,
      buyer_name,
      buyer_email,
      buyer_phone,
      quantity,
      payment_status,
      payment_reference,
      issued_at
    ) VALUES (
      v_ticket_code,
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

  -- Return shape matching ticketService.ts lines 187-212
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
  purchase_tickets_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT)
  TO anon, authenticated;


-- =============================================================
-- 3. DROP THE BROKEN AUTH-BASED submit_judge_score OVERLOAD
-- =============================================================
-- Migration 009 created a second overload with signature
-- (UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT).
-- This overload inserts non-existent columns `total_score` and
-- `locked_at`, uses rubric range 1-5 (violating CHECK constraints),
-- and is never called by the application (judgeService.ts calls
-- the 7-arg code-based overload exclusively).

DROP FUNCTION IF EXISTS
  submit_judge_score(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT);


-- =============================================================
-- 4. REPLACE submit_judge_score (7-arg, code-based, canonical)
-- =============================================================
-- The 009 version of the 7-arg overload is functionally correct
-- but inserts 'SCORE_SUBMITTED' which was not in the enum until
-- step 1 above. Replace now that the enum value is available.
--
-- Changes from 009 version:
--   - SCORE_SUBMITTED audit log is now valid (enum fixed)
--   - Rubric stays 0-3 / 0-3 / 0-2 / 0-2 (max 10), per 001 schema
--   - total is NOT stored (calculated client-side by scoreService)
--   - Score locking via submitted=true (existing mechanism, correct)
--   - No auth.uid() guard (judges use judge_code identity, not auth)

CREATE OR REPLACE FUNCTION submit_judge_score(
  judge_code_input          TEXT,
  act_id_input              UUID,
  creativity_input          INTEGER,
  execution_input           INTEGER,
  stage_presence_input      INTEGER,
  audience_engagement_input INTEGER,
  notes_input               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id           UUID;
  v_judge_active       BOOLEAN;
  v_act_status         act_status;
  v_existing_submitted BOOLEAN;
  v_score_id           UUID;
  v_now                TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate rubric ranges (0-3 / 0-3 / 0-2 / 0-2 = max 10)
  IF creativity_input IS NULL OR creativity_input < 0 OR creativity_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Creativity score must be between 0 and 3.';
  END IF;
  IF execution_input IS NULL OR execution_input < 0 OR execution_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Execution score must be between 0 and 3.';
  END IF;
  IF stage_presence_input IS NULL OR stage_presence_input < 0 OR stage_presence_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Stage presence score must be between 0 and 2.';
  END IF;
  IF audience_engagement_input IS NULL OR audience_engagement_input < 0 OR audience_engagement_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE'
      USING HINT = 'Audience engagement score must be between 0 and 2.';
  END IF;

  -- 2. Resolve judge identity from judge_code (e.g. JUDGE-01)
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, is_active INTO v_judge_id, v_judge_active
  FROM judges WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge_id IS NULL THEN
    BEGIN
      SELECT id, is_active INTO v_judge_id, v_judge_active
      FROM judges WHERE id = judge_code_input::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
    END;
  END IF;

  IF v_judge_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Invalid judge credentials.';
  END IF;

  IF NOT v_judge_active THEN
    RAISE EXCEPTION 'INACTIVE_JUDGE' USING HINT = 'This judge account is currently inactive.';
  END IF;

  -- 3. Verify act is APPROVED
  SELECT status INTO v_act_status FROM acts WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED'
      USING HINT = 'There is currently no approved act available for judging.';
  END IF;

  -- 4. Score locking check
  SELECT submitted INTO v_existing_submitted
  FROM judge_scores WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_existing_submitted IS TRUE THEN
    RAISE EXCEPTION 'SCORE_LOCKED'
      USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 5. Upsert score (total NOT stored, calculated by scoreService)
  INSERT INTO judge_scores (
    act_id, judge_id, creativity, execution,
    stage_presence, audience_engagement, notes,
    submitted, submitted_at
  ) VALUES (
    act_id_input, v_judge_id,
    creativity_input, execution_input,
    stage_presence_input, audience_engagement_input,
    TRIM(notes_input), true, v_now
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity          = EXCLUDED.creativity,
    execution           = EXCLUDED.execution,
    stage_presence      = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    notes               = EXCLUDED.notes,
    submitted           = true,
    submitted_at        = EXCLUDED.submitted_at,
    updated_at          = now()
  WHERE judge_scores.submitted = false
  RETURNING id INTO v_score_id;

  IF v_score_id IS NULL THEN
    RAISE EXCEPTION 'SCORE_LOCKED'
      USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 6. Audit log (SCORE_SUBMITTED now valid after step 1)
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  SELECT id, 'JUDGE', 'SCORE_SUBMITTED', jsonb_build_object(
    'judge_id', v_judge_id,
    'act_id',   act_id_input,
    'total',    (creativity_input + execution_input + stage_presence_input + audience_engagement_input)
  )
  FROM events ORDER BY created_at DESC LIMIT 1;

  -- 7. Return matching judgeService.ts line 183-196 expectations
  RETURN jsonb_build_object(
    'id',                 v_score_id,
    'actId',              act_id_input,
    'judgeId',            v_judge_id,
    'creativity',         creativity_input,
    'execution',          execution_input,
    'stagePresence',      stage_presence_input,
    'audienceEngagement', audience_engagement_input,
    'total',              (creativity_input + execution_input + stage_presence_input + audience_engagement_input),
    'notes',              COALESCE(TRIM(notes_input), ''),
    'submitted',          true,
    'createdAt',          v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  submit_judge_score(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT)
  TO anon, authenticated;


-- =============================================================
-- 5. REPLACE admin_set_current_act
-- =============================================================
-- Replaces the 009 version to ensure CURRENT_ACT_CHANGED
-- (now valid after step 1) is used cleanly. Logic unchanged.

CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id   UUID;
  v_act_status act_status;
  v_act_code   TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only active admin users can set the active act.';
  END IF;

  SELECT status, act_code INTO v_act_status, v_act_code
  FROM acts WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED'
      USING HINT = 'Only approved acts can be set as the current performance.';
  END IF;

  SELECT id INTO v_event_id
  FROM events ORDER BY (status = 'LIVE') DESC, created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  UPDATE events
  SET current_act_id = act_id_input, updated_at = now()
  WHERE id = v_event_id;

  -- CURRENT_ACT_CHANGED valid after step 1
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'CURRENT_ACT_CHANGED', jsonb_build_object(
    'current_act_id', act_id_input,
    'act_code',       v_act_code
  ));

  RETURN jsonb_build_object(
    'success',        true,
    'event_id',       v_event_id,
    'current_act_id', act_id_input
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_current_act(UUID) TO anon, authenticated;


-- =============================================================
-- 6. REPLACE admin_update_event_state
-- =============================================================
-- Replaces the 009 version to ensure EVENT_STATE_UPDATED
-- (now valid after step 1) is used cleanly. Logic unchanged.

CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status         TEXT    DEFAULT NULL,
  p_voting_open    BOOLEAN DEFAULT NULL,
  p_current_act_id UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id       UUID;
  v_current_status event_status;
  v_new_status     event_status;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_active_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only active admin users can update event state.';
  END IF;

  SELECT id, status INTO v_event_id, v_current_status
  FROM events ORDER BY (status = 'LIVE') DESC, created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;

    IF v_current_status = 'ENDED' AND v_new_status <> 'ENDED' THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION'
        USING HINT = 'An ended event cannot be reopened.';
    END IF;

    IF v_new_status = 'LIVE' AND v_current_status NOT IN ('DRAFT', 'READY', 'PAUSED') THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION'
        USING HINT = 'Event can only go live from READY or PAUSED state.';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  IF p_voting_open = true AND v_new_status <> 'LIVE' THEN
    RAISE EXCEPTION 'INVALID_VOTING_STATE'
      USING HINT = 'Voting can only be opened when the event status is LIVE.';
  END IF;

  UPDATE events
  SET status         = COALESCE(v_new_status, status),
      voting_open    = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at     = now()
  WHERE id = v_event_id;

  -- EVENT_STATE_UPDATED valid after step 1
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status',         v_new_status,
    'voting_open',    p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object(
    'success',  true,
    'event_id', v_event_id,
    'status',   v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  admin_update_event_state(TEXT, BOOLEAN, UUID)
  TO anon, authenticated;

-- ============================================================
-- END OF MIGRATION 010
-- ============================================================
