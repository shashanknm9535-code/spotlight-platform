import React, { useState, useEffect } from 'react';
import type { Act, LiveEventState } from '../types';
import { MOCK_ACTS } from '../data/eventData';
import { getLiveEventState, subscribeToEventState } from '../services/adminService';
import { getRegistration } from '../services/registrationService';
import { isSupabaseEnabled } from '../lib/supabase/client';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Tv, Radio, EyeOff, Sparkles, User, Users } from 'lucide-react';

export const StagePage: React.FC = () => {
  const [liveState, setLiveState] = useState<LiveEventState>({
    eventStatus: 'live',
    currentActId: '',
    votingOpen: false,
    votingTimeRemaining: 0,
    totalVotesReceived: 0,
  });
  const [currentAct, setCurrentAct] = useState<Act | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial event state & active act
  useEffect(() => {
    let isMounted = true;

    const loadStageData = async () => {
      setIsLoading(true);
      try {
        if (!isSupabaseEnabled) {
          if (isMounted) {
            setCurrentAct(MOCK_ACTS[0]);
            setLiveState({
              eventStatus: 'live',
              currentActId: MOCK_ACTS[0].id,
              votingOpen: true,
              votingTimeRemaining: 45,
              totalVotesReceived: 247,
            });
            setIsLoading(false);
          }
          return;
        }

        const state = await getLiveEventState();
        if (!isMounted) return;
        setLiveState(state);

        if (state.currentActId) {
          const actData = await getRegistration(state.currentActId);
          if (isMounted && actData) {
            setCurrentAct({
              id: actData.id,
              actCode: actData.act_code,
              slotNumber: actData.running_order || 1,
              category: actData.category === 'GROUP' ? 'group' : 'solo',
              title: actData.title || 'Untitled Performance',
              performerName: actData.performer_name,
              department: actData.department || 'N/A',
              year: actData.year || 'N/A',
              performanceType: actData.performance_type || actData.title,
              blurb: actData.bio || '',
              photoUrl: actData.photo_url || '',
            });
          } else if (isMounted) {
            setCurrentAct(null);
          }
        } else if (isMounted) {
          setCurrentAct(null);
        }
      } catch (err) {
        console.warn('[StagePage] Error loading stage data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStageData();

    // Subscribe to Realtime state updates
    const unsubscribe = subscribeToEventState(async (newState) => {
      if (!isMounted) return;
      setLiveState(newState);

      if (newState.currentActId) {
        const actData = await getRegistration(newState.currentActId);
        if (isMounted && actData) {
          setCurrentAct({
            id: actData.id,
            actCode: actData.act_code,
            slotNumber: actData.running_order || 1,
            category: actData.category === 'GROUP' ? 'group' : 'solo',
            title: actData.title || 'Untitled Performance',
            performerName: actData.performer_name,
            department: actData.department || 'N/A',
            year: actData.year || 'N/A',
            performanceType: actData.performance_type || actData.title,
            blurb: actData.bio || '',
            photoUrl: actData.photo_url || '',
          });
        }
      } else if (isMounted) {
        setCurrentAct(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-[#050508] flex items-center justify-center">
        <div className="text-center font-mono text-xs text-zinc-500">
          <span className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin inline-block mb-3" />
          <p>Connecting to Auditorium Mainstage Screen Feed...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 bg-[#050508] bg-noise">
      <PageContainer size="wide">
        {/* STAGE DISPLAY HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
              MAINSTAGE PROJECTION FEED
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white uppercase tracking-tight mt-1">
              SPOTLIGHT 2026 LIVE STAGE
            </h1>
            <p className="text-xs font-mono text-zinc-400">
              Live feed broadcast to auditorium LED screens and stage monitors.
            </p>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <span className={`px-3 py-1.5 border flex items-center gap-1.5 ${
              liveState.votingOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                : 'bg-red-500/10 border-red-500/30 text-red-400 font-bold'
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{liveState.votingOpen ? 'VOTING OPEN' : 'VOTING CLOSED'}</span>
            </span>
          </div>
        </div>

        {/* MAINSTAGE SCREEN FEED CONTAINER */}
        <div className="p-6 sm:p-12 bg-[#08080E] border-4 border-amber-400/80 shadow-[0_0_80px_rgba(250,204,21,0.2)] relative overflow-hidden font-sans rounded-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 blur-[120px] pointer-events-none" />

          {/* SCREEN HEADER */}
          <div className="flex items-center justify-between pb-6 border-b border-[#1E1E2E] mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-400 text-black flex items-center justify-center font-black font-display text-2xl">
                S
              </div>
              <div>
                <span className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wider block leading-none">
                  SPOTLIGHT 2026
                </span>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest block mt-1">
                  OFFICIAL AUDITORIUM FEED
                </span>
              </div>
            </div>

            <Badge variant={currentAct ? 'live' : 'dark'}>
              {currentAct ? 'NOW ON STAGE' : 'STAGE CLEAR'}
            </Badge>
          </div>

          {/* ACTIVE ACT PROJECTION OR STAGE CLEAR PLACEHOLDER */}
          {currentAct ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center py-6">
              {/* PERFORMER STAGE PHOTO */}
              <div className="md:col-span-5 flex justify-center">
                <div className="w-56 h-56 sm:w-72 sm:h-72 bg-[#141420] border-4 border-amber-400 shadow-[0_0_50px_rgba(250,204,21,0.35)] overflow-hidden shrink-0">
                  <img src={currentAct.photoUrl || ''} alt={currentAct.title} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* PERFORMER DETAILS */}
              <div className="md:col-span-7 space-y-5 text-center md:text-left">
                <div className="inline-flex items-center space-x-2">
                  <Badge variant="gold">ACT #{currentAct.slotNumber.toString().padStart(2, '0')}</Badge>
                  <Badge variant="dark" icon={currentAct.category === 'group' ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}>
                    {(currentAct.category || 'solo').toUpperCase()} ACT
                  </Badge>
                </div>

                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-white uppercase tracking-tight leading-none">
                  {currentAct.title}
                </h2>

                <p className="text-2xl sm:text-3xl font-bold text-amber-400 font-sans">
                  {currentAct.performerName}
                </p>

                <div className="text-sm sm:text-base font-mono text-zinc-300 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span>{currentAct.department}</span>
                  <span>•</span>
                  <span>{currentAct.year}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{currentAct.performanceType}</span>
                </div>

                {currentAct.blurb && (
                  <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed max-w-xl">
                    "{currentAct.blurb}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center space-y-4 font-mono text-zinc-500">
              <Tv className="w-16 h-16 mx-auto text-amber-400/60 animate-pulse" />
              <p className="text-lg uppercase font-bold text-zinc-300 tracking-wider">
                NO ACT CURRENTLY ACTIVE ON STAGE
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                The mainstage feed will display the next performer as soon as the stage manager sets an act live.
              </p>
            </div>
          )}

          {/* FOOTER BAR */}
          <div className="pt-6 border-t border-[#1E1E2E] mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
            <span>FEED ID: SPOTLIGHT-MAINSTAGE-01</span>
            <span className="text-amber-400 font-bold">
              {liveState.votingOpen ? '⚡ LIVE VOTING IN PROGRESS' : '🔒 VOTING CLOSED'}
            </span>
          </div>
        </div>
      </PageContainer>
    </main>
  );
};
