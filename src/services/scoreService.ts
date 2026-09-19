/**
 * scoreService.ts — Phase 7: Score Aggregation Engine
 *
 * Pure, deterministic calculation functions. Zero React or Supabase dependencies.
 * All intermediate values kept at full floating-point; round to 2dp only for display.
 *
 * Formula:
 *   Panel Score   = average of submitted judge totals (max 10 each)
 *   Audience Score = average of all audience votes (1–10)
 *   Final Score   = (Panel × 0.60) + (Audience × 0.40)
 *
 * Tiebreaker hierarchy (ascending priority):
 *   1st — Higher Audience Score
 *   2nd — Anchor Judge (judge-01) score for that act
 *   3rd — MANUAL REVIEW flag (isManualReview = true)
 */

import type {
  JudgeScore,
  Act,
  JudgeIdentity,
  ActResult,
  LeaderboardState,
  JudgeScoreBreakdown,
  TiebreakerReason,
} from '../types';

const JUDGE_WEIGHT = 0.60;
const AUDIENCE_WEIGHT = 0.40;
const ANCHOR_JUDGE_ID = 'judge-01';

// --- Low-level helpers -------------------------------------------------------

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Core Calculations -------------------------------------------------------

export function calculatePanelScore(judgeScores: JudgeScore[]): number {
  const submitted = judgeScores.filter(s => s.submitted);
  if (submitted.length === 0) return 0;
  return avg(submitted.map(s => s.total));
}

export function calculateAudienceScore(votes: number[]): number {
  return avg(votes);
}

export function calculateFinalScore(panelScore: number, audienceScore: number): number {
  return panelScore * JUDGE_WEIGHT + audienceScore * AUDIENCE_WEIGHT;
}

export function calculateSelfRatingGap(selfRating: number, finalScore: number): number {
  return Math.abs(selfRating - finalScore);
}

// --- Per-act Result Builder --------------------------------------------------

interface ActInputs {
  act: Act;
  selfRating: number;
  judgeScores: JudgeScore[];
  audienceVotes: number[];
  judges: JudgeIdentity[];
}

export function calculateActResult(inputs: ActInputs): Omit<ActResult, 'rank' | 'tiebreakerUsed' | 'isManualReview'> {
  const { act, selfRating, judgeScores, audienceVotes, judges } = inputs;

  const submittedScores = judgeScores.filter(s => s.submitted && s.actId === act.id);
  const panelScore = calculatePanelScore(submittedScores);
  const audienceScore = calculateAudienceScore(audienceVotes);
  const finalScore = calculateFinalScore(panelScore, audienceScore);
  const selfRatingGap = calculateSelfRatingGap(selfRating, finalScore);

  const judgeBreakdowns: JudgeScoreBreakdown[] = submittedScores.map(s => {
    const judge = judges.find(j => j.id === s.judgeId);
    return {
      judgeId: s.judgeId,
      judgeName: judge?.name ?? s.judgeId,
      creativity: s.creativity,
      execution: s.execution,
      stagePresence: s.stagePresence,
      audienceEngagement: s.audienceEngagement,
      total: s.total,
    };
  });

  return {
    actId: act.id,
    actTitle: act.title,
    performerName: act.performerName,
    category: act.category,
    performanceType: act.performanceType,
    photoUrl: act.photoUrl,
    selfRating,
    selfRatingGap: round2(selfRatingGap),
    judgeBreakdowns,
    audienceVotes,
    panelScore: round2(panelScore),
    audienceScore: round2(audienceScore),
    finalScore: round2(finalScore),
    judgesSubmitted: submittedScores.length,
    totalAudienceVotes: audienceVotes.length,
  };
}

// --- Ranking + Tiebreaking --------------------------------------------------

function resolveTie(
  a: Omit<ActResult, 'rank' | 'tiebreakerUsed' | 'isManualReview'>,
  b: Omit<ActResult, 'rank' | 'tiebreakerUsed' | 'isManualReview'>,
  judgeScores: JudgeScore[],
): { delta: number; reason: TiebreakerReason } {
  if (Math.abs(a.audienceScore - b.audienceScore) > 0.001) {
    return { delta: a.audienceScore - b.audienceScore, reason: 'audience_score' };
  }
  const anchorA = judgeScores.find(s => s.judgeId === ANCHOR_JUDGE_ID && s.actId === a.actId && s.submitted)?.total ?? 0;
  const anchorB = judgeScores.find(s => s.judgeId === ANCHOR_JUDGE_ID && s.actId === b.actId && s.submitted)?.total ?? 0;
  if (Math.abs(anchorA - anchorB) > 0.001) {
    return { delta: anchorA - anchorB, reason: 'anchor_judge' };
  }
  return { delta: 0, reason: 'manual_review' };
}

