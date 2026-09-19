import React from 'react';
import type { EventStat } from '../../types';

export interface StatCardProps {
  stat: EventStat;
}

export const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  return (
    <div
      className={`relative p-6 sm:p-8 bg-[#0E0E16]/80 backdrop-blur-md border ${
        stat.highlight
          ? 'border-amber-400/40 shadow-[0_0_30px_rgba(250,204,21,0.08)]'
          : 'border-[#1E1E2C]'
      } transition-all duration-300 hover:border-amber-400/60 group`}
    >
      {stat.highlight && (
        <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
          <div className="bg-amber-400 text-black text-[9px] font-bold py-0.5 px-3 transform rotate-45 translate-x-3 translate-y-1">
            ★
          </div>
        </div>
      )}
      <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors duration-300">
        {stat.value}
      </div>
      <div className="mt-2 text-sm sm:text-base font-semibold uppercase tracking-wider text-amber-400/90 font-mono">
        {stat.label}
      </div>
      {stat.description && (
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
          {stat.description}
        </p>
      )}
    </div>
  );
};
