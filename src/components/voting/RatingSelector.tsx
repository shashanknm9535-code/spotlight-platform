import React from 'react';
import { Star } from 'lucide-react';

export interface RatingSelectorProps {
  selectedRating: number;
  disabled?: boolean;
  onSelectRating: (rating: number) => void;
}

const getRatingDescriptor = (rating: number): string => {
  if (rating <= 3) return 'NEEDS WORK';
  if (rating <= 6) return 'GOOD PERFORMANCE';
  if (rating <= 8) return 'STRONG ACT';
  return 'OUTSTANDING SHOWSTOPPER';
};

export const RatingSelector: React.FC<RatingSelectorProps> = ({
  selectedRating,
  disabled = false,
  onSelectRating,
}) => {
  return (
    <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-6 text-center">
      <div className="flex items-center justify-center space-x-2 pb-3 border-b border-[#1C1C2A]">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        <h3 className="text-xl font-display font-bold text-white uppercase">
          RATE THIS ACT (1 – 10)
        </h3>
      </div>

      {/* BIG SCORE DISPLAY */}
      <div className="p-6 bg-[#141420] border border-[#27273C] text-center">
        <div className="text-6xl font-display font-black text-amber-400 spotlight-text-glow mb-2">
          {selectedRating} <span className="text-xl font-sans text-zinc-500">/ 10</span>
        </div>
        <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
          {getRatingDescriptor(selectedRating)}
        </div>
      </div>

      {/* 1 TO 10 TOUCH-FRIENDLY BUTTON GRID */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => onSelectRating(val)}
            className={`py-3 sm:py-3.5 font-mono text-sm sm:text-base font-bold border transition-all duration-200 select-none ${
              selectedRating === val
                ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-105 z-10'
                : 'bg-[#181826] text-zinc-300 border-[#27273C] hover:border-amber-400/60 hover:text-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {val}
          </button>
        ))}
      </div>

      {/* SLIDER CONTROLLER */}
      <input
        type="range"
        min="1"
        max="10"
        disabled={disabled}
        value={selectedRating}
        onChange={(e) => onSelectRating(Number(e.target.value))}
        className="w-full accent-amber-400 cursor-pointer disabled:opacity-30"
      />

      <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-1">
        <span>1: Needs Work</span>
        <span>5: Good</span>
        <span>8: Strong</span>
        <span>10: Outstanding</span>
      </div>
    </div>
  );
};
