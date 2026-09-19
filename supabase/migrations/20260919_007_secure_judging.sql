-- ============================================================
-- SPOTLIGHT — Secure Judge Scoring RPC Functions
-- File: supabase/migrations/20260919_007_secure_judging.sql
-- Apply AFTER 20260919_006_secure_voting.sql
-- ============================================================
--
-- Security boundary for judge scoring:
--   - Judges authenticate by judge_code (e.g. JUDGE-01).
--   - Enforces rubric limits:
--       creativity: 0–3
--       execution: 0–3
--       stage_presence: 0–2
--       audience_engagement: 0–2
--   - Calculated total is NOT stored (calculated by scoreService).
--   - Judge isolation: judges can ONLY access their own score records.
--   - Score locking: submitted = true locks score from further modification.
-- ============================================================

-- ─── 1. get_judge_by_code RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_judge_by_code(
  judge_code_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge RECORD;
BEGIN
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, name, email, judge_code, is_anchor, is_active
  INTO v_judge
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_JUDGE' USING HINT = 'Judge code not recognized. Please check your assigned code (e.g. JUDGE-01).';
  END IF;

  IF NOT v_judge.is_active THEN
    RAISE EXCEPTION 'INACTIVE_JUDGE' USING HINT = 'This judge account is currently inactive.';
  END IF;

  RETURN jsonb_build_object(
    'id', v_judge.id,
    'name', v_judge.name,
    'email', COALESCE(v_judge.email, ''),
    'code', v_judge.judge_code,
    'isAnchor', v_judge.is_anchor,
    'isActive', v_judge.is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_judge_by_code(TEXT) TO anon, authenticated;

-- ─── 2. get_judge_score_for_act RPC ────────────────────────────

CREATE OR REPLACE FUNCTION get_judge_score_for_act(
  judge_code_input TEXT,
  act_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge_id UUID;
  v_score RECORD;
BEGIN
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id INTO v_judge_id
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input AND is_active = true;

  IF v_judge_id IS NULL THEN
    -- Try resolving judge_code_input as UUID directly
    BEGIN
      v_judge_id := judge_code_input::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  SELECT id, act_id, judge_id, creativity, execution, stage_presence, audience_engagement, notes, submitted, submitted_at, created_at
  INTO v_score
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_score.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_score.id,
    'actId', v_score.act_id,
    'judgeId', v_score.judge_id,
    'creativity', v_score.creativity,
    'execution', v_score.execution,
    'stagePresence', v_score.stage_presence,
    'audienceEngagement', v_score.audience_engagement,
    'total', (v_score.creativity + v_score.execution + v_score.stage_presence + v_score.audience_engagement),
    'notes', COALESCE(v_score.notes, ''),
    'submitted', v_score.submitted,
    'createdAt', COALESCE(v_score.submitted_at, v_score.created_at)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_judge_score_for_act(TEXT, UUID) TO anon, authenticated;

-- ─── 3. submit_judge_score RPC ────────────────────────────────

CREATE OR REPLACE FUNCTION submit_judge_score(
  judge_code_input TEXT,
  act_id_input UUID,
  creativity_input INTEGER,
  execution_input INTEGER,
  stage_presence_input INTEGER,
  audience_engagement_input INTEGER,
  notes_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_judge_id UUID;
  v_judge_active BOOLEAN;
  v_act_status act_status;
  v_existing_submitted BOOLEAN;
  v_score_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate score ranges
  IF creativity_input IS NULL OR creativity_input < 0 OR creativity_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Creativity score must be between 0 and 3.';
  END IF;

  IF execution_input IS NULL OR execution_input < 0 OR execution_input > 3 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Execution score must be between 0 and 3.';
  END IF;

  IF stage_presence_input IS NULL OR stage_presence_input < 0 OR stage_presence_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Stage presence score must be between 0 and 2.';
  END IF;

  IF audience_engagement_input IS NULL OR audience_engagement_input < 0 OR audience_engagement_input > 2 THEN
    RAISE EXCEPTION 'INVALID_SCORE' USING HINT = 'Audience engagement score must be between 0 and 2.';
  END IF;

  -- 2. Resolve judge identity
  judge_code_input := UPPER(TRIM(judge_code_input));

  SELECT id, is_active INTO v_judge_id, v_judge_active
  FROM judges
  WHERE UPPER(judge_code) = judge_code_input;

  IF v_judge_id IS NULL THEN
    -- Fallback: check if judge_code_input is a UUID string directly
    BEGIN
      SELECT id, is_active INTO v_judge_id, v_judge_active
      FROM judges
      WHERE id = judge_code_input::UUID;
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

  -- 3. Verify act exists and is APPROVED
  SELECT status INTO v_act_status
  FROM acts
  WHERE id = act_id_input;

  IF v_act_status IS NULL OR v_act_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'ACT_NOT_APPROVED' USING HINT = 'There is currently no approved act available for judging.';
  END IF;

  -- 4. Check score locking (if already submitted, reject modification)
  SELECT submitted INTO v_existing_submitted
  FROM judge_scores
  WHERE judge_id = v_judge_id AND act_id = act_id_input;

  IF v_existing_submitted IS TRUE THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 5. Upsert score securely into judge_scores
  INSERT INTO judge_scores (
    act_id,
    judge_id,
    creativity,
    execution,
    stage_presence,
    audience_engagement,
    notes,
    submitted,
    submitted_at
  ) VALUES (
    act_id_input,
    v_judge_id,
    creativity_input,
    execution_input,
    stage_presence_input,
    audience_engagement_input,
    TRIM(notes_input),
    true,
    v_now
  )
  ON CONFLICT (judge_id, act_id) DO UPDATE SET
    creativity = EXCLUDED.creativity,
    execution = EXCLUDED.execution,
    stage_presence = EXCLUDED.stage_presence,
    audience_engagement = EXCLUDED.audience_engagement,
    notes = EXCLUDED.notes,
    submitted = true,
    submitted_at = EXCLUDED.submitted_at
  WHERE judge_scores.submitted = false
  RETURNING id INTO v_score_id;

  IF v_score_id IS NULL THEN
    RAISE EXCEPTION 'SCORE_LOCKED' USING HINT = 'This score has already been submitted and locked.';
  END IF;

  -- 6. Return JSON response
  RETURN jsonb_build_object(
    'id', v_score_id,
    'actId', act_id_input,
    'judgeId', v_judge_id,
    'creativity', creativity_input,
    'execution', execution_input,
    'stagePresence', stage_presence_input,
    'audienceEngagement', audience_engagement_input,
    'total', (creativity_input + execution_input + stage_presence_input + audience_engagement_input),
    'notes', COALESCE(TRIM(notes_input), ''),
    'submitted', true,
    'createdAt', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_judge_score(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO anon, authenticated;
