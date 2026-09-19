import React from 'react';
import { PageContainer } from '../ui/PageContainer';
import { SectionHeading } from '../ui/SectionHeading';
import { SCORING_DATA } from '../../data/eventData';
import { ShieldAlert, Users, Award, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const ScoringSection: React.FC = () => {
  return (
    <section id="scoring" className="relative py-24 md:py-32 bg-[#09090F] border-t border-[#1C1C2A] overflow-hidden">
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-amber-400/5 blur-[120px] pointer-events-none" />

      <PageContainer size="normal">
        <SectionHeading
          badge="COMPETITION MECHANICS"
          title="YOUR PERFORMANCE. THEIR VERDICT."
          subtitle="Spotlight combines technical expert critique with raw crowd consensus into a transparent 100-point grand total."
        />

        {/* 60 / 40 SPLIT VISUAL BAR */}
        <div className="mb-16 p-8 bg-[#0E0E16] border border-[#1E1E2C]">
          <div className="flex items-center justify-between mb-4 font-mono text-sm">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-white uppercase">60% JUDGES PANEL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase">40% LIVE AUDIENCE</span>
              <Users className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          {/* Visual Bar */}
          <div className="w-full h-6 bg-[#161622] rounded-none overflow-hidden flex border border-[#27273A]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 text-black font-mono font-bold text-xs flex items-center justify-center tracking-wider transition-all duration-500 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              style={{ width: `${SCORING_DATA.judgesWeight}%` }}
            >
              60% PANEL WEIGHT
            </div>
            <div
              className="h-full bg-[#222234] text-zinc-300 font-mono font-bold text-xs flex items-center justify-center tracking-wider"
              style={{ width: `${SCORING_DATA.audienceWeight}%` }}
            >
              40% CROWD VOTE
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-400 gap-2">
            <span>Score formula: (Panel Score / 10 × 60) + (Audience Avg / 10 × 40)</span>
            <Badge variant="gold">Real-Time Automated Ledger</Badge>
          </div>
        </div>

        {/* 2-COLUMN BREAKDOWN: JUDGES RUBRIC VS AUDIENCE RATING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* JUDGES RUBRIC (7 COLS) */}
          <div className="lg:col-span-7 p-8 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1C1C2A]">
                <div>
                  <Badge variant="gold">60% WEIGHT</Badge>
                  <h3 className="text-2xl font-display font-bold text-white uppercase mt-2">
                    Judges Evaluation Rubric
                  </h3>
                </div>
                <div className="text-right font-mono text-xs text-amber-400">
                  Total: 10 Points Scale
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {SCORING_DATA.rubric.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#141420] border border-[#222234] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-white text-lg">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          ({item.weight})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-sans">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 font-mono text-right">
                      <span className="text-2xl font-bold text-amber-400">
                        {item.maxPoints}
                      </span>
                      <span className="text-xs text-zinc-400 block">MAX PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-mono text-zinc-400 flex items-center gap-2 pt-4 border-t border-[#1C1C2A]">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              Judges score each act independently via encrypted digital slates.
            </p>
          </div>

          {/* AUDIENCE RATING (5 COLS) */}
          <div className="lg:col-span-5 p-8 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1C1C2A]">
                <div>
                  <Badge variant="dark">40% WEIGHT</Badge>
                  <h3 className="text-2xl font-display font-bold text-white uppercase mt-2">
                    Audience Live Rating
                  </h3>
                </div>
                <div className="text-right font-mono text-xs text-amber-400">
                  Scale: 1 – 10
                </div>
              </div>

              <div className="p-6 bg-[#141420] border border-[#222234] text-center mb-6">
                <div className="text-5xl font-display font-extrabold text-amber-400 mb-2">
                  1 – 10
                </div>
                <p className="text-sm font-semibold text-white font-sans uppercase mb-4">
                  Mobile QR Voting Window
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Every attendee ticket includes a unique QR vote pass. As each act finishes, a 90-second voting window opens on your mobile screen.
                </p>
              </div>

              <div className="space-y-3 text-xs font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>One verified vote per ticket holder per performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Anti-tamper geo & seat validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant submission to auditorium stage screens</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#1C1C2A] text-xs font-mono text-amber-400/90 uppercase">
              Audience power is real-time. Every vote counts.
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
};
