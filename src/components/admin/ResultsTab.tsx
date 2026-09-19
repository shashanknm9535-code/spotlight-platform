import React, { useMemo, useState } from 'react';
import { calculateLeaderboard, getJudgeSubmissionMatrix, round2 } from '../../services/scoreService';
import {
  MOCK_ACTS,
  MOCK_ACTS_EXTENDED,
  MOCK_JUDGE_SCORES,
  MOCK_VOTE_RECORDS,
  MOCK_JUDGES,
} from '../../data/eventData';
import { ActResultDetailModal } from '../leaderboard/ActResultDetailModal';
import type { ActResult } from '../../types';

const SELF_RATING_MAP: Record<string, number> = {
  'act-01': 9, 'act-02': 8, 'act-03': 8, 'act-04': 7,
  'act-05': 7, 'act-06': 6, 'act-07': 9, 'act-08': 8,
};

const ALL_ACTS = [...MOCK_ACTS, ...MOCK_ACTS_EXTENDED];

function groupVotes(votes: { actId: string; rating: number }[]): Record<string, number[]> {
  return votes.reduce<Record<string, number[]>>((acc, v) => {
    if (!acc[v.actId]) acc[v.actId] = [];
    acc[v.actId].push(v.rating);
    return acc;
  }, {});
}

export const ResultsTab: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<'solo' | 'group'>('solo');
  const [selectedResult, setSelectedResult] = useState<ActResult | null>(null);

  const leaderboard = useMemo(() => {
    const audienceVotesByAct = groupVotes(MOCK_VOTE_RECORDS);
    return calculateLeaderboard({
      acts: ALL_ACTS,
      selfRatings: SELF_RATING_MAP,
      judgeScores: MOCK_JUDGE_SCORES,
      audienceVotesByAct,
      judges: MOCK_JUDGES,
    });
  }, []);

  const judgeMatrix = useMemo(() =>
    getJudgeSubmissionMatrix(MOCK_JUDGE_SCORES, ALL_ACTS, MOCK_JUDGES),
  []);

  const trackResults = activeTrack === 'solo' ? leaderboard.soloResults : leaderboard.groupResults;

  // Completion stats
  const totalCombos = ALL_ACTS.length * MOCK_JUDGES.length;
  const submittedCount = MOCK_JUDGE_SCORES.filter(s => s.submitted).length;
  const completionPct = Math.round((submittedCount / totalCombos) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Score Results</h2>
          <p className="text-sm text-white/40">Live aggregation · Panel×60% + Audience×40%</p>
        </div>
        <a
          href="/leaderboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-colors"
        >
          Public Leaderboard ↗
        </a>
      </div>

      {/* Completion Bar */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60 font-semibold">Judge Submission Completeness</span>
          <span className={`text-sm font-black ${completionPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{completionPct}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completionPct === 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-white/30 mt-1">{submittedCount} of {totalCombos} judge-act score sheets submitted</p>
      </div>

      {/* Judge × Act Matrix */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-x-auto">
        <div className="p-3 border-b border-white/10">
          <h3 className="text-xs font-bold text-white/50 tracking-widest">SUBMISSION MATRIX</h3>
        </div>
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-xs text-white/30 font-bold w-36">JUDGE</th>
              {ALL_ACTS.map(act => (
                <th key={act.id} className="text-center px-2 py-2 text-xs text-white/30 font-bold">
                  {act.id.replace('act-', 'A')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_JUDGES.map(judge => (
              <tr key={judge.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-2.5 text-xs text-white/60 font-semibold whitespace-nowrap">{judge.name.split(' ').slice(-1)[0]}</td>
                {ALL_ACTS.map(act => {
                  const submitted = judgeMatrix[judge.id]?.[act.id] ?? false;
                  return (
                    <td key={act.id} className="text-center py-2.5">
                      {submitted
                        ? <span className="text-emerald-400 font-bold text-base">✓</span>
                        : <span className="text-white/20 text-base">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Track Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {(['solo', 'group'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTrack(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
              activeTrack === tab ? 'bg-amber-400 text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/10 grid grid-cols-12 gap-2 text-xs text-white/30 font-bold tracking-widest px-4">
          <div className="col-span-1">RK</div>
          <div className="col-span-4">ACT</div>
          <div className="col-span-2 text-right">PANEL</div>
          <div className="col-span-2 text-right">AUDIENCE</div>
          <div className="col-span-2 text-right">FINAL</div>
          <div className="col-span-1 text-right">GAP</div>
        </div>
        {trackResults.map(result => (
          <button
            key={result.actId}
            type="button"
            onClick={() => setSelectedResult(result)}
            className="w-full text-left grid grid-cols-12 gap-2 items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="col-span-1">
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                result.rank === 1 ? 'bg-amber-400 text-black' :
                result.rank === 2 ? 'bg-slate-300 text-slate-900' :
                result.rank === 3 ? 'bg-amber-700 text-amber-100' :
                'bg-white/10 text-white/60'
              }`}>
                #{result.rank}
              </span>
            </div>
            <div className="col-span-4 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{result.actTitle}</div>
              <div className="text-xs text-white/30 truncate">{result.performerName}</div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {result.tiebreakerUsed && !result.isManualReview && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/20">
                    TB:{result.tiebreakerUsed === 'audience_score' ? 'AUD' : 'ANCHOR'}
                  </span>
                )}
                {result.isManualReview && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">MANUAL</span>
                )}
              </div>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-sm font-semibold text-white/70">{result.panelScore.toFixed(2)}</span>
              <div className="text-xs text-white/25">{result.judgesSubmitted}/3 judges</div>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-sm font-semibold text-white/70">{result.audienceScore.toFixed(2)}</span>
              <div className="text-xs text-white/25">{result.totalAudienceVotes} votes</div>
            </div>
            <div className="col-span-2 text-right">
              <span className={`text-base font-black tabular-nums ${result.rank <= 3 ? 'text-amber-300' : 'text-white'}`}>
                {result.finalScore.toFixed(2)}
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className={`text-sm font-bold tabular-nums ${
                result.selfRatingGap <= 1 ? 'text-emerald-400' :
                result.selfRatingGap <= 2.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {round2(result.selfRatingGap).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Anomalies / Tiebreak Audit */}
      {trackResults.some(r => r.tiebreakerUsed || r.isManualReview) && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-white/30 tracking-widest mb-3">TIEBREAK AUDIT</h3>
          {trackResults.filter(r => r.tiebreakerUsed).map(r => (
            <div key={r.actId} className={`flex items-center justify-between p-2.5 rounded-lg text-sm border ${
              r.isManualReview ? 'bg-red-500/10 border-red-500/30' : 'bg-violet-500/10 border-violet-500/30'
            }`}>
              <span className={r.isManualReview ? 'text-red-400' : 'text-violet-300'}>
                #{r.rank} {r.actTitle}
              </span>
              <span className="text-xs text-white/40">
                {r.isManualReview
                  ? 'MANUAL REVIEW'
                  : r.tiebreakerUsed === 'audience_score'
                    ? 'Resolved: Audience Score'
                    : 'Resolved: Anchor Judge (J01)'}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedResult && (
        <ActResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      )}
    </div>
  );
};
