import React from 'react';
import type { ActResult } from '../../types';

interface LeaderboardRowProps {
  result: ActResult;
  onClick: (result: ActResult) => void;
  isHighlighted?: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-400 text-black font-black text-lg shadow-lg shadow-amber-400/40',
  2: 'bg-slate-300 text-slate-900 font-black text-base shadow-md shadow-slate-300/30',
  3: 'bg-amber-700 text-amber-100 font-black text-base shadow-md shadow-amber-700/30',
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ result, onClick, isHighlighted }) => {
  const isTop3 = result.rank <= 3;
  const rankStyle = RANK_STYLES[result.rank] ?? 'bg-white/10 text-white/70 font-bold text-sm';

  return (
    <button
      type="button"
      onClick={() => onClick(result)}
      className={`w-full text-left group flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer
        ${isHighlighted
          ? 'border-amber-400/60 bg-amber-400/5 shadow-lg shadow-amber-400/10'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
        }
      `}
    >
      {/* Rank Badge */}
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${rankStyle}`}>
        {isTop3 ? RANK_ICONS[result.rank] : `#${result.rank}`}
      </div>

      {/* Performer Photo */}
      <img
        src={result.photoUrl}
        alt={result.performerName}
        className="shrink-0 w-10 h-10 rounded-lg object-cover border border-white/10"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'; }}
      />

      {/* Name + Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold truncate ${isTop3 ? 'text-white' : 'text-white/90'}`}>
            {result.actTitle}
          </span>
          {result.isManualReview && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
              MANUAL REVIEW
            </span>
          )}
          {result.tiebreakerUsed && !result.isManualReview && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
              {result.tiebreakerUsed === 'audience_score' ? 'TB: AUDIENCE' : 'TB: ANCHOR'}
            </span>
          )}
        </div>
        <div className="text-xs text-white/40 mt-0.5 truncate">
          {result.performerName} · {result.performanceType}
        </div>
      </div>

      {/* Score Columns */}
      <div className="shrink-0 hidden sm:flex items-center gap-4 text-right">
        <div className="w-14">
          <div className="text-xs text-white/30 mb-0.5">PANEL</div>
          <div className="text-sm font-semibold text-white/70">{result.panelScore.toFixed(2)}</div>
        </div>
        <div className="w-14">
          <div className="text-xs text-white/30 mb-0.5">AUDIENCE</div>
          <div className="text-sm font-semibold text-white/70">{result.audienceScore.toFixed(2)}</div>
        </div>
        <div className={`w-16 px-2 py-1 rounded-lg ${isTop3 ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-white/5 border border-white/10'}`}>
          <div className="text-[10px] text-white/30 mb-0.5">FINAL</div>
          <div className={`text-base font-black tabular-nums ${isTop3 ? 'text-amber-300' : 'text-white'}`}>
            {result.finalScore.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Mobile: just final score */}
      <div className={`shrink-0 sm:hidden px-2 py-1 rounded-lg ${isTop3 ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-white/5 border border-white/10'}`}>
        <div className={`text-base font-black tabular-nums ${isTop3 ? 'text-amber-300' : 'text-white'}`}>
          {result.finalScore.toFixed(2)}
        </div>
      </div>

      {/* Chevron */}
      <div className="shrink-0 text-white/20 group-hover:text-white/50 transition-colors ml-1">›</div>
    </button>
  );
};
