import { MOCK_JUDGES } from '../data/eventData';
import type { JudgeIdentity, JudgeScore } from '../types';

// In-memory mock judge score store
const judgeScoresStore: Record<string, JudgeScore> = {};

/**
 * Authenticates judge pin code.
 */
export const authenticateJudgeCode = async (
  code: string
): Promise<JudgeIdentity | null> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms auth latency

  const normalized = code.trim().toUpperCase();
  const found = MOCK_JUDGES.find((j) => j.code === normalized);
  return found || null;
};

/**
 * Submits an immutable score record for a specific judge and act.
 */
export const submitJudgeScore = async (
  scoreData: Omit<JudgeScore, 'id' | 'submitted' | 'createdAt'>
): Promise<JudgeScore> => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s submit latency

  const key = `${scoreData.judgeId}_${scoreData.actId}`;
  
  if (judgeScoresStore[key] && judgeScoresStore[key].submitted) {
    throw new Error('This act has already been scored and locked.');
  }

  const scoreRecord: JudgeScore = {
    ...scoreData,
    id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    submitted: true,
    createdAt: new Date().toISOString(),
  };

  judgeScoresStore[key] = scoreRecord;
  return scoreRecord;
};

/**
 * Gets submitted score record for a judge and act if exists.
 */
export const getJudgeScoreForAct = (
  judgeId: string,
  actId: string
): JudgeScore | null => {
  const key = `${judgeId}_${actId}`;
  return judgeScoresStore[key] || null;
};

/**
 * Clears in-memory judge scores (for dev testing).
 */
export const resetMockScores = (): void => {
  Object.keys(judgeScoresStore).forEach((key) => delete judgeScoresStore[key]);
};
