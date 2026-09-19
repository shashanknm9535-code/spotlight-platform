import React from 'react';
import type { Act } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Award, Lock, ArrowLeft, CheckCircle2, X } from 'lucide-react';

export interface ScoreReviewModalProps {
  act: Act;
  creativity: number;
  execution: number;
  stagePresence: number;
  audienceEngagement: number;
  notes?: string;
  isSubmitting: boolean;
  onConfirmSubmit: () => void;
  onEdit: () => void;
}

export const ScoreReviewModal: React.FC<ScoreReviewModalProps> = ({
  act,
  creativity,
  execution,
  stagePresence,
  audienceEngagement,
  notes,
  isSubmitting,
  onConfirmSubmit,
  onEdit,
}) => {
  const total = creativity + execution + stagePresence + audienceEngagement;

  return (
    <div className="fixed inset-0 z-50 bg-[#08080C]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E0E16] border-2 border-amber-400 p-6 sm:p-8 relative shadow-[0_0_50px_rgba(250,204,21,0.25)] space-y-6">
        <button
          type="button"
          onClick={onEdit}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="text-center pb-4 border-b border-[#1C1C2A]">
          <Badge variant="gold" icon={<Award className="w-3.5 h-3.5" />}>
            CONFIRM RUBRIC EVALUATION
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase mt-2">
            REVIEW SCORE
          </h2>
          <p className="text-xs font-mono text-amber-400 mt-1">
            Act #{act.slotNumber} — {act.title} ({act.performerName})
          </p>
        </div>

        {/* ITEMIZED CATEGORY BREAKDOWN */}
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between items-center">
            <span className="text-zinc-300">Creativity</span>
            <span className="font-bold text-white">{creativity} / 3</span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between items-center">
            <span className="text-zinc-300">Execution</span>
            <span className="font-bold text-white">{execution} / 3</span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between items-center">
            <span className="text-zinc-300">Stage Presence</span>
            <span className="font-bold text-white">{stagePresence} / 2</span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#27273C] flex justify-between items-center">
            <span className="text-zinc-300">Audience Engagement</span>
            <span className="font-bold text-white">{audienceEngagement} / 2</span>
          </div>

          {/* TOTAL SCORE BAR */}
          <div className="p-4 bg-[#181826] border-2 border-amber-400 flex justify-between items-center text-sm">
            <span className="font-bold text-amber-400 uppercase">FINAL GRAND TOTAL</span>
            <span className="text-2xl font-display font-black text-amber-400">
              {total} / 10
            </span>
          </div>

          {notes && (
            <div className="p-3 bg-[#141420] border border-[#27273C] text-[11px] text-zinc-400 font-sans">
              <strong className="text-zinc-300 block font-mono uppercase mb-0.5">Notes:</strong>
              "{notes}"
            </div>
          )}
        </div>

        {/* LOCK WARNING */}
        <div className="p-3 bg-amber-400/10 border border-amber-400/30 text-xs font-mono text-amber-400 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Scores cannot be edited after submission. Please verify before locking.</span>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onEdit}
            disabled={isSubmitting}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Edit Score
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            icon={
              isSubmitting ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )
            }
          >
            {isSubmitting ? 'LOCKING SCORE...' : 'Submit & Lock Score'}
          </Button>
        </div>
      </div>
    </div>
  );
};
