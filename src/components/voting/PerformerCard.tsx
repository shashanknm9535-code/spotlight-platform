import React from 'react';
import type { Act } from '../../types';
import { Badge } from '../ui/Badge';
import { User, Users, Music2 } from 'lucide-react';

export interface PerformerCardProps {
  act: Act;
}

export const PerformerCard: React.FC<PerformerCardProps> = ({ act }) => {
  return (
    <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] relative overflow-hidden space-y-6">
      <div className="flex items-center justify-between border-b border-[#1C1C2A] pb-4">
        <div className="flex items-center space-x-2">
          <Badge variant="live">NOW ON STAGE</Badge>
          <span className="text-xs font-mono font-bold text-amber-400">
            SLOT #{act.slotNumber.toString().padStart(2, '0')}
          </span>
        </div>

        <Badge variant="dark" icon={act.category === 'group' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}>
          {act.category === 'group' ? 'GROUP ACT' : 'SOLO ACT'}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* PERFORMER STAGE PHOTO */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 bg-[#141420] border-2 border-amber-400/80 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.2)]">
          <img
            src={act.photoUrl}
            alt={act.performerName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* PERFORMER DETAILS */}
        <div className="space-y-2 text-center sm:text-left grow">
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white uppercase tracking-tight">
            {act.title}
          </h2>

          <p className="text-sm font-semibold text-amber-400 font-sans">
            {act.performerName}
          </p>

          <div className="text-xs font-mono text-zinc-400 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>{act.department}</span>
            <span>•</span>
            <span>{act.year}</span>
            <span>•</span>
            <span className="text-zinc-300 font-bold">{act.performanceType}</span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed pt-2 border-t border-[#1C1C2A]">
            "{act.blurb}"
          </p>
        </div>
      </div>
    </div>
  );
};
