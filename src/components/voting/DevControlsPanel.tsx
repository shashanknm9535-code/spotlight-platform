import React, { useState } from 'react';
import { Sliders, RefreshCw, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, FastForward } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface DevControlsPanelProps {
  onUseValidTicket: () => void;
  onUseInvalidTicket: () => void;
  onNextAct: () => void;
  onToggleVotingOpen: () => void;
  onResetVotes: () => void;
  isVotingOpen: boolean;
  activeActSlot: number;
}

export const DevControlsPanel: React.FC<DevControlsPanelProps> = ({
  onUseValidTicket,
  onUseInvalidTicket,
  onNextAct,
  onToggleVotingOpen,
  onResetVotes,
  isVotingOpen,
  activeActSlot,
}) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm bg-[#0E0E16] border-2 border-amber-400/80 shadow-[0_0_30px_rgba(250,204,21,0.2)] text-xs font-mono">
      {/* Dev Header Toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full bg-[#181826] p-3 flex items-center justify-between text-amber-400 hover:bg-[#202032] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4" />
          <span className="font-bold uppercase tracking-wider">DEV CONTROLS (TESTING)</span>
        </div>
        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Controls Content */}
      {!collapsed && (
        <div className="p-4 space-y-3 bg-[#0E0E16] border-t border-[#27273C]">
          <div className="p-2 bg-[#141420] border border-[#222234] text-[11px] text-zinc-400">
            Current Stage Slot: <strong className="text-white">#{activeActSlot}</strong> | Voting:{' '}
            <strong className={isVotingOpen ? 'text-emerald-400' : 'text-red-400'}>
              {isVotingOpen ? 'OPEN' : 'CLOSED'}
            </strong>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={onUseValidTicket}
              className="p-2 bg-[#141420] border border-[#27273C] text-left text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Use Valid Ticket (SPT-TKT-2026-0001)</span>
            </button>

            <button
              type="button"
              onClick={onUseInvalidTicket}
              className="p-2 bg-[#141420] border border-[#27273C] text-left text-zinc-300 hover:text-red-400 hover:border-red-400/50 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Simulate Invalid Ticket</span>
            </button>

            <button
              type="button"
              onClick={onNextAct}
              className="p-2 bg-[#141420] border border-[#27273C] text-left text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Next Act (Advance Slot)</span>
            </button>

            <button
              type="button"
              onClick={onToggleVotingOpen}
              className="p-2 bg-[#141420] border border-[#27273C] text-left text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Toggle Voting Open / Closed</span>
            </button>

            <button
              type="button"
              onClick={onResetVotes}
              className="p-2 bg-[#141420] border border-[#27273C] text-left text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Local Vote Memory</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 pt-2 border-t border-[#222234]">
            Development harness only • Will be omitted in production
          </div>
        </div>
      )}
    </div>
  );
};
