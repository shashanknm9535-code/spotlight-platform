import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Sparkles, Mic2, Ticket, Radio, Shield, Tv, Sliders, Construction } from 'lucide-react';

interface ModuleMetadata {
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  upcomingPhase: string;
  specs: string[];
}

const moduleMap: Record<string, ModuleMetadata> = {
  '/register': {
    title: 'PERFORMER REGISTRATION',
    badge: 'MODULE 01',
    subtitle: 'Performer registration will appear here.',
    description: 'This module will allow solo acts and group ensembles to submit their registration profiles, audio tracks, team rosters, and track preferences.',
    icon: <Mic2 className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 2: Performer Management',
    specs: ['Solo & Group Submissions', 'Audio Track Upload', 'Stage Requirements Form'],
  },
  '/ticket': {
    title: 'AUDIENCE TICKETING',
    badge: 'MODULE 02',
    subtitle: '₹10 Audience ticket booking will appear here.',
    description: 'This module will process seat reservations, QR ticket generation, and audience pass issuance for the 800-seat live event.',
    icon: <Ticket className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 3: Ticketing & Access Control',
    specs: ['₹10 Payment Gateways', 'Encrypted QR Ticket Pass', 'Instant Mobile Check-in'],
  },
  '/vote': {
    title: 'LIVE AUDIENCE VOTING',
    badge: 'MODULE 03',
    subtitle: 'Live mobile QR voting portal will appear here.',
    description: 'During live performances, audience members will scan their ticket QR code to submit 1–10 ratings for each active performer in real-time.',
    icon: <Radio className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 4: Live Voting & Realtime Engine',
    specs: ['90-Second Vote Window', '1–10 Scale Slider', 'Single-Device QR Lockout'],
  },
  '/judge': {
    title: 'JUDGE SCORING PORTAL',
    badge: 'MODULE 04',
    subtitle: 'Judge rubric evaluation interface will appear here.',
    description: 'Empowers the 4-member judge panel to grade acts on Creativity (3), Execution (3), Stage Presence (2), and Audience Engagement (2).',
    icon: <Shield className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 5: Judge Slate & Evaluation',
    specs: ['Weighted 60% Formula', 'Encrypted Judge Authentication', 'Instant Rubric Lockout'],
  },
  '/stage': {
    title: 'STAGE DISPLAY ENGINE',
    badge: 'MODULE 05',
    subtitle: 'Auditorium big-screen stage view will appear here.',
    description: 'Designed for auditorium projectors and LED walls to render running order, active performer cards, vote timers, and real-time leaderboards.',
    icon: <Tv className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 6: Stage Display & Cinema Mode',
    specs: ['Full-Screen Auditorium Mode', 'Dynamic Leaderboard Transitions', 'Live Vote Count Animations'],
  },
  '/admin': {
    title: 'ADMIN CONTROL DASHBOARD',
    badge: 'MODULE 06',
    subtitle: 'Centralized stage control system will appear here.',
    description: 'Provides stage managers and organizers full command over act sequence, live voting triggers, judge lockout overrides, and results verification.',
    icon: <Sliders className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Phase 7: Admin Command Center',
    specs: ['Stage Sequence Queue Control', 'Real-Time Vote Window Override', 'Audit & Score Lock Engine'],
  },
};

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const metadata = moduleMap[path] || {
    title: 'SPOTLIGHT MODULE',
    badge: 'PLANNED MODULE',
    subtitle: 'This feature module will appear here.',
    description: 'This area of the platform is scaffolded and ready for implementation in subsequent project phases.',
    icon: <Construction className="w-10 h-10 text-amber-400" />,
    upcomingPhase: 'Future System Integration',
    specs: ['Frontend Route Scaffolded', 'Decoupled Mock Layer', 'Supabase API Ready'],
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[#08080C] bg-noise flex items-center justify-center">
      <PageContainer size="narrow">
        <div className="p-8 sm:p-12 bg-[#0E0E16] border border-[#1E1E2C] text-center relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 blur-[100px] pointer-events-none" />

          {/* BACK LINK */}
          <div className="flex justify-start mb-8">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Landing Page</span>
            </Link>
          </div>

          {/* MODULE ICON */}
          <div className="w-20 h-20 mx-auto mb-6 bg-[#141420] border border-[#27273C] flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.1)]">
            {metadata.icon}
          </div>

          {/* BADGE */}
          <div className="inline-block mb-4">
            <Badge variant="gold">{metadata.badge}</Badge>
          </div>

          {/* TITLE */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white uppercase tracking-tight mb-3">
            {metadata.title}
          </h1>

          {/* SUBTITLE */}
          <p className="text-lg font-semibold text-amber-400 font-sans mb-4">
            {metadata.subtitle}
          </p>

          {/* DESCRIPTION */}
          <p className="text-sm text-zinc-400 font-sans max-w-xl mx-auto leading-relaxed mb-8">
            {metadata.description}
          </p>

          {/* SPECS BOX */}
          <div className="p-6 bg-[#141420] border border-[#222234] text-left mb-8 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#222234]">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
                PLANNED SPECS
              </span>
              <span className="text-[10px] font-mono text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 border border-amber-400/20">
                {metadata.upcomingPhase}
              </span>
            </div>
            <ul className="space-y-2 text-xs font-mono text-zinc-400">
              {metadata.specs.map((spec, i) => (
                <li key={i} className="flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex justify-center">
            <Button href="/" variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
              Return to Public Site
            </Button>
          </div>
        </div>
      </PageContainer>
    </main>
  );
};
