import { MOCK_JUDGES } from '../data/eventData';
import type { JudgeIdentity, JudgeScore } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase/client';
import type { DbJudge, DbJudgeScore } from '../types/database';

// In-memory mock judge score store
const judgeScoresStore: Record<string, JudgeScore> = {};

/**
 * Authenticates a judge by their PIN access code (e.g. JUDGE-01).
 * Resolves judge record from Supabase when VITE_USE_SUPABASE=true, or MOCK_JUDGES when false.
 */
export const authenticateJudgeCode = async (
  code: string
): Promise<JudgeIdentity | null> => {
  const normalized = code.trim().toUpperCase();

  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const found = MOCK_JUDGES.find((j) => j.code === normalized);
    return found || null;
  }

  // ── SUPABASE LIVE PERSISTENCE ───────────────────────────────────────────────
  try {
    const { data, error } = await (supabase as any).rpc('get_judge_by_code', {
      judge_code_input: normalized,
    });

    if (error || !data) {
      console.warn('[JudgeService] authenticateJudgeCode RPC error:', error);
      return null;
    }

    const payload = data as any;
    return {
      id: payload.id,
      name: payload.name,
      code: payload.code,
      title: 'Official Judge Panelist',
      role: payload.isAnchor ? 'Anchor Judge & Tiebreaker' : 'Panel Judge',
    };
  } catch (err) {
    console.error('[JudgeService] Error authenticating judge code:', err);
    return null;
  }
};

/**
 * Retrieves the submitted or draft score record for a specific judge and act.
 * Enforces JUDGE ISOLATION: A judge code can ONLY access their own score sheet!
 */
export const getJudgeScoreForAct = async (
  judgeIdOrCode: string,
  actId: string
): Promise<JudgeScore | null> => {
  const key = `${judgeIdOrCode}_${actId}`;

  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    return judgeScoresStore[key] || null;
  }

  // ── SUPABASE LIVE PERSISTENCE ───────────────────────────────────────────────
  try {
    const { data, error } = await (supabase as any).rpc('get_judge_score_for_act', {
      judge_code_input: judgeIdOrCode,
      act_id_input: actId,
    });

    if (error || !data) {
      return null;
    }

    const res = data as any;
    const scoreRecord: JudgeScore = {
      id: res.id,
      judgeId: res.judgeId,
      actId: res.actId,
      creativity: res.creativity,
      execution: res.execution,
      stagePresence: res.stagePresence,
      audienceEngagement: res.audienceEngagement,
      total: res.creativity + res.execution + res.stagePresence + res.audienceEngagement,
      notes: res.notes || undefined,
      submitted: res.submitted ?? true,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    // Cache in local store for synchronous fallback if needed
    judgeScoresStore[key] = scoreRecord;
    return scoreRecord;
  } catch (err) {
    console.error('[JudgeService] Error in getJudgeScoreForAct:', err);
    return judgeScoresStore[key] || null;
  }
};

/**
 * Submits an immutable score record for a specific judge and act.
 * Validates rubric limits (0–3, 0–3, 0–2, 0–2) and enforces SCORE LOCKING.
 */
export const submitJudgeScore = async (
  scoreData: Omit<JudgeScore, 'id' | 'submitted' | 'createdAt'> & { judgeCode?: string }
): Promise<JudgeScore> => {
  // 1. Frontend Rubric Limit Validation
  if (scoreData.creativity < 0 || scoreData.creativity > 3) {
    throw new Error('Creativity score must be between 0 and 3.');
  }
  if (scoreData.execution < 0 || scoreData.execution > 3) {
    throw new Error('Execution score must be between 0 and 3.');
  }
  if (scoreData.stagePresence < 0 || scoreData.stagePresence > 2) {
    throw new Error('Stage Presence score must be between 0 and 2.');
  }
  if (scoreData.audienceEngagement < 0 || scoreData.audienceEngagement > 2) {
    throw new Error('Audience Engagement score must be between 0 and 2.');
  }

  const judgeIdentifier = scoreData.judgeCode || scoreData.judgeId;
  const key = `${scoreData.judgeId}_${scoreData.actId}`;

  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (judgeScoresStore[key] && judgeScoresStore[key].submitted) {
      throw new Error('This score has already been submitted and locked.');
    }

    const calculatedTotal =
      scoreData.creativity +
      scoreData.execution +
      scoreData.stagePresence +
      scoreData.audienceEngagement;

    const scoreRecord: JudgeScore = {
      ...scoreData,
      id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      total: calculatedTotal,
      submitted: true,
      createdAt: new Date().toISOString(),
    };

    judgeScoresStore[key] = scoreRecord;
    return scoreRecord;
  }

  // ── SUPABASE LIVE PERSISTENCE VIA SECURE RPC ────────────────────────────────
  try {
    const { data, error } = await (supabase as any).rpc('submit_judge_score', {
      judge_code_input: judgeIdentifier,
      act_id_input: scoreData.actId,
      creativity_input: scoreData.creativity,
      execution_input: scoreData.execution,
      stage_presence_input: scoreData.stagePresence,
      audience_engagement_input: scoreData.audienceEngagement,
      notes_input: scoreData.notes || null,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('SCORE_LOCKED')) {
        throw new Error('This score has already been submitted and locked.');
      }
      if (msg.includes('INVALID_JUDGE')) {
        throw new Error('Invalid judge credentials.');
      }
      if (msg.includes('INACTIVE_JUDGE')) {
        throw new Error('This judge account is currently inactive.');
      }
      if (msg.includes('ACT_NOT_APPROVED')) {
        throw new Error('There is currently no approved act available for judging.');
      }
      if (msg.includes('INVALID_SCORE')) {
        throw new Error('Please check the score values and try again.');
      }
      console.error('[JudgeService] submit_judge_score RPC error:', error);
      throw new Error("We couldn't submit your score. Please try again.");
    }

    const res = data as any;
    const scoreRecord: JudgeScore = {
      id: res.id,
      judgeId: res.judgeId || scoreData.judgeId,
      actId: res.actId || scoreData.actId,
      creativity: res.creativity,
      execution: res.execution,
      stagePresence: res.stagePresence,
      audienceEngagement: res.audienceEngagement,
      total: res.creativity + res.execution + res.stagePresence + res.audienceEngagement,
      notes: res.notes || undefined,
      submitted: true,
      createdAt: res.createdAt || new Date().toISOString(),
    };

    judgeScoresStore[key] = scoreRecord;
    return scoreRecord;
  } catch (err: any) {
    console.error('[JudgeService] Submission error:', err);
    throw new Error(err?.message || "We couldn't submit your score. Please try again.");
  }
};

/**
 * Returns submission status for a specific judge and act.
 */
export const getJudgeSubmissionStatus = async (
  judgeCodeOrId: string,
  actId: string
): Promise<'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'> => {
  const score = await getJudgeScoreForAct(judgeCodeOrId, actId);
  if (!score) return 'NOT_STARTED';
  return score.submitted ? 'SUBMITTED' : 'IN_PROGRESS';
};

/**
 * Clears in-memory judge scores (for dev testing).
 */
export const resetMockScores = (): void => {
  Object.keys(judgeScoresStore).forEach((key) => delete judgeScoresStore[key]);
};
