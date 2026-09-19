import React from 'react';
import type { ActCategory } from '../../types';
import { User, Users, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface StepActTypeProps {
  selectedCategory: ActCategory | null;
  onSelectCategory: (category: ActCategory) => void;
  error?: string;
}

export const StepActType: React.FC<StepActTypeProps> = ({
  selectedCategory,
  onSelectCategory,
  error,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold">STEP 01</Badge>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
          WHAT ARE YOU REGISTERING?
        </h2>
        <p className="text-sm text-zinc-400 font-sans">
          Select your competition category to configure your stage setup and roster details.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        {/* SOLO CARD */}
        <button
          type="button"
          onClick={() => onSelectCategory('solo')}
          className={`relative p-8 md:p-10 text-left border transition-all duration-300 group flex flex-col justify-between ${
            selectedCategory === 'solo'
              ? 'bg-[#141422] border-amber-400 shadow-[0_0_35px_rgba(250,204,21,0.2)] scale-[1.02]'
              : 'bg-[#0E0E16] border-[#1E1E2C] hover:border-amber-400/50 hover:bg-[#12121D]'
          }`}
        >
          {selectedCategory === 'solo' && (
            <div className="absolute top-4 right-4 text-amber-400">
              <CheckCircle2 className="w-6 h-6 fill-amber-400 text-black" />
            </div>
          )}

          <div>
            <div className="w-14 h-14 bg-[#181826] border border-[#2B2B40] flex items-center justify-center mb-6 group-hover:border-amber-400/60 transition-colors">
              <User className={`w-7 h-7 ${selectedCategory === 'solo' ? 'text-amber-400' : 'text-zinc-400'}`} />
            </div>

            <Badge variant={selectedCategory === 'solo' ? 'gold' : 'dark'}>CATEGORY 01</Badge>

            <h3 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-3 mb-2 group-hover:text-amber-400 transition-colors">
              SOLO
            </h3>

            <p className="text-base font-semibold text-amber-400/90 font-sans mb-4">
              One performer. One act. One spotlight.
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              For solo vocalists, dancers, instrumentalists, spoken word poets, stand-up acts, and single performers.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1C1C2A] text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>STAGE TIME: 4 MIN</span>
            <span className="text-amber-400 font-bold">1 PERFORMER</span>
          </div>
        </button>

        {/* GROUP CARD */}
        <button
          type="button"
          onClick={() => onSelectCategory('group')}
          className={`relative p-8 md:p-10 text-left border transition-all duration-300 group flex flex-col justify-between ${
            selectedCategory === 'group'
              ? 'bg-[#141422] border-amber-400 shadow-[0_0_35px_rgba(250,204,21,0.2)] scale-[1.02]'
              : 'bg-[#0E0E16] border-[#1E1E2C] hover:border-amber-400/50 hover:bg-[#12121D]'
          }`}
        >
          {selectedCategory === 'group' && (
            <div className="absolute top-4 right-4 text-amber-400">
              <CheckCircle2 className="w-6 h-6 fill-amber-400 text-black" />
            </div>
          )}

          <div>
            <div className="w-14 h-14 bg-[#181826] border border-[#2B2B40] flex items-center justify-center mb-6 group-hover:border-amber-400/60 transition-colors">
              <Users className={`w-7 h-7 ${selectedCategory === 'group' ? 'text-amber-400' : 'text-zinc-400'}`} />
            </div>

            <Badge variant={selectedCategory === 'group' ? 'gold' : 'dark'}>CATEGORY 02</Badge>

            <h3 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-3 mb-2 group-hover:text-amber-400 transition-colors">
              GROUP
            </h3>

            <p className="text-base font-semibold text-amber-400/90 font-sans mb-4">
              Multiple performers. One act. One spotlight.
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              For dance crews, music bands, theater troupes, and collaborative ensembles delivering high-energy synchronized acts.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1C1C2A] text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>STAGE TIME: 7 MIN</span>
            <span className="text-amber-400 font-bold">2–12 PERFORMERS</span>
          </div>
        </button>
      </div>
    </div>
  );
};
