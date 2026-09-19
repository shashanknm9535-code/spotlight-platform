import React, { useState, useEffect } from 'react';
import type { JudgeIdentity, JudgeScore, Act, JudgingState } from '../types';
import { MOCK_ACTS } from '../data/eventData';
import {
  authenticateJudgeCode,
  submitJudgeScore,
  getJudgeScoreForAct,
  resetMockScores,
} from '../services/judgeService';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { JudgeHeader } from '../components/judge/JudgeHeader';
import { PerformerCard } from '../components/voting/PerformerCard';
import { RubricScorer } from '../components/judge/RubricScorer';
import { ScoreReviewModal } from '../components/judge/ScoreReviewModal';
import { LockedScoreSummary } from '../components/judge/LockedScoreSummary';
import { JudgeDevControls } from '../components/judge/JudgeDevControls';
import { KeyRound, ArrowRight, AlertTriangle } from 'lucide-react';

export const JudgePage: React.FC = () => {
  const [judgingState, setJudgingState] = useState<JudgingState>('access');
  const [codeInput, setCodeInput] = useState('');
  const [judge, setJudge] = useState<JudgeIdentity | null>(null);
  const [activeActIndex, setActiveActIndex] = useState(0);

  // Rubric Form State
  const [creativity, setCreativity] = useState(3);
  const [execution, setExecution] = useState(3);
  const [stagePresence, setStagePresence] = useState(2);
  const [audienceEngagement, setAudienceEngagement] = useState(2);
  const [notes, setNotes] = useState('');

  const [submittedScore, setSubmittedScore] = useState<JudgeScore | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const currentAct: Act = MOCK_ACTS[activeActIndex] || MOCK_ACTS[0];

  // Check if current judge has already scored current act
  useEffect(() => {
    if (!judge) return;
    let isMounted = true;
    const checkScore = async () => {
      try {
        const existing = await getJudgeScoreForAct(judge.code || judge.id, currentAct.id);
        if (!isMounted) return;
        if (existing && existing.submitted) {
          setSubmittedScore(existing);
          setJudgingState('already_scored');
        } else {
          setSubmittedScore(null);
          setJudgingState('scoring');
        }
      } catch (err) {
        console.warn('Error checking judge score:', err);
      }
    };
    checkScore();
    return () => {
      isMounted = false;
    };
  }, [judge, activeActIndex]);

  // Handle Judge PIN Authentication
  const handleAuthenticate = async (codeToUse: string) => {
    setErrorMsg(null);
    setJudgingState('loading');

    try {
      const authenticatedJudge = await authenticateJudgeCode(codeToUse);
      if (authenticatedJudge) {
        setJudge(authenticatedJudge);
      } else {
        setErrorMsg('Judge code not recognized. Please check your assigned code (e.g. JUDGE-01).');
        setJudgingState('access');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error occurred. Try again.');
      setJudgingState('access');
    }
  };

  // Handle Score Category Change
  const handleChangeCategory = (
    cat: 'creativity' | 'execution' | 'stagePresence' | 'audienceEngagement',
    val: number
  ) => {
    if (cat === 'creativity') setCreativity(val);
    if (cat === 'execution') setExecution(val);
    if (cat === 'stagePresence') setStagePresence(val);
    if (cat === 'audienceEngagement') setAudienceEngagement(val);
  };

  // Handle Final Score Lock Submission
  const handleConfirmSubmit = async () => {
    if (!judge) return;
    setShowReviewModal(false);
    setJudgingState('submitting');
    setErrorMsg(null);

    const total = creativity + execution + stagePresence + audienceEngagement;

    try {
      const scoreRecord = await submitJudgeScore({
        judgeId: judge.id,
        judgeCode: judge.code,
        actId: currentAct.id,
        creativity,
        execution,
        stagePresence,
        audienceEngagement,
        total,
        notes: notes.trim() || undefined,
      });

      setSubmittedScore(scoreRecord);
      setJudgingState('locked');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to lock score.');
      setJudgingState('scoring');
    }
  };

  const handleNextAct = () => {
    const nextIdx = (activeActIndex + 1) % MOCK_ACTS.length;
    setActiveActIndex(nextIdx);
    // Reset Rubric Slates
    setCreativity(3);
    setExecution(3);
    setStagePresence(2);
    setAudienceEngagement(2);
    setNotes('');
  };

  const handlePrevAct = () => {
    const prevIdx = (activeActIndex - 1 + MOCK_ACTS.length) % MOCK_ACTS.length;
    setActiveActIndex(prevIdx);
  };

  return (
    <main className="min-h-screen pt-24 pb-28 bg-[#08080C] bg-noise">
      <PageContainer size="wide">
        {/* 1. STATE: ACCESS PIN CODE FORM */}
        {judgingState === 'access' && (
          <div className="max-w-md mx-auto p-8 sm:p-10 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-8 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto bg-amber-400 text-black flex items-center justify-center font-bold shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <KeyRound className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <Badge variant="gold">OFFICIAL JUDGE ACCESS</Badge>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
                JUDGE ACCESS
              </h1>
              <p className="text-sm text-zinc-400 font-sans">
                Enter your assigned judge pin code to access the encrypted live scoring panel.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (codeInput.trim()) handleAuthenticate(codeInput);
              }}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                  JUDGE ACCESS CODE <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="e.g. JUDGE-01"
                  className="w-full px-4 py-3.5 bg-[#141420] border border-[#27273C] text-white font-mono text-sm uppercase tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Enter Judging Panel
              </Button>
            </form>

            <div className="p-3 bg-[#141420] border border-[#222234] text-[11px] font-mono text-zinc-400">
              <span className="text-amber-400 font-bold block mb-1">MOCK DEMO CODES:</span>
              <code>JUDGE-01</code>, <code>JUDGE-02</code>, or <code>JUDGE-03</code>
            </div>
          </div>
        )}

        {/* 2. STATE: LOADING */}
        {(judgingState === 'loading' || judgingState === 'submitting') && (
          <div className="max-w-md mx-auto p-12 bg-[#0E0E16] border border-amber-400/40 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 mx-auto border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">
              {judgingState === 'submitting' ? 'LOCKING SCORE...' : 'VERIFYING JUDGE...'}
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              {judgingState === 'submitting'
                ? 'Recording score to judge ledger...'
                : 'Connecting to judge panel slate.'}
            </p>
          </div>
        )}

        {/* 3. STATE: SCORING / LOCKED / ALREADY SCORED DASHBOARD */}
        {judge && (judgingState === 'scoring' || judgingState === 'locked' || judgingState === 'already_scored') && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* JUDGE HEADER BAR */}
            <JudgeHeader
              judge={judge}
              activeActSlot={currentAct.slotNumber}
              totalActs={MOCK_ACTS.length}
              onLogout={() => {
                setJudge(null);
                setJudgingState('access');
              }}
            />

            {/* 2-COLUMN LAYOUT (LEFT: ACT PROFILE, RIGHT: SCORER OR LOCKED SUMMARY) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: ACTIVE ACT PROFILE (5 COLS) */}
              <div className="lg:col-span-5 space-y-6">
                <PerformerCard act={currentAct} />

                <div className="p-4 bg-[#0E0E16] border border-[#1E1E2C] text-xs font-mono text-zinc-400 space-y-2">
                  <div className="flex justify-between">
                    <span>PANEL WEIGHT</span>
                    <strong className="text-amber-400">60% TOTAL SCORE</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>AUDIENCE WEIGHT</span>
                    <strong className="text-zinc-300">40% TOTAL SCORE</strong>
                  </div>
                  <p className="text-[10px] text-zinc-500 pt-2 border-t border-[#1C1C2A]">
                    🔒 Judge scoring is completely isolated. You cannot view other judges' scores or audience ratings.
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: SCORING SLATE OR LOCKED SUMMARY (7 COLS) */}
              <div className="lg:col-span-7">
                {judgingState === 'scoring' && (
                  <RubricScorer
                    creativity={creativity}
                    execution={execution}
                    stagePresence={stagePresence}
                    audienceEngagement={audienceEngagement}
                    notes={notes}
                    onChangeCategory={handleChangeCategory}
                    onChangeNotes={(n) => setNotes(n)}
                    onReview={() => setShowReviewModal(true)}
                  />
                )}

                {(judgingState === 'locked' || judgingState === 'already_scored') && submittedScore && (
                  <LockedScoreSummary score={submittedScore} onNextAct={handleNextAct} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* REVIEW CONFIRMATION MODAL */}
        {showReviewModal && judge && (
          <ScoreReviewModal
            act={currentAct}
            creativity={creativity}
            execution={execution}
            stagePresence={stagePresence}
            audienceEngagement={audienceEngagement}
            notes={notes}
            isSubmitting={judgingState === 'submitting'}
            onConfirmSubmit={handleConfirmSubmit}
            onEdit={() => setShowReviewModal(false)}
          />
        )}

        {/* DEV CONTROLS OVERLAY */}
        <JudgeDevControls
          onSelectJudge={handleAuthenticate}
          onNextAct={handleNextAct}
          onPrevAct={handlePrevAct}
          onResetScores={resetMockScores}
          activeJudgeCode={judge?.code}
          activeActSlot={currentAct.slotNumber}
        />
      </PageContainer>
    </main>
  );
};
