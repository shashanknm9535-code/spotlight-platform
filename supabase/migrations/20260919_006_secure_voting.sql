-- ============================================================
-- SPOTLIGHT — Secure Audience Voting RPC Functions
-- File: supabase/migrations/20260919_006_secure_voting.sql
-- Apply AFTER 20260919_005_tickets_rls.sql
-- ============================================================
--
-- Security boundary for audience voting:
--   - Public client passes (ticket_code, rating) ONLY.
--   - Database determines current LIVE event and current APPROVED act.
--   - Prevents client manipulation of act_id or voting for past/future acts.
--   - Enforces 1–10 rating validation and UNIQUE(ticket_id, act_id) constraint.
-- ============================================================

-- ─── 1. submit_audience_vote RPC ───────────────────────────────

CREATE OR REPLACE FUNCTION submit_audience_vote(
  ticket_code_input TEXT,
  rating_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current_act_id UUID;
  v_event_status event_status;
  v_voting_open BOOLEAN;
  v_act_status act_status;
  v_act_title TEXT;
  v_performer_name TEXT;
  v_slot_number INTEGER;
  v_ticket_id UUID;
  v_ticket_payment payment_status;
  v_existing_vote_id UUID;
  v_vote_id UUID;
BEGIN
  -- 1. Validate rating (1–10)
  IF rating_input IS NULL OR rating_input < 1 OR rating_input > 10 THEN
    RAISE EXCEPTION 'INVALID_RATING' USING HINT = 'Please select a rating from 1 to 10.';
  END IF;

  -- 2. Normalize ticket code input
  ticket_code_input := UPPER(TRIM(ticket_code_input));
  IF ticket_code_input IS NULL OR length(ticket_code_input) < 5 THEN
    RAISE EXCEPTION 'INVALID_TICKET' USING HINT = 'This ticket is not valid for voting.';
  END IF;

  -- 3. Lookup ticket & confirm payment_status = PAID
  SELECT id, payment_status INTO v_ticket_id, v_ticket_payment
  FROM tickets
  WHERE UPPER(ticket_code) = ticket_code_input;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TICKET' USING HINT = 'This ticket is not valid for voting.';
  END IF;

  IF v_ticket_payment <> 'PAID' THEN
    RAISE EXCEPTION 'UNPAID_TICKET' USING HINT = 'This ticket has not been paid for.';
  END IF;

  -- 4. Lookup active LIVE event
  SELECT id, current_act_id, status, voting_open
  INTO v_event_id, v_current_act_id, v_event_status, v_voting_open
  FROM events
  WHERE status = 'LIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL OR v_event_status <> 'LIVE' OR NOT v_voting_open OR v_current_act_id IS NULL THEN
    RAISE EXCEPTION 'VOTING_CLOSED' USING HINT = 'Voting is currently closed.';
  END IF;

  -- 5. Lookup current act & verify APPROVED status
  SELECT status, title, performer_name, running_order
  INTO v_act_status, v_act_title, v_performer_name, v_slot_number
  FROM acts
  WHERE id = v_current_act_id;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'Voting is only available for approved performances.';
  END IF;

  -- 6. Check if ticket has already voted for current act
  SELECT id INTO v_existing_vote_id
  FROM audience_votes
  WHERE ticket_id = v_ticket_id AND act_id = v_current_act_id;

  IF v_existing_vote_id IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_VOTED' USING HINT = 'You have already voted for this act.';
  END IF;

  -- 7. Insert vote securely into audience_votes (handles race condition)
  BEGIN
    INSERT INTO audience_votes (ticket_id, act_id, rating)
    VALUES (v_ticket_id, v_current_act_id, rating_input)
    RETURNING id INTO v_vote_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED' USING HINT = 'You have already voted for this act.';
  END;

  -- 8. Return JSON payload describing success
  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'ticket_id', v_ticket_id,
    'act_id', v_current_act_id,
    'rating', rating_input,
    'act_title', v_act_title,
    'performer_name', v_performer_name,
    'slot_number', v_slot_number
  );
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION submit_audience_vote(TEXT, INTEGER) TO anon, authenticated;

-- ─── 2. get_current_voting_state RPC ───────────────────────────

CREATE OR REPLACE FUNCTION get_current_voting_state(
  ticket_code_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current_act_id UUID;
  v_event_status event_status;
  v_voting_open BOOLEAN;
  v_act RECORD;
  v_ticket_id UUID;
  v_voted_rating INTEGER := NULL;
  v_has_voted BOOLEAN := false;
BEGIN
  -- Lookup active LIVE event (or fallback to latest event)
  SELECT id, current_act_id, status, voting_open
  INTO v_event_id, v_current_act_id, v_event_status, v_voting_open
  FROM events
  ORDER BY (status = 'LIVE') DESC, created_at DESC
  LIMIT 1;

  IF v_current_act_id IS NOT NULL THEN
    SELECT id, act_code, category, title, performer_name, department, year, photo_url, performance_type, bio, running_order
    INTO v_act
    FROM acts
    WHERE id = v_current_act_id;
  END IF;

  -- Check vote status for ticket if ticket_code provided
  IF ticket_code_input IS NOT NULL AND length(TRIM(ticket_code_input)) >= 5 THEN
    SELECT id INTO v_ticket_id FROM tickets WHERE UPPER(ticket_code) = UPPER(TRIM(ticket_code_input)) AND payment_status = 'PAID';
    
    IF v_ticket_id IS NOT NULL AND v_current_act_id IS NOT NULL THEN
      SELECT rating INTO v_voted_rating
      FROM audience_votes
      WHERE ticket_id = v_ticket_id AND act_id = v_current_act_id;
      
      IF v_voted_rating IS NOT NULL THEN
        v_has_voted := true;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'event_status', COALESCE(v_event_status, 'DRAFT'),
    'voting_open', COALESCE(v_voting_open, false),
    'current_act', CASE WHEN v_act.id IS NOT NULL THEN jsonb_build_object(
      'id', v_act.id,
      'act_code', v_act.act_code,
      'category', LOWER(v_act.category::text),
      'title', v_act.title,
      'performer_name', v_act.performer_name,
      'department', COALESCE(v_act.department, ''),
      'year', COALESCE(v_act.year, ''),
      'photo_url', COALESCE(v_act.photo_url, ''),
      'performance_type', COALESCE(v_act.performance_type, ''),
      'blurb', COALESCE(v_act.bio, ''),
      'slot_number', COALESCE(v_act.running_order, 1)
    ) ELSE NULL END,
    'has_voted', v_has_voted,
    'voted_rating', v_voted_rating
  );
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_current_voting_state(TEXT) TO anon, authenticated;
