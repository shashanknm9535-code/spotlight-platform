import React, { useEffect, useState } from 'react';
import { LeaderboardRow } from '../components/leaderboard/LeaderboardRow';
import { ActResultDetailModal } from '../components/leaderboard/ActResultDetailModal';
import { fetchLiveLeaderboard, type LiveLeaderboardData } from '../services/scoreService';
import type { ActResult } from '../types';

export const LeaderboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'solo' | 'group'>('solo');
  const [selectedResult, setSelectedResult] = useState<ActResult | null>(null);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LiveLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchLiveLeaderboard();
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.warn('[LeaderboardPage] Error fetching leaderboard:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const leaderboard = data?.leaderboard || { soloResults: [], groupResults: [], lastCalculatedAt: '', isLive: false };

  const activeResults = (activeTab === 'solo' ? leaderboard.soloResults : leaderboard.groupResults)
    .filter(r =>
      search.trim() === '' ||
      r.actTitle.toLowerCase().includes(search.toLowerCase()) ||
      r.performerName.toLowerCase().includes(search.toLowerCase())
    );

  const updatedAt = leaderboard.lastCalculatedAt
    ? new Date(leaderboard.lastCalculatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

  return (
    <main className="min-h-screen bg-[#08080C] text-[#F4F4F6]">
      {/* Hero Header */}
      <section className="relative pt-20 pb-10 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            LIVE LEADERBOARD
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
            SPOTLIGHT 2026
          </h1>
          <p className="text-white/40 text-sm">
            Score formula: Panel Score × 60% + Audience Vote × 40%
          </p>
          <p className="text-white/25 text-xs mt-1">
            Last updated: {updatedAt}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-4">
        {/* Track Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(['solo', 'group'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab.toUpperCase()} TRACK
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search act or performer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        {/* Column Headers (desktop) */}
        <div className="hidden sm:flex items-center gap-3 sm:gap-4 px-4 text-xs text-white/25 font-bold tracking-widest">
          <div className="w-10">RANK</div>
          <div className="w-10" />
          <div className="flex-1">ACT</div>
          <div className="w-14 text-right">PANEL</div>
          <div className="w-14 text-right">AUDIENCE</div>
          <div className="w-16 text-right">FINAL</div>
          <div className="w-4" />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {activeResults.length === 0 ? (
            <div className="text-center py-16 text-white/25">
              {search ? 'No acts match your search.' : 'No results available yet.'}
            </div>
          ) : (
            activeResults.map(result => (
              <LeaderboardRow
                key={result.actId}
                result={result}
                onClick={setSelectedResult}
                isHighlighted={result.rank === 1}
              />
            ))
          )}
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-white/8 flex flex-wrap gap-3 text-xs text-white/25">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-500/40 border border-violet-500/30" />
            TB: AUDIENCE — Tiebreaker resolved by audience score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-500/40 border border-violet-500/30" />
            TB: ANCHOR — Resolved by Anchor Judge (Judge 01)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500/30" />
            MANUAL REVIEW — Requires organiser decision
          </span>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedResult && (
        <ActResultDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </main>
  );
};
