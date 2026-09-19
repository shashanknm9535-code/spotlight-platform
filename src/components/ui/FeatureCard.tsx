import React from 'react';
import type { ParticipantType } from '../../types';
import { Mic, Users, Award, Sliders, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

const iconMap: Record<string, React.ReactNode> = {
  Mic: <Mic className="w-6 h-6 text-amber-400" />,
  Users: <Users className="w-6 h-6 text-amber-400" />,
  Award: <Award className="w-6 h-6 text-amber-400" />,
  Sliders: <Sliders className="w-6 h-6 text-amber-400" />,
};

export interface FeatureCardProps {
  participant: ParticipantType;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ participant }) => {
  return (
    <div className="group relative p-8 bg-[#0E0E16] border border-[#1E1E2C] hover:border-amber-400/50 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 flex items-center justify-center bg-[#161622] border border-[#27273C] group-hover:border-amber-400/50 transition-colors">
            {iconMap[participant.iconName] || <Mic className="w-6 h-6 text-amber-400" />}
          </div>
          <Badge variant="dark">{participant.role}</Badge>
        </div>

        <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tight mb-2 group-hover:text-amber-400 transition-colors">
          {participant.title}
        </h3>
        <p className="text-sm font-semibold text-amber-400/90 font-sans mb-4">
          {participant.tagline}
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
          {participant.description}
        </p>
      </div>

      <div className="pt-4 border-t border-[#1C1C2A] space-y-2">
        {participant.highlights.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-xs text-zinc-300 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
