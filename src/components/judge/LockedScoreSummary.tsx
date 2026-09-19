import React from 'react';
import type { JudgeScore } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface LockedScoreSummaryProps {
  score: JudgeScore;
  onNextAct: () => void;
}

export const LockedScoreSummary: React.FC<LockedScoreSummaryProps> = ({
  score,
  onNextAct,
}) => {
  return (
    <div className="p-6 sm:p-8 bg-[#0E0E16] border-2 border-amber-400/80 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A]">
        <div className="flex items-center space-x-2">
          <Lock className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-display font-bold text-white uppercase">
            IMMUTABLE SCORE RECORD
          </h3>
        </div>
        <Badge variant="gold" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          SCORE LOCKED
        </Badge>
      </div>

      <div className="p-4 bg-amber-400/10 border border-amber-400/30 text-xs font-mono text-amber-400 text-center">
        🔒 Your score for Act #{score.actId} has been recorded into the judge ledger and locked.
      </div>

      {/* READ ONLY BREAKDOWN */}
      <div className="space-y-3 font-mono text-xs">
        <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between">
          <span className="text-zinc-400">Creativity</span>
          <span className="font-bold text-white">{score.creativity} / 3</span>
        </div>

        <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between">
          <span className="text-zinc-400">Execution</span>
          <span className="font-bold text-white">{score.execution} / 3</span>
        </div>

        <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between">
          <span className="text-zinc-400">Stage Presence</span>
          <span className="font-bold text-white">{score.stagePresence} / 2</span>
        </div>

        <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between">
          <span className="text-zinc-400">Audience Engagement</span>
          <span className="font-bold text-white">{score.audienceEngagement} / 2</span>
        </div>

        <div className="p-4 bg-[#181826] border-2 border-amber-400 flex justify-between items-center text-sm">
          <span className="font-bold text-amber-400 uppercase">SUBMITTED TOTAL SCORE</span>
          <span className="text-3xl font-display font-black text-amber-400">
            {score.total} / 10
          </span>
        </div>

        {score.notes && (
          <div className="p-3 bg-[#141420] border border-[#27273C] text-[11px] text-zinc-400 font-sans">
            <strong className="text-zinc-300 block font-mono uppercase mb-0.5">Submitted Notes:</strong>
            "{score.notes}"
          </div>
        )}
      </div>

      {/* NEXT ACT BUTTON */}
      <Button
        type="button"
        onClick={onNextAct}
        variant="primary"
        size="lg"
        fullWidth
        icon={<ArrowRight className="w-5 h-5" />}
      >
        Continue to Next Act
      </Button>
    </div>
  );
};
