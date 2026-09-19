import React from 'react';
import type { ActResult } from '../../types';

interface ActResultDetailModalProps {
  result: ActResult;
  onClose: () => void;
}

export const ActResultDetailModal: React.FC<ActResultDetailModalProps> = ({ result, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Act score details"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#0F0F15] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative">
          <img
            src={result.photoUrl}
            alt={result.actTitle}
            className="w-full h-36 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F15] via-[#0F0F15]/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-4">
            <div className="text-amber-400 text-xs font-bold tracking-widest mb-1">
              #{result.rank} — {result.category.toUpperCase()} TRACK
            </div>
            <div className="text-white text-xl font-black leading-tight">{result.actTitle}</div>
            <div className="text-white/50 text-sm">{result.performerName}</div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Final Score Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <div>
              <div className="text-xs text-amber-400/70 font-bold tracking-widest">FINAL SCORE</div>
              <div className="text-4xl font-black text-amber-300 tabular-nums">{result.finalScore.toFixed(2)}</div>
              <div className="text-xs text-white/40 mt-0.5">
                Panel×60% + Audience×40%
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <div className="text-xs text-white/30">PANEL</div>
                <div className="text-lg font-bold text-white">{result.panelScore.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-white/30">AUDIENCE</div>
                <div className="text-lg font-bold text-white">{result.audienceScore.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Tiebreaker / Manual Review notice */}
          {result.tiebreakerUsed && (
            <div className={`px-3 py-2 rounded-lg text-sm border ${result.isManualReview ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-violet-500/10 border-violet-500/30 text-violet-300'}`}>
              {result.isManualReview
                ? '⚠️ This result requires MANUAL REVIEW — scores are fully tied.'
                : result.tiebreakerUsed === 'audience_score'
                  ? '🎭 Rank resolved by Audience Score (Tiebreaker 1)'
                  : '⚖️ Rank resolved by Anchor Judge score (Tiebreaker 2)'}
            </div>
          )}

          {/* Judge Breakdown */}
          <div>
            <div className="text-xs text-white/30 font-bold tracking-widest mb-2">JUDGE BREAKDOWN</div>
            {result.judgeBreakdowns.length === 0 ? (
              <p className="text-white/30 text-sm italic">No judge scores submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {result.judgeBreakdowns.map(jb => (
                  <div key={jb.judgeId} className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-white/80">{jb.judgeName}</div>
                      <div className="text-lg font-black text-white">{jb.total}<span className="text-white/30 text-xs">/10</span></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: 'Creativity', val: jb.creativity, max: 3 },
                        { label: 'Execution', val: jb.execution, max: 3 },
                        { label: 'Stage', val: jb.stagePresence, max: 2 },
                        { label: 'Audience', val: jb.audienceEngagement, max: 2 },
                      ].map(({ label, val, max }) => (
                        <div key={label} className="bg-white/[0.04] rounded-lg p-1.5">
                          <div className="text-[9px] text-white/30 mb-0.5 truncate">{label}</div>
                          <div className="text-sm font-bold text-white/80">{val}<span className="text-white/20 text-[9px]">/{max}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audience Votes */}
          <div>
            <div className="text-xs text-white/30 font-bold tracking-widest mb-2">AUDIENCE VOTES</div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">{result.totalAudienceVotes} votes cast</div>
                <div className="text-lg font-black text-white">Avg: {result.audienceScore.toFixed(2)}</div>
              </div>
              {result.audienceVotes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.audienceVotes.map((v, i) => (
                    <span key={i} className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Self-Rating Gap */}
          <div>
            <div className="text-xs text-white/30 font-bold tracking-widest mb-2">SELF-RATING COMPARISON</div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-white/50">Self-rated: <span className="text-white font-bold">{result.selfRating}/10</span></div>
                <div className="text-sm text-white/50">Final Score: <span className="text-white font-bold">{result.finalScore.toFixed(2)}/10</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/30 mb-0.5">GAP</div>
                <div className={`text-2xl font-black tabular-nums ${result.selfRatingGap <= 1 ? 'text-emerald-400' : result.selfRatingGap <= 2.5 ? 'text-amber-400' : 'text-red-400'}`}>
                  {result.selfRatingGap.toFixed(2)}
                </div>
                <div className="text-xs text-white/30">
                  {result.selfRatingGap <= 1 ? 'Accurate self-assessment' : result.selfRatingGap <= 2.5 ? 'Slight variance' : 'High variance'}
                </div>
              </div>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-colors text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