function rankTrack(
  unranked: Omit<ActResult, 'rank' | 'tiebreakerUsed' | 'isManualReview'>[],
  allJudgeScores: JudgeScore[],
): ActResult[] {
  const sorted = [...unranked].sort((a, b) => {
    const scoreDiff = b.finalScore - a.finalScore;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    const { delta } = resolveTie(a, b, allJudgeScores);
    return -delta;
  });

  return sorted.map((entry, index) => {
    const prev = index > 0 ? sorted[index - 1] : null;
    let tiebreakerUsed: TiebreakerReason = null;
    let isManualReview = false;

    if (prev && Math.abs(entry.finalScore - prev.finalScore) <= 0.001) {
      const { reason } = resolveTie(prev, entry, allJudgeScores);
      tiebreakerUsed = reason;
      isManualReview = reason === 'manual_review';
    }

    return {
      ...entry,
      rank: index + 1,
      tiebreakerUsed,
      isManualReview,
    };
  });
}

// --- Top-level Leaderboard Calculator ----------------------------------------

export interface LeaderboardInput {
  acts: Act[];
  selfRatings: Record<string, number>;
  judgeScores: JudgeScore[];
  audienceVotesByAct: Record<string, number[]>;
  judges: JudgeIdentity[];
}

// --- Top-level Leaderboard Calculator ----------------------------------------

export interface LeaderboardInput {
  acts: Act[];
  selfRatings: Record<string, number>;
  judgeScores: JudgeScore[];
  audienceVotesByAct: Record<string, number[]>;
  judges: JudgeIdentity[];
}

export function calculateLeaderboard(input: LeaderboardInput): LeaderboardState {
  const { acts, selfRatings, judgeScores, audienceVotesByAct, judges } = input;

  const allResults = acts.map(act => {
    const votes = audienceVotesByAct[act.id] ?? [];
    const actJudgeScores = judgeScores.filter(s => s.actId === act.id);
    return calculateActResult({
      act,
      selfRating: selfRatings[act.id] ?? 5,
      judgeScores: actJudgeScores,
      audienceVotes: votes,
      judges,
    });
  });

  const soloUnranked = allResults.filter(r => r.category === 'solo');
  const groupUnranked = allResults.filter(r => r.category === 'group');

  return {
    soloResults: rankTrack(soloUnranked, judgeScores),
    groupResults: rankTrack(groupUnranked, judgeScores),
    lastCalculatedAt: new Date().toISOString(),
    isLive: true,
  };
}

// --- Admin Matrix Helper -----------------------------------------------------

export function getJudgeSubmissionMatrix(
  judgeScores: JudgeScore[],
  acts: Act[],
  judges: JudgeIdentity[],
): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const judge of judges) {
    matrix[judge.id] = {};
    if (judge.code) matrix[judge.code] = {};
    for (const act of acts) {
      const score = judgeScores.find(s => (s.judgeId === judge.id || s.judgeId === judge.code) && (s.actId === act.id || s.actId === act.actCode));
      const isSub = score?.submitted ?? false;
      matrix[judge.id][act.id] = isSub;
      if (judge.code) matrix[judge.code][act.id] = isSub;
    }
  }
  return matrix;
}

// --- Live Async Data Fetcher --------------------------------------------------

export interface LiveLeaderboardData {
  leaderboard: LeaderboardState;
  judgeMatrix: Record<string, Record<string, boolean>>;
  submittedCount: number;
  totalCombos: number;
  completionPct: number;
  actsList: Act[];
  judgesList: JudgeIdentity[];
}

/**
 * Fetches real production data from Supabase (when VITE_USE_SUPABASE=true)
 * or returns calculated mock data (when VITE_USE_SUPABASE=false).
 */
