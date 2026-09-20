import React, { useState } from 'react';
import type { LiveEventState, Act } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Radio, Play, Square, Pause, RotateCcw, FastForward, AlertTriangle, X } from 'lucide-react';

export interface LiveEventTabProps {
  liveState: LiveEventState;
  currentAct: Act | null;
  onUpdateState: (newState: Partial<LiveEventState>) => void;
  onNextAct: () => void;
}

export const LiveEventTab: React.FC<LiveEventTabProps> = ({
  liveState,
  currentAct,
  onUpdateState,
  onNextAct,
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'pause' | 'end' | 'reset';
    title: string;
    description: string;
  } | null>(null);

  const handleExecuteAction = () => {
    if (!confirmDialog) return;
    if (confirmDialog.action === 'pause') {
      onUpdateState({ eventStatus: liveState.eventStatus === 'paused' ? 'live' : 'paused' });
    } else if (confirmDialog.action === 'end') {
      onUpdateState({ eventStatus: 'ended', votingOpen: false });
    } else if (confirmDialog.action === 'reset') {
      onUpdateState({ eventStatus: 'live', votingOpen: true, totalVotesReceived: 0 });
    }
    setConfirmDialog(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Badge variant="gold">COMMAND CENTER</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
          LIVE EVENT CONTROL
        </h1>
        <p className="text-xs font-mono text-zinc-400">
          Real-time auditorium stage sequence, voting window override, and event safety controls.
        </p>
      </div>

      {/* EVENT STATUS BAR */}
      <div className="p-6 sm:p-8 bg-[#0E0E16] border-2 border-amber-400 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A]">
          <div className="flex items-center space-x-3">
            <Radio className="w-6 h-6 text-red-400 animate-pulse" />
            <div>
              <span className="text-xs font-mono text-zinc-400 block">EVENT STATUS</span>
              <span className="text-2xl font-display font-bold text-white uppercase">
                {liveState.eventStatus.toUpperCase()}
              </span>
            </div>
          </div>

          <Badge variant={liveState.eventStatus === 'live' ? 'live' : 'dark'}>
            {liveState.eventStatus.toUpperCase()}
          </Badge>
        </div>

        {/* ACTIVE ACT & VOTES RECAP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-4 bg-[#141420] border border-[#27273C]">
            {currentAct ? (
              <>
                <span className="text-zinc-500 block">STAGE SLOT #{currentAct.slotNumber}</span>
                <span className="text-lg font-bold text-white uppercase block">{currentAct.title}</span>
                <span className="text-amber-400 block">{currentAct.performerName}</span>
              </>
            ) : (
              <>
                <span className="text-zinc-500 block">STAGE SLOT</span>
                <span className="text-lg font-bold text-zinc-400 uppercase block">NO ACTIVE ACT</span>
                <span className="text-zinc-500 block">Waiting for organizer selection</span>
              </>
            )}
          </div>

          <div className="p-4 bg-[#141420] border border-[#27273C]">
            <span className="text-zinc-500 block">VOTING WINDOW</span>
            <span className={`text-lg font-bold block ${liveState.votingOpen ? 'text-emerald-400' : 'text-red-400'}`}>
              {liveState.votingOpen ? 'OPEN' : 'CLOSED'}
            </span>
            <span className="text-zinc-400 block">Audience Rating Active</span>
          </div>

          <div className="p-4 bg-[#141420] border border-[#27273C]">
            <span className="text-zinc-500 block">LIVE VOTES RECEIVED</span>
            <span className="text-3xl font-display font-black text-amber-400">{liveState.totalVotesReceived}</span>
            <span className="text-zinc-400 block">Realtime Vote Tally</span>
          </div>
        </div>

        {/* EMPTY STATE BANNER WHEN NO ACT IS CURRENTLY ACTIVE */}
        {!currentAct && (
          <div className="p-4 sm:p-5 bg-[#141420] border border-amber-400/30 text-center space-y-1.5">
            <span className="text-amber-400 font-mono font-bold text-xs tracking-wider uppercase block">
              NO ACT CURRENTLY ACTIVE
            </span>
            <p className="text-sm font-sans text-white font-medium">
              No performer has been placed on stage yet.
            </p>
            <p className="text-xs font-mono text-zinc-400">
              Set an approved act as the current act from Running Order to begin the live event.
            </p>
          </div>
        )}

        {/* OPERATIONAL CONTROLS */}
        <div className="pt-4 border-t border-[#1C1C2A] space-y-3">
          <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
            STAGE & VOTING OVERRIDES
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              type="button"
              variant={liveState.votingOpen ? 'secondary' : 'primary'}
              size="md"
              onClick={() => onUpdateState({ votingOpen: !liveState.votingOpen })}
              icon={liveState.votingOpen ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            >
              {liveState.votingOpen ? 'Close Voting' : 'Open Voting'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onNextAct}
              icon={<FastForward className="w-4 h-4" />}
            >
              Next Act
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() =>
                setConfirmDialog({
                  action: 'pause',
                  title: liveState.eventStatus === 'paused' ? 'RESUME EVENT' : 'PAUSE EVENT',
                  description: 'Are you sure you want to pause live stage scoring and voting?',
                })
              }
              icon={<Pause className="w-4 h-4" />}
            >
              {liveState.eventStatus === 'paused' ? 'Resume Event' : 'Pause Event'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() =>
                setConfirmDialog({
                  action: 'reset',
                  title: 'RESET EVENT STATE',
                  description: 'Warning: This will reset active vote memory and clear current slot timers.',
                })
              }
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Event
            </Button>
          </div>
        </div>
      </div>

      {/* DANGER CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-[#08080C]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0E0E16] border-2 border-red-500 p-6 text-center space-y-4 font-mono text-xs">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-lg font-display font-bold text-white uppercase">{confirmDialog.title}</h3>
            <p className="text-zinc-400 font-sans">{confirmDialog.description}</p>
            <div className="flex justify-center space-x-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-400 border-red-500 hover:bg-red-500/20 font-bold"
                onClick={handleExecuteAction}
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
