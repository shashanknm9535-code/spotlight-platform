import React, { useState } from 'react';
import { Sliders, ChevronUp, ChevronDown, UserCheck, FastForward, Rewind, RefreshCw } from 'lucide-react';
import { MOCK_JUDGES } from '../../data/eventData';

export interface JudgeDevControlsProps {
  onSelectJudge: (code: string) => void;
  onNextAct: () => void;
  onPrevAct: () => void;
  onResetScores: () => void;
  activeJudgeCode?: string;
  activeActSlot: number;
}

export const JudgeDevControls: React.FC<JudgeDevControlsProps> = ({
  onSelectJudge,
  onNextAct,
  onPrevAct,
  onResetScores,
  activeJudgeCode,
  activeActSlot,
}) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs sm:max-w-sm bg-[#0E0E16] border-2 border-amber-400/80 shadow-[0_0_30px_rgba(250,204,21,0.2)] text-xs font-mono">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full bg-[#181826] p-3 flex items-center justify-between text-amber-400 hover:bg-[#202032] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4" />
          <span className="font-bold uppercase tracking-wider">JUDGE DEV CONTROLS</span>
        </div>
        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3 bg-[#0E0E16] border-t border-[#27273C]">
          <div className="p-2 bg-[#141420] border border-[#222234] text-[11px] text-zinc-400">
            Active Judge: <strong className="text-amber-400">{activeJudgeCode || 'NONE'}</strong> | Act:{' '}
            <strong className="text-white">#{activeActSlot}</strong>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">
              QUICK JUDGE SWITCHING:
            </span>
            <div className="grid grid-cols-3 gap-1">
              {MOCK_JUDGES.map((j) => (
                <button
                  key={j.code}
                  type="button"
                  onClick={() => onSelectJudge(j.code)}
                  className={`p-1.5 text-center font-mono text-[11px] border transition-colors ${
                    activeJudgeCode === j.code
                      ? 'bg-amber-400 text-black font-bold border-amber-400'
                      : 'bg-[#141420] text-zinc-300 border-[#27273C] hover:border-amber-400/50'
                  }`}
                >
                  {j.code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#27273C]">
            <button
              type="button"
              onClick={onPrevAct}
              className="flex-1 p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-amber-400 flex items-center justify-center gap-1"
            >
              <Rewind className="w-3.5 h-3.5" />
              <span>Prev Act</span>
            </button>

            <button
              type="button"
              onClick={onNextAct}
              className="flex-1 p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-amber-400 flex items-center justify-center gap-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Next Act</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetScores}
            className="w-full p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-amber-400 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Mock Judge Scores</span>
          </button>
        </div>
      )}
    </div>
  );
};
