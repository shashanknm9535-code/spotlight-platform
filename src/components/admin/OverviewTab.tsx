import React from 'react';
import type { LiveEventState, Act, AdminTab } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Users, Ticket, Award, Radio, ArrowRight, Play, Square, FastForward } from 'lucide-react';

export interface OverviewTabProps {
  liveState: LiveEventState;
  currentAct: Act;
  onNavigateTab: (tab: AdminTab) => void;
  onToggleVoting: () => void;
  onNextAct: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  liveState,
  currentAct,
  onNavigateTab,
  onToggleVoting,
  onNextAct,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Badge variant="gold">ADMIN DASHBOARD</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-2">
          EVENT OVERVIEW
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-1">
          Operational control metrics for Spotlight 2026 live performance.
        </p>
      </div>

      {/* 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* REGISTRATIONS */}
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>PERFORMERS</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-4xl font-display font-extrabold text-white">126</div>
          <div className="text-xs font-mono text-zinc-400">
            <span className="text-emerald-400 font-bold">98 Confirmed</span> • 28 Pending
          </div>
        </div>

        {/* TICKETS SOLD */}
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>TICKETS SOLD</span>
            <Ticket className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-4xl font-display font-extrabold text-amber-400">
            643 <span className="text-xl font-sans text-zinc-500">/ 800</span>
          </div>
          <div className="w-full bg-[#181826] h-1.5 overflow-hidden">
            <div className="bg-amber-400 h-full w-[80%]" />
          </div>
          <div className="text-[11px] font-mono text-zinc-400">80% Auditorium Capacity</div>
        </div>

        {/* CURRENT ACT */}
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>STAGE SLOT</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-4xl font-display font-extrabold text-white">
            ACT #{currentAct.slotNumber.toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-mono text-amber-400 truncate">
            {currentAct.title}
          </div>
        </div>

        {/* JUDGES STATUS */}
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>JUDGES PANEL</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-4xl font-display font-extrabold text-white">3 / 3</div>
          <div className="text-xs font-mono text-emerald-400 font-bold">● Active & Online</div>
        </div>
      </div>

      {/* LIVE EVENT SUMMARY CARD */}
      <div className="p-6 sm:p-8 bg-[#0E0E16] border-2 border-amber-400/80 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A]">
          <div className="flex items-center space-x-3">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-xl font-display font-bold text-white uppercase">
              LIVE EVENT STATUS
            </h3>
          </div>
          <Badge variant="gold">AUDITORIUM ACTIVE</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
          <div className="p-4 bg-[#141420] border border-[#27273C] space-y-1">
            <span className="text-zinc-500 block">NOW ON STAGE</span>
            <span className="text-lg font-bold text-white uppercase block">{currentAct.title}</span>
            <span className="text-amber-400 block">{currentAct.performerName}</span>
          </div>

          <div className="p-4 bg-[#141420] border border-[#27273C] space-y-1">
            <span className="text-zinc-500 block">VOTING WINDOW</span>
            <span className={`text-lg font-bold block ${liveState.votingOpen ? 'text-emerald-400' : 'text-red-400'}`}>
              {liveState.votingOpen ? 'OPEN (00:42)' : 'CLOSED'}
            </span>
            <span className="text-zinc-400 block">{liveState.totalVotesReceived} Votes Received</span>
          </div>

          <div className="p-4 bg-[#141420] border border-[#27273C] space-y-2 flex flex-col justify-between">
            <span className="text-zinc-500 block">QUICK ACTIONS</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleVoting}
                className="flex-1 text-xs"
              >
                {liveState.votingOpen ? 'Close Vote' : 'Open Vote'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onNextAct}
                icon={<FastForward className="w-3.5 h-3.5" />}
                className="flex-1 text-xs"
              >
                Next Act
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1C1C2A] flex flex-wrap gap-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => onNavigateTab('registrations')}
            className="text-amber-400 hover:text-yellow-300 flex items-center gap-1 uppercase font-bold"
          >
            Manage Registrations <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('running-order')}
            className="text-amber-400 hover:text-yellow-300 flex items-center gap-1 uppercase font-bold"
          >
            Edit Running Order <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('live')}
            className="text-amber-400 hover:text-yellow-300 flex items-center gap-1 uppercase font-bold"
          >
            Full Live Controls <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
