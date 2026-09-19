import React from 'react';
import type { CompetitionTrack } from '../../types';
import { Button } from './Button';
import { Badge } from './Badge';
import { ArrowRight, UserCheck, Clock, ShieldCheck } from 'lucide-react';

export interface TrackCardProps {
  track: CompetitionTrack;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track }) => {
  return (
    <div className="relative p-8 md:p-10 bg-[#0E0E16] border border-[#1E1E2C] hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-400/10 to-transparent pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <Badge variant="gold">{track.badge}</Badge>
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              {track.performerLimit}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {track.stageTime}
            </span>
          </div>
        </div>

        <h3 className="text-4xl md:text-5xl font-display font-extrabold text-white uppercase tracking-tight mb-3 group-hover:text-amber-400 transition-colors">
          {track.title}
        </h3>

        <p className="text-base font-semibold text-amber-400/90 mb-4 font-sans">
          {track.tagline}
        </p>

        <p className="text-sm text-zinc-400 leading-relaxed mb-8 font-sans">
          {track.description}
        </p>
      </div>

      <div>
        <div className="mb-8 pt-6 border-t border-[#1C1C2A] space-y-2.5">
          {track.highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-center space-x-2.5 text-xs text-zinc-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        <Button
          href={track.ctaHref}
          variant="primary"
          fullWidth
          icon={<ArrowRight className="w-4 h-4" />}
        >
          {track.ctaText}
        </Button>
      </div>
    </div>
  );
};
