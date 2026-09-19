import React from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PageContainer } from '../ui/PageContainer';
import { Mic2, Ticket, Sparkles, ChevronDown } from 'lucide-react';
import { EVENT_INFO } from '../../data/eventData';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] md:min-h-screen pt-32 pb-20 flex items-center justify-center overflow-hidden spotlight-radial-hero bg-noise">
      {/* STAGE LIGHTING & CONE EFFECT */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top spotlight source bulb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-2 bg-amber-300 blur-sm rounded-full z-20 shadow-[0_0_80px_30px_rgba(250,204,21,0.8)]" />

        {/* Dynamic Cone Spotlight Beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[900px] spotlight-cone origin-top animate-spotlight-sway opacity-90" />

        {/* Center Stage Floor Glow Oval */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[250px] bg-amber-400/10 blur-[100px] rounded-full" />

        {/* Ambient Grid Lines */}
        <div className="absolute inset-0 bg-grid-pattern opacity-15" />
      </div>

      <PageContainer size="wide" className="relative z-10 text-center">
        {/* EVENT EDITION BADGE */}
        <div className="inline-flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
            {EVENT_INFO.edition}
          </Badge>
          <span className="hidden sm:inline-block text-xs font-mono text-zinc-400 tracking-wider uppercase border-l border-zinc-700 pl-3">
            LIVE AUDIENCE SCORING
          </span>
        </div>

        {/* MASSIVE DISPLAY TYPOGRAPHY */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black tracking-tight text-white uppercase leading-[0.92] mb-6 select-none animate-in fade-in slide-in-from-bottom-5 duration-1000">
          YOUR STAGE.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 spotlight-text-glow">
            YOUR MOMENT.
          </span>
        </h1>

        {/* SUPPORTING SUBTITLE */}
        <p className="text-lg sm:text-xl md:text-2xl text-zinc-300 font-sans max-w-3xl mx-auto font-normal leading-relaxed mb-10 text-balance animate-in fade-in slide-in-from-bottom-7 duration-1000">
          {EVENT_INFO.tagline}
        </p>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-lg mx-auto mb-16 animate-in fade-in slide-in-from-bottom-9 duration-1000">
          <Button
            href="/register"
            variant="primary"
            size="lg"
            fullWidth
            icon={<Mic2 className="w-5 h-5" />}
          >
            Register as Performer
          </Button>
          <Button
            href="/ticket"
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Ticket className="w-5 h-5 text-amber-400" />}
          >
            Get Your ₹10 Ticket
          </Button>
        </div>

        {/* KEY FEATURES TAPE */}
        <div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-6 py-3 bg-[#0E0E16]/90 border border-[#1E1E2E] backdrop-blur-md text-xs font-mono text-zinc-400 uppercase tracking-widest">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>800 CAPACITY AUDITORIUM</span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold">₹10</span>
            <span>ENTRY TICKET</span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold">60 / 40</span>
            <span>PANEL × AUDIENCE</span>
          </div>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="mt-16 flex justify-center">
          <a
            href="#stats"
            className="p-2 text-zinc-300 hover:text-amber-400 transition-colors animate-bounce"
            aria-label="Scroll down"
          >
            <ChevronDown className="w-6 h-6" />
          </a>
        </div>
      </PageContainer>
    </section>
  );
};
