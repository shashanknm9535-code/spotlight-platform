-- ============================================================
-- SPOTLIGHT — Secure Admin Event Control RPC Functions
-- File: supabase/migrations/20260919_008_admin_event_control.sql
-- Apply AFTER 20260919_007_secure_judging.sql
-- ============================================================
--
-- Security boundary for Admin Event Operations:
--   - Provides transactional operations for registration approvals,
--     running order management, event control, live voting state,
--     and stage display controls.
--   - Automatically logs every important action to event_logs table.
-- ============================================================

-- ─── 1. admin_approve_registration RPC ────────────────────────

CREATE OR REPLACE FUNCTION admin_approve_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status act_status;
  v_next_order INTEGER;
  v_updated RECORD;
BEGIN
  SELECT status INTO v_current_status
  FROM acts
  WHERE id = act_id_input;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  IF v_current_status = 'REJECTED' THEN
    RAISE EXCEPTION 'CANNOT_APPROVE_REJECTED' USING HINT = 'Rejected registrations cannot be approved directly.';
  END IF;

  -- Calculate next running_order position
  SELECT COALESCE(MAX(running_order), 0) + 1 INTO v_next_order
  FROM acts
  WHERE status = 'APPROVED';

  UPDATE acts
  SET status = 'APPROVED',
      running_order = COALESCE(running_order, v_next_order),
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, category, status, running_order INTO v_updated;

  -- Log administrative action to event_logs
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

GRANT EXECUTE ON FUNCTION admin_approve_registration(UUID) TO anon, authenticated;

-- ─── 2. admin_reject_registration RPC ─────────────────────────

CREATE OR REPLACE FUNCTION admin_reject_registration(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  UPDATE acts
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = act_id_input
  RETURNING id, act_code, title, performer_name, status INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'ACT_NOT_FOUND' USING HINT = 'Act registration not found.';
  END IF;

  -- Log administrative action
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

GRANT EXECUTE ON FUNCTION admin_reject_registration(UUID) TO anon, authenticated;

-- ─── 3. admin_set_current_act RPC ─────────────────────────────

CREATE OR REPLACE FUNCTION admin_set_current_act(
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_act_status act_status;
  v_act_code TEXT;
BEGIN
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

GRANT EXECUTE ON FUNCTION admin_set_current_act(UUID) TO anon, authenticated;

-- ─── 4. admin_update_event_state RPC ──────────────────────────

CREATE OR REPLACE FUNCTION admin_update_event_state(
  p_status TEXT DEFAULT NULL,
  p_voting_open BOOLEAN DEFAULT NULL,
  p_current_act_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_new_status event_status;
BEGIN
  SELECT id INTO v_event_id
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'NO_EVENT' USING HINT = 'No active event found.';
  END IF;

  IF p_status IS NOT NULL THEN
    v_new_status := p_status::event_status;
  END IF;

  UPDATE events
  SET status = COALESCE(v_new_status, status),
      voting_open = COALESCE(p_voting_open, voting_open),
      current_act_id = COALESCE(p_current_act_id, current_act_id),
      updated_at = now()
  WHERE id = v_event_id;

  -- Log action
  INSERT INTO event_logs (event_id, actor_type, action, metadata)
  VALUES (v_event_id, 'ADMIN', 'EVENT_STATE_UPDATED', jsonb_build_object(
    'status', p_status,
    'voting_open', p_voting_open,
    'current_act_id', p_current_act_id
  ));

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_event_state(TEXT, BOOLEAN, UUID) TO anon, authenticated;

-- ─── 5. admin_get_overview_stats RPC ──────────────────────────

CREATE OR REPLACE FUNCTION admin_get_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_total_registrations INTEGER;
  v_approved_acts INTEGER;
  v_tickets_sold INTEGER;
  v_tickets_revenue NUMERIC;
  v_total_votes INTEGER;
  v_judges_submitted INTEGER;
  v_total_judges INTEGER;
BEGIN
  SELECT id, current_act_id, status, voting_open, capacity, ticket_price
  INTO v_event
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  SELECT COUNT(*) INTO v_total_registrations FROM acts;
  SELECT COUNT(*) INTO v_approved_acts FROM acts WHERE status = 'APPROVED';
  
  SELECT COALESCE(SUM(quantity), 0) INTO v_tickets_sold 
  FROM tickets WHERE payment_status = 'PAID';

  v_tickets_revenue := v_tickets_sold * COALESCE(v_event.ticket_price, 10);

  SELECT COUNT(*) INTO v_total_votes FROM audience_votes;

  SELECT COUNT(DISTINCT judge_id) INTO v_judges_submitted 
  FROM judge_scores 
  WHERE act_id = v_event.current_act_id AND submitted = true;

  SELECT COUNT(*) INTO v_total_judges FROM judges WHERE is_active = true;

  RETURN jsonb_build_object(
    'total_registrations', v_total_registrations,
    'approved_acts', v_approved_acts,
    'tickets_sold', v_tickets_sold,
    'capacity', COALESCE(v_event.capacity, 800),
    'tickets_revenue', v_tickets_revenue,
    'total_votes', v_total_votes,
    'judges_submitted', v_judges_submitted,
    'total_judges', v_total_judges,
    'event_status', COALESCE(v_event.status::text, 'LIVE'),
    'voting_open', COALESCE(v_event.voting_open, false),
    'current_act_id', v_event.current_act_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_overview_stats() TO anon, authenticated;