export async function fetchLiveLeaderboard(): Promise<LiveLeaderboardData> {
  const { supabase, isSupabaseEnabled, logSupabaseError } = await import('../lib/supabase/client');

  if (!isSupabaseEnabled || !supabase) {
    const {
      MOCK_ACTS,
      MOCK_ACTS_EXTENDED,
      MOCK_JUDGE_SCORES,
      MOCK_VOTE_RECORDS,
      MOCK_JUDGES,
    } = await import('../data/eventData');

    const selfRatingMap: Record<string, number> = {
      'act-01': 9, 'act-02': 8, 'act-03': 8, 'act-04': 7,
      'act-05': 7, 'act-06': 6, 'act-07': 9, 'act-08': 8,
    };

    const allActs = [...MOCK_ACTS, ...MOCK_ACTS_EXTENDED];
    const audienceVotesByAct = MOCK_VOTE_RECORDS.reduce<Record<string, number[]>>((acc, v) => {
      if (!acc[v.actId]) acc[v.actId] = [];
      acc[v.actId].push(v.rating);
      return acc;
    }, {});

    const leaderboard = calculateLeaderboard({
      acts: allActs,
      selfRatings: selfRatingMap,
      judgeScores: MOCK_JUDGE_SCORES,
      audienceVotesByAct,
      judges: MOCK_JUDGES,
    });

    const judgeMatrix = getJudgeSubmissionMatrix(MOCK_JUDGE_SCORES, allActs, MOCK_JUDGES);
    const totalCombos = allActs.length * MOCK_JUDGES.length;
    const submittedCount = MOCK_JUDGE_SCORES.filter(s => s.submitted).length;
    const completionPct = totalCombos > 0 ? Math.round((submittedCount / totalCombos) * 100) : 0;

    return {
      leaderboard,
      judgeMatrix,
      submittedCount,
      totalCombos,
      completionPct,
      actsList: allActs,
      judgesList: MOCK_JUDGES,
    };
  }

  try {
    const [actsRes, judgesRes, scoresRes, votesRes] = await Promise.all([
      supabase.from('acts').select('*').eq('status', 'APPROVED').order('running_order', { ascending: true }),
      supabase.from('judges').select('*').eq('is_active', true),
      supabase.from('judge_scores').select('*').eq('submitted', true),
      supabase.from('audience_votes').select('act_id, rating'),
    ]);

    if (actsRes.error) logSupabaseError('ScoreService', 'fetchLiveLeaderboard (acts)', actsRes.error);
    if (judgesRes.error) logSupabaseError('ScoreService', 'fetchLiveLeaderboard (judges)', judgesRes.error);
    if (scoresRes.error) logSupabaseError('ScoreService', 'fetchLiveLeaderboard (scores)', scoresRes.error);
    if (votesRes.error) logSupabaseError('ScoreService', 'fetchLiveLeaderboard (votes)', votesRes.error);

    const dbActs = (actsRes.data as any[]) || [];
    const dbJudges = (judgesRes.data as any[]) || [];
    const dbScores = (scoresRes.data as any[]) || [];
    const dbVotes = (votesRes.data as any[]) || [];

    const actsList: Act[] = dbActs.map((act, idx) => ({
      id: act.id,
      actCode: act.act_code,
      slotNumber: act.running_order || idx + 1,
      title: act.title || 'Untitled Performance',
      performerName: act.performer_name || 'Performer',
      category: act.category === 'GROUP' ? 'group' : 'solo',
      department: act.department || 'N/A',
      year: act.year || 'N/A',
      performanceType: act.performance_type || act.title || 'Performance',
      blurb: act.bio || '',
      photoUrl: act.photo_url || '',
    }));

    const selfRatings: Record<string, number> = {};
    dbActs.forEach(act => {
      selfRatings[act.id] = act.self_rating || 5;
    });

    const judgesList: JudgeIdentity[] = dbJudges.map(j => ({
      id: j.id,
      code: j.judge_code,
      name: j.name,
      title: 'Official Judge Panelist',
      role: j.is_anchor ? 'Anchor Judge & Tiebreaker' : 'Panel Judge',
    }));

    const judgeScoresList: JudgeScore[] = dbScores.map(s => ({
      id: s.id,
      judgeId: s.judge_id,
      actId: s.act_id,
      creativity: s.creativity,
      execution: s.execution,
      stagePresence: s.stage_presence,
      audienceEngagement: s.audience_engagement,
      total: (s.creativity || 0) + (s.execution || 0) + (s.stage_presence || 0) + (s.audience_engagement || 0),
      notes: s.notes || undefined,
      submitted: s.submitted ?? true,
      createdAt: s.submitted_at || s.created_at || new Date().toISOString(),
    }));

    const audienceVotesByAct: Record<string, number[]> = {};
    dbVotes.forEach(v => {
      if (!audienceVotesByAct[v.act_id]) audienceVotesByAct[v.act_id] = [];
      audienceVotesByAct[v.act_id].push(v.rating);
    });

    const leaderboard = calculateLeaderboard({
      acts: actsList,
      selfRatings,
      judgeScores: judgeScoresList,
      audienceVotesByAct,
      judges: judgesList,
    });

    const judgeMatrix = getJudgeSubmissionMatrix(judgeScoresList, actsList, judgesList);
    const totalCombos = actsList.length * judgesList.length;
    const submittedCount = judgeScoresList.length;
    const completionPct = totalCombos > 0 ? Math.round((submittedCount / totalCombos) * 100) : 0;

    return {
      leaderboard,
      judgeMatrix,
      submittedCount,
      totalCombos,
      completionPct,
      actsList,
      judgesList,
    };
  } catch (err) {
    logSupabaseError('ScoreService', 'fetchLiveLeaderboard', err);
    return {
      leaderboard: { soloResults: [], groupResults: [], lastCalculatedAt: new Date().toISOString(), isLive: false },
      judgeMatrix: {},
      submittedCount: 0,
      totalCombos: 0,
      completionPct: 0,
      actsList: [],
      judgesList: [],
    };
  }
}
