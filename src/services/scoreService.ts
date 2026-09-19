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
    for (const act of acts) {
      const score = judgeScores.find(s => s.judgeId === judge.id && s.actId === act.id);
      matrix[judge.id][act.id] = score?.submitted ?? false;
    }
  }
  return matrix;
}
