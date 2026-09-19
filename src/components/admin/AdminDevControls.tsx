import React, { useState } from 'react';
import { Sliders, ChevronUp, ChevronDown, RefreshCw, Plus, FastForward } from 'lucide-react';

export interface AdminDevControlsProps {
  onResetEvent: () => void;
  onNextAct: () => void;
  onToggleVoting: () => void;
}

export const AdminDevControls: React.FC<AdminDevControlsProps> = ({
  onResetEvent,
  onNextAct,
  onToggleVoting,
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
          <span className="font-bold uppercase tracking-wider">ADMIN DEV CONTROLS</span>
        </div>
        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-2.5 bg-[#0E0E16] border-t border-[#27273C]">
          <button
            type="button"
            onClick={onNextAct}
            className="w-full p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-amber-400 text-left flex items-center gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-400" />
            <span>Advance Active Act Slot</span>
          </button>

          <button
            type="button"
            onClick={onToggleVoting}
            className="w-full p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-amber-400 text-left flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Toggle Live Voting State</span>
          </button>

          <button
            type="button"
            onClick={onResetEvent}
            className="w-full p-2 bg-[#141420] border border-[#27273C] text-zinc-300 hover:text-red-400 text-left flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            <span>Reset Event State</span>
          </button>

          <div className="text-[10px] text-zinc-500 pt-2 border-t border-[#222234]">
            Development harness only • Testing mock events
          </div>
        </div>
      )}
    </div>
  );
};
