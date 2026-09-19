import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../ui/PageContainer';
import { Badge } from '../ui/Badge';
import { Mic2, Ticket, Radio, Shield, Tv, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050508] border-t border-[#1C1C2A] text-zinc-400 font-sans">
      <PageContainer size="normal" className="py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 md:gap-12 mb-16">
          {/* BRAND COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-400 text-black font-black flex items-center justify-center font-display text-lg tracking-tighter">
                S
              </div>
              <span className="font-display font-black text-2xl tracking-wider text-white uppercase">
                SPOTLIGHT
              </span>
            </Link>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm font-sans">
              The real-time college performance competition platform where performers step up, judges evaluate, and the audience votes live.
            </p>

            <div className="pt-2">
              <Badge variant="gold" icon={<Sparkles className="w-3 h-3" />}>
                LIVE EVENT EXPERIENCE 2026
              </Badge>
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-amber-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="/#about" className="hover:text-amber-400 transition-colors">
                  About Spotlight
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-amber-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#scoring" className="hover:text-amber-400 transition-colors">
                  Scoring Breakdown
                </a>
              </li>
              <li>
                <a href="/#tracks" className="hover:text-amber-400 transition-colors">
                  Solo & Group Tracks
                </a>
              </li>
            </ul>
          </div>

          {/* EVENT ACTIONS */}
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">
              Event Portals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/register" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5 text-amber-400" />
                  Performer Registration
                </Link>
              </li>
              <li>
                <Link to="/ticket" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  ₹10 Audience Pass
                </Link>
              </li>
              <li>
                <Link to="/vote" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  Live Mobile Voting
                </Link>
              </li>
              <li>
                <Link to="/judge" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Judge Rubric Portal
                </Link>
              </li>
              <li>
                <Link to="/stage" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-amber-400" />
                  Stage Screen Feed
                </Link>
              </li>
            </ul>
          </div>

          {/* KEY SPECS */}
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">
              Platform Specs
            </h4>
            <div className="space-y-3 text-xs font-mono text-zinc-400">
              <div className="p-2.5 bg-[#0D0D14] border border-[#1E1E2C]">
                <span className="text-amber-400 block font-bold">CAPACITY</span>
                800 Live Audience Seats
              </div>
              <div className="p-2.5 bg-[#0D0D14] border border-[#1E1E2C]">
                <span className="text-amber-400 block font-bold">FORMULA</span>
                60% Judges × 40% Audience
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM COPYRIGHT BAR */}
        <div className="pt-8 border-t border-[#181826] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div>
            © 2026 Spotlight. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <span className="hover:text-zinc-300 transition-colors">Privacy Policy</span>
            <span className="hover:text-zinc-300 transition-colors">Terms of Service</span>
            <span className="hover:text-zinc-300 transition-colors">Event Guidelines</span>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
};
