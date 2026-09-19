import React, { useState } from 'react';
import type { Act } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tv, Eye, EyeOff, FastForward, Rewind, Sparkles, User, Users } from 'lucide-react';

export interface StageTabProps {
  currentAct?: Act | null;
  onNextAct: () => void;
  onPrevAct: () => void;
}

export const StageTab: React.FC<StageTabProps> = ({
  currentAct,
  onNextAct,
  onPrevAct,
}) => {
  const [displayVisible, setDisplayVisible] = useState(true);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="gold">AUDITORIUM PROJECTION</Badge>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
            STAGE DISPLAY CONTROL & PREVIEW
          </h1>
          <p className="text-xs font-mono text-zinc-400">
            Preview the projected mainstage screen view visible to auditorium audience and performers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={displayVisible ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setDisplayVisible(!displayVisible)}
            icon={displayVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          >
            {displayVisible ? 'Display Active' : 'Display Hidden'}
          </Button>
        </div>
      </div>

      {/* STAGE SCREEN PREVIEW CONTAINER */}
      <div className="p-6 sm:p-10 bg-[#050508] border-4 border-amber-400/80 shadow-[0_0_60px_rgba(250,204,21,0.25)] relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between pb-6 border-b border-[#1E1E2E] mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-amber-400 text-black flex items-center justify-center font-black font-display text-xl">
              S
            </div>
            <div>
              <span className="font-display font-black text-2xl text-white uppercase tracking-wider block">
                SPOTLIGHT
              </span>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                MAINSTAGE SCREEN FEED
              </span>
            </div>
          </div>

          <Badge variant={displayVisible ? 'live' : 'dark'}>
            {displayVisible ? 'NOW ON STAGE' : 'SCREEN BLANKED'}
          </Badge>
        </div>

        {displayVisible && currentAct ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
            {/* PERFORMER STAGE PHOTO */}
            <div className="md:col-span-4 flex justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-[#141420] border-4 border-amber-400 shadow-[0_0_40px_rgba(250,204,21,0.3)] overflow-hidden">
                <img src={currentAct.photoUrl || ''} alt={currentAct.title} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* PERFORMER STAGE DETAILS */}
            <div className="md:col-span-8 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center space-x-2">
                <Badge variant="gold">ACT #{currentAct.slotNumber.toString().padStart(2, '0')}</Badge>
                <Badge variant="dark" icon={currentAct.category === 'group' ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}>
                  {(currentAct.category || 'solo').toUpperCase()} ACT
                </Badge>
              </div>

              <h2 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tight leading-none">
                {currentAct.title}
              </h2>

              <p className="text-xl font-bold text-amber-400 font-sans">
                {currentAct.performerName}
              </p>

              <div className="text-sm font-mono text-zinc-300 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span>{currentAct.department}</span>
                <span>•</span>
                <span>{currentAct.year}</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{currentAct.performanceType}</span>
              </div>

              <p className="text-sm text-zinc-300 font-sans leading-relaxed max-w-xl">
                "{currentAct.blurb}"
              </p>
            </div>
          </div>
        ) : displayVisible && !currentAct ? (
          <div className="py-20 text-center space-y-3 font-mono text-zinc-500">
            <Tv className="w-12 h-12 mx-auto text-amber-400/60" />
            <p className="text-sm uppercase font-bold text-zinc-300">NO ACT CURRENTLY ACTIVE ON STAGE</p>
            <p className="text-xs">Set an act live from the Running Order tab to project feed onto mainstage.</p>
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 font-mono text-zinc-500">
            <EyeOff className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-sm uppercase font-bold text-zinc-400">STAGE SCREEN BLANKED BY ADMIN</p>
            <p className="text-xs">Click "Display Active" above to project current performer feed.</p>
          </div>
        )}

        <div className="pt-6 border-t border-[#1E1E2E] mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <span>PROJECTOR FEED ID: PROJ-AUDITORIUM-01</span>
          <div className="flex items-center space-x-3">
            <Button type="button" variant="secondary" size="sm" onClick={onPrevAct} icon={<Rewind className="w-3.5 h-3.5" />}>
              Previous Act
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onNextAct} icon={<FastForward className="w-3.5 h-3.5" />}>
              Next Act
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
