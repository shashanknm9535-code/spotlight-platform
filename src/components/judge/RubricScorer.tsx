import React from 'react';
import { Award, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export interface RubricScorerProps {
  creativity: number;
  execution: number;
  stagePresence: number;
  audienceEngagement: number;
  notes: string;
  onChangeCategory: (category: 'creativity' | 'execution' | 'stagePresence' | 'audienceEngagement', value: number) => void;
  onChangeNotes: (notes: string) => void;
  onReview: () => void;
}

export const RubricScorer: React.FC<RubricScorerProps> = ({
  creativity,
  execution,
  stagePresence,
  audienceEngagement,
  notes,
  onChangeCategory,
  onChangeNotes,
  onReview,
}) => {
  const total = creativity + execution + stagePresence + audienceEngagement;

  return (
    <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A]">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-display font-bold text-white uppercase">
            SCORE THIS PERFORMANCE
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-400 uppercase">
          10-POINT OFFICIAL RUBRIC
        </span>
      </div>

      {/* 4 RUBRIC CATEGORIES */}
      <div className="space-y-6">
        {/* 1. CREATIVITY (MAX 3) */}
        <div className="p-4 bg-[#141420] border border-[#27273C] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-white text-base uppercase block">
                CREATIVITY
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Originality, arrangement, & artistic innovation (Max 3 pts)
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-400">{creativity} / 3</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeCategory('creativity', val)}
                className={`py-3 font-mono text-sm font-bold border transition-all ${
                  creativity === val
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-[1.02]'
                    : 'bg-[#181826] text-zinc-300 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* 2. EXECUTION (MAX 3) */}
        <div className="p-4 bg-[#141420] border border-[#27273C] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-white text-base uppercase block">
                EXECUTION
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Technical precision, pitch/fidelity, & rhythm (Max 3 pts)
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-400">{execution} / 3</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeCategory('execution', val)}
                className={`py-3 font-mono text-sm font-bold border transition-all ${
                  execution === val
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-[1.02]'
                    : 'bg-[#181826] text-zinc-300 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* 3. STAGE PRESENCE (MAX 2) */}
        <div className="p-4 bg-[#141420] border border-[#27273C] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-white text-base uppercase block">
                STAGE PRESENCE
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Confidence, expressiveness, & visual impact (Max 2 pts)
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-400">{stagePresence} / 2</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeCategory('stagePresence', val)}
                className={`py-3 font-mono text-sm font-bold border transition-all ${
                  stagePresence === val
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-[1.02]'
                    : 'bg-[#181826] text-zinc-300 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* 4. AUDIENCE ENGAGEMENT (MAX 2) */}
        <div className="p-4 bg-[#141420] border border-[#27273C] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-white text-base uppercase block">
                AUDIENCE ENGAGEMENT
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Crowd reaction, atmosphere, & energy flow (Max 2 pts)
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-400">{audienceEngagement} / 2</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeCategory('audienceEngagement', val)}
                className={`py-3 font-mono text-sm font-bold border transition-all ${
                  audienceEngagement === val
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-[1.02]'
                    : 'bg-[#181826] text-zinc-300 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PROMINENT LIVE TOTAL READOUT */}
      <div className="p-6 bg-[#141420] border-2 border-amber-400 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase block">
            CALCULATED TOTAL SCORE
          </span>
          <span className="text-xs font-mono text-amber-400">
            60% Panel Weight Component
          </span>
        </div>

        <div className="text-right">
          <span className="text-5xl font-display font-black text-amber-400 spotlight-text-glow">
            {total}
          </span>
          <span className="text-xl font-display font-bold text-zinc-500"> / 10</span>
        </div>
      </div>

      {/* OPTIONAL NOTES */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
          Judge Notes <span className="text-zinc-500 font-normal">(Optional)</span>
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Optional notes about vocal range, choreography precision, or feedback for organizers..."
          className="w-full p-3 bg-[#141420] border border-[#27273C] text-white text-xs font-sans focus:outline-none focus:border-amber-400 resize-none"
        />
      </div>

      {/* REVIEW BUTTON */}
      <Button
        type="button"
        onClick={onReview}
        variant="primary"
        size="lg"
        fullWidth
        icon={<CheckCircle2 className="w-5 h-5" />}
      >
        Review Score ({total} / 10)
      </Button>
    </div>
  );
};
