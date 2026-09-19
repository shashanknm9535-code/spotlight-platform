import React from 'react';
import type { JudgeIdentity } from '../../types';
import { Badge } from '../ui/Badge';
import { Shield, LogOut, Award } from 'lucide-react';

export interface JudgeHeaderProps {
  judge: JudgeIdentity;
  activeActSlot: number;
  totalActs: number;
  onLogout: () => void;
}

export const JudgeHeader: React.FC<JudgeHeaderProps> = ({
  judge,
  activeActSlot,
  totalActs,
  onLogout,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-8 border-b border-[#1C1C2A] gap-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-amber-400 text-black flex items-center justify-center font-bold">
          <Award className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <span className="font-display font-black text-xl text-white uppercase tracking-wider block">
            SPOTLIGHT JUDGE PANEL
          </span>
          <span className="text-xs font-mono text-amber-400">
            {judge.role} • {judge.name}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
        <div className="flex items-center space-x-2">
          <Badge variant="live">PERFORMANCE LIVE</Badge>
          <span className="text-xs font-mono font-bold text-zinc-300">
            ACT #{activeActSlot.toString().padStart(2, '0')} / {totalActs.toString().padStart(2, '0')}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="p-2 text-xs font-mono text-zinc-400 hover:text-white bg-[#141420] border border-[#27273C] flex items-center gap-1.5 transition-colors"
          title="Log Out of Judge Panel"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
};
