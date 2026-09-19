import React from 'react';
import type { Act } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ArrowUp, ArrowDown, Radio, Trash2, Shield } from 'lucide-react';

export interface RunningOrderTabProps {
  runningOrder: Act[];
  activeActId: string;
  onReorder: (newActs: Act[]) => void;
  onSetActiveAct: (actId: string) => void;
}

export const RunningOrderTab: React.FC<RunningOrderTabProps> = ({
  runningOrder,
  activeActId,
  onReorder,
  onSetActiveAct,
}) => {
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...runningOrder];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onReorder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === runningOrder.length - 1) return;
    const updated = [...runningOrder];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onReorder(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="gold">STAGE QUEUE</Badge>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
            RUNNING ORDER ({runningOrder.length} ACTS)
          </h1>
        </div>
      </div>

      <p className="text-xs font-mono text-zinc-400">
        Reorder performance slots for the auditorium stage manager slate. The active act marked <strong className="text-emerald-400">NOW LIVE</strong> streams directly to judge and voting portals.
      </p>

      {/* RUNNING ORDER LIST */}
      <div className="space-y-3">
        {runningOrder.map((act, idx) => {
          const isLive = act.id === activeActId;
          return (
            <div
              key={act.id}
              className={`p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs ${
                isLive
                  ? 'bg-[#141424] border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.15)]'
                  : 'bg-[#0E0E16] border-[#1E1E2C] hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-display font-black text-amber-400 w-8 text-center">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>

                <div className="w-12 h-12 bg-[#141420] border border-[#27273C] overflow-hidden shrink-0">
                  <img src={act.photoUrl} alt={act.title} className="w-full h-full object-cover" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-display font-bold text-white uppercase">
                      {act.title}
                    </h3>
                    {isLive && <Badge variant="live">NOW LIVE</Badge>}
                  </div>
                  <span className="text-amber-400 block">{act.performerName}</span>
                  <span className="text-zinc-500 text-[11px] block">
                    {act.category.toUpperCase()} • {act.performanceType} • {act.department}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1C1C2A]">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-2 text-zinc-400 hover:text-white bg-[#141420] border border-[#27273C] disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === runningOrder.length - 1}
                  className="p-2 text-zinc-400 hover:text-white bg-[#141420] border border-[#27273C] disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {!isLive && (
                  <button
                    type="button"
                    onClick={() => onSetActiveAct(act.id)}
                    className="px-3 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold uppercase flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Set Live</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
